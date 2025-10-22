import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// PUT /api/community/questions/[id]/answers/[answerId] - Edit an answer
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; answerId: string }> }
) {
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
    const { id: questionId, answerId } = params;
    const userId = 'userId' in user ? user.userId : user.partnerId;
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Answer content must be at least 3 characters long' },
        { status: 400 }
      );
    }

    // Verify the answer exists and belongs to the authenticated user
    const existingAnswer = await prisma.communityAnswer.findFirst({
      where: {
        id: answerId,
        question_id: questionId,
        user_id: userId, // CRITICAL: Only allow editing own answers
        status: 'active'
      }
    });

    if (!existingAnswer) {
      return NextResponse.json(
        { success: false, error: 'Answer not found or you do not have permission to edit it' },
        { status: 404 }
      );
    }

    // Check if question is still active
    const question = await prisma.communityQuestion.findFirst({
      where: {
        id: questionId,
        status: 'active'
      }
    });

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Question not found or inactive' },
        { status: 404 }
      );
    }

    // Update the answer
    const updatedAnswer = await prisma.communityAnswer.update({
      where: { id: answerId },
      data: {
        content: content.trim(),
        updated_at: new Date()
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            profile_image_url: true,
            reputation: true
          }
        }
      }
    });

    // Log the edit for audit purposes
    try {
      await prisma.userEngagement.create({
        data: {
          id: `eng_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: userId,
          action_type: 'answer_edited',
          points_earned: 0, // No points for editing
          description: `Edited answer to: ${question.title}`,
          related_id: answerId,
          related_type: 'answer'
        }
      });
    } catch (engagementError) {
      console.warn('Could not log engagement for answer edit:', engagementError);
    }

    // Transform User to user for mobile app compatibility
    const answerWithCorrectUserField = {
      ...updatedAnswer,
      user: updatedAnswer.User  // Copy User to user field
    };

    return NextResponse.json({
      success: true,
      data: { answer: answerWithCorrectUserField }
    });
  } catch (error) {
    console.error('Error editing answer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to edit answer' },
      { status: 500 }
    );
  }
}

// DELETE /api/community/questions/[id]/answers/[answerId] - Delete an answer
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; answerId: string }> }
) {
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
    const { id: questionId, answerId } = params;
    const userId = 'userId' in user ? user.userId : user.partnerId;

    // Verify the answer exists and belongs to the authenticated user
    const existingAnswer = await prisma.communityAnswer.findFirst({
      where: {
        id: answerId,
        question_id: questionId,
        user_id: userId, // CRITICAL: Only allow deleting own answers
        status: 'active'
      }
    });

    if (!existingAnswer) {
      return NextResponse.json(
        { success: false, error: 'Answer not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    // Soft delete the answer
    await prisma.communityAnswer.update({
      where: { id: answerId },
      data: {
        status: 'deleted',
        updated_at: new Date()
      }
    });

    // Update question answer count
    await prisma.communityQuestion.update({
      where: { id: questionId },
      data: {
        answer_count: {
          decrement: 1
        },
        updated_at: new Date()
      }
    });

    // Log the deletion for audit purposes
    try {
      await prisma.userEngagement.create({
        data: {
          id: `eng_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: userId,
          action_type: 'answer_deleted',
          points_earned: -10, // Deduct points for deletion
          description: `Deleted answer`,
          related_id: answerId,
          related_type: 'answer'
        }
      });
    } catch (engagementError) {
      console.warn('Could not log engagement for answer deletion:', engagementError);
    }

    return NextResponse.json({
      success: true,
      message: 'Answer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting answer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete answer' },
      { status: 500 }
    );
  }
}