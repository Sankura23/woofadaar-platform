import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET /api/community/questions/[id] - Get a specific question with answers and comments
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

    const question = await prisma.communityQuestion.findFirst({
      where: { 
        id: questionId,
        status: 'active'
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            profile_image_url: true,
            reputation: true
          }
        },
        Dog: {
          select: {
            id: true,
            name: true,
            breed: true,
            photo_url: true
          }
        },
        CommunityAnswer: {
          where: { status: 'active' },
          include: {
            User: {
              select: {
                id: true,
                name: true,
                profile_image_url: true,
                reputation: true
              }
            },
            CommunityComment: {
              where: { status: 'active' },
              include: {
                User: {
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
        },
        CommunityComment: {
          where: { status: 'active' },
          include: {
            User: {
              select: {
                id: true,
                name: true,
                profile_image_url: true
              }
            }
          },
          orderBy: { created_at: 'asc' }
        }
      }
    });

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Question not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { question }
    });
  } catch (error) {
    console.error('Error fetching question:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch question' },
      { status: 500 }
    );
  }
}

// PUT /api/community/questions/[id] - Update a question (only by owner)
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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
    const { title, content, tags, category, is_resolved } = body;

    // Check if question exists and user owns it
    const existingQuestion = await prisma.communityQuestion.findFirst({
      where: { 
        id: questionId,
        user_id: userId,
        status: 'active'
      }
    });

    if (!existingQuestion) {
      return NextResponse.json(
        { success: false, error: 'Question not found or not authorized' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (title && title.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'Title must be at least 5 characters long' },
        { status: 400 }
      );
    }

    if (content && content.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Content must be at least 10 characters long' },
        { status: 400 }
      );
    }

    // Update question
    const updatedQuestion = await prisma.communityQuestion.update({
      where: { id: questionId },
      data: {
        ...(title && { title: title.trim() }),
        ...(content && { content: content.trim() }),
        ...(tags && { tags }),
        ...(category && { category }),
        ...(typeof is_resolved === 'boolean' && { is_resolved }),
        updated_at: new Date()
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        },
        Dog: {
          select: {
            id: true,
            name: true,
            breed: true,
            photo_url: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: { question: updatedQuestion }
    });
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update question' },
      { status: 500 }
    );
  }
}

// DELETE /api/community/questions/[id] - Delete a question (only by owner)
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    // Check if question exists and user owns it
    const existingQuestion = await prisma.communityQuestion.findFirst({
      where: { 
        id: questionId,
        user_id: userId,
        status: 'active'
      }
    });

    if (!existingQuestion) {
      return NextResponse.json(
        { success: false, error: 'Question not found or not authorized' },
        { status: 404 }
      );
    }

    // Soft delete the question
    await prisma.communityQuestion.update({
      where: { id: questionId },
      data: {
        status: 'deleted',
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete question' },
      { status: 500 }
    );
  }
}