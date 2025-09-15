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

    // Get user's trial subscription
    const trialSubscription = await prisma.premiumSubscription.findFirst({
      where: { 
        user_id: userId,
        status: 'trial'
      },
      include: {
        feature_usage: {
          where: {
            usage_month: new Date().toISOString().substring(0, 7) // Current month
          }
        },
        user: {
          select: { id: true, name: true, email: true, created_at: true }
        }
      }
    });

    if (!trialSubscription) {
      return NextResponse.json({ 
        has_trial: false,
        message: 'No active trial subscription found'
      });
    }

    // Calculate trial progress
    const now = new Date();
    const trialStart = new Date(trialSubscription.trial_start_date);
    const trialEnd = new Date(trialSubscription.trial_end_date);
    
    const totalTrialDays = Math.ceil((trialEnd.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    const trialProgress = Math.min(100, Math.max(0, (daysElapsed / totalTrialDays) * 100));
    
    // Check if trial has expired
    const isTrialExpired = now > trialEnd;

    // Calculate feature usage summary
    const featureUsageSummary = trialSubscription.feature_usage.reduce((acc: any, usage) => {
      acc[usage.feature_name] = {
        used: usage.usage_count,
        limit: usage.monthly_limit,
        unlimited: usage.monthly_limit === null,
        last_used: usage.last_used_at
      };
      return acc;
    }, {});

    // Generate personalized recommendations
    const recommendations = generateTrialRecommendations(
      trialSubscription.feature_usage,
      daysRemaining,
      isTrialExpired
    );

    return NextResponse.json({
      success: true,
      has_trial: true,
      trial_status: {
        subscription_id: trialSubscription.id,
        is_active: !isTrialExpired,
        is_expired: isTrialExpired,
        start_date: trialSubscription.trial_start_date,
        end_date: trialSubscription.trial_end_date,
        days_total: totalTrialDays,
        days_elapsed: daysElapsed,
        days_remaining: daysRemaining,
        progress_percentage: Math.round(trialProgress),
        features_enabled: trialSubscription.features_enabled
      },
      feature_usage: featureUsageSummary,
      recommendations,
      upgrade_options: {
        monthly: {
          price: trialSubscription.monthly_price,
          savings: 0,
          billing_cycle: '1 Month'
        },
        annual: {
          price: trialSubscription.annual_price,
          savings: (trialSubscription.monthly_price * 12) - trialSubscription.annual_price,
          billing_cycle: '12 Months'
        }
      }
    });

  } catch (error) {
    console.error('Error fetching trial status:', error);
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
    const { action } = body;

    switch (action) {
      case 'start':
        return await startTrial(userId);
      case 'extend':
        return await extendTrial(userId, body.days || 7);
      case 'convert':
        return await convertToSubscription(userId, body.subscription_type || 'monthly');
      default:
        return NextResponse.json({ 
          error: 'Invalid action. Supported: start, extend, convert' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error managing trial:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function startTrial(userId: string) {
  // Check if user already has a trial or active subscription
  const existingSubscription = await prisma.premiumSubscription.findFirst({
    where: { 
      user_id: userId,
      status: { in: ['trial', 'active'] }
    }
  });

  if (existingSubscription) {
    return NextResponse.json({ 
      error: 'User already has an active subscription or trial',
      existing_subscription: existingSubscription
    }, { status: 400 });
  }

  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 14); // 14-day trial

  const subscription = await prisma.premiumSubscription.create({
    data: {
      user_id: userId,
      subscription_type: 'monthly',
      status: 'trial',
      trial_start_date: new Date(),
      trial_end_date: trialEndDate,
      monthly_price: 99.0,
      annual_price: 999.0,
      features_enabled: [
        'health_analytics',
        'priority_booking',
        'expert_consultation',
        'unlimited_health_logs',
        'advanced_insights'
      ],
      auto_renewal: false, // Don't auto-renew trials
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  return NextResponse.json({
    success: true,
    message: '14-day premium trial started successfully',
    subscription,
    trial_expires: trialEndDate
  });
}

async function extendTrial(userId: string, extensionDays: number) {
  const trialSubscription = await prisma.premiumSubscription.findFirst({
    where: { 
      user_id: userId,
      status: 'trial'
    }
  });

  if (!trialSubscription) {
    return NextResponse.json({ 
      error: 'No active trial found' 
    }, { status: 404 });
  }

  // Extend trial by specified days
  const newEndDate = new Date(trialSubscription.trial_end_date);
  newEndDate.setDate(newEndDate.getDate() + extensionDays);

  const updatedSubscription = await prisma.premiumSubscription.update({
    where: { id: trialSubscription.id },
    data: {
      trial_end_date: newEndDate,
      updated_at: new Date()
    }
  });

  return NextResponse.json({
    success: true,
    message: `Trial extended by ${extensionDays} days`,
    subscription: updatedSubscription,
    new_expiry_date: newEndDate
  });
}

async function convertToSubscription(userId: string, subscriptionType: string) {
  const trialSubscription = await prisma.premiumSubscription.findFirst({
    where: { 
      user_id: userId,
      status: 'trial'
    }
  });

  if (!trialSubscription) {
    return NextResponse.json({ 
      error: 'No trial subscription found to convert' 
    }, { status: 404 });
  }

  // Calculate new billing dates
  const now = new Date();
  const billingEndDate = subscriptionType === 'monthly'
    ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
    : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 365 days

  const updatedSubscription = await prisma.premiumSubscription.update({
    where: { id: trialSubscription.id },
    data: {
      status: 'active',
      subscription_type: subscriptionType,
      current_period_start: now,
      current_period_end: billingEndDate,
      next_billing_date: billingEndDate,
      auto_renewal: true,
      updated_at: new Date()
    }
  });

  // Update user premium status
  await prisma.user.update({
    where: { id: userId },
    data: { is_premium: true }
  });

  return NextResponse.json({
    success: true,
    message: 'Trial successfully converted to premium subscription',
    subscription: updatedSubscription,
    next_billing_date: billingEndDate,
    amount: subscriptionType === 'monthly' 
      ? updatedSubscription.monthly_price 
      : updatedSubscription.annual_price
  });
}

function generateTrialRecommendations(featureUsage: any[], daysRemaining: number, isExpired: boolean) {
  const recommendations = [];

  if (isExpired) {
    recommendations.push({
      type: 'upgrade',
      priority: 'high',
      title: 'Trial Expired - Continue with Premium',
      description: 'Your trial has ended. Upgrade now to continue accessing premium features.',
      action: 'Subscribe now for uninterrupted access'
    });
  } else if (daysRemaining <= 3) {
    recommendations.push({
      type: 'urgent_upgrade',
      priority: 'high',
      title: `Only ${daysRemaining} days left in your trial`,
      description: 'Subscribe now to avoid losing access to premium features.',
      action: 'Upgrade before trial expires'
    });
  } else if (daysRemaining <= 7) {
    recommendations.push({
      type: 'upgrade_reminder',
      priority: 'medium',
      title: 'Trial ending soon',
      description: `${daysRemaining} days remaining. Consider upgrading to maintain access.`,
      action: 'Explore subscription plans'
    });
  }

  // Feature-specific recommendations
  const unusedFeatures = featureUsage.filter(usage => usage.usage_count === 0);
  if (unusedFeatures.length > 0) {
    recommendations.push({
      type: 'feature_discovery',
      priority: 'medium',
      title: 'Discover unused features',
      description: `Try ${unusedFeatures.map((f: any) => f.feature_name).join(', ')} before your trial ends`,
      action: 'Explore all features'
    });
  }

  return recommendations;
}