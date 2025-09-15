import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// POST /api/push/subscribe - Subscribe user to push notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      endpoint,
      p256dh_key,
      auth_key,
      user_agent
    } = body;

    // Validation
    if (!user_id || !endpoint) {
      return NextResponse.json({
        success: false,
        message: 'user_id and endpoint are required'
      }, { status: 400 });
    }

    // Check if subscription already exists
    const existingSubscription = await prisma.pushNotification.findFirst({
      where: {
        user_id,
        endpoint
      }
    });

    if (existingSubscription) {
      // Update existing subscription
      const updatedSubscription = await prisma.pushNotification.update({
        where: { id: existingSubscription.id },
        data: {
          p256dh_key,
          auth_key,
          user_agent,
          is_active: true,
          updated_at: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Push subscription updated successfully',
        data: {
          subscription_id: updatedSubscription.id,
          endpoint: updatedSubscription.endpoint
        }
      });
    }

    // Create new subscription
    const newSubscription = await prisma.pushNotification.create({
      data: {
        user_id,
        endpoint,
        p256dh_key,
        auth_key,
        user_agent: user_agent || 'Unknown',
        is_active: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Push subscription created successfully',
      data: {
        subscription_id: newSubscription.id,
        endpoint: newSubscription.endpoint,
        created_at: newSubscription.created_at
      }
    });

  } catch (error) {
    console.error('Push subscription error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create push subscription'
    }, { status: 500 });
  }
}

// GET /api/push/subscribe - Get user's push subscriptions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) {
      return NextResponse.json({
        success: false,
        message: 'user_id is required'
      }, { status: 400 });
    }

    const subscriptions = await prisma.pushNotification.findMany({
      where: {
        user_id,
        is_active: true
      },
      select: {
        id: true,
        endpoint: true,
        user_agent: true,
        created_at: true,
        updated_at: true
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: {
        subscriptions,
        total_count: subscriptions.length
      }
    });

  } catch (error) {
    console.error('Get push subscriptions error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve push subscriptions'
    }, { status: 500 });
  }
}

// DELETE /api/push/subscribe - Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const endpoint = searchParams.get('endpoint');

    if (!user_id) {
      return NextResponse.json({
        success: false,
        message: 'user_id is required'
      }, { status: 400 });
    }

    let whereClause: any = { user_id };
    if (endpoint) {
      whereClause.endpoint = endpoint;
    }

    // Deactivate subscriptions
    const result = await prisma.pushNotification.updateMany({
      where: whereClause,
      data: {
        is_active: false,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Push subscription(s) deactivated successfully',
      data: {
        deactivated_count: result.count
      }
    });

  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to unsubscribe from push notifications'
    }, { status: 500 });
  }
}