import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
import { PARTNER_SUBSCRIPTION_TIERS, RevenueCalculator } from '@/lib/revenue-utils';

const verifyToken = (authHeader: string | null) => {
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Authentication required', status: 401 };
  }
  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    if (!decoded.userId) {
      return { error: 'Invalid authentication token', status: 401 };
    }
    return { decoded };
  } catch (error) {
    return { error: 'Invalid authentication token', status: 401 };
  }
};

const isAdmin = (userType: string) => userType === 'admin';
const isPartner = (userType: string) => userType === 'partner';

// GET /api/partners/subscriptions - Get partner subscriptions with filtering
export async function GET(request: NextRequest) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const tier = searchParams.get('tier');
    const partnerId = searchParams.get('partner_id');

    const offset = (page - 1) * limit;

    // Build where clause based on user permissions
    const where: any = {};

    // Apply user-specific filters
    if (!isAdmin(decoded.userType)) {
      if (isPartner(decoded.userType)) {
        // Partners can only see their own subscription
        where.partner_id = decoded.partnerId || decoded.userId;
      } else {
        return NextResponse.json({
          success: false,
          message: 'Access denied: Only partners and admins can view subscriptions'
        }, { status: 403 });
      }
    } else {
      // Admins can filter by specific partner if requested
      if (partnerId) where.partner_id = partnerId;
    }

    // Apply other filters
    if (status) where.status = status;
    if (tier) where.subscription_tier = tier;

    const [subscriptions, totalCount] = await Promise.all([
      prisma.partnerSubscription.findMany({
        where,
        include: {
          partner: {
            select: {
              id: true,
              name: true,
              email: true,
              business_name: true,
              partner_type: true,
              registration_number: true,
              rating_average: true
            }
          },
          subscription_payments: {
            orderBy: { created_at: 'desc' },
            take: 5 // Recent 5 payments
          }
        },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.partnerSubscription.count({ where })
    ]);

    // Calculate enhanced subscription data
    const enhancedSubscriptions = subscriptions.map(subscription => {
      const tierConfig = PARTNER_SUBSCRIPTION_TIERS[subscription.subscription_tier as keyof typeof PARTNER_SUBSCRIPTION_TIERS];
      const totalPaid = subscription.subscription_payments.reduce((sum, payment) => sum + payment.amount, 0);
      const isActiveOrTrial = ['active', 'trialing'].includes(subscription.status);
      
      return {
        ...subscription,
        tier_config: tierConfig,
        total_paid: totalPaid,
        days_remaining: isActiveOrTrial && subscription.current_period_end ? 
          Math.ceil((subscription.current_period_end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
        billing_status: getBillingStatus(subscription),
        next_billing_date: subscription.current_period_end,
        commission_earnings_current_period: null // Will be calculated separately if needed
      };
    });

    // Calculate aggregate statistics
    const stats = await prisma.partnerSubscription.aggregate({
      where,
      _count: { _all: true },
      _sum: { monthly_rate: true }
    });

    const tierBreakdown = await prisma.partnerSubscription.groupBy({
      by: ['subscription_tier', 'status'],
      where,
      _count: { _all: true },
      _sum: { monthly_rate: true }
    });

    return NextResponse.json({
      success: true,
      data: {
        subscriptions: enhancedSubscriptions,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalCount / limit),
          total_count: totalCount,
          per_page: limit
        },
        analytics: {
          total_subscriptions: stats._count._all,
          total_monthly_revenue: stats._sum.monthly_rate || 0,
          annual_recurring_revenue: RevenueCalculator.calculateARR(stats._sum.monthly_rate || 0),
          tier_breakdown: tierBreakdown,
          available_tiers: Object.keys(PARTNER_SUBSCRIPTION_TIERS).map(tier => ({
            tier,
            config: PARTNER_SUBSCRIPTION_TIERS[tier as keyof typeof PARTNER_SUBSCRIPTION_TIERS]
          }))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching partner subscriptions:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// POST /api/partners/subscriptions - Create or upgrade partner subscription
export async function POST(request: NextRequest) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const body = await request.json();
    
    const {
      subscription_tier,
      billing_cycle = 'monthly',
      partner_id, // Only admins can create subscriptions for other partners
      trial_days = 14,
      auto_renew = true
    } = body;

    // Validate subscription tier
    const validTiers = Object.keys(PARTNER_SUBSCRIPTION_TIERS);
    if (!validTiers.includes(subscription_tier)) {
      return NextResponse.json({
        success: false,
        message: `Invalid subscription tier. Valid options: ${validTiers.join(', ')}`
      }, { status: 400 });
    }

    // Determine target partner ID
    let targetPartnerId = decoded.userId;
    if (partner_id && isAdmin(decoded.userType)) {
      targetPartnerId = partner_id;
    } else if (partner_id && !isAdmin(decoded.userType)) {
      return NextResponse.json({
        success: false,
        message: 'Only admins can create subscriptions for other partners'
      }, { status: 403 });
    }

    // Verify partner exists and is active
    const partner = await prisma.partner.findUnique({
      where: { id: targetPartnerId },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        business_name: true, 
        is_active: true,
        partner_type: true
      }
    });

    if (!partner) {
      return NextResponse.json({
        success: false,
        message: 'Partner not found'
      }, { status: 404 });
    }

    if (!partner.is_active) {
      return NextResponse.json({
        success: false,
        message: 'Partner account is not active'
      }, { status: 400 });
    }

    // Check for existing active subscription
    const existingSubscription = await prisma.partnerSubscription.findUnique({
      where: { partner_id: targetPartnerId }
    });

    if (existingSubscription && ['active', 'trialing'].includes(existingSubscription.status)) {
      return NextResponse.json({
        success: false,
        message: 'Partner already has an active subscription. Use PUT to upgrade/modify.',
        data: { existing_subscription: existingSubscription }
      }, { status: 409 });
    }

    // Get tier configuration
    const tierConfig = PARTNER_SUBSCRIPTION_TIERS[subscription_tier as keyof typeof PARTNER_SUBSCRIPTION_TIERS];
    const monthlyRate = tierConfig.monthlyRate;
    const annualRate = RevenueCalculator.calculatePartnerSubscription(subscription_tier, 'annual').totalAmount;

    // Calculate subscription period dates
    const now = new Date();
    const trialEnd = trial_days > 0 ? new Date(now.getTime() + trial_days * 24 * 60 * 60 * 1000) : now;
    const periodEnd = billing_cycle === 'annual' ? 
      new Date(trialEnd.getTime() + 365 * 24 * 60 * 60 * 1000) :
      new Date(trialEnd.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Create or update subscription
    let subscription;
    if (existingSubscription) {
      subscription = await prisma.partnerSubscription.update({
        where: { id: existingSubscription.id },
        data: {
          subscription_tier,
          billing_cycle,
          monthly_rate: monthlyRate,
          annual_rate: annualRate,
          status: trial_days > 0 ? 'trialing' : 'active',
          current_period_start: now,
          current_period_end: periodEnd,
          trial_end: trialEnd,
          auto_renew,
          commission_rate: tierConfig.commissionRate,
          max_monthly_referrals: tierConfig.maxMonthlyReferrals === 'unlimited' ? null : tierConfig.maxMonthlyReferrals,
          features: tierConfig.features,
          updated_at: now
        },
        include: {
          partner: {
            select: {
              name: true,
              business_name: true,
              email: true
            }
          }
        }
      });
    } else {
      subscription = await prisma.partnerSubscription.create({
        data: {
          partner_id: targetPartnerId,
          subscription_tier,
          billing_cycle,
          monthly_rate: monthlyRate,
          annual_rate: annualRate,
          status: trial_days > 0 ? 'trialing' : 'active',
          current_period_start: now,
          current_period_end: periodEnd,
          trial_end: trialEnd,
          auto_renew,
          commission_rate: tierConfig.commissionRate,
          max_monthly_referrals: tierConfig.maxMonthlyReferrals === 'unlimited' ? null : tierConfig.maxMonthlyReferrals,
          features: tierConfig.features
        },
        include: {
          partner: {
            select: {
              name: true,
              business_name: true,
              email: true
            }
          }
        }
      });
    }

    console.log(`Partner subscription ${existingSubscription ? 'updated' : 'created'}: ${subscription.id} (${partner.business_name || partner.name} - ${subscription_tier})`);

    return NextResponse.json({
      success: true,
      message: `Partner subscription ${existingSubscription ? 'updated' : 'created'} successfully`,
      data: {
        subscription,
        tier_config: tierConfig,
        billing_info: {
          current_period: {
            start: subscription.current_period_start,
            end: subscription.current_period_end
          },
          trial_period: trial_days > 0 ? {
            end: subscription.trial_end,
            days_remaining: Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          } : null,
          next_payment_amount: billing_cycle === 'annual' ? annualRate : monthlyRate,
          billing_cycle
        }
      }
    });

  } catch (error) {
    console.error('Error creating partner subscription:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper function to determine billing status
function getBillingStatus(subscription: any): string {
  const now = new Date();
  
  if (subscription.status === 'cancelled') return 'cancelled';
  if (subscription.status === 'paused') return 'paused';
  if (subscription.status === 'trialing') {
    return subscription.trial_end && subscription.trial_end > now ? 'in_trial' : 'trial_ended';
  }
  if (subscription.status === 'active') {
    if (subscription.current_period_end && subscription.current_period_end < now) {
      return 'overdue';
    }
    return 'active';
  }
  
  return 'unknown';
}