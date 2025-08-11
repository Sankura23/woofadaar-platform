import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET /api/community/questions/[id]/answers - Get answers for a question
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const questionId = params.id;

    if (!questionId) {
      return NextResponse.json(
        { success: false, error: 'Question ID is required' },
        { status: 400 }
      );
    }

    // Check if question exists
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

    const answers = await prisma.communityAnswer.findMany({
      where: { 
        question_id: questionId,
        status: 'active'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true,
            reputation: true
          }
        },
        comments: {
          where: { status: 'active' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profile_image_url: true
              }
            }
          },
          orderBy: { created_at: 'asc' }
        }
      },
      orderBy: [
        { is_best_answer: 'desc' },
        { upvotes: 'desc' },
        { created_at: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: { answers }
    });
  } catch (error) {
    console.error('Error fetching answers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch answers' },
      { status: 500 }
    );
  }
}

// POST /api/community/questions/[id]/answers - Submit an answer
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const params = await context.params;
    const questionId = params.id;
    const userId = 'userId' in user ? user.userId : user.partnerId;
    const body = await request.json();
    const { content, photo_url } = body;

    if (!content || content.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Answer content must be at least 10 characters long' },
        { status: 400 }
      );
    }

    // Check if question exists
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

    // Create the answer
    const answer = await prisma.communityAnswer.create({
      data: {
        question_id: questionId,
        user_id: userId,
        content: content.trim(),
        photo_url: photo_url || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true,
            reputation: true
          }
        }
      }
    });

    // Update question answer count
    await prisma.communityQuestion.update({
      where: { id: questionId },
      data: {
        answer_count: {
          increment: 1
        },
        updated_at: new Date()
      }
    });

    // Award points for posting an answer
    await prisma.userEngagement.create({
      data: {
        user_id: userId,
        action_type: 'answer_posted',
        points_earned: 15,
        description: `Posted answer to: ${question.title}`,
        related_id: answer.id,
        related_type: 'answer'
      }
    });

    // Check for first answer badge
    const answerCount = await prisma.communityAnswer.count({
      where: { user_id: userId }
    });

    if (answerCount === 1) {
      await prisma.userBadge.create({
        data: {
          user_id: userId,
          badge_type: 'first_answer',
          badge_name: 'First Answer',
          badge_description: 'Posted your first community answer',
          badge_icon: '💡',
          badge_color: '#10B981'
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: { answer }
    });
  } catch (error) {
    console.error('Error creating answer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create answer' },
      { status: 500 }
    );
  }
}