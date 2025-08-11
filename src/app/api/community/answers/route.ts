import { NextRequest, NextResponse } from 'next/server';
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
    const { questionId, content, photoUrl } = body;

    if (!questionId || !content) {
      return NextResponse.json(
        { success: false, error: 'Question ID and content are required' },
        { status: 400 }
      );
    }

    // Check if question exists and is active
    const question = await prisma.communityQuestion.findUnique({
      where: { id: questionId, status: 'active' }
    });

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Question not found or inactive' },
        { status: 404 }
      );
    }

    // Check if user is a verified expert
    const expert = await prisma.communityExpert.findFirst({
      where: { 
        user_id: 'userId' in user ? user.userId : user.partnerId, 
        verification_status: 'verified' 
      }
    });

    // Create the answer
    const answer = await prisma.communityAnswer.create({
      data: {
        question_id: questionId,
        user_id: 'userId' in user ? user.userId : user.partnerId,
        content,
        photo_url: photoUrl || null,
        is_verified_expert: !!expert
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        }
      }
    });

    // Update question answer count
    await prisma.communityQuestion.update({
      where: { id: questionId },
      data: { answer_count: { increment: 1 } }
    });

    // Award points for posting an answer
    const pointsEarned = expert ? 15 : 10; // Experts get more points
    await prisma.userEngagement.create({
      data: {
        user_id: 'userId' in user ? user.userId : user.partnerId,
        action_type: 'answer_posted',
        points_earned: pointsEarned,
        description: `Answered question: ${question.title}`,
        related_id: answer.id,
        related_type: 'answer'
      }
    });

    // Check for first answer badge
    const answerCount = await prisma.communityAnswer.count({
      where: { user_id: 'userId' in user ? user.userId : user.partnerId }
    });

    if (answerCount === 1) {
      await prisma.userBadge.create({
        data: {
          user_id: 'userId' in user ? user.userId : user.partnerId,
          badge_type: 'first_answer',
          badge_name: 'First Answer',
          badge_description: 'Provided your first community answer',
          badge_icon: '💡',
          badge_color: '#10B981'
        }
      });
    }

    // Update expert stats if applicable
    if (expert) {
      await prisma.communityExpert.update({
        where: { id: expert.id },
        data: { 
          answer_count: { increment: 1 },
          total_points: { increment: pointsEarned }
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: { answer }
    });
  } catch (error) {
    console.error('Error creating community answer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create answer' },
      { status: 500 }
    );
  }
} 