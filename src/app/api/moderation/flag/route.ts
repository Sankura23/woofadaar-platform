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
    const { 
      questionId, 
      answerId, 
      commentId, 
      forumPostId, 
      reason, 
      description 
    } = body;

    // Validate that at least one content ID is provided
    if (!questionId && !answerId && !commentId && !forumPostId) {
      return NextResponse.json(
        { success: false, error: 'At least one content ID is required' },
        { status: 400 }
      );
    }

    // Validate reason
    const validReasons = ['spam', 'inappropriate', 'harassment', 'misinformation', 'other'];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { success: false, error: 'Invalid reason' },
        { status: 400 }
      );
    }

    // Check if user has already flagged this content
    const existingFlag = await prisma.communityFlag.findFirst({
      where: {
        user_id: user.id,
        question_id: questionId || null,
        answer_id: answerId || null,
        comment_id: commentId || null,
        forum_post_id: forumPostId || null,
        status: { in: ['pending', 'reviewed'] }
      }
    });

    if (existingFlag) {
      return NextResponse.json(
        { success: false, error: 'You have already flagged this content' },
        { status: 400 }
      );
    }

    // Create the flag
    const flag = await prisma.communityFlag.create({
      data: {
        user_id: user.id,
        question_id: questionId || null,
        answer_id: answerId || null,
        comment_id: commentId || null,
        forum_post_id: forumPostId || null,
        reason,
        description: description || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: { flag },
      message: 'Content flagged successfully. Our moderation team will review it.'
    });
  } catch (error) {
    console.error('Error creating content flag:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to flag content' },
      { status: 500 }
    );
  }
}

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

    // Check if user is admin/moderator (you can implement your own logic here)
    const isAdmin = user.role === 'admin' || user.role === 'moderator';
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const reason = searchParams.get('reason');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = { status };
    if (reason) where.reason = reason;

    const flags = await prisma.communityFlag.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        },
        moderator: {
          select: {
            id: true,
            name: true
          }
        },
        question: {
          select: {
            id: true,
            title: true,
            content: true
          }
        },
        answer: {
          select: {
            id: true,
            content: true
          }
        },
        comment: {
          select: {
            id: true,
            content: true
          }
        },
        forum_post: {
          select: {
            id: true,
            title: true,
            content: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset
    });

    const total = await prisma.communityFlag.count({ where });

    return NextResponse.json({
      success: true,
      data: {
        flags,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching content flags:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch flags' },
      { status: 500 }
    );
  }
} 