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

// GET /api/partners/subscriptions/[id] - Get specific subscription details
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const subscriptionId = params.id;

    // Find subscription with related data
    const subscription = await prisma.partnerSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
            business_name: true,
            partner_type: true,
            rating_average: true,
            created_at: true
          }
        },
        subscription_payments: {
          orderBy: { created_at: 'desc' },
          take: 20
        }
      }
    });

    if (!subscription) {
      return NextResponse.json({
        success: false,
        message: 'Subscription not found'
      }, { status: 404 });
    }

    // Permission check
    if (!isAdmin(decoded.userType) && subscription.partner_id !== decoded.userId) {
      return NextResponse.json({
        success: false,
        message: 'Access denied: You can only view your own subscription'
      }, { status: 403 });
    }

    // Get commission earnings for current period
    const commissionEarnings = await prisma.referralCommission.aggregate({
      where: {
        partner_id: subscription.partner_id,
        created_at: {
          gte: subscription.current_period_start,
          lte: subscription.current_period_end
        },
        status: 'paid'
      },
      _sum: {
        commission_amount: true,
        referral_amount: true
      },
      _count: {
        _all: true
      }
    });

    // Calculate usage and limits
    const referralCount = commissionEarnings._count._all || 0;
    const tierConfig = PARTNER_SUBSCRIPTION_TIERS[subscription.subscription_tier as keyof typeof PARTNER_SUBSCRIPTION_TIERS];
    const maxReferrals = subscription.max_monthly_referrals;
    
    const usageInfo = {
      referrals_current_period: referralCount,
      referrals_limit: maxReferrals,
      referrals_remaining: maxReferrals ? Math.max(0, maxReferrals - referralCount) : 'unlimited',
      commission_earned_current_period: commissionEarnings._sum.commission_amount || 0,
      referral_value_current_period: commissionEarnings._sum.referral_amount || 0,
      commission_rate: subscription.commission_rate,
      usage_percentage: maxReferrals ? Math.min(100, (referralCount / maxReferrals) * 100) : 0
    };

    // Calculate billing information
    const now = new Date();
    const daysRemaining = subscription.current_period_end ? 
      Math.ceil((subscription.current_period_end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
    
    const billingInfo = {
      status: getBillingStatus(subscription),
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      days_remaining: daysRemaining,
      trial_end: subscription.trial_end,
      billing_cycle: subscription.billing_cycle,
      monthly_rate: subscription.monthly_rate,
      annual_rate: subscription.annual_rate,
      auto_renew: subscription.auto_renew,
      next_billing_amount: subscription.billing_cycle === 'annual' ? subscription.annual_rate : subscription.monthly_rate,
      total_paid: subscription.subscription_payments.reduce((sum, payment) => sum + payment.amount, 0)
    };

    return NextResponse.json({
      success: true,
      data: {
        subscription,
        tier_config: tierConfig,
        usage_info: usageInfo,
        billing_info: billingInfo,
        payment_history: subscription.subscription_payments
      }
    });

  } catch (error) {
    console.error('Error fetching subscription details:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// PUT /api/partners/subscriptions/[id] - Update subscription (upgrade/downgrade, modify settings)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const subscriptionId = params.id;
    const body = await request.json();

    const {
      subscription_tier,
      billing_cycle,
      auto_renew,
      action // 'upgrade', 'downgrade', 'pause', 'resume', 'cancel'
    } = body;

    // Find existing subscription
    const subscription = await prisma.partnerSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        partner: {
          select: { name: true, business_name: true, email: true }
        }
      }
    });

    if (!subscription) {
      return NextResponse.json({
        success: false,
        message: 'Subscription not found'
      }, { status: 404 });
    }

    // Permission check
    if (!isAdmin(decoded.userType) && subscription.partner_id !== decoded.userId) {
      return NextResponse.json({
        success: false,
        message: 'Access denied: You can only modify your own subscription'
      }, { status: 403 });
    }

    let updateData: any = {};
    let statusMessage = '';

    switch (action) {
      case 'pause':
        updateData = {
          status: 'paused',
          paused_at: new Date()
        };
        statusMessage = 'Subscription paused successfully';
        break;

      case 'resume':
        if (subscription.status !== 'paused') {
          return NextResponse.json({
            success: false,
            message: 'Subscription is not paused'
          }, { status: 400 });
        }
        updateData = {
          status: 'active',
          paused_at: null
        };
        statusMessage = 'Subscription resumed successfully';
        break;

      case 'cancel':
        updateData = {
          status: 'cancelled',
          cancelled_at: new Date(),
          auto_renew: false
        };
        statusMessage = 'Subscription cancelled successfully';
        break;

      case 'upgrade':
      case 'downgrade':
        if (!subscription_tier) {
          return NextResponse.json({
            success: false,
            message: 'Subscription tier is required for tier changes'
          }, { status: 400 });
        }

        const validTiers = Object.keys(PARTNER_SUBSCRIPTION_TIERS);
        if (!validTiers.includes(subscription_tier)) {
          return NextResponse.json({
            success: false,
            message: `Invalid subscription tier. Valid options: ${validTiers.join(', ')}`
          }, { status: 400 });
        }

        const newTierConfig = PARTNER_SUBSCRIPTION_TIERS[subscription_tier as keyof typeof PARTNER_SUBSCRIPTION_TIERS];
        const newBillingCycle = billing_cycle || subscription.billing_cycle;
        
        updateData = {
          subscription_tier,
          billing_cycle: newBillingCycle,
          monthly_rate: newTierConfig.monthlyRate,
          annual_rate: RevenueCalculator.calculatePartnerSubscription(subscription_tier, 'annual').totalAmount,
          commission_rate: newTierConfig.commissionRate,
          max_monthly_referrals: newTierConfig.maxMonthlyReferrals === 'unlimited' ? null : newTierConfig.maxMonthlyReferrals,
          features: newTierConfig.features,
          updated_at: new Date()
        };
        statusMessage = `Subscription ${action}d to ${subscription_tier} tier successfully`;
        break;

      default:
        // Regular update (auto_renew, billing_cycle, etc.)
        if (auto_renew !== undefined) updateData.auto_renew = auto_renew;
        if (billing_cycle !== undefined) {
          updateData.billing_cycle = billing_cycle;
          // Recalculate next billing amount based on cycle
          const tierConfig = PARTNER_SUBSCRIPTION_TIERS[subscription.subscription_tier as keyof typeof PARTNER_SUBSCRIPTION_TIERS];
          if (billing_cycle === 'annual') {
            updateData.annual_rate = RevenueCalculator.calculatePartnerSubscription(subscription.subscription_tier, 'annual').totalAmount;
          }
        }
        statusMessage = 'Subscription updated successfully';
    }

    // Update subscription
    const updatedSubscription = await prisma.partnerSubscription.update({
      where: { id: subscriptionId },
      data: updateData,
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

    console.log(`Subscription ${action || 'updated'}: ${subscriptionId} (${subscription.partner.business_name || subscription.partner.name})`);

    return NextResponse.json({
      success: true,
      message: statusMessage,
      data: {
        subscription: updatedSubscription,
        changes_applied: updateData
      }
    });

  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// DELETE /api/partners/subscriptions/[id] - Delete subscription (admin only)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    
    if (!isAdmin(decoded.userType)) {
      return NextResponse.json({
        success: false,
        message: 'Admin access required for subscription deletion'
      }, { status: 403 });
    }

    const subscriptionId = params.id;

    // Find subscription
    const subscription = await prisma.partnerSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        partner: {
          select: { name: true, business_name: true }
        }
      }
    });

    if (!subscription) {
      return NextResponse.json({
        success: false,
        message: 'Subscription not found'
      }, { status: 404 });
    }

    // Delete subscription and related data
    await prisma.$transaction(async (tx) => {
      // Delete subscription payments
      await tx.subscriptionPayment.deleteMany({
        where: { subscription_id: subscriptionId }
      });

      // Delete the subscription
      await tx.partnerSubscription.delete({
        where: { id: subscriptionId }
      });
    });

    console.log(`Subscription deleted: ${subscriptionId} (${subscription.partner.business_name || subscription.partner.name})`);

    return NextResponse.json({
      success: true,
      message: 'Subscription deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting subscription:', error);
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