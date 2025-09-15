import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user's current active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: { in: ['active', 'trialing'] }
      },
      orderBy: { created_at: 'desc' }
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, message: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Update subscription to cancelled but keep active until end date
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        auto_renew: false, // Prevent auto-renewal
        status: subscription.status === 'trialing' ? 'cancelled' : 'active', // Cancel trial immediately, keep paid active
        updated_at: new Date(),
        metadata: JSON.stringify({
          ...JSON.parse(subscription.metadata || '{}'),
          cancelled_at: new Date().toISOString(),
          cancelled_by_user: true
        })
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: {
        subscription_id: subscription.id,
        effective_date: subscription.end_date,
        message: subscription.status === 'trialing' 
          ? 'Trial cancelled immediately' 
          : 'Subscription will remain active until ' + new Date(subscription.end_date).toLocaleDateString()
      }
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to cancel subscription' 
      },
      { status: 500 }
    );
  }
}