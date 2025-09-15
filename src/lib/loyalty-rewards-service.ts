// Week 26 Phase 3: Loyalty Rewards & Referral Program Service
// Reward premium users for loyalty and successful referrals

import prisma from './db';

export interface LoyaltyReward {
  id: string;
  user_id: string;
  reward_type: 'loyalty_points' | 'free_month' | 'credit_bonus' | 'exclusive_discount' | 'premium_upgrade';
  reward_value: number;
  reward_description: string;
  earned_from: 'monthly_loyalty' | 'referral' | 'milestone' | 'special_promo' | 'activity_bonus';
  earned_date: Date;
  redeemed: boolean;
  redeemed_date?: Date;
  expiry_date?: Date;
  metadata: any;
}

export interface ReferralProgram {
  referrer_id: string;
  referred_user_id: string;
  referred_email: string;
  referral_code: string;
  status: 'pending' | 'registered' | 'premium_converted' | 'reward_claimed';
  referral_date: Date;
  premium_conversion_date?: Date;
  rewards_earned: {
    referrer_reward: number;
    referred_reward: number;
  };
}

export interface LoyaltyTier {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  required_months: number;
  benefits: string[];
  monthly_credits_bonus: number;
  discount_percentage: number;
  exclusive_features: string[];
}

export interface UserLoyaltyStatus {
  user_id: string;
  premium_months: number;
  current_tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  total_loyalty_points: number;
  available_points: number;
  referrals_made: number;
  successful_referrals: number;
  lifetime_rewards_earned: number;
  current_streak: number;
  next_tier: string;
  months_to_next_tier: number;
}

export class LoyaltyRewardsService {

  // Loyalty tier definitions
  private static readonly LOYALTY_TIERS: LoyaltyTier[] = [
    {
      tier: 'bronze',
      required_months: 1,
      benefits: [
        'Basic premium features',
        'Priority support',
        '5 monthly consultation credits'
      ],
      monthly_credits_bonus: 0,
      discount_percentage: 0,
      exclusive_features: []
    },
    {
      tier: 'silver',
      required_months: 6,
      benefits: [
        'All Bronze benefits',
        '1 bonus consultation credit monthly',
        '5% discount on additional credit purchases',
        'Early access to new features'
      ],
      monthly_credits_bonus: 1,
      discount_percentage: 5,
      exclusive_features: ['early_feature_access']
    },
    {
      tier: 'gold',
      required_months: 12,
      benefits: [
        'All Silver benefits',
        '2 bonus consultation credits monthly',
        '10% discount on additional purchases',
        'Exclusive health reports',
        'Priority vet appointment booking'
      ],
      monthly_credits_bonus: 2,
      discount_percentage: 10,
      exclusive_features: ['early_feature_access', 'exclusive_health_reports', 'priority_vet_booking']
    },
    {
      tier: 'platinum',
      required_months: 24,
      benefits: [
        'All Gold benefits',
        '5 bonus consultation credits monthly',
        '15% discount on all purchases',
        'Free annual vet checkup voucher',
        'Dedicated account manager',
        'Exclusive events and webinars'
      ],
      monthly_credits_bonus: 5,
      discount_percentage: 15,
      exclusive_features: [
        'early_feature_access', 
        'exclusive_health_reports', 
        'priority_vet_booking',
        'dedicated_account_manager',
        'exclusive_events'
      ]
    }
  ];

  /**
   * Get user's loyalty status and tier information
   */
  static async getUserLoyaltyStatus(userId: string): Promise<UserLoyaltyStatus | null> {
    try {
      // Check if user has premium subscription
      const subscription = await prisma.subscription.findFirst({
        where: {
          user_id: userId,
          status: 'active'
        },
        include: {
          payments: {
            where: { status: 'completed' },
            orderBy: { created_at: 'asc' }
          }
        }
      });

      if (!subscription) {
        return null; // Not a premium user
      }

      // Calculate premium months
      const firstPayment = subscription.payments[0];
      const premiumMonths = firstPayment 
        ? Math.floor((new Date().getTime() - firstPayment.created_at.getTime()) / (30 * 24 * 60 * 60 * 1000))
        : 0;

      // Determine current tier
      const currentTier = this.calculateUserTier(premiumMonths);
      const nextTier = this.getNextTier(currentTier);

      // Get loyalty points and rewards
      const loyaltyData = await prisma.userLoyalty.findUnique({
        where: { user_id: userId }
      });

      const totalPoints = loyaltyData?.total_points || 0;
      const availablePoints = loyaltyData?.available_points || 0;

      // Get referral statistics
      const referrals = await prisma.referralProgram.findMany({
        where: { referrer_id: userId }
      });

      const successfulReferrals = referrals.filter(r => r.status === 'premium_converted').length;

      // Calculate lifetime rewards
      const rewards = await prisma.loyaltyReward.findMany({
        where: { user_id: userId }
      });

      const lifetimeRewardsValue = rewards.reduce((sum, reward) => sum + reward.reward_value, 0);

      return {
        user_id: userId,
        premium_months: premiumMonths,
        current_tier: currentTier.tier,
        total_loyalty_points: totalPoints,
        available_points: availablePoints,
        referrals_made: referrals.length,
        successful_referrals: successfulReferrals,
        lifetime_rewards_earned: lifetimeRewardsValue,
        current_streak: loyaltyData?.current_streak || 0,
        next_tier: nextTier ? nextTier.tier : 'Maximum tier reached',
        months_to_next_tier: nextTier ? Math.max(0, nextTier.required_months - premiumMonths) : 0
      };

    } catch (error) {
      console.error('Error getting user loyalty status:', error);
      throw error;
    }
  }

  /**
   * Generate referral code for user
   */
  static async generateReferralCode(userId: string): Promise<{ success: boolean; referral_code?: string; message: string }> {
    try {
      // Check if user is premium
      const isPremium = await this.checkPremiumAccess(userId);
      if (!isPremium) {
        return {
          success: false,
          message: 'Premium subscription required to generate referral codes'
        };
      }

      // Check if user already has an active referral code
      const existingCode = await prisma.referralCode.findFirst({
        where: {
          user_id: userId,
          is_active: true
        }
      });

      if (existingCode) {
        return {
          success: true,
          referral_code: existingCode.code,
          message: 'Your existing referral code'
        };
      }

      // Generate unique referral code
      const referralCode = this.generateUniqueCode(userId);

      // Create referral code
      await prisma.referralCode.create({
        data: {
          user_id: userId,
          code: referralCode,
          is_active: true,
          created_at: new Date(),
          metadata: {
            generated_timestamp: new Date().toISOString(),
            platform: 'web'
          }
        }
      });

      return {
        success: true,
        referral_code: referralCode,
        message: 'New referral code generated successfully'
      };

    } catch (error) {
      console.error('Error generating referral code:', error);
      return {
        success: false,
        message: 'Failed to generate referral code'
      };
    }
  }

  /**
   * Process referral when someone signs up using referral code
   */
  static async processReferral(
    referralCode: string, 
    newUserId: string, 
    newUserEmail: string
  ): Promise<{ success: boolean; message: string; rewards?: any }> {
    try {
      // Find referral code
      const referralCodeRecord = await prisma.referralCode.findFirst({
        where: {
          code: referralCode,
          is_active: true
        }
      });

      if (!referralCodeRecord) {
        return {
          success: false,
          message: 'Invalid or expired referral code'
        };
      }

      // Prevent self-referral
      if (referralCodeRecord.user_id === newUserId) {
        return {
          success: false,
          message: 'Cannot use your own referral code'
        };
      }

      // Check if user already has a referral record
      const existingReferral = await prisma.referralProgram.findFirst({
        where: {
          OR: [
            { referred_user_id: newUserId },
            { referred_email: newUserEmail }
          ]
        }
      });

      if (existingReferral) {
        return {
          success: false,
          message: 'User has already been referred'
        };
      }

      // Create referral record
      const referral = await prisma.referralProgram.create({
        data: {
          referrer_id: referralCodeRecord.user_id,
          referred_user_id: newUserId,
          referred_email: newUserEmail,
          referral_code: referralCode,
          status: 'registered',
          referral_date: new Date(),
          metadata: {
            registration_timestamp: new Date().toISOString(),
            referral_source: 'signup'
          }
        }
      });

      // Give immediate signup bonus to referred user
      await this.awardLoyaltyReward(
        newUserId,
        'credit_bonus',
        2,
        'Welcome bonus for joining through referral',
        'referral'
      );

      // Track referral in user loyalty
      await this.updateUserLoyalty(referralCodeRecord.user_id, {
        referrals_made: { increment: 1 }
      });

      return {
        success: true,
        message: 'Referral processed successfully',
        rewards: {
          new_user_bonus: '2 consultation credits',
          referrer_pending_reward: 'Will receive reward when you subscribe to premium'
        }
      };

    } catch (error) {
      console.error('Error processing referral:', error);
      return {
        success: false,
        message: 'Failed to process referral'
      };
    }
  }

  /**
   * Process referral reward when referred user subscribes to premium
   */
  static async processReferralPremiumConversion(userId: string): Promise<void> {
    try {
      // Find if this user was referred
      const referral = await prisma.referralProgram.findFirst({
        where: {
          referred_user_id: userId,
          status: 'registered'
        }
      });

      if (!referral) {
        return; // User wasn't referred
      }

      // Update referral status
      await prisma.referralProgram.update({
        where: { id: referral.id },
        data: {
          status: 'premium_converted',
          premium_conversion_date: new Date()
        }
      });

      // Award referrer with premium month and credits
      await this.awardLoyaltyReward(
        referral.referrer_id,
        'free_month',
        1,
        'Free premium month for successful referral',
        'referral'
      );

      await this.awardLoyaltyReward(
        referral.referrer_id,
        'credit_bonus',
        5,
        'Bonus consultation credits for successful referral',
        'referral'
      );

      // Award referred user with additional credits
      await this.awardLoyaltyReward(
        userId,
        'credit_bonus',
        3,
        'Premium subscription bonus credits',
        'referral'
      );

      // Update loyalty stats
      await this.updateUserLoyalty(referral.referrer_id, {
        successful_referrals: { increment: 1 },
        total_points: { increment: 500 },
        available_points: { increment: 500 }
      });

    } catch (error) {
      console.error('Error processing referral premium conversion:', error);
    }
  }

  /**
   * Process monthly loyalty rewards for active premium subscribers
   */
  static async processMonthlyLoyaltyRewards(userId: string): Promise<void> {
    try {
      const loyaltyStatus = await this.getUserLoyaltyStatus(userId);
      if (!loyaltyStatus) return;

      const currentTier = this.LOYALTY_TIERS.find(t => t.tier === loyaltyStatus.current_tier);
      if (!currentTier) return;

      // Award monthly loyalty points
      const monthlyPoints = 100 + (currentTier.monthly_credits_bonus * 50);
      await this.awardLoyaltyPoints(userId, monthlyPoints, 'Monthly loyalty points');

      // Award tier-specific bonuses
      if (currentTier.monthly_credits_bonus > 0) {
        await this.awardLoyaltyReward(
          userId,
          'credit_bonus',
          currentTier.monthly_credits_bonus,
          `${currentTier.tier.charAt(0).toUpperCase() + currentTier.tier.slice(1)} tier monthly bonus credits`,
          'monthly_loyalty'
        );
      }

      // Award milestone rewards
      if (loyaltyStatus.premium_months % 12 === 0) { // Annual milestone
        await this.awardLoyaltyReward(
          userId,
          'exclusive_discount',
          25,
          `${loyaltyStatus.premium_months / 12} year anniversary - 25% discount voucher`,
          'milestone'
        );
      }

      // Update streak
      await this.updateUserLoyalty(userId, {
        current_streak: { increment: 1 }
      });

    } catch (error) {
      console.error('Error processing monthly loyalty rewards:', error);
    }
  }

  /**
   * Get user's available loyalty rewards
   */
  static async getUserLoyaltyRewards(
    userId: string,
    includeRedeemed: boolean = false
  ): Promise<LoyaltyReward[]> {
    try {
      const whereClause: any = { user_id: userId };
      if (!includeRedeemed) {
        whereClause.redeemed = false;
      }

      const rewards = await prisma.loyaltyReward.findMany({
        where: whereClause,
        orderBy: { earned_date: 'desc' }
      });

      return rewards.map(reward => ({
        id: reward.id,
        user_id: reward.user_id,
        reward_type: reward.reward_type as any,
        reward_value: reward.reward_value,
        reward_description: reward.reward_description,
        earned_from: reward.earned_from as any,
        earned_date: reward.earned_date,
        redeemed: reward.redeemed,
        redeemed_date: reward.redeemed_date,
        expiry_date: reward.expiry_date,
        metadata: reward.metadata
      }));

    } catch (error) {
      console.error('Error getting user loyalty rewards:', error);
      return [];
    }
  }

  /**
   * Redeem loyalty reward
   */
  static async redeemLoyaltyReward(
    userId: string,
    rewardId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const reward = await prisma.loyaltyReward.findFirst({
        where: {
          id: rewardId,
          user_id: userId,
          redeemed: false
        }
      });

      if (!reward) {
        return {
          success: false,
          message: 'Reward not found or already redeemed'
        };
      }

      // Check if reward is expired
      if (reward.expiry_date && new Date() > reward.expiry_date) {
        return {
          success: false,
          message: 'Reward has expired'
        };
      }

      // Process redemption based on reward type
      const redemptionResult = await this.processRewardRedemption(userId, reward);
      
      if (!redemptionResult.success) {
        return redemptionResult;
      }

      // Mark reward as redeemed
      await prisma.loyaltyReward.update({
        where: { id: rewardId },
        data: {
          redeemed: true,
          redeemed_date: new Date()
        }
      });

      return {
        success: true,
        message: redemptionResult.message
      };

    } catch (error) {
      console.error('Error redeeming loyalty reward:', error);
      return {
        success: false,
        message: 'Failed to redeem reward'
      };
    }
  }

  // Helper Methods
  private static calculateUserTier(premiumMonths: number): LoyaltyTier {
    return this.LOYALTY_TIERS
      .reverse()
      .find(tier => premiumMonths >= tier.required_months) || this.LOYALTY_TIERS[0];
  }

  private static getNextTier(currentTier: LoyaltyTier): LoyaltyTier | null {
    const currentIndex = this.LOYALTY_TIERS.findIndex(t => t.tier === currentTier.tier);
    return currentIndex < this.LOYALTY_TIERS.length - 1 ? this.LOYALTY_TIERS[currentIndex + 1] : null;
  }

  private static generateUniqueCode(userId: string): string {
    const prefix = 'WF';
    const userHash = userId.substring(0, 6).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${userHash}${random}`;
  }

  private static async awardLoyaltyReward(
    userId: string,
    rewardType: string,
    rewardValue: number,
    description: string,
    earnedFrom: string,
    expiryDays?: number
  ): Promise<void> {
    const expiryDate = expiryDays ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) : null;

    await prisma.loyaltyReward.create({
      data: {
        user_id: userId,
        reward_type: rewardType,
        reward_value: rewardValue,
        reward_description: description,
        earned_from: earnedFrom,
        earned_date: new Date(),
        redeemed: false,
        expiry_date: expiryDate,
        metadata: {
          awarded_timestamp: new Date().toISOString(),
          auto_awarded: true
        }
      }
    });
  }

  private static async awardLoyaltyPoints(
    userId: string,
    points: number,
    description: string
  ): Promise<void> {
    await this.updateUserLoyalty(userId, {
      total_points: { increment: points },
      available_points: { increment: points }
    });

    await this.awardLoyaltyReward(userId, 'loyalty_points', points, description, 'monthly_loyalty');
  }

  private static async updateUserLoyalty(userId: string, data: any): Promise<void> {
    await prisma.userLoyalty.upsert({
      where: { user_id: userId },
      update: data,
      create: {
        user_id: userId,
        total_points: data.total_points?.increment || 0,
        available_points: data.available_points?.increment || 0,
        referrals_made: data.referrals_made?.increment || 0,
        successful_referrals: data.successful_referrals?.increment || 0,
        current_streak: data.current_streak?.increment || 0
      }
    });
  }

  private static async processRewardRedemption(
    userId: string,
    reward: any
  ): Promise<{ success: boolean; message: string }> {
    switch (reward.reward_type) {
      case 'credit_bonus':
        // Add consultation credits
        await prisma.consultationCredit.updateMany({
          where: { user_id: userId },
          data: { available_credits: { increment: reward.reward_value } }
        });
        return {
          success: true,
          message: `${reward.reward_value} consultation credits added to your account`
        };

      case 'exclusive_discount':
        // Create discount voucher
        await prisma.discountVoucher.create({
          data: {
            user_id: userId,
            discount_percentage: reward.reward_value,
            code: `LOYALTY${Date.now()}`,
            valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            usage_limit: 1,
            description: reward.reward_description
          }
        });
        return {
          success: true,
          message: `${reward.reward_value}% discount voucher created and available in your account`
        };

      case 'free_month':
        // Extend subscription by reward_value months
        const subscription = await prisma.subscription.findFirst({
          where: { user_id: userId, status: 'active' }
        });
        
        if (subscription) {
          const newEndDate = new Date(subscription.end_date);
          newEndDate.setMonth(newEndDate.getMonth() + reward.reward_value);
          
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { end_date: newEndDate }
          });
        }
        
        return {
          success: true,
          message: `${reward.reward_value} month(s) added to your premium subscription`
        };

      default:
        return {
          success: true,
          message: 'Reward redeemed successfully'
        };
    }
  }

  private static async checkPremiumAccess(userId: string): Promise<boolean> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: 'active'
      }
    });
    return subscription !== null;
  }
}