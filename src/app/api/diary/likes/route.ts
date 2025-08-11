import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken, getTokenFromRequest, isPetParent } from '@/lib/auth';

// POST /api/diary/likes - Toggle like on diary entry
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
    const { entry_id } = body;

    if (!entry_id) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
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

    // Can't like private entries from other users
    if (entry.privacy_level === 'private' && entry.dog.user_id !== userId) {
      return NextResponse.json(
        { error: 'Cannot like private entry' },
        { status: 403 }
      );
    }

    // For now, just increment the likes count
    // TODO: Implement proper likes tracking with separate table
    const updatedEntry = await prisma.diaryEntry.update({
      where: { id: entry_id },
      data: {
        likes_count: {
          increment: 1
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Entry liked',
      data: { 
        liked: true,
        likes_count: updatedEntry.likes_count
      }
    });

  } catch (error) {
    console.error('Error toggling diary like:', error);
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    );
  }
}