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

    // Check if already subscribed
    const existingSubscription = await prisma.topicSubscription.findFirst({
      where: {
        user_id: userId,
        forum_post_id: id
      }
    });

    if (existingSubscription) {
      return NextResponse.json(
        { success: false, error: 'Already subscribed to this topic' },
        { status: 400 }
      );
    }

    // Create subscription
    const subscription = await prisma.topicSubscription.create({
      data: {
        user_id: userId,
        forum_post_id: id,
        notification_enabled: true
      }
    });

    return NextResponse.json({
      success: true,
      data: { subscription },
      message: 'Successfully subscribed to topic'
    });
  } catch (error) {
    console.error('Error subscribing to topic:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to subscribe to topic' },
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

    // Find and delete subscription
    const deletedSubscription = await prisma.topicSubscription.deleteMany({
      where: {
        user_id: userId,
        forum_post_id: id
      }
    });

    if (deletedSubscription.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from topic'
    });
  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unsubscribe from topic' },
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

    // Check subscription status
    const subscription = await prisma.topicSubscription.findFirst({
      where: {
        user_id: userId,
        forum_post_id: id
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        isSubscribed: !!subscription,
        subscription
      }
    });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check subscription status' },
      { status: 500 }
    );
  }
}