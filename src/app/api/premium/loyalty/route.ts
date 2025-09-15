// Week 26 Phase 3: Loyalty Rewards & Referral Program API
// Manage loyalty tiers, referrals, and reward redemption for premium users

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { LoyaltyRewardsService } from '@/lib/loyalty-rewards-service';

const prisma = new PrismaClient();

/**
 * GET /api/premium/loyalty
 * Get loyalty status, rewards, referrals, or tier information
 */
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
    const action = searchParams.get('action') || 'status';

    switch (action) {
      case 'status':
        const loyaltyStatus = await LoyaltyRewardsService.getUserLoyaltyStatus(userId);
        
        if (!loyaltyStatus) {
          return NextResponse.json({
            error: 'Premium subscription required for loyalty program',
            upgrade_message: 'Join our loyalty program with premium subscription. Get rewards, exclusive benefits, and referral bonuses.',
            loyalty_benefits: {
              tiers: ['Bronze', 'Silver', 'Gold', 'Platinum'],
              rewards: ['Bonus consultation credits', 'Exclusive discounts', 'Free premium months'],
              referral_program: 'Earn free months and credits for successful referrals'
            }
          }, { status: 403 });
        }

        // Get current tier details
        const tiers = [
          {
            tier: 'bronze',
            required_months: 1,
            benefits: [
              'Basic premium features',
              'Priority support',
              '5 monthly consultation credits'
            ],
            current: loyaltyStatus.current_tier === 'bronze'
          },
          {
            tier: 'silver',
            required_months: 6,
            benefits: [
              'All Bronze benefits',
              '1 bonus consultation credit monthly',
              '5% discount on additional purchases',
              'Early access to new features'
            ],
            current: loyaltyStatus.current_tier === 'silver'
          },
          {
            tier: 'gold',
            required_months: 12,
            benefits: [
              'All Silver benefits',
              '2 bonus consultation credits monthly',
              '10% discount on purchases',
              'Exclusive health reports',
              'Priority vet booking'
            ],
            current: loyaltyStatus.current_tier === 'gold'
          },
          {
            tier: 'platinum',
            required_months: 24,
            benefits: [
              'All Gold benefits',
              '5 bonus consultation credits monthly',
              '15% discount on all purchases',
              'Free annual vet checkup',
              'Dedicated account manager',
              'Exclusive events'
            ],
            current: loyaltyStatus.current_tier === 'platinum'
          }
        ];

        return NextResponse.json({
          success: true,
          loyalty_status: loyaltyStatus,
          loyalty_tiers: tiers,
          premium_feature: true,
          next_milestone: loyaltyStatus.months_to_next_tier > 0 ? {
            tier: loyaltyStatus.next_tier,
            months_remaining: loyaltyStatus.months_to_next_tier,
            benefits_unlock: tiers.find(t => t.tier === loyaltyStatus.next_tier)?.benefits || []
          } : null
        });

      case 'rewards':
        const includeRedeemed = searchParams.get('include_redeemed') === 'true';
        const rewards = await LoyaltyRewardsService.getUserLoyaltyRewards(userId, includeRedeemed);

        return NextResponse.json({
          success: true,
          loyalty_rewards: rewards.map(reward => ({
            id: reward.id,
            reward_type: reward.reward_type,
            reward_value: reward.reward_value,
            description: reward.reward_description,
            earned_from: reward.earned_from,
            earned_date: reward.earned_date,
            redeemed: reward.redeemed,
            redeemed_date: reward.redeemed_date,
            expiry_date: reward.expiry_date,
            days_to_expiry: reward.expiry_date 
              ? Math.ceil((reward.expiry_date.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
              : null
          })),
          summary: {
            total_rewards: rewards.length,
            unredeemed_rewards: rewards.filter(r => !r.redeemed).length,
            expiring_soon: rewards.filter(r => 
              r.expiry_date && 
              !r.redeemed && 
              r.expiry_date.getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000
            ).length
          },
          premium_feature: true
        });

      case 'referrals':
        // Get user's referral information and history
        const referralCode = await prisma.referralCode.findFirst({
          where: {
            user_id: userId,
            is_active: true
          }
        });

        const referralHistory = await prisma.referralProgram.findMany({
          where: { referrer_id: userId },
          orderBy: { referral_date: 'desc' },
          take: 20
        });

        const referralStats = {
          total_referrals: referralHistory.length,
          successful_conversions: referralHistory.filter(r => r.status === 'premium_converted').length,
          pending_conversions: referralHistory.filter(r => r.status === 'registered').length,
          total_rewards_earned: 0 // This would be calculated from actual rewards
        };

        return NextResponse.json({
          success: true,
          referral_program: {
            referral_code: referralCode?.code || null,
            referral_stats: referralStats,
            referral_history: referralHistory.map(ref => ({
              referred_email: ref.referred_email,
              referral_date: ref.referral_date,
              status: ref.status,
              premium_conversion_date: ref.premium_conversion_date
            })),
            rewards_structure: {
              referrer_reward: '1 free premium month + 5 consultation credits',
              referred_reward: '2 consultation credits on signup + 3 more on premium subscription',
              terms: 'Rewards are credited when referred user subscribes to premium'
            }
          },
          premium_feature: true
        });

      case 'tiers':
        // Return detailed tier information
        const tierInfo = [
          {
            tier: 'bronze',
            name: 'Bronze Member',
            required_months: 1,
            icon: '🥉',
            benefits: [
              'Basic premium features',
              'Priority support',
              '5 monthly consultation credits'
            ],
            monthly_bonus: '0 bonus credits',
            discount: '0% discount'
          },
          {
            tier: 'silver',
            name: 'Silver Member',
            required_months: 6,
            icon: '🥈',
            benefits: [
              'All Bronze benefits',
              '1 bonus consultation credit monthly',
              '5% discount on additional purchases',
              'Early access to new features'
            ],
            monthly_bonus: '1 bonus credit',
            discount: '5% discount'
          },
          {
            tier: 'gold',
            name: 'Gold Member',
            required_months: 12,
            icon: '🥇',
            benefits: [
              'All Silver benefits',
              '2 bonus consultation credits monthly',
              '10% discount on purchases',
              'Exclusive health reports',
              'Priority vet booking'
            ],
            monthly_bonus: '2 bonus credits',
            discount: '10% discount'
          },
          {
            tier: 'platinum',
            name: 'Platinum Member',
            required_months: 24,
            icon: '💎',
            benefits: [
              'All Gold benefits',
              '5 bonus consultation credits monthly',
              '15% discount on all purchases',
              'Free annual vet checkup voucher',
              'Dedicated account manager',
              'Exclusive events and webinars'
            ],
            monthly_bonus: '5 bonus credits',
            discount: '15% discount'
          }
        ];

        return NextResponse.json({
          success: true,
          loyalty_tiers: tierInfo,
          tier_progression: {
            message: 'Loyalty tiers are based on continuous premium subscription months',
            benefits_cumulative: true,
            tier_downgrade: 'Tiers are maintained as long as subscription is active'
          }
        });

      default:
        return NextResponse.json({
          error: 'Invalid action parameter'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in loyalty rewards API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/premium/loyalty
 * Generate referral code, redeem rewards, or process referrals
 */
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
      case 'generate_referral_code':
        const codeResult = await LoyaltyRewardsService.generateReferralCode(userId);

        if (!codeResult.success) {
          const statusCode = codeResult.message.includes('Premium subscription required') ? 403 : 400;
          return NextResponse.json({
            error: codeResult.message,
            upgrade_required: statusCode === 403
          }, { status: statusCode });
        }

        // Track premium feature usage
        await trackPremiumFeatureUsage(userId, 'referral_code_generation');

        return NextResponse.json({
          success: true,
          referral_code: codeResult.referral_code,
          message: codeResult.message,
          sharing_message: `Join Woofadaar Premium with my referral code ${codeResult.referral_code} and get bonus consultation credits! Use code at signup: ${codeResult.referral_code}`,
          rewards_info: {
            for_you: 'Get 1 free premium month + 5 consultation credits when they subscribe',
            for_them: 'They get 2 credits on signup + 3 more when they subscribe to premium'
          }
        });

      case 'process_referral':
        const { referral_code } = body;

        if (!referral_code) {
          return NextResponse.json({
            error: 'Referral code is required'
          }, { status: 400 });
        }

        // Get user email for referral processing
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true }
        });

        if (!user) {
          return NextResponse.json({
            error: 'User not found'
          }, { status: 404 });
        }

        const referralResult = await LoyaltyRewardsService.processReferral(
          referral_code,
          userId,
          user.email
        );

        if (!referralResult.success) {
          return NextResponse.json({
            error: referralResult.message
          }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: referralResult.message,
          rewards: referralResult.rewards,
          next_steps: [
            'Your signup bonus credits have been added',
            'Subscribe to premium to unlock full rewards',
            'The person who referred you will get their reward when you subscribe'
          ]
        });

      case 'redeem_reward':
        const { reward_id } = body;

        if (!reward_id) {
          return NextResponse.json({
            error: 'Reward ID is required'
          }, { status: 400 });
        }

        const redemptionResult = await LoyaltyRewardsService.redeemLoyaltyReward(
          userId,
          reward_id
        );

        if (!redemptionResult.success) {
          return NextResponse.json({
            error: redemptionResult.message
          }, { status: 400 });
        }

        // Track premium feature usage
        await trackPremiumFeatureUsage(userId, 'loyalty_reward_redemption');

        return NextResponse.json({
          success: true,
          message: redemptionResult.message,
          redeemed_at: new Date().toISOString()
        });

      default:
        return NextResponse.json({
          error: 'Invalid action. Use "generate_referral_code", "process_referral", or "redeem_reward"'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing loyalty request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process loyalty request',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

async function trackPremiumFeatureUsage(userId: string, featureName: string) {
  try {
    await prisma.featureUsageLog.create({
      data: {
        user_id: userId,
        feature_id: featureName,
        usage_count: 1,
        metadata: {
          endpoint: '/api/premium/loyalty',
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error tracking premium feature usage:', error);
  }
}