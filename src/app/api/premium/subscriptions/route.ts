import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.id;

    // Get user's premium subscriptions
    const subscriptions = await prisma.premiumSubscription.findMany({
      where: { user_id: userId },
      include: {
        feature_usage: {
          orderBy: { created_at: 'desc' },
          take: 10
        },
        subscription_payments: {
          orderBy: { created_at: 'desc' },
          take: 5,
          where: { payment_status: 'completed' }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Calculate subscription analytics
    const analytics = {
      total_subscriptions: subscriptions.length,
      active_subscriptions: subscriptions.filter(s => s.status === 'active').length,
      trial_subscriptions: subscriptions.filter(s => s.status === 'trial').length,
      total_spent: subscriptions.reduce((sum, sub) => {
        return sum + sub.subscription_payments.reduce((paySum, pay) => paySum + pay.amount, 0);
      }, 0),
      next_billing_dates: subscriptions
        .filter(s => s.status === 'active' && s.next_billing_date)
        .map(s => ({
          subscription_type: s.subscription_type,
          next_billing_date: s.next_billing_date,
          amount: s.subscription_type === 'monthly' ? s.monthly_price : s.annual_price
        }))
    };

    return NextResponse.json({
      success: true,
      subscriptions,
      analytics
    });

  } catch (error) {
    console.error('Error fetching premium subscriptions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.id;

    const body = await request.json();
    const { subscription_type = 'monthly', plan_features = [] } = body;

    // Check if user already has an active subscription
    const existingSubscription = await prisma.premiumSubscription.findFirst({
      where: { 
        user_id: userId,
        status: { in: ['active', 'trial'] }
      }
    });

    if (existingSubscription) {
      return NextResponse.json({ 
        error: 'User already has an active premium subscription',
        existing_subscription: existingSubscription
      }, { status: 400 });
    }

    // Calculate pricing
    const pricing = {
      monthly: { price: 99.0, discount: 0 },
      annual: { price: 999.0, discount: 199.0 } // 2 months free
    };

    const selectedPlan = pricing[subscription_type as keyof typeof pricing];
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14); // 14-day free trial

    // Create premium subscription
    const subscription = await prisma.premiumSubscription.create({
      data: {
        user_id: userId,
        subscription_type,
        status: 'trial',
        trial_start_date: new Date(),
        trial_end_date: trialEndDate,
        monthly_price: pricing.monthly.price,
        annual_price: pricing.annual.price,
        features_enabled: plan_features,
        auto_renewal: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Initialize feature usage tracking
    const defaultFeatures = [
      'health_analytics',
      'priority_booking', 
      'expert_consultation',
      'unlimited_health_logs',
      'advanced_insights'
    ];

    const featureUsagePromises = defaultFeatures.map(feature => 
      prisma.premiumFeatureUsage.create({
        data: {
          premium_subscription_id: subscription.id,
          feature_name: feature,
          usage_count: 0,
          usage_month: new Date().toISOString().substring(0, 7), // YYYY-MM format
          monthly_limit: feature === 'expert_consultation' ? 3 : null // 3 consultations per month
        }
      })
    );

    await Promise.all(featureUsagePromises);

    return NextResponse.json({
      success: true,
      message: 'Premium subscription created successfully with 14-day free trial',
      subscription: {
        ...subscription,
        trial_days_remaining: 14,
        features_included: defaultFeatures
      }
    });

  } catch (error) {
    console.error('Error creating premium subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.id;

    const body = await request.json();
    const { subscription_id, action, subscription_type } = body;

    // Verify user owns the subscription
    const subscription = await prisma.premiumSubscription.findFirst({
      where: { 
        id: subscription_id,
        user_id: userId
      }
    });

    if (!subscription) {
      return NextResponse.json({ 
        error: 'Subscription not found or access denied' 
      }, { status: 404 });
    }

    let updatedSubscription;

    switch (action) {
      case 'cancel':
        updatedSubscription = await prisma.premiumSubscription.update({
          where: { id: subscription_id },
          data: {
            status: 'cancelled',
            auto_renewal: false,
            cancellation_date: new Date(),
            cancellation_reason: body.cancellation_reason || 'User requested',
            updated_at: new Date()
          }
        });
        break;

      case 'reactivate':
        if (subscription.status !== 'cancelled') {
          return NextResponse.json({ 
            error: 'Can only reactivate cancelled subscriptions' 
          }, { status: 400 });
        }
        updatedSubscription = await prisma.premiumSubscription.update({
          where: { id: subscription_id },
          data: {
            status: 'active',
            auto_renewal: true,
            cancellation_date: null,
            cancellation_reason: null,
            updated_at: new Date()
          }
        });
        break;

      case 'change_plan':
        if (!subscription_type || !['monthly', 'annual'].includes(subscription_type)) {
          return NextResponse.json({ 
            error: 'Valid subscription_type required (monthly/annual)' 
          }, { status: 400 });
        }
        updatedSubscription = await prisma.premiumSubscription.update({
          where: { id: subscription_id },
          data: {
            subscription_type,
            updated_at: new Date()
          }
        });
        break;

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Supported: cancel, reactivate, change_plan' 
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Subscription ${action} successful`,
      subscription: updatedSubscription
    });

  } catch (error) {
    console.error('Error updating premium subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}