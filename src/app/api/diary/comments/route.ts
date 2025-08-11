import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken, getTokenFromRequest, isPetParent } from '@/lib/auth';

// POST /api/diary/comments - Add comment to diary entry
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !isPetParent(payload)) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const userId = payload.userId;
    const body = await request.json();
      const { entry_id, content } = body;

    if (!entry_id || !content) {
      return NextResponse.json(
        { error: 'Entry ID and content are required' },
        { status: 400 }
      );
    }

    // Check if entry exists and is accessible
    const entry = await prisma.diaryEntry.findUnique({
      where: { id: entry_id },
      include: {
        dog: {
          select: { user_id: true }
        }
      }
    });

    if (!entry) {
      return NextResponse.json(
        { error: 'Diary entry not found' },
        { status: 404 }
      );
    }

    // Can't comment on private entries from other users
    if (entry.privacy_level === 'private' && entry.dog.user_id !== userId) {
      return NextResponse.json(
        { error: 'Cannot comment on private entry' },
        { status: 403 }
      );
    }

    // Create comment
    const comment = await prisma.diaryComment.create({
      data: {
        diary_entry_id: entry_id,
        user_id: userId,
        content
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar_url: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Comment added successfully',
      data: { comment }
    });

  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

// GET /api/diary/comments - Get comments for diary entry
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !isPetParent(payload)) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const userId = payload.userId;
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entry_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!entryId) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      );
    }

    // Check if entry exists and is accessible
    const entry = await prisma.diaryEntry.findUnique({
      where: { id: entryId },
      include: {
        dog: {
          select: { user_id: true }
        }
      }
    });

    if (!entry) {
      return NextResponse.json(
        { error: 'Diary entry not found' },
        { status: 404 }
      );
    }

    // Can't view comments on private entries from other users
    if (entry.privacy_level === 'private' && entry.dog.user_id !== userId) {
      return NextResponse.json(
        { error: 'Cannot view comments on private entry' },
        { status: 403 }
      );
    }

    const [comments, totalCount] = await Promise.all([
      prisma.diaryComment.findMany({
        where: { diary_entry_id: entryId },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              avatar_url: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.diaryComment.count({ where: { diary_entry_id: entryId } })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        comments,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + comments.length < totalCount
        }
      }
    });

  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}