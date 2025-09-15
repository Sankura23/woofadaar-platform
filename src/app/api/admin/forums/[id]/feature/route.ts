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

    // Check if user has admin/moderator permissions
    // This is a placeholder - implement your own role checking logic
    
    const { id } = params;
    const body = await request.json();
    const { action } = body; // 'feature', 'unfeature', 'pin', 'unpin'

    if (!['feature', 'unfeature', 'pin', 'unpin'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Find the forum post
    const post = await prisma.forumPost.findUnique({
      where: { id }
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Forum post not found' },
        { status: 404 }
      );
    }

    // Update the post
    const updateData: any = {};
    switch (action) {
      case 'feature':
        updateData.is_featured = true;
        break;
      case 'unfeature':
        updateData.is_featured = false;
        break;
      case 'pin':
        updateData.is_pinned = true;
        break;
      case 'unpin':
        updateData.is_pinned = false;
        break;
    }

    const updatedPost = await prisma.forumPost.update({
      where: { id },
      data: {
        ...updateData,
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

    // Log the action
    const moderatorId = 'userId' in user ? user.userId : user.partnerId;
    await prisma.moderationAction.create({
      data: {
        moderator_id: moderatorId,
        target_id: id,
        target_type: 'forum_post',
        action_type: action,
        reason: `Post ${action}d by moderator`,
        is_automated: false
      }
    });

    // Award points if featuring (positive action)
    if (action === 'feature') {
      await prisma.userEngagement.create({
        data: {
          user_id: post.user_id,
          action_type: 'post_featured',
          points_earned: 20,
          description: `Your post "${post.title}" was featured!`,
          related_id: post.id,
          related_type: 'forum_post'
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: { post: updatedPost },
      message: `Post ${action}d successfully`
    });
  } catch (error) {
    console.error('Error featuring/pinning post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update post status' },
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

    // Find and soft delete the forum post
    const post = await prisma.forumPost.findUnique({
      where: { id }
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Forum post not found' },
        { status: 404 }
      );
    }

    await prisma.forumPost.update({
      where: { id },
      data: { status: 'removed' }
    });

    // Log the action
    const moderatorId = 'userId' in user ? user.userId : user.partnerId;
    await prisma.moderationAction.create({
      data: {
        moderator_id: moderatorId,
        target_id: id,
        target_type: 'forum_post',
        action_type: 'remove',
        reason: 'Post removed by moderator',
        is_automated: false
      }
    });

    // Update category post count
    await prisma.forumCategory.update({
      where: { id: post.category_id },
      data: { post_count: { decrement: 1 } }
    });

    return NextResponse.json({
      success: true,
      message: 'Post removed successfully'
    });
  } catch (error) {
    console.error('Error removing post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove post' },
      { status: 500 }
    );
  }
}