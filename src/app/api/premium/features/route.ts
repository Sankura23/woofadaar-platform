import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Premium feature definitions with limits and capabilities
const PREMIUM_FEATURES = {
  health_analytics: {
    name: 'Advanced Health Analytics',
    description: 'AI-powered health insights and predictive analytics',
    free_tier_limit: 3,
    premium_limit: null, // unlimited
    trial_limit: 10
  },
  expert_consultation: {
    name: 'Expert Consultations',
    description: 'Book consultations with verified veterinary experts',
    free_tier_limit: 0,
    premium_limit: 3,
    trial_limit: 1
  },
  priority_booking: {
    name: 'Priority Appointment Booking',
    description: 'Get priority access to partner appointments',
    free_tier_limit: 0,
    premium_limit: null,
    trial_limit: null
  },
  unlimited_health_logs: {
    name: 'Unlimited Health Logs',
    description: 'Track unlimited health logs with photo storage',
    free_tier_limit: 20,
    premium_limit: null,
    trial_limit: 50
  },
  advanced_insights: {
    name: 'Advanced Health Insights',
    description: 'Detailed breed-specific and age-based recommendations',
    free_tier_limit: 0,
    premium_limit: null,
    trial_limit: null
  },
  export_reports: {
    name: 'Health Report Export',
    description: 'Export detailed health reports for veterinary visits',
    free_tier_limit: 1,
    premium_limit: null,
    trial_limit: 3
  },
  multi_dog_management: {
    name: 'Multi-Dog Management',
    description: 'Manage health records for multiple dogs',
    free_tier_limit: 1,
    premium_limit: null,
    trial_limit: 3
  }
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.id;

    const { searchParams } = new URL(request.url);
    const feature = searchParams.get('feature');
    const checkAccess = searchParams.get('check_access') === 'true';

    // Get user's subscription status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        is_premium: true,
        created_at: true
      }
    });

    const premiumSubscription = await prisma.premiumSubscription.findFirst({
      where: {
        user_id: userId,
        status: { in: ['trial', 'active'] }
      },
      include: {
        feature_usage: {
          where: {
            usage_month: new Date().toISOString().substring(0, 7) // Current month
          }
        }
      }
    });

    // Determine user's tier
    let userTier: 'free' | 'trial' | 'premium' = 'free';
    if (premiumSubscription) {
      userTier = premiumSubscription.status === 'trial' ? 'trial' : 'premium';
    }

    // If checking access to a specific feature
    if (checkAccess && feature) {
      const accessResult = await checkFeatureAccess(userId, feature, userTier, premiumSubscription);
      return NextResponse.json(accessResult);
    }

    // Get usage statistics for current month
    const currentMonth = new Date().toISOString().substring(0, 7);
    const featureUsage = premiumSubscription?.feature_usage || [];

    // Calculate feature availability for all features
    const featureAvailability = Object.entries(PREMIUM_FEATURES).map(([key, featureInfo]) => {
      const usage = featureUsage.find(u => u.feature_name === key);
      const limit = getFeatureLimit(key, userTier);
      const used = usage?.usage_count || 0;
      
      return {
        feature_key: key,
        ...featureInfo,
        user_tier: userTier,
        limit: limit,
        used: used,
        remaining: limit === null ? 'unlimited' : Math.max(0, limit - used),
        has_access: limit === null || used < limit,
        last_used: usage?.last_used_at,
        upgrade_required: !hasFeatureAccess(userTier, key, used, limit)
      };
    });

    // Get user's dogs count for multi-dog feature
    const dogCount = await prisma.dog.count({
      where: { user_id: userId }
    });

    // Get user's health log count for current month
    const healthLogCount = await prisma.healthLog.count({
      where: {
        user_id: userId,
        created_at: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    });

    return NextResponse.json({
      success: true,
      user_status: {
        tier: userTier,
        is_premium: user?.is_premium || false,
        subscription_status: premiumSubscription?.status,
        subscription_type: premiumSubscription?.subscription_type,
        trial_end: premiumSubscription?.status === 'trial' ? premiumSubscription.trial_end_date : null,
        next_billing: premiumSubscription?.next_billing_date
      },
      feature_availability: featureAvailability,
      usage_summary: {
        current_month: currentMonth,
        dogs_managed: dogCount,
        health_logs_this_month: healthLogCount,
        consultations_used: featureUsage.find(u => u.feature_name === 'expert_consultation')?.usage_count || 0,
        analytics_generated: featureUsage.find(u => u.feature_name === 'health_analytics')?.usage_count || 0
      },
      upgrade_benefits: {
        from_free_to_premium: [
          'Unlimited health analytics',
          'Expert consultations (3/month)',
          'Priority appointment booking',
          'Advanced AI insights',
          'Unlimited health logs',
          'Multi-dog management'
        ],
        from_trial_to_premium: [
          'Continue unlimited access',
          'Full expert consultation quota',
          'Advanced feature access'
        ]
      }
    });

  } catch (error) {
    console.error('Error fetching premium features:', error);
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
    const { feature, action = 'use' } = body;

    if (!feature || !PREMIUM_FEATURES[feature as keyof typeof PREMIUM_FEATURES]) {
      return NextResponse.json({
        error: 'Invalid feature specified'
      }, { status: 400 });
    }

    // Get user's subscription
    const premiumSubscription = await prisma.premiumSubscription.findFirst({
      where: {
        user_id: userId,
        status: { in: ['trial', 'active'] }
      }
    });

    const userTier: 'free' | 'trial' | 'premium' = premiumSubscription 
      ? (premiumSubscription.status === 'trial' ? 'trial' : 'premium')
      : 'free';

    switch (action) {
      case 'use':
        // Track feature usage
        const accessResult = await checkFeatureAccess(userId, feature, userTier, premiumSubscription);
        
        if (!accessResult.has_access) {
          return NextResponse.json({
            error: 'Feature access denied',
            ...accessResult
          }, { status: 403 });
        }

        // Record usage if subscription exists
        if (premiumSubscription) {
          await trackFeatureUsage(premiumSubscription.id, feature);
        }

        return NextResponse.json({
          success: true,
          message: `${PREMIUM_FEATURES[feature as keyof typeof PREMIUM_FEATURES].name} access granted`,
          usage_tracked: !!premiumSubscription,
          remaining_uses: accessResult.remaining
        });

      case 'check':
        // Just check access without recording usage
        const checkResult = await checkFeatureAccess(userId, feature, userTier, premiumSubscription);
        return NextResponse.json(checkResult);

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported: use, check'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing premium feature request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
async function checkFeatureAccess(userId: string, feature: string, userTier: string, subscription: any) {
  const featureInfo = PREMIUM_FEATURES[feature as keyof typeof PREMIUM_FEATURES];
  
  if (!featureInfo) {
    return {
      has_access: false,
      error: 'Feature not found'
    };
  }

  const limit = getFeatureLimit(feature, userTier);
  let used = 0;

  // Get current usage if there's a subscription
  if (subscription) {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const usage = await prisma.premiumFeatureUsage.findUnique({
      where: {
        premium_subscription_id_feature_name_usage_month: {
          premium_subscription_id: subscription.id,
          feature_name: feature,
          usage_month: currentMonth
        }
      }
    });
    used = usage?.usage_count || 0;
  }

  const hasAccess = hasFeatureAccess(userTier, feature, used, limit);
  const remaining = limit === null ? 'unlimited' : Math.max(0, limit - used);

  return {
    has_access: hasAccess,
    feature: feature,
    feature_name: featureInfo.name,
    user_tier: userTier,
    limit: limit,
    used: used,
    remaining: remaining,
    upgrade_required: !hasAccess,
    upgrade_message: !hasAccess ? generateUpgradeMessage(userTier, feature) : null
  };
}

function getFeatureLimit(feature: string, tier: string): number | null {
  const featureInfo = PREMIUM_FEATURES[feature as keyof typeof PREMIUM_FEATURES];
  
  switch (tier) {
    case 'free':
      return featureInfo.free_tier_limit;
    case 'trial':
      return featureInfo.trial_limit;
    case 'premium':
      return featureInfo.premium_limit;
    default:
      return featureInfo.free_tier_limit;
  }
}

function hasFeatureAccess(tier: string, feature: string, used: number, limit: number | null): boolean {
  if (limit === null) return true; // Unlimited access
  if (limit === 0) return false; // No access
  return used < limit;
}

function generateUpgradeMessage(tier: string, feature: string): string {
  const featureInfo = PREMIUM_FEATURES[feature as keyof typeof PREMIUM_FEATURES];
  
  switch (tier) {
    case 'free':
      return `Upgrade to Premium to access ${featureInfo.name}. Start with a 14-day free trial!`;
    case 'trial':
      return `Your trial includes limited ${featureInfo.name}. Upgrade to Premium for unlimited access!`;
    default:
      return `Premium subscription required for ${featureInfo.name}.`;
  }
}

async function trackFeatureUsage(subscriptionId: string, feature: string) {
  const currentMonth = new Date().toISOString().substring(0, 7);
  
  try {
    await prisma.premiumFeatureUsage.upsert({
      where: {
        premium_subscription_id_feature_name_usage_month: {
          premium_subscription_id: subscriptionId,
          feature_name: feature,
          usage_month: currentMonth
        }
      },
      update: {
        usage_count: { increment: 1 },
        last_used_at: new Date()
      },
      create: {
        premium_subscription_id: subscriptionId,
        feature_name: feature,
        usage_count: 1,
        usage_month: currentMonth,
        monthly_limit: getDefaultLimit(feature),
        last_used_at: new Date()
      }
    });
  } catch (error) {
    console.error('Error tracking feature usage:', error);
    throw error;
  }
}

function getDefaultLimit(feature: string): number | null {
  const featureInfo = PREMIUM_FEATURES[feature as keyof typeof PREMIUM_FEATURES];
  return featureInfo.premium_limit;
}