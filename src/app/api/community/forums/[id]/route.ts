import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const post = await prisma.forumPost.findFirst({
      where: { 
        id,
        status: 'active'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true
          }
        },
        _count: {
          select: {
            comments: {
              where: { status: 'active' }
            }
          }
        }
      }
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Forum post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { post }
    });
  } catch (error) {
    console.error('Error fetching forum post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch forum post' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const body = await request.json();
    const { title, content, tags, categoryId } = body;

    // Check if post exists and user owns it
    const existingPost = await prisma.forumPost.findFirst({
      where: { 
        id,
        user_id: 'userId' in user ? user.userId : user.partnerId
      }
    });

    if (!existingPost) {
      return NextResponse.json(
        { success: false, error: 'Forum post not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update the post
    const updatedPost = await prisma.forumPost.update({
      where: { id },
      data: {
        title,
        content,
        tags: tags || existingPost.tags,
        category_id: categoryId || existingPost.category_id,
        updated_at: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: { post: updatedPost }
    });
  } catch (error) {
    console.error('Error updating forum post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update forum post' },
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

    // Check if post exists and user owns it
    const existingPost = await prisma.forumPost.findFirst({
      where: { 
        id,
        user_id: 'userId' in user ? user.userId : user.partnerId
      }
    });

    if (!existingPost) {
      return NextResponse.json(
        { success: false, error: 'Forum post not found or unauthorized' },
        { status: 404 }
      );
    }

    // Soft delete by updating status
    await prisma.forumPost.update({
      where: { id },
      data: { status: 'deleted' }
    });

    // Update category post count
    await prisma.forumCategory.update({
      where: { id: existingPost.category_id },
      data: { post_count: { decrement: 1 } }
    });

    return NextResponse.json({
      success: true,
      message: 'Forum post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting forum post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete forum post' },
      { status: 500 }
    );
  }
}