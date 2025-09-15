import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import webpush from 'web-push';

// Configure web-push with VAPID keys - Only if properly configured
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:notifications@woofadaar.com';

// Only set VAPID details if we have valid keys
if (vapidPublicKey && vapidPrivateKey && vapidPrivateKey.length > 10) {
  try {
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
  } catch (error) {
    console.warn('Invalid VAPID configuration, push notifications disabled:', error);
  }
}

// POST /api/push/send - Send push notification to users
export async function POST(request: NextRequest) {
  try {
    // Check if push notifications are properly configured
    if (!vapidPublicKey || !vapidPrivateKey || vapidPrivateKey.length <= 10) {
      return NextResponse.json({
        success: false,
        message: 'Push notifications not configured - VAPID keys missing'
      }, { status: 503 });
    }

    const body = await request.json();
    const { user_ids, payload } = body;

    // Validation
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'user_ids array is required'
      }, { status: 400 });
    }

    if (!payload || !payload.title || !payload.body) {
      return NextResponse.json({
        success: false,
        message: 'payload with title and body is required'
      }, { status: 400 });
    }

    // Get active push subscriptions for the users
    const subscriptions = await prisma.pushNotification.findMany({
      where: {
        user_id: { in: user_ids },
        is_active: true
      }
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active push subscriptions found for the specified users',
        data: {
          total_sent: 0,
          successful: 0,
          failed: 0,
          results: []
        }
      });
    }

    const results = [];
    let successful = 0;
    let failed = 0;

    // Send notifications to each subscription
    for (const subscription of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key || '',
            auth: subscription.auth_key || ''
          }
        };

        const notificationPayload = JSON.stringify({
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/woofadaar-logo.svg',
          badge: payload.badge || '/woofadaar-logo.svg',
          image: payload.image,
          tag: payload.tag || 'woofadaar-notification',
          url: payload.url || '/',
          data: {
            url: payload.url || '/',
            timestamp: payload.timestamp || Date.now(),
            ...payload.data
          },
          actions: payload.actions || [
            {
              action: 'open',
              title: 'Open App',
              icon: '/woofadaar-logo.svg'
            },
            {
              action: 'close',
              title: 'Dismiss'
            }
          ],
          requireInteraction: payload.urgent || payload.requireInteraction || false,
          silent: payload.silent || false,
          renotify: true
        });

        const options = {
          TTL: 60 * 60 * 24, // 24 hours
          urgency: payload.urgent ? 'high' : 'normal',
          headers: {}
        };

        await webpush.sendNotification(pushSubscription, notificationPayload, options);
        
        successful++;
        results.push({
          user_id: subscription.user_id,
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          status: 'sent',
          timestamp: new Date().toISOString()
        });

        // Log successful notification in database
        await prisma.userBehaviorAnalytics.create({
          data: {
            user_id: subscription.user_id,
            action_type: 'push_notification_sent',
            metadata: {
              title: payload.title,
              tag: payload.tag,
              endpoint_preview: subscription.endpoint.substring(0, 50)
            }
          }
        });

      } catch (error: any) {
        console.error(`Failed to send push notification to ${subscription.user_id}:`, error);
        
        failed++;
        results.push({
          user_id: subscription.user_id,
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        });

        // Handle invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription is no longer valid, deactivate it
          await prisma.pushNotification.update({
            where: { id: subscription.id },
            data: { is_active: false }
          });
        }

        // Log failed notification
        await prisma.userBehaviorAnalytics.create({
          data: {
            user_id: subscription.user_id,
            action_type: 'push_notification_failed',
            metadata: {
              title: payload.title,
              error: error.message,
              status_code: error.statusCode
            }
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Push notifications processed: ${successful} sent, ${failed} failed`,
      data: {
        total_sent: successful,
        successful,
        failed,
        results
      }
    });

  } catch (error) {
    console.error('Send push notification error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to send push notifications'
    }, { status: 500 });
  }
}

// GET /api/push/send - Get notification sending statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '24h';
    const user_id = searchParams.get('user_id');

    // Calculate time range
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const timeRangeMs = timeRanges[timeframe as keyof typeof timeRanges] || timeRanges['24h'];
    const startTime = new Date(Date.now() - timeRangeMs);

    // Build where clause
    const whereClause: any = {
      timestamp: { gte: startTime },
      action_type: { in: ['push_notification_sent', 'push_notification_failed'] }
    };

    if (user_id) {
      whereClause.user_id = user_id;
    }

    // Get notification analytics
    const notifications = await prisma.userBehaviorAnalytics.findMany({
      where: whereClause,
      select: {
        user_id: true,
        action_type: true,
        timestamp: true,
        metadata: true
      },
      orderBy: { timestamp: 'desc' },
      take: 500
    });

    // Calculate statistics
    const sent = notifications.filter(n => n.action_type === 'push_notification_sent').length;
    const failed = notifications.filter(n => n.action_type === 'push_notification_failed').length;
    const total = sent + failed;
    const successRate = total > 0 ? (sent / total) * 100 : 0;

    // Group by time periods for trend analysis
    const hourlyStats = notifications.reduce((acc: any, notification) => {
      const hour = new Date(notification.timestamp).toISOString().substring(0, 13);
      if (!acc[hour]) {
        acc[hour] = { sent: 0, failed: 0 };
      }
      if (notification.action_type === 'push_notification_sent') {
        acc[hour].sent++;
      } else {
        acc[hour].failed++;
      }
      return acc;
    }, {});

    // Get top notification types
    const notificationTypes = notifications
      .filter(n => n.metadata && (n.metadata as any).tag)
      .reduce((acc: any, n) => {
        const tag = (n.metadata as any).tag;
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {});

    const topTypes = Object.entries(notificationTypes)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        timeframe,
        period: {
          start: startTime.toISOString(),
          end: new Date().toISOString()
        },
        statistics: {
          total_notifications: total,
          successful_deliveries: sent,
          failed_deliveries: failed,
          success_rate: Math.round(successRate * 100) / 100
        },
        trends: {
          hourly_stats: hourlyStats
        },
        top_notification_types: topTypes,
        recent_notifications: notifications.slice(0, 20).map(n => ({
          user_id: n.user_id,
          type: n.action_type,
          title: (n.metadata as any)?.title,
          timestamp: n.timestamp
        }))
      }
    });

  } catch (error) {
    console.error('Get push notification stats error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve notification statistics'
    }, { status: 500 });
  }
}