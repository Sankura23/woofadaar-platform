import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// POST /api/community/questions/[id]/view - Increment view count (only once per user session)
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const questionId = params.id;

    if (!questionId) {
      return NextResponse.json(
        { success: false, error: 'Question ID is required' },
        { status: 400 }
      );
    }

    // Get user ID if authenticated (optional for view tracking)
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    let userId = null;
    
    if (token) {
      const user = await verifyToken(token);
      if (user) {
        userId = 'userId' in user ? user.userId : user.partnerId;
      }
    }

    // Check if question exists and is active
    const question = await prisma.communityQuestion.findFirst({
      where: { 
        id: questionId,
        status: 'active'
      }
    });

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Question not found' },
        { status: 404 }
      );
    }

    // Get session fingerprint from headers (IP + User Agent)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const sessionFingerprint = `${ip}-${userAgent}`.substring(0, 100); // Limit length

    // Check if this session has already viewed this question in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const existingView = await prisma.questionView.findFirst({
      where: {
        question_id: questionId,
        OR: [
          ...(userId ? [{ user_id: userId }] : []),
          { 
            session_fingerprint: sessionFingerprint,
            created_at: {
              gte: oneHourAgo
            }
          }
        ]
      }
    });

    if (existingView) {
      // User/session has already viewed this question recently
      return NextResponse.json({
        success: true,
        message: 'View already recorded'
      });
    }

    // Record the view and increment count
    await prisma.$transaction(async (tx) => {
      // Create view record
      await tx.questionView.create({
        data: {
          question_id: questionId,
          user_id: userId,
          session_fingerprint: sessionFingerprint
        }
      });

      // Increment view count
      await tx.communityQuestion.update({
        where: { id: questionId },
        data: {
          view_count: {
            increment: 1
          },
          updated_at: new Date()
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: 'View count updated'
    });
  } catch (error) {
    console.error('Error updating view count:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update view count' },
      { status: 500 }
    );
  }
}