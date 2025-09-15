import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ForumNotificationService } from '@/lib/notification-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const comments = await prisma.communityComment.findMany({
      where: { 
        forum_post_id: id,
        status: 'active'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        }
      },
      orderBy: [
        { created_at: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: { comments }
    });
  } catch (error) {
    console.error('Error fetching forum comments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch forum comments' },
      { status: 500 }
    );
  }
}

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
    const { content, parent_comment_id } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: 'Comment content is required' },
        { status: 400 }
      );
    }

    // Check if forum post exists and is not locked
    const forumPost = await prisma.forumPost.findFirst({
      where: { 
        id,
        status: 'active',
        is_locked: false
      }
    });

    if (!forumPost) {
      return NextResponse.json(
        { success: false, error: 'Forum post not found or locked' },
        { status: 404 }
      );
    }

    // Extract mentioned users from content (@username)
    const mentionRegex = /@(\w+)/g;
    const mentionedUsernames: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentionedUsernames.push(match[1]);
    }

    // Get mentioned user IDs
    const mentionedUsers = mentionedUsernames.length > 0 ? 
      await prisma.user.findMany({
        where: {
          name: { in: mentionedUsernames, mode: 'insensitive' }
        },
        select: { id: true }
      }) : [];

    const mentionedUserIds = mentionedUsers.map(u => u.id);

    // Create the comment
    const comment = await prisma.communityComment.create({
      data: {
        user_id: 'userId' in user ? user.userId : user.partnerId,
        forum_post_id: id,
        parent_comment_id: parent_comment_id || null,
        content: content.trim(),
        mentioned_users: mentionedUserIds
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        }
      }
    });

    // Update forum post comment count
    await prisma.forumPost.update({
      where: { id },
      data: { comment_count: { increment: 1 } }
    });

    // Update parent comment reply count if this is a reply
    if (parent_comment_id) {
      await prisma.communityComment.update({
        where: { id: parent_comment_id },
        data: { reply_count: { increment: 1 } }
      });
    }

    // Award points for forum participation
    await prisma.userEngagement.create({
      data: {
        user_id: 'userId' in user ? user.userId : user.partnerId,
        action_type: 'forum_comment',
        points_earned: 3,
        description: `Commented on forum post: ${forumPost.title}`,
        related_id: comment.id,
        related_type: 'forum_comment'
      }
    });

    // Send notifications for mentions
    if (mentionedUserIds.length > 0) {
      mentionedUserIds.forEach(async (mentionedUserId) => {
        await ForumNotificationService.sendMentionNotification({
          mentionedUserId,
          mentionerUserId: 'userId' in user ? user.userId : user.partnerId,
          mentionerName: 'name' in user ? user.name : 'User', // You may need to fetch user name
          contentType: 'comment',
          contentId: comment.id,
          parentContentId: id,
          contentTitle: forumPost.title,
          contentPreview: content.trim()
        });
      });
    }

    // Send notification to post author for top-level comments (not replies)
    if (!parent_comment_id && forumPost.user_id !== ('userId' in user ? user.userId : user.partnerId)) {
      await ForumNotificationService.sendReplyNotification({
        originalAuthorId: forumPost.user_id,
        replierUserId: 'userId' in user ? user.userId : user.partnerId,
        replierName: 'name' in user ? user.name : 'User', // You may need to fetch user name
        contentType: 'forum_post',
        contentId: id,
        parentContentId: id,
        contentTitle: forumPost.title,
        replyPreview: content.trim()
      });
    }

    // Send notification to parent comment author for replies
    if (parent_comment_id) {
      const parentComment = await prisma.communityComment.findUnique({
        where: { id: parent_comment_id },
        select: { user_id: true }
      });
      
      if (parentComment && parentComment.user_id !== ('userId' in user ? user.userId : user.partnerId)) {
        await ForumNotificationService.sendReplyNotification({
          originalAuthorId: parentComment.user_id,
          replierUserId: 'userId' in user ? user.userId : user.partnerId,
          replierName: 'name' in user ? user.name : 'User', // You may need to fetch user name
          contentType: 'comment',
          contentId: comment.id,
          parentContentId: id,
          contentTitle: forumPost.title,
          replyPreview: content.trim()
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { comment }
    });
  } catch (error) {
    console.error('Error creating forum comment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create forum comment' },
      { status: 500 }
    );
  }
}