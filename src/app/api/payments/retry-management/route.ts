// Week 25 Phase 1: Payment Retry Management API
// Advanced payment retry and dunning management endpoints

import { NextRequest, NextResponse } from 'next/server';
import { paymentRetryService } from '@/lib/payment-retry-service';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

// GET /api/payments/retry-management - Get payment retry status for user
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

    // Get user's active subscriptions
    const subscriptions = await prisma.subscription.findMany({
      where: {
        user_id: userId,
        status: { in: ['active', 'past_due', 'payment_failed'] }
      },
      include: {
        payments: {
          where: { status: 'failed' },
          orderBy: { created_at: 'desc' },
          take: 5
        }
      }
    });

    // Get retry attempts for user's subscriptions
    const retryAttempts = await prisma.paymentRetry.findMany({
      where: {
        subscription: {
          user_id: userId
        },
        created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      },
      orderBy: { created_at: 'desc' },
      include: {
        subscription: {
          select: { id: true, plan_type: true, status: true }
        }
      }
    });

    // Get active dunning campaigns
    const dunningCampaigns = await prisma.dunningCampaign.findMany({
      where: {
        user_id: userId,
        status: 'active'
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: {
        subscriptions: subscriptions.map(sub => ({
          id: sub.id,
          plan_type: sub.plan_type,
          status: sub.status,
          failed_payments_count: sub.payments.length,
          last_failed_payment: sub.payments[0] || null
        })),
        retry_attempts: retryAttempts.map(retry => ({
          id: retry.id,
          subscription_id: retry.subscription_id,
          attempt_number: retry.attempt_number,
          scheduled_at: retry.scheduled_at,
          attempted_at: retry.attempted_at,
          status: retry.status,
          retry_method: retry.retry_method,
          grace_period_active: retry.grace_period_active,
          failure_reason: retry.failure_reason,
          subscription: retry.subscription
        })),
        dunning_campaigns: dunningCampaigns.map(campaign => ({
          id: campaign.id,
          campaign_type: campaign.campaign_type,
          current_step: campaign.current_step,
          total_steps: campaign.total_steps,
          next_action_date: campaign.next_action_date,
          communications_sent: campaign.communications_sent,
          response_received: campaign.response_received
        })),
        summary: {
          has_payment_issues: subscriptions.some(sub => sub.status === 'past_due' || sub.status === 'payment_failed'),
          total_failed_payments: subscriptions.reduce((sum, sub) => sum + sub.payments.length, 0),
          active_retry_attempts: retryAttempts.filter(retry => retry.status === 'scheduled').length,
          active_dunning_campaigns: dunningCampaigns.length
        }
      }
    });

  } catch (error) {
    console.error('Get retry management error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to get retry management data' 
      },
      { status: 500 }
    );
  }
}

// POST /api/payments/retry-management - Handle payment failure or trigger manual retry
export async function POST(request: NextRequest) {
  try {
    // Admin authentication (payment team only)
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // In production, you'd verify admin/staff role here
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
      payment_id,
      subscription_id,
      failure_reason,
      error_code,
      retry_id
    } = body;

    switch (action) {
      case 'handle_failure':
        if (!payment_id || !subscription_id) {
          return NextResponse.json(
            { success: false, message: 'payment_id and subscription_id are required' },
            { status: 400 }
          );
        }

        const failureResult = await paymentRetryService.handlePaymentFailure(
          payment_id,
          subscription_id,
          failure_reason || 'Manual failure handling',
          error_code
        );

        return NextResponse.json({
          success: failureResult.success,
          message: failureResult.message,
          data: failureResult.success ? {
            retry_id: failureResult.retryId,
            next_retry_date: failureResult.nextRetryDate,
            grace_period_end: failureResult.gracePeriodEnd,
            recommended_action: failureResult.recommendedAction
          } : null
        }, { status: failureResult.success ? 200 : 400 });

      case 'execute_retry':
        if (!retry_id) {
          return NextResponse.json(
            { success: false, message: 'retry_id is required' },
            { status: 400 }
          );
        }

        const retryResult = await paymentRetryService.executePaymentRetry(retry_id);

        return NextResponse.json({
          success: retryResult.success,
          message: retryResult.message,
          data: retryResult.success ? {
            next_retry_date: retryResult.nextRetryDate,
            grace_period_end: retryResult.gracePeriodEnd,
            recommended_action: retryResult.recommendedAction
          } : null
        }, { status: retryResult.success ? 200 : 400 });

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action. Use "handle_failure" or "execute_retry"' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Payment retry management error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Payment retry management failed' 
      },
      { status: 500 }
    );
  }
}