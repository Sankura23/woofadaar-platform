import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// POST /api/community/comments - Create a comment
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

    const userId = 'userId' in user ? user.userId : user.partnerId;
    const body = await request.json();
    const { content, question_id, answer_id, forum_post_id } = body;

    if (!content || content.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Comment must be at least 3 characters long' },
        { status: 400 }
      );
    }

    // Validate that exactly one target is specified
    const targets = [question_id, answer_id, forum_post_id].filter(Boolean);
    if (targets.length !== 1) {
      return NextResponse.json(
        { success: false, error: 'Must specify exactly one target (question_id, answer_id, or forum_post_id)' },
        { status: 400 }
      );
    }

    // Verify target exists
    if (question_id) {
      const question = await prisma.communityQuestion.findFirst({
        where: { id: question_id, status: 'active' }
      });
      if (!question) {
        return NextResponse.json(
          { success: false, error: 'Question not found' },
          { status: 404 }
        );
      }
    }

    if (answer_id) {
      const answer = await prisma.communityAnswer.findFirst({
        where: { id: answer_id, status: 'active' }
      });
      if (!answer) {
        return NextResponse.json(
          { success: false, error: 'Answer not found' },
          { status: 404 }
        );
      }
    }

    if (forum_post_id) {
      const forumPost = await prisma.forumPost.findFirst({
        where: { id: forum_post_id, status: 'active' }
      });
      if (!forumPost) {
        return NextResponse.json(
          { success: false, error: 'Forum post not found' },
          { status: 404 }
        );
      }
    }

    // Create the comment
    const comment = await prisma.communityComment.create({
      data: {
        user_id: userId,
        content: content.trim(),
        question_id: question_id || null,
        answer_id: answer_id || null,
        forum_post_id: forum_post_id || null
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        }
      }
    });

    // Award points for commenting
    await prisma.userEngagement.create({
      data: {
        user_id: userId,
        action_type: 'comment_posted',
        points_earned: 5,
        description: 'Posted a comment',
        related_id: comment.id,
        related_type: 'comment'
      }
    });

    // Check for first comment badge
    const commentCount = await prisma.communityComment.count({
      where: { user_id: userId }
    });

    if (commentCount === 1) {
      await prisma.userBadge.create({
        data: {
          user_id: userId,
          badge_type: 'first_comment',
          badge_name: 'First Comment',
          badge_description: 'Posted your first community comment',
          badge_icon: '💬',
          badge_color: '#6366F1'
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: { comment }
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

// GET /api/community/comments - Get comments (with filters)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('question_id');
    const answerId = searchParams.get('answer_id');
    const forumPostId = searchParams.get('forum_post_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = { status: 'active' };
    
    if (questionId) where.question_id = questionId;
    if (answerId) where.answer_id = answerId;
    if (forumPostId) where.forum_post_id = forumPostId;

    // Fetch comments
    const comments = await prisma.communityComment.findMany({
      where,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            profile_image_url: true,
            reputation: true
          }
        }
      },
      orderBy: { created_at: 'asc' },
      take: limit,
      skip: offset
    });

    const total = await prisma.communityComment.count({ where });

    return NextResponse.json({
      success: true,
      data: {
        comments,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}