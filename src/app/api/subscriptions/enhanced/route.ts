// Week 25 Phase 1: Enhanced Subscription Management API
// Comprehensive subscription lifecycle management with advanced features

import { NextRequest, NextResponse } from 'next/server';
import { subscriptionManager, ENHANCED_SUBSCRIPTION_PLANS } from '@/lib/subscription-manager';
import jwt from 'jsonwebtoken';

// GET /api/subscriptions/enhanced - Get user's subscription status
export async function GET(request: NextRequest) {
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

    const subscriptionStatus = await subscriptionManager.getUserSubscriptionStatus(userId);

    return NextResponse.json({
      success: true,
      data: {
        subscription: subscriptionStatus,
        available_plans: ENHANCED_SUBSCRIPTION_PLANS.map(plan => ({
          ...plan,
          is_current: plan.id === subscriptionStatus.plan?.id
        }))
      }
    });

  } catch (error) {
    console.error('Get subscription status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to get subscription status' 
      },
      { status: 500 }
    );
  }
}

// POST /api/subscriptions/enhanced - Create or change subscription
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

    const body = await request.json();
    const { 
      action, 
      plan_id, 
      proration_mode = 'immediate',
      payment_method_id
    } = body;

    switch (action) {
      case 'create':
        if (!plan_id) {
          return NextResponse.json(
            { success: false, message: 'Plan ID is required for subscription creation' },
            { status: 400 }
          );
        }

        const createResult = await subscriptionManager.createSubscription(
          userId,
          plan_id,
          payment_method_id,
          proration_mode
        );

        return NextResponse.json({
          success: createResult.success,
          message: createResult.message,
          data: createResult.success ? {
            subscription_id: createResult.subscriptionId,
            trial_end_date: createResult.trialEndDate,
            next_billing_date: createResult.nextBillingDate,
            proration_amount: createResult.prorationAmount
          } : null
        }, { status: createResult.success ? 201 : 400 });

      case 'change':
        if (!plan_id) {
          return NextResponse.json(
            { success: false, message: 'Plan ID is required for subscription change' },
            { status: 400 }
          );
        }

        const changeResult = await subscriptionManager.changeSubscription(
          userId,
          plan_id,
          proration_mode
        );

        return NextResponse.json({
          success: changeResult.success,
          message: changeResult.message,
          data: changeResult.success ? {
            proration_amount: changeResult.prorationAmount,
            effective_date: changeResult.effectiveDate
          } : null
        }, { status: changeResult.success ? 200 : 400 });

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action. Use "create" or "change"' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Subscription management error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Subscription management failed' 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/subscriptions/enhanced - Cancel subscription
export async function DELETE(request: NextRequest) {
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

    const body = await request.json();
    const { 
      cancel_at_period_end = true,
      cancellation_reason
    } = body;

    const result = await subscriptionManager.cancelSubscription(
      userId,
      cancel_at_period_end,
      cancellation_reason
    );

    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: result.success ? {
        effective_date: result.effectiveDate,
        refund_amount: result.refundAmount
      } : null
    }, { status: result.success ? 200 : 400 });

  } catch (error) {
    console.error('Subscription cancellation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Subscription cancellation failed' 
      },
      { status: 500 }
    );
  }
}