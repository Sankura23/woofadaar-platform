import { NextRequest, NextResponse } from 'next/server';
import { processNewContent, automatedModerationEngine } from '@/lib/automated-moderation';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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
    const { content, contentType, contentId, action = 'process' } = body;

    if (!content || !contentType) {
      return NextResponse.json(
        { success: false, error: 'Content and contentType are required' },
        { status: 400 }
      );
    }

    const validTypes = ['question', 'answer', 'comment', 'forum_post', 'story'];
    if (!validTypes.includes(contentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid content type' },
        { status: 400 }
      );
    }

    let result;

    if (action === 'process') {
      // Process new content with automated moderation
      result = await processNewContent(content, contentType, contentId || 'temp-id', user.id);
      
      // If content is blocked or requires review, don't allow immediate posting
      if (result.action === 'block') {
        return NextResponse.json({
          success: false,
          error: 'Content blocked by automated moderation',
          data: {
            reason: result.reasons.join(', '),
            confidence: result.confidence,
            autoActions: result.autoActions,
            canAppeal: true
          }
        }, { status: 403 });
      }

      if (result.action === 'review') {
        return NextResponse.json({
          success: true,
          data: {
            action: result.action,
            message: 'Content submitted for review',
            reasons: result.reasons,
            confidence: result.confidence,
            estimatedReviewTime: '2-4 hours',
            queuePosition: await getQueuePosition(result.queueItem || '')
          }
        });
      }

      // Content allowed or flagged - can be posted but may be monitored
      return NextResponse.json({
        success: true,
        data: {
          action: result.action,
          message: result.action === 'flag' ? 
            'Content posted but flagged for monitoring' : 
            'Content approved',
          reasons: result.reasons,
          confidence: result.confidence,
          autoActions: result.autoActions,
          processingTime: result.processingTime
        }
      });

    } else if (action === 'feedback') {
      // Handle feedback for learning system
      const { wasAccurate, actualAction, moderatorNotes } = body;

      if (!contentId || wasAccurate === undefined || !actualAction) {
        return NextResponse.json(
          { success: false, error: 'Feedback requires contentId, wasAccurate, and actualAction' },
          { status: 400 }
        );
      }

      // Check if user is admin/moderator for feedback
      const isAdmin = user.role === 'admin' || user.role === 'moderator';
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Only moderators can provide feedback' },
          { status: 403 }
        );
      }

      await automatedModerationEngine.updateLearningThresholds({
        contentType,
        contentId,
        wasAccurate,
        actualAction,
        moderatorNotes
      });

      return NextResponse.json({
        success: true,
        message: 'Feedback recorded for machine learning improvement'
      });

    } else if (action === 'reprocess') {
      // Reprocess content with updated rules/thresholds
      if (!contentId) {
        return NextResponse.json(
          { success: false, error: 'Content ID required for reprocessing' },
          { status: 400 }
        );
      }

      // Check if user is admin/moderator
      const isAdmin = user.role === 'admin' || user.role === 'moderator';
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Only moderators can reprocess content' },
          { status: 403 }
        );
      }

      result = await processNewContent(content, contentType, contentId, user.id);

      // Update existing quality score if it exists
      try {
        await prisma.contentQualityScore.upsert({
          where: {
            content_type_content_id: {
              content_type: contentType,
              content_id: contentId
            }
          },
          update: {
            last_analyzed: new Date()
          },
          create: {
            content_type: contentType,
            content_id: contentId,
            quality_score: 50,
            spam_likelihood: 0,
            toxicity_score: 0,
            readability_score: 50,
            engagement_score: 50,
            ai_confidence: 0.5,
            flags: [],
            last_analyzed: new Date()
          }
        });
      } catch (dbError) {
        console.error('Error updating quality score:', dbError);
      }

      return NextResponse.json({
        success: true,
        data: {
          action: result.action,
          message: `Content reprocessed - new action: ${result.action}`,
          reasons: result.reasons,
          confidence: result.confidence,
          autoActions: result.autoActions,
          processingTime: result.processingTime,
          previousAction: body.previousAction || 'unknown'
        }
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use: process, feedback, or reprocess' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Auto-moderation processing error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Automated moderation service error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

async function getQueuePosition(queueItemId: string): Promise<number> {
  try {
    if (!queueItemId) return 0;

    const position = await prisma.advancedModerationQueue.count({
      where: {
        id: { not: queueItemId },
        status: 'pending',
        added_at: {
          lte: (await prisma.advancedModerationQueue.findUnique({
            where: { id: queueItemId },
            select: { added_at: true }
          }))?.added_at || new Date()
        }
      }
    });

    return position + 1;
  } catch (error) {
    console.error('Error calculating queue position:', error);
    return 0;
  }
}

// Batch processing endpoint for existing content
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

    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required for batch processing' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { contentType, limit = 100, offset = 0 } = body;

    // Get existing content to reprocess
    let query: any = {};
    let includeClause: any = {};

    if (contentType === 'question') {
      query = { status: 'active' };
      includeClause = { user: { select: { id: true } } };
    }

    // This is a simplified example - in production, you'd handle each content type
    const contentItems = await (prisma as any)[`community${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`]?.findMany({
      where: query,
      include: includeClause,
      take: limit,
      skip: offset,
      orderBy: { created_at: 'desc' }
    }) || [];

    const results = [];
    let processed = 0;
    let errors = 0;

    for (const item of contentItems) {
      try {
        const content = item.content || item.title || '';
        if (!content) continue;

        const result = await processNewContent(
          content,
          contentType as any,
          item.id,
          item.user?.id || item.user_id || 'system'
        );

        results.push({
          id: item.id,
          action: result.action,
          confidence: result.confidence,
          flags: result.autoActions.length
        });

        processed++;

        // Add small delay to prevent overwhelming the system
        if (processed % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (itemError) {
        console.error(`Error processing item ${item.id}:`, itemError);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processed,
        errors,
        totalItems: contentItems.length,
        results: results.slice(0, 20), // Return first 20 results
        summary: {
          blocked: results.filter(r => r.action === 'block').length,
          flagged: results.filter(r => r.action === 'flag').length,
          approved: results.filter(r => r.action === 'allow').length,
          review: results.filter(r => r.action === 'review').length
        }
      },
      message: `Batch processing completed: ${processed} processed, ${errors} errors`
    });

  } catch (error) {
    console.error('Batch processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Batch processing failed' },
      { status: 500 }
    );
  }
}