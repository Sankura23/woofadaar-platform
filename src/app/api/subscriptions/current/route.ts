import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import jwt from 'jsonwebtoken';
import { SUBSCRIPTION_PLANS, FREE_TIER_LIMITS } from '@/lib/razorpay';

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

    // Get user's current subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: { in: ['active', 'trialing', 'past_due'] }
      },
      orderBy: { created_at: 'desc' },
      include: {
        payments: {
          where: { status: 'paid' },
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!subscription) {
      // Return free tier information
      return NextResponse.json({
        success: true,
        data: {
          subscription: null,
          plan: {
            type: 'free',
            name: 'Free Plan',
            status: 'active',
            features: [
              'Basic dog profile management',
              'Limited health history (7 days)',
              'Basic Dog ID features',
              '1 expert consultation per month',
              'Community access with ads',
              'Standard customer support'
            ],
            limits: FREE_TIER_LIMITS,
            upgrade_available: true
          },
          usage: {
            can_upgrade: true,
            trial_available: true
          }
        }
      });
    }

    // Parse subscription metadata
    const metadata = JSON.parse(subscription.metadata || '{}');
    const planId = metadata.plan_id;
    const planDetails = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];

    // Calculate trial/subscription status
    const now = new Date();
    const trialEndDate = new Date(subscription.trial_end_date);
    const subscriptionEndDate = new Date(subscription.end_date);
    
    const isInTrial = subscription.status === 'trialing' && now < trialEndDate;
    const trialDaysRemaining = isInTrial ? 
      Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    
    const daysUntilExpiry = Math.ceil((subscriptionEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate usage statistics
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const [
      expertConsultationsThisMonth,
      healthLogsThisMonth,
      photoStorageUsed
    ] = await Promise.all([
      prisma.premiumFeatureUsage.count({
        where: {
          user_id: userId,
          feature_name: 'expert_consultation',
          created_at: { gte: currentMonth }
        }
      }),
      prisma.healthLog.count({
        where: {
          dog: { user_id: userId },
          created_at: { gte: currentMonth }
        }
      }),
      prisma.dogPhoto.count({
        where: {
          dog: { user_id: userId }
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          plan_type: subscription.plan_type,
          status: subscription.status,
          start_date: subscription.start_date,
          end_date: subscription.end_date,
          trial_end_date: subscription.trial_end_date,
          billing_cycle: subscription.billing_cycle,
          amount_paid: subscription.amount_paid,
          auto_renew: subscription.auto_renew,
          is_trial: isInTrial,
          trial_days_remaining: trialDaysRemaining,
          days_until_expiry: daysUntilExpiry,
          next_billing_date: subscriptionEndDate,
          can_cancel: true,
          can_pause: subscription.status === 'active',
          created_at: subscription.created_at
        },
        plan: {
          type: 'premium',
          id: planId,
          name: planDetails?.name || 'Premium Plan',
          features: planDetails?.features || [],
          amount: planDetails?.amount ? planDetails.amount / 100 : 0,
          currency: 'INR',
          interval: planDetails?.interval || 'monthly'
        },
        usage: {
          expert_consultations_used: expertConsultationsThisMonth,
          health_logs_this_month: healthLogsThisMonth,
          photo_storage_used: photoStorageUsed,
          unlimited_access: true
        },
        payment_history: subscription.payments.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          payment_method: payment.payment_method,
          created_at: payment.created_at,
          invoice_number: payment.invoice_number,
          invoice_url: payment.invoice_url
        }))
      }
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to get subscription' 
      },
      { status: 500 }
    );
  }
}