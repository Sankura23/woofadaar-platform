import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;
    const userId = 'userId' in user ? user.userId : user.partnerId;

    // Check if forum post exists
    const forumPost = await prisma.forumPost.findFirst({
      where: { 
        id,
        status: 'active'
      }
    });

    if (!forumPost) {
      return NextResponse.json(
        { success: false, error: 'Forum post not found' },
        { status: 404 }
      );
    }

    // Check if already bookmarked
    const existingBookmark = await prisma.postBookmark.findFirst({
      where: {
        user_id: userId,
        forum_post_id: id
      }
    });

    if (existingBookmark) {
      return NextResponse.json(
        { success: false, error: 'Post already bookmarked' },
        { status: 400 }
      );
    }

    // Create bookmark
    const bookmark = await prisma.postBookmark.create({
      data: {
        user_id: userId,
        forum_post_id: id
      }
    });

    return NextResponse.json({
      success: true,
      data: { bookmark },
      message: 'Post bookmarked successfully'
    });
  } catch (error) {
    console.error('Error bookmarking post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to bookmark post' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;
    const userId = 'userId' in user ? user.userId : user.partnerId;

    // Find and delete bookmark
    const deletedBookmark = await prisma.postBookmark.deleteMany({
      where: {
        user_id: userId,
        forum_post_id: id
      }
    });

    if (deletedBookmark.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Bookmark not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bookmark removed successfully'
    });
  } catch (error) {
    console.error('Error removing bookmark:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove bookmark' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;
    const userId = 'userId' in user ? user.userId : user.partnerId;

    // Check bookmark status
    const bookmark = await prisma.postBookmark.findFirst({
      where: {
        user_id: userId,
        forum_post_id: id
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        isBookmarked: !!bookmark,
        bookmark
      }
    });
  } catch (error) {
    console.error('Error checking bookmark status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check bookmark status' },
      { status: 500 }
    );
  }
}