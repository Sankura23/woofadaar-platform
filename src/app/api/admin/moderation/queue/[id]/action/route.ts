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
    const body = await request.json();
    const { action, notes } = body;

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be approve or reject.' },
        { status: 400 }
      );
    }

    // Find the moderation queue item
    const moderationItem = await prisma.moderationQueue.findUnique({
      where: { id }
    });

    if (!moderationItem) {
      return NextResponse.json(
        { success: false, error: 'Moderation item not found' },
        { status: 404 }
      );
    }

    if (moderationItem.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Item has already been processed' },
        { status: 400 }
      );
    }

    const moderatorId = 'userId' in user ? user.userId : user.partnerId;

    // Update the moderation queue item
    const updatedItem = await prisma.moderationQueue.update({
      where: { id },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        moderator_id: moderatorId,
        moderator_notes: notes || null,
        action_taken: action,
        processed_at: new Date()
      }
    });

    // Log the moderation action
    await prisma.moderationAction.create({
      data: {
        moderator_id: moderatorId,
        target_id: moderationItem.item_id,
        target_type: moderationItem.item_type,
        action_type: action,
        reason: notes || `${action} via moderation dashboard`,
        is_automated: false
      }
    });

    // If rejecting, take action on the content
    if (action === 'reject') {
      try {
        switch (moderationItem.item_type) {
          case 'forum_post':
            await prisma.forumPost.update({
              where: { id: moderationItem.item_id },
              data: { status: 'removed' }
            });
            break;

          case 'comment':
            await prisma.communityComment.update({
              where: { id: moderationItem.item_id },
              data: { status: 'removed' }
            });
            break;

          case 'question':
            await prisma.communityQuestion.update({
              where: { id: moderationItem.item_id },
              data: { status: 'removed' }
            });
            break;

          case 'answer':
            await prisma.communityAnswer.update({
              where: { id: moderationItem.item_id },
              data: { status: 'removed' }
            });
            break;
        }
      } catch (error) {
        console.error('Error removing content:', error);
        // Continue even if content removal fails
      }
    }

    return NextResponse.json({
      success: true,
      data: { item: updatedItem },
      message: `Content ${action}d successfully`
    });
  } catch (error) {
    console.error('Error processing moderation action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process moderation action' },
      { status: 500 }
    );
  }
}