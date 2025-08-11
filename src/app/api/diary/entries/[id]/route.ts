import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken, getTokenFromRequest, isPetParent } from '@/lib/auth';

// GET /api/diary/entries/[id] - Get specific diary entry
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { id } = params;

    const entry = await prisma.diaryEntry.findUnique({
      where: { id },
      include: {
        dog: {
          select: {
            id: true,
            name: true,
            breed: true,
            photo_url: true,
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar_url: true
              }
            }
          }
        },
        comments: {
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
          take: 20
        }
      }
    });

    if (!entry) {
      return NextResponse.json(
        { error: 'Diary entry not found' },
        { status: 404 }
      );
    }

    // Check if private entry belongs to user
    if (entry.privacy_level === 'private' && entry.dog.user.id !== userId) {
      return NextResponse.json(
        { error: 'Access denied to private entry' },
        { status: 403 }
      );
    }

    const formattedEntry = {
      ...entry,
      isLiked: false, // TODO: Implement likes
      likesCount: entry.likes_count || 0,
      commentsCount: entry.comments_count || 0,
      is_private: entry.privacy_level === 'private',
      mood: entry.mood_emoji
    };

    return NextResponse.json({
      success: true,
      data: { entry: formattedEntry }
    });

  } catch (error) {
    console.error('Error fetching diary entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch diary entry' },
      { status: 500 }
    );
  }
}

// PUT /api/diary/entries/[id] - Update diary entry
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { id } = params;
    const body = await request.json();

    const {
      title,
      content,
      entry_type,
      photos,
      milestone_type,
      mood,
      weather,
      location,
      tags,
      privacy_level
    } = body;

    // Verify entry ownership
    const entry = await prisma.diaryEntry.findFirst({
      where: {
        id,
        dog: {
          user_id: userId
        }
      }
    });

    if (!entry) {
      return NextResponse.json(
        { error: 'Diary entry not found or access denied' },
        { status: 404 }
      );
    }

    // Update entry
    const updatedEntry = await prisma.diaryEntry.update({
      where: { id },
      data: {
        title: title || entry.title,
        content: content || entry.content,
        entry_type: entry_type || entry.entry_type,
        photos: photos || entry.photos,
        milestone_type: milestone_type || entry.milestone_type,
        mood_emoji: mood || entry.mood_emoji,
        weather: weather || entry.weather,
        location: location || entry.location,
        tags: tags || entry.tags,
        privacy_level: privacy_level || entry.privacy_level,
        updated_at: new Date()
      },
      include: {
        dog: {
          select: {
            id: true,
            name: true,
            breed: true,
            photo_url: true
          }
        },
        comments: {
          select: {
            id: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Diary entry updated successfully',
      data: { entry: updatedEntry }
    });

  } catch (error) {
    console.error('Error updating diary entry:', error);
    return NextResponse.json(
      { error: 'Failed to update diary entry' },
      { status: 500 }
    );
  }
}

// DELETE /api/diary/entries/[id] - Delete diary entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { id } = params;

    // Verify entry ownership
    const entry = await prisma.diaryEntry.findFirst({
      where: {
        id,
        dog: {
          user_id: userId
        }
      }
    });

    if (!entry) {
      return NextResponse.json(
        { error: 'Diary entry not found or access denied' },
        { status: 404 }
      );
    }

    // Delete entry and related data
    await prisma.$transaction([
      prisma.diaryComment.deleteMany({ where: { diary_entry_id: id } }),
      prisma.diaryEntry.delete({ where: { id } })
    ]);

    return NextResponse.json({
      success: true,
      message: 'Diary entry deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting diary entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete diary entry' },
      { status: 500 }
    );
  }
}