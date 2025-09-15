import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { communityFeedbackSystem } from '@/lib/community-feedback-system';

// GET /api/moderation/community-feedback - Get feedback opportunities or consensus data
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

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const contentId = searchParams.get('contentId');
    const contentType = searchParams.get('contentType');

    if (action === 'opportunities') {
      // Get feedback opportunities for the user (mock data for demo)
      const limit = parseInt(searchParams.get('limit') || '10');
      
      // Mock opportunities data
      const opportunities = [
        {
          contentId: 'demo-content-1',
          contentType: 'question',
          contentPreview: 'My dog keeps barking at night and disturbing neighbors. What training methods work best for reducing excessive barking behavior?',
          originalAction: 'flag',
          confidence: 0.65,
          moderatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          pointsAvailable: 8,
          priority: 'medium' as const
        },
        {
          contentId: 'demo-content-2', 
          contentType: 'answer',
          contentPreview: 'URGENT! Buy premium dog supplements now! Special 70% discount expires today. Click link for amazing deals on pet health products!!!',
          originalAction: 'block',
          confidence: 0.92,
          moderatedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          pointsAvailable: 12,
          priority: 'high' as const
        },
        {
          contentId: 'demo-content-3',
          contentType: 'comment', 
          contentPreview: 'You people are idiots if you think that advice will work. Anyone following this garbage deserves what happens to their dogs.',
          originalAction: 'review',
          confidence: 0.78,
          moderatedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
          pointsAvailable: 10,
          priority: 'high' as const
        }
      ];

      return NextResponse.json({
        success: true,
        data: {
          opportunities,
          userStats: {
            reputation: 247,
            trustLevel: 'trusted',
            totalVotes: 23,
            accuracy: 0.91
          }
        }
      });

    } else if (action === 'consensus' && contentId && contentType) {
      // Get consensus data for specific content
      const consensus = await communityFeedbackSystem.getCommunityConsensus(contentId, contentType);

      if (!consensus) {
        return NextResponse.json(
          { success: false, error: 'No consensus data found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: { consensus }
      });

    } else if (action === 'stats') {
      // Get community feedback statistics
      const [totalVotes, activeUsers, recentConsensus] = await Promise.all([
        prisma.communityFeedbackVote.count({
          where: {
            submitted_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        }),
        prisma.communityFeedbackVote.groupBy({
          by: ['voter_id'],
          where: {
            submitted_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          },
          _count: { voter_id: true }
        }),
        prisma.moderationOverrideRecommendation.count({
          where: {
            created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        })
      ]);

      // Get accuracy stats
      const accuracyStats = await prisma.$queryRaw`
        SELECT 
          AVG(CASE WHEN was_accurate THEN 1.0 ELSE 0.0 END) as accuracy_rate,
          COUNT(*) as total_votes,
          SUM(CASE WHEN voter_trust_level IN ('expert', 'moderator') THEN 1 ELSE 0 END) as expert_votes
        FROM community_feedback_vote
        WHERE submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ` as any[];

      const accuracy = accuracyStats[0] || { accuracy_rate: 0, total_votes: 0, expert_votes: 0 };

      return NextResponse.json({
        success: true,
        data: {
          stats: {
            totalVotes30Days: totalVotes,
            activeUsers7Days: activeUsers.length,
            recentConsensus7Days: recentConsensus,
            communityAccuracy: Math.round(parseFloat(accuracy.accuracy_rate) * 100),
            expertParticipation: parseInt(accuracy.expert_votes),
            averageVotesPerContent: totalVotes > 0 ? Math.round(totalVotes / Math.max(activeUsers.length, 1)) : 0
          }
        }
      });

    } else if (action === 'leaderboard') {
      // Get community feedback leaderboard
      const leaderboard = await prisma.$queryRaw`
        SELECT 
          cfv.voter_id,
          u.name,
          u.profile_image_url,
          cfv.voter_trust_level,
          COUNT(*) as total_votes,
          AVG(cfv.vote_weight) as avg_vote_weight,
          SUM(CASE WHEN cfv.was_accurate THEN 1 ELSE 0 END) as accurate_votes,
          (SUM(CASE WHEN cfv.was_accurate THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as accuracy_rate
        FROM community_feedback_vote cfv
        JOIN users u ON cfv.voter_id = u.id
        WHERE cfv.submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY cfv.voter_id, u.name, u.profile_image_url, cfv.voter_trust_level
        HAVING COUNT(*) >= 5
        ORDER BY accuracy_rate DESC, total_votes DESC
        LIMIT 20
      ` as any[];

      return NextResponse.json({
        success: true,
        data: { leaderboard }
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action or missing parameters' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error handling community feedback GET:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch community feedback data' },
      { status: 500 }
    );
  }
}

// POST /api/moderation/community-feedback - Submit feedback or create campaign
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

    const body = await request.json();
    const { action } = body;

    if (action === 'submit_feedback') {
      // Submit community feedback vote (mock implementation for demo)
      const { contentId, contentType, feedback } = body;

      if (!contentId || !contentType || !feedback) {
        return NextResponse.json(
          { success: false, error: 'Content ID, type, and feedback are required' },
          { status: 400 }
        );
      }

      // Validate feedback structure
      if (typeof feedback.wasAccurate !== 'boolean' || !feedback.severity || !Array.isArray(feedback.categories)) {
        return NextResponse.json(
          { success: false, error: 'Invalid feedback structure' },
          { status: 400 }
        );
      }

      // Mock successful submission with points
      const pointsEarned = Math.floor(Math.random() * 10) + 5; // 5-15 points

      return NextResponse.json({
        success: true,
        message: 'Thank you for your feedback! Your input helps improve our AI system.',
        data: { pointsEarned }
      });

    } else if (action === 'create_campaign') {
      // Create feedback campaign (admin only)
      if (user.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403 }
        );
      }

      const { name, description, options } = body;

      if (!name || !description) {
        return NextResponse.json(
          { success: false, error: 'Campaign name and description are required' },
          { status: 400 }
        );
      }

      const campaignId = await communityFeedbackSystem.createFeedbackCampaign(
        name,
        description,
        options || {}
      );

      return NextResponse.json({
        success: true,
        data: { campaignId },
        message: 'Feedback campaign created successfully'
      });

    } else if (action === 'bulk_feedback') {
      // Submit feedback for multiple items (for power users)
      const { feedbackItems } = body;

      if (!Array.isArray(feedbackItems) || feedbackItems.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Feedback items array is required' },
          { status: 400 }
        );
      }

      // Limit bulk submissions
      if (feedbackItems.length > 20) {
        return NextResponse.json(
          { success: false, error: 'Maximum 20 items per bulk submission' },
          { status: 400 }
        );
      }

      const results = [];
      let totalPointsEarned = 0;

      for (const item of feedbackItems) {
        try {
          const result = await communityFeedbackSystem.submitFeedback(
            item.contentId,
            item.contentType,
            user.id,
            item.feedback
          );

          results.push({
            contentId: item.contentId,
            success: result.success,
            message: result.message,
            pointsEarned: result.pointsEarned || 0
          });

          if (result.pointsEarned) {
            totalPointsEarned += result.pointsEarned;
          }
        } catch (itemError) {
          results.push({
            contentId: item.contentId,
            success: false,
            message: 'Error processing feedback',
            pointsEarned: 0
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      return NextResponse.json({
        success: true,
        data: {
          results,
          summary: {
            totalItems: feedbackItems.length,
            successfulSubmissions: successCount,
            failedSubmissions: feedbackItems.length - successCount,
            totalPointsEarned
          }
        },
        message: `Processed ${successCount}/${feedbackItems.length} feedback submissions`
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error handling community feedback POST:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process community feedback request' },
      { status: 500 }
    );
  }
}

// PUT /api/moderation/community-feedback - Update campaign or override decisions
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { action } = body;

    if (action === 'apply_override') {
      // Apply community override recommendation (moderator/admin only)
      const isAuthorized = user.role === 'admin' || user.role === 'moderator';
      if (!isAuthorized) {
        return NextResponse.json(
          { success: false, error: 'Moderator access required' },
          { status: 403 }
        );
      }

      const { overrideId, approved, moderatorNotes } = body;

      if (!overrideId || typeof approved !== 'boolean') {
        return NextResponse.json(
          { success: false, error: 'Override ID and approval status required' },
          { status: 400 }
        );
      }

      // Update override recommendation
      const override = await prisma.moderationOverrideRecommendation.update({
        where: { id: overrideId },
        data: {
          status: approved ? 'approved' : 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date(),
          moderator_notes: moderatorNotes
        }
      });

      if (approved) {
        // Apply the override action
        await prisma.contentModerationAction.create({
          data: {
            content_id: override.content_id,
            action_type: override.recommended_action,
            reason: `Community override: ${override.reason}`,
            moderator_id: user.id,
            is_community_override: true
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: approved ? 'Override applied successfully' : 'Override rejected'
      });

    } else if (action === 'update_campaign') {
      // Update feedback campaign (admin only)
      if (user.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403 }
        );
      }

      const { campaignId, updates } = body;

      if (!campaignId || !updates) {
        return NextResponse.json(
          { success: false, error: 'Campaign ID and updates are required' },
          { status: 400 }
        );
      }

      await prisma.feedbackCampaign.update({
        where: { id: campaignId },
        data: {
          name: updates.name,
          description: updates.description,
          is_active: updates.isActive,
          points_per_vote: updates.pointsPerVote,
          min_reputation: updates.minReputation
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Campaign updated successfully'
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error handling community feedback PUT:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update community feedback data' },
      { status: 500 }
    );
  }
}