import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// POST /api/push/schedule - Schedule a push notification for later delivery
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, payload, scheduled_for } = body;

    // Validation
    if (!user_id || !payload || !scheduled_for) {
      return NextResponse.json({
        success: false,
        message: 'user_id, payload, and scheduled_for are required'
      }, { status: 400 });
    }

    if (!payload.title || !payload.body) {
      return NextResponse.json({
        success: false,
        message: 'payload must include title and body'
      }, { status: 400 });
    }

    const scheduledTime = new Date(scheduled_for);
    if (scheduledTime <= new Date()) {
      return NextResponse.json({
        success: false,
        message: 'scheduled_for must be in the future'
      }, { status: 400 });
    }

    // Create scheduled notification record
    const scheduledNotification = await prisma.pushNotification.create({
      data: {
        user_id,
        endpoint: 'scheduled', // Special marker for scheduled notifications
        p256dh_key: null,
        auth_key: null,
        user_agent: 'Scheduled Notification',
        is_active: true,
        metadata: {
          type: 'scheduled',
          payload,
          scheduled_for: scheduledTime.toISOString(),
          created_at: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Notification scheduled successfully',
      data: {
        schedule_id: scheduledNotification.id,
        user_id,
        scheduled_for: scheduledTime.toISOString(),
        payload: {
          title: payload.title,
          body: payload.body
        }
      }
    });

  } catch (error) {
    console.error('Schedule push notification error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to schedule push notification'
    }, { status: 500 });
  }
}

// GET /api/push/schedule - Get scheduled notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const status = searchParams.get('status') || 'pending'; // pending, sent, cancelled

    const whereClause: any = {
      endpoint: 'scheduled',
      is_active: status === 'pending'
    };

    if (user_id) {
      whereClause.user_id = user_id;
    }

    const scheduledNotifications = await prisma.pushNotification.findMany({
      where: whereClause,
      select: {
        id: true,
        user_id: true,
        metadata: true,
        created_at: true,
        updated_at: true,
        is_active: true
      },
      orderBy: { created_at: 'desc' },
      take: 100
    });

    // Filter and format scheduled notifications
    const formattedNotifications = scheduledNotifications
      .filter(n => n.metadata && (n.metadata as any).type === 'scheduled')
      .map(n => {
        const meta = n.metadata as any;
        return {
          schedule_id: n.id,
          user_id: n.user_id,
          payload: meta.payload,
          scheduled_for: meta.scheduled_for,
          status: n.is_active ? 'pending' : 'cancelled',
          created_at: n.created_at,
          updated_at: n.updated_at
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        scheduled_notifications: formattedNotifications,
        total_count: formattedNotifications.length
      }
    });

  } catch (error) {
    console.error('Get scheduled notifications error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve scheduled notifications'
    }, { status: 500 });
  }
}

// DELETE /api/push/schedule - Cancel scheduled notification
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schedule_id = searchParams.get('schedule_id');
    const user_id = searchParams.get('user_id');

    if (!schedule_id) {
      return NextResponse.json({
        success: false,
        message: 'schedule_id is required'
      }, { status: 400 });
    }

    // Build where clause
    const whereClause: any = {
      id: schedule_id,
      endpoint: 'scheduled'
    };

    if (user_id) {
      whereClause.user_id = user_id;
    }

    // Cancel the scheduled notification
    const result = await prisma.pushNotification.updateMany({
      where: whereClause,
      data: {
        is_active: false,
        updated_at: new Date()
      }
    });

    if (result.count === 0) {
      return NextResponse.json({
        success: false,
        message: 'Scheduled notification not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduled notification cancelled successfully',
      data: {
        cancelled_count: result.count
      }
    });

  } catch (error) {
    console.error('Cancel scheduled notification error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to cancel scheduled notification'
    }, { status: 500 });
  }
}

// PUT /api/push/schedule - Update scheduled notification
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { schedule_id, payload, scheduled_for, user_id } = body;

    if (!schedule_id) {
      return NextResponse.json({
        success: false,
        message: 'schedule_id is required'
      }, { status: 400 });
    }

    // Find existing scheduled notification
    const whereClause: any = {
      id: schedule_id,
      endpoint: 'scheduled',
      is_active: true
    };

    if (user_id) {
      whereClause.user_id = user_id;
    }

    const existingNotification = await prisma.pushNotification.findFirst({
      where: whereClause
    });

    if (!existingNotification || !existingNotification.metadata) {
      return NextResponse.json({
        success: false,
        message: 'Scheduled notification not found'
      }, { status: 404 });
    }

    const currentMeta = existingNotification.metadata as any;
    
    // Update the metadata
    const updatedMeta = {
      ...currentMeta,
      payload: payload || currentMeta.payload,
      scheduled_for: scheduled_for || currentMeta.scheduled_for,
      updated_at: new Date().toISOString()
    };

    // Validate new scheduled time if provided
    if (scheduled_for) {
      const newScheduledTime = new Date(scheduled_for);
      if (newScheduledTime <= new Date()) {
        return NextResponse.json({
          success: false,
          message: 'scheduled_for must be in the future'
        }, { status: 400 });
      }
    }

    // Update the scheduled notification
    const updatedNotification = await prisma.pushNotification.update({
      where: { id: schedule_id },
      data: {
        metadata: updatedMeta,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Scheduled notification updated successfully',
      data: {
        schedule_id: updatedNotification.id,
        payload: updatedMeta.payload,
        scheduled_for: updatedMeta.scheduled_for,
        updated_at: updatedNotification.updated_at
      }
    });

  } catch (error) {
    console.error('Update scheduled notification error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update scheduled notification'
    }, { status: 500 });
  }
}