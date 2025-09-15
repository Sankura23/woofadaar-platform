import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin/moderator
    const isAdmin = user.role === 'admin' || user.role === 'moderator';
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied - Admin/Moderator required' },
        { status: 403 }
      );
    }

    // Get current date ranges for analytics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Parallel queries for dashboard data
    const [
      pendingReports,
      activeQueue,
      todayStats,
      weekStats,
      monthStats,
      topFlaggedContent,
      moderatorActivity,
      automationStats,
      criticalAlerts
    ] = await Promise.all([
      // Pending reports count
      prisma.contentReport.count({
        where: { status: 'pending' }
      }),

      // Active moderation queue
      prisma.advancedModerationQueue.findMany({
        where: { status: { in: ['pending', 'in_progress'] } },
        include: {
          assigned_moderator: {
            select: { id: true, name: true, profile_image_url: true }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { added_at: 'asc' }
        ],
        take: 20
      }),

      // Today's moderation stats
      prisma.contentModerationAction.groupBy({
        by: ['action_type'],
        where: {
          created_at: { gte: today }
        },
        _count: {
          action_type: true
        }
      }),

      // This week's stats
      prisma.contentModerationAction.groupBy({
        by: ['action_type'],
        where: {
          created_at: { gte: weekAgo }
        },
        _count: {
          action_type: true
        }
      }),

      // This month's stats
      prisma.contentModerationAction.groupBy({
        by: ['action_type'],
        where: {
          created_at: { gte: monthAgo }
        },
        _count: {
          action_type: true
        }
      }),

      // Top flagged content types
      prisma.contentQualityScore.groupBy({
        by: ['content_type'],
        where: {
          spam_likelihood: { gte: 70 }
        },
        _count: {
          content_type: true
        },
        _avg: {
          spam_likelihood: true,
          toxicity_score: true
        },
        orderBy: {
          _count: {
            content_type: 'desc'
          }
        },
        take: 10
      }),

      // Moderator activity this week
      prisma.contentModerationAction.groupBy({
        by: ['moderator_id'],
        where: {
          created_at: { gte: weekAgo },
          is_automated: false
        },
        _count: {
          moderator_id: true
        },
        orderBy: {
          _count: {
            moderator_id: 'desc'
          }
        },
        take: 10
      }),

      // Automation effectiveness stats
      prisma.autoModerationLog.groupBy({
        by: ['result'],
        where: {
          created_at: { gte: weekAgo }
        },
        _count: {
          result: true
        },
        _avg: {
          confidence: true,
          processing_time: true
        }
      }),

      // Critical alerts (high priority pending items)
      prisma.contentReport.findMany({
        where: {
          status: 'pending',
          priority: { in: ['high', 'urgent'] }
        },
        include: {
          reporter: {
            select: { id: true, name: true }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { created_at: 'asc' }
        ],
        take: 5
      })
    ]);

    // Get moderator names for activity stats
    const moderatorIds = moderatorActivity.map(m => m.moderator_id);
    const moderators = await prisma.user.findMany({
      where: { id: { in: moderatorIds } },
      select: { id: true, name: true, profile_image_url: true }
    });

    const moderatorMap = moderators.reduce((acc, mod) => {
      acc[mod.id] = mod;
      return acc;
    }, {} as Record<string, any>);

    // Process and format the data
    const dashboardStats = {
      overview: {
        pendingReports,
        activeQueueItems: activeQueue.length,
        criticalAlerts: criticalAlerts.length,
        automationRate: automationStats.reduce((acc, stat) => acc + stat._count.result, 0)
      },
      
      actionStats: {
        today: todayStats.reduce((acc, stat) => {
          acc[stat.action_type] = stat._count.action_type;
          return acc;
        }, {} as Record<string, number>),
        
        week: weekStats.reduce((acc, stat) => {
          acc[stat.action_type] = stat._count.action_type;
          return acc;
        }, {} as Record<string, number>),
        
        month: monthStats.reduce((acc, stat) => {
          acc[stat.action_type] = stat._count.action_type;
          return acc;
        }, {} as Record<string, number>)
      },

      contentAnalysis: {
        topFlaggedTypes: topFlaggedContent.map(item => ({
          contentType: item.content_type,
          count: item._count.content_type,
          avgSpamScore: Math.round(item._avg.spam_likelihood || 0),
          avgToxicityScore: Math.round(item._avg.toxicity_score || 0)
        }))
      },

      moderatorPerformance: moderatorActivity.map(activity => ({
        moderator: moderatorMap[activity.moderator_id] || { 
          id: activity.moderator_id, 
          name: 'Unknown', 
          profile_image_url: null 
        },
        actionsThisWeek: activity._count.moderator_id
      })),

      automationEffectiveness: {
        results: automationStats.map(stat => ({
          result: stat.result,
          count: stat._count.result,
          avgConfidence: Math.round((stat._avg.confidence || 0) * 100),
          avgProcessingTime: Math.round(stat._avg.processing_time || 0)
        })),
        totalProcessed: automationStats.reduce((acc, stat) => acc + stat._count.result, 0)
      },

      alerts: {
        critical: criticalAlerts.map(alert => ({
          id: alert.id,
          contentType: alert.content_type,
          contentId: alert.content_id,
          category: alert.report_category,
          reason: alert.report_reason,
          priority: alert.priority,
          reporter: alert.reporter.name,
          createdAt: alert.created_at,
          timeSincereported: Math.floor((now.getTime() - alert.created_at.getTime()) / (1000 * 60))
        }))
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        stats: dashboardStats,
        queue: activeQueue.map(item => ({
          id: item.id,
          contentType: item.content_type,
          contentId: item.content_id,
          queueType: item.queue_type,
          priority: item.priority,
          status: item.status,
          reason: item.added_reason,
          addedBy: item.added_by,
          addedAt: item.added_at,
          assignedTo: item.assigned_moderator,
          waitingTime: Math.floor((now.getTime() - item.added_at.getTime()) / (1000 * 60))
        })),
        metadata: {
          generatedAt: now.toISOString(),
          dataRange: {
            today: today.toISOString(),
            weekAgo: weekAgo.toISOString(),
            monthAgo: monthAgo.toISOString()
          }
        }
      }
    });

  } catch (error) {
    console.error('Error fetching moderation dashboard data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

// Bulk moderation actions
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin/moderator
    const isAdmin = user.role === 'admin' || user.role === 'moderator';
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied - Admin/Moderator required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, items, reason, duration } = body;

    if (!action || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid bulk action request' },
        { status: 400 }
      );
    }

    const validActions = ['approve', 'reject', 'hide', 'warn', 'ban', 'assign', 'escalate'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action type' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    // Process each item in the bulk action
    for (const item of items) {
      try {
        const { type, id } = item; // type: 'report' | 'queue', id: string

        if (type === 'report') {
          // Handle content report actions
          const report = await prisma.contentReport.findUnique({
            where: { id }
          });

          if (!report) {
            errors.push({ id, error: 'Report not found' });
            continue;
          }

          // Update report status
          let newStatus = 'resolved';
          if (action === 'escalate') newStatus = 'reviewing';
          if (action === 'assign') newStatus = 'reviewing';

          await prisma.contentReport.update({
            where: { id },
            data: {
              status: newStatus,
              assigned_to: action === 'assign' ? user.id : undefined,
              resolved_by: action !== 'assign' && action !== 'escalate' ? user.id : undefined,
              resolved_at: action !== 'assign' && action !== 'escalate' ? new Date() : undefined,
              resolution: reason || `Bulk action: ${action}`
            }
          });

          // Create moderation action record
          await prisma.contentModerationAction.create({
            data: {
              report_id: id,
              content_type: report.content_type,
              content_id: report.content_id,
              action_type: action,
              moderator_id: user.id,
              reason: reason || `Bulk moderation action: ${action}`,
              duration: duration || null,
              expires_at: duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : null,
              is_automated: false
            }
          });

          results.push({ id, type: 'report', action, status: 'success' });

        } else if (type === 'queue') {
          // Handle moderation queue actions
          const queueItem = await prisma.advancedModerationQueue.findUnique({
            where: { id }
          });

          if (!queueItem) {
            errors.push({ id, error: 'Queue item not found' });
            continue;
          }

          // Update queue item status
          let newStatus = 'completed';
          if (action === 'assign') newStatus = 'in_progress';
          if (action === 'escalate') newStatus = 'pending'; // Will be re-prioritized

          await prisma.advancedModerationQueue.update({
            where: { id },
            data: {
              status: newStatus,
              assigned_to: action === 'assign' ? user.id : queueItem.assigned_to,
              started_at: action === 'assign' ? new Date() : queueItem.started_at,
              completed_at: newStatus === 'completed' ? new Date() : null,
              priority: action === 'escalate' ? Math.min(queueItem.priority + 2, 10) : queueItem.priority
            }
          });

          // Create moderation action record
          await prisma.contentModerationAction.create({
            data: {
              content_type: queueItem.content_type,
              content_id: queueItem.content_id,
              action_type: action,
              moderator_id: user.id,
              reason: reason || `Bulk queue action: ${action}`,
              duration: duration || null,
              expires_at: duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : null,
              is_automated: false
            }
          });

          results.push({ id, type: 'queue', action, status: 'success' });
        }

      } catch (itemError) {
        console.error(`Error processing item ${item.id}:`, itemError);
        errors.push({ id: item.id, error: 'Processing failed' });
      }
    }

    // Award points for moderation activities
    const pointsPerAction = {
      approve: 5,
      reject: 10,
      hide: 8,
      warn: 12,
      ban: 15,
      assign: 3,
      escalate: 7
    };

    if (pointsPerAction[action as keyof typeof pointsPerAction]) {
      await prisma.userEngagement.create({
        data: {
          user_id: user.id,
          action_type: 'bulk_moderation',
          points_earned: pointsPerAction[action as keyof typeof pointsPerAction] * results.length,
          description: `Bulk ${action} action on ${results.length} items`,
          related_type: 'moderation'
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: results.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: errors.length,
        results,
        errors
      },
      message: `Bulk ${action} completed: ${results.length} processed, ${errors.length} failed`
    });

  } catch (error) {
    console.error('Error processing bulk moderation action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process bulk action' },
      { status: 500 }
    );
  }
}