// Week 20 Phase 3: Advanced Notification Service for Forum Interactions
// Handles mentions, replies, subscriptions, and real-time updates

import prisma from '@/lib/db';

export interface NotificationData {
  userId: string;
  title: string;
  body: string;
  type: 'mention' | 'reply' | 'forum_post' | 'featured' | 'digest' | 'subscription';
  actionUrl?: string;
  metadata?: any;
}

export interface MentionNotification {
  mentionedUserId: string;
  mentionerUserId: string;
  mentionerName: string;
  contentType: 'forum_post' | 'comment';
  contentId: string;
  contentTitle?: string;
  contentPreview: string;
}

export interface ReplyNotification {
  originalAuthorId: string;
  replierUserId: string;
  replierName: string;
  contentType: 'forum_post' | 'comment';
  contentId: string;
  parentContentId: string;
  contentTitle?: string;
  replyPreview: string;
}

export interface SubscriptionNotification {
  subscriberIds: string[];
  actorUserId: string;
  actorName: string;
  actionType: 'new_comment' | 'new_reply';
  topicId: string;
  topicTitle: string;
  contentPreview: string;
}

export class ForumNotificationService {
  /**
   * Send notification when user is mentioned in content
   */
  static async sendMentionNotification(data: MentionNotification): Promise<void> {
    try {
      // Don't notify self-mentions
      if (data.mentionedUserId === data.mentionerUserId) return;

      const actionUrl = data.contentType === 'forum_post' 
        ? `/community/forums/${data.contentId}`
        : `/community/forums/${data.parentContentId || data.contentId}`;

      await this.createNotification({
        userId: data.mentionedUserId,
        title: `${data.mentionerName} mentioned you`,
        body: `In "${data.contentTitle || 'a discussion'}": ${this.truncateText(data.contentPreview, 100)}`,
        type: 'mention',
        actionUrl,
        metadata: {
          mentioner_id: data.mentionerUserId,
          mentioner_name: data.mentionerName,
          content_type: data.contentType,
          content_id: data.contentId,
          content_title: data.contentTitle
        }
      });

      console.log(`📩 Mention notification sent to user ${data.mentionedUserId}`);
    } catch (error) {
      console.error('Error sending mention notification:', error);
    }
  }

  /**
   * Send notification when someone replies to user's content
   */
  static async sendReplyNotification(data: ReplyNotification): Promise<void> {
    try {
      // Don't notify self-replies
      if (data.originalAuthorId === data.replierUserId) return;

      const actionUrl = data.contentType === 'forum_post' 
        ? `/community/forums/${data.contentId}`
        : `/community/forums/${data.parentContentId || data.contentId}`;

      const contentType = data.contentType === 'forum_post' ? 'post' : 'comment';

      await this.createNotification({
        userId: data.originalAuthorId,
        title: `${data.replierName} replied to your ${contentType}`,
        body: `In "${data.contentTitle || 'a discussion'}": ${this.truncateText(data.replyPreview, 100)}`,
        type: 'reply',
        actionUrl,
        metadata: {
          replier_id: data.replierUserId,
          replier_name: data.replierName,
          content_type: data.contentType,
          content_id: data.contentId,
          parent_content_id: data.parentContentId,
          content_title: data.contentTitle
        }
      });

      console.log(`💬 Reply notification sent to user ${data.originalAuthorId}`);
    } catch (error) {
      console.error('Error sending reply notification:', error);
    }
  }

  /**
   * Send notifications to topic subscribers
   */
  static async sendSubscriptionNotifications(data: SubscriptionNotification): Promise<void> {
    try {
      // Filter out the actor from subscribers
      const subscribersToNotify = data.subscriberIds.filter(id => id !== data.actorUserId);
      
      if (subscribersToNotify.length === 0) return;

      const actionUrl = `/community/forums/${data.topicId}`;
      const actionText = data.actionType === 'new_comment' ? 'commented on' : 'replied in';

      // Create notifications for all subscribers
      const notifications = subscribersToNotify.map(subscriberId => ({
        userId: subscriberId,
        title: `New activity in "${data.topicTitle}"`,
        body: `${data.actorName} ${actionText}: ${this.truncateText(data.contentPreview, 100)}`,
        type: 'subscription' as const,
        actionUrl,
        metadata: {
          actor_id: data.actorUserId,
          actor_name: data.actorName,
          action_type: data.actionType,
          topic_id: data.topicId,
          topic_title: data.topicTitle
        }
      }));

      // Batch create notifications
      await Promise.all(notifications.map(notification => this.createNotification(notification)));

      console.log(`🔔 Subscription notifications sent to ${subscribersToNotify.length} users`);
    } catch (error) {
      console.error('Error sending subscription notifications:', error);
    }
  }

  /**
   * Send notification when post is featured
   */
  static async sendFeaturedPostNotification(userId: string, postId: string, postTitle: string): Promise<void> {
    try {
      await this.createNotification({
        userId,
        title: '🌟 Your post was featured!',
        body: `Your post "${postTitle}" was selected as a featured discussion. Great work!`,
        type: 'featured',
        actionUrl: `/community/forums/${postId}`,
        metadata: {
          post_id: postId,
          post_title: postTitle,
          points_awarded: 20
        }
      });

      console.log(`⭐ Featured post notification sent to user ${userId}`);
    } catch (error) {
      console.error('Error sending featured post notification:', error);
    }
  }

  /**
   * Create and store notification in database
   */
  private static async createNotification(data: NotificationData): Promise<void> {
    await prisma.pushNotification.create({
      data: {
        user_id: data.userId,
        title: data.title,
        body: data.body,
        type: data.type,
        action_url: data.actionUrl,
        status: 'pending',
        metadata: data.metadata || {}
      }
    });
  }

  /**
   * Get unread notifications for a user
   */
  static async getUserNotifications(userId: string, limit = 10): Promise<any[]> {
    return await prisma.pushNotification.findMany({
      where: {
        user_id: userId,
        status: { in: ['pending', 'delivered'] }
      },
      orderBy: { created_at: 'desc' },
      take: limit
    });
  }

  /**
   * Mark notifications as read/clicked
   */
  static async markNotificationsRead(userId: string, notificationIds?: string[]): Promise<void> {
    const where: any = { user_id: userId };
    if (notificationIds) {
      where.id = { in: notificationIds };
    }

    await prisma.pushNotification.updateMany({
      where,
      data: {
        clicked_at: new Date(),
        status: 'clicked'
      }
    });
  }

  /**
   * Get notification count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return await prisma.pushNotification.count({
      where: {
        user_id: userId,
        status: { in: ['pending', 'delivered'] }
      }
    });
  }

  /**
   * Helper function to truncate text
   */
  private static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Send weekly digest notifications
   */
  static async sendWeeklyDigest(): Promise<void> {
    try {
      // Get all users with notification preferences enabled
      const users = await prisma.user.findMany({
        where: {
          status: 'active',
          // Add notification preference check here when implemented
        },
        select: {
          id: true,
          name: true,
          email: true
        }
      });

      // Get popular posts from the last week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const popularPosts = await prisma.forumPost.findMany({
        where: {
          created_at: { gte: oneWeekAgo },
          status: 'active'
        },
        include: {
          user: {
            select: { name: true }
          },
          category: {
            select: { name: true, icon: true }
          }
        },
        orderBy: [
          { like_count: 'desc' },
          { comment_count: 'desc' },
          { view_count: 'desc' }
        ],
        take: 5
      });

      if (popularPosts.length === 0) {
        console.log('No popular posts this week, skipping digest');
        return;
      }

      // Create digest notifications for all users
      const digestNotifications = users.map(user => ({
        userId: user.id,
        title: '📬 Weekly Community Digest',
        body: `Check out this week's most popular discussions! ${popularPosts.length} trending topics await you.`,
        type: 'digest' as const,
        actionUrl: '/community/forums',
        metadata: {
          popular_posts: popularPosts.map(post => ({
            id: post.id,
            title: post.title,
            category: post.category.name,
            author: post.user.name,
            engagement: post.like_count + post.comment_count
          })),
          week_start: oneWeekAgo.toISOString(),
          week_end: new Date().toISOString()
        }
      }));

      // Batch create digest notifications
      await Promise.all(digestNotifications.map(notification => this.createNotification(notification)));

      console.log(`📰 Weekly digest sent to ${users.length} users`);
    } catch (error) {
      console.error('Error sending weekly digest:', error);
    }
  }
}

// Export individual functions for easy importing
export const {
  sendMentionNotification,
  sendReplyNotification,
  sendSubscriptionNotifications,
  sendFeaturedPostNotification,
  getUserNotifications,
  markNotificationsRead,
  getUnreadCount,
  sendWeeklyDigest
} = ForumNotificationService;