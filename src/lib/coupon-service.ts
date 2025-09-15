// Week 25 Phase 2: Coupon and Discount Management System
// Advanced promotional codes, loyalty discounts, and referral rewards

import prisma from './db';

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'free_trial_extension';
  value: number; // Percentage (0-100) or fixed amount in INR
  minimum_order_amount?: number;
  maximum_discount_amount?: number;
  usage_limit?: number; // Total usage limit
  usage_limit_per_user?: number;
  valid_from: Date;
  valid_until: Date;
  applicable_plans?: string[]; // Which subscription plans this applies to
  first_time_users_only: boolean;
  status: 'active' | 'inactive' | 'expired';
  created_by: string; // User ID of admin who created it
  metadata?: any;
}

export interface CouponUsage {
  id: string;
  coupon_id: string;
  user_id: string;
  order_id?: string;
  subscription_id?: string;
  discount_amount: number;
  original_amount: number;
  final_amount: number;
  used_at: Date;
  status: 'applied' | 'refunded';
}

export interface DiscountValidation {
  valid: boolean;
  discount_amount: number;
  final_amount: number;
  message: string;
  coupon?: Coupon;
}

export interface ReferralProgram {
  referrer_reward: number; // Amount or percentage
  referee_reward: number;  // Amount or percentage for new user
  reward_type: 'percentage' | 'fixed_amount' | 'free_months';
  minimum_subscription_duration: number; // Days before reward is given
  maximum_rewards_per_user: number;
  active: boolean;
}

export class CouponService {
  
  // Predefined coupon types for common scenarios
  private readonly COMMON_COUPONS = {
    NEW_USER_WELCOME: {
      code: 'WELCOME50',
      name: 'New User Welcome',
      type: 'percentage' as const,
      value: 50,
      description: '50% off first month for new users',
      first_time_users_only: true
    },
    YEARLY_DISCOUNT: {
      code: 'YEARLY25',
      name: 'Annual Plan Discount',
      type: 'percentage' as const,
      value: 25,
      description: 'Additional 25% off yearly subscriptions',
      applicable_plans: ['premium_yearly', 'family_yearly']
    },
    FESTIVAL_OFFER: {
      code: 'DIWALI2024',
      name: 'Diwali Special',
      type: 'percentage' as const,
      value: 30,
      description: 'Diwali special - 30% off all plans'
    }
  };

  /**
   * Create a new coupon
   */
  public async createCoupon(
    couponData: Omit<Coupon, 'id' | 'status'>,
    createdBy: string
  ): Promise<{ success: boolean; coupon?: Coupon; message: string }> {
    try {
      // Validate coupon code uniqueness
      const existingCoupon = await prisma.coupon.findFirst({
        where: { 
          code: couponData.code.toUpperCase(),
          status: { in: ['active', 'inactive'] }
        }
      });

      if (existingCoupon) {
        return { 
          success: false, 
          message: 'Coupon code already exists' 
        };
      }

      // Validate dates
      if (couponData.valid_from >= couponData.valid_until) {
        return {
          success: false,
          message: 'Valid from date must be before valid until date'
        };
      }

      // Create coupon
      const coupon = await prisma.coupon.create({
        data: {
          code: couponData.code.toUpperCase(),
          name: couponData.name,
          description: couponData.description,
          type: couponData.type,
          value: couponData.value,
          minimum_order_amount: couponData.minimum_order_amount,
          maximum_discount_amount: couponData.maximum_discount_amount,
          usage_limit: couponData.usage_limit,
          usage_limit_per_user: couponData.usage_limit_per_user || 1,
          valid_from: couponData.valid_from,
          valid_until: couponData.valid_until,
          applicable_plans: couponData.applicable_plans ? 
            JSON.stringify(couponData.applicable_plans) : null,
          first_time_users_only: couponData.first_time_users_only,
          status: 'active',
          created_by: createdBy,
          metadata: couponData.metadata ? JSON.stringify(couponData.metadata) : null
        }
      });

      const couponResponse: Coupon = {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        description: coupon.description || undefined,
        type: coupon.type as Coupon['type'],
        value: coupon.value,
        minimum_order_amount: coupon.minimum_order_amount || undefined,
        maximum_discount_amount: coupon.maximum_discount_amount || undefined,
        usage_limit: coupon.usage_limit || undefined,
        usage_limit_per_user: coupon.usage_limit_per_user || undefined,
        valid_from: coupon.valid_from,
        valid_until: coupon.valid_until,
        applicable_plans: coupon.applicable_plans ? 
          JSON.parse(coupon.applicable_plans) : undefined,
        first_time_users_only: coupon.first_time_users_only,
        status: coupon.status as Coupon['status'],
        created_by: coupon.created_by,
        metadata: coupon.metadata ? JSON.parse(coupon.metadata) : undefined
      };

      return {
        success: true,
        coupon: couponResponse,
        message: 'Coupon created successfully'
      };

    } catch (error) {
      console.error('Error creating coupon:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create coupon'
      };
    }
  }

  /**
   * Validate and calculate discount for a coupon
   */
  public async validateCoupon(
    couponCode: string,
    userId: string,
    orderAmount: number,
    planId?: string
  ): Promise<DiscountValidation> {
    try {
      // Get coupon
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: couponCode.toUpperCase(),
          status: 'active'
        }
      });

      if (!coupon) {
        return {
          valid: false,
          discount_amount: 0,
          final_amount: orderAmount,
          message: 'Invalid or expired coupon code'
        };
      }

      // Check date validity
      const now = new Date();
      if (now < coupon.valid_from || now > coupon.valid_until) {
        return {
          valid: false,
          discount_amount: 0,
          final_amount: orderAmount,
          message: 'Coupon is not currently valid'
        };
      }

      // Check minimum order amount
      if (coupon.minimum_order_amount && orderAmount < coupon.minimum_order_amount) {
        return {
          valid: false,
          discount_amount: 0,
          final_amount: orderAmount,
          message: `Minimum order amount is ₹${coupon.minimum_order_amount}`
        };
      }

      // Check plan eligibility
      if (coupon.applicable_plans && planId) {
        const applicablePlans = JSON.parse(coupon.applicable_plans);
        if (!applicablePlans.includes(planId)) {
          return {
            valid: false,
            discount_amount: 0,
            final_amount: orderAmount,
            message: 'Coupon not applicable to selected plan'
          };
        }
      }

      // Check first-time user restriction
      if (coupon.first_time_users_only) {
        const hasExistingSubscription = await prisma.subscription.findFirst({
          where: { 
            user_id: userId,
            status: { in: ['active', 'trialing', 'cancelled', 'past_due'] }
          }
        });

        if (hasExistingSubscription) {
          return {
            valid: false,
            discount_amount: 0,
            final_amount: orderAmount,
            message: 'Coupon only valid for first-time users'
          };
        }
      }

      // Check total usage limit
      if (coupon.usage_limit) {
        const totalUsage = await prisma.couponUsage.count({
          where: { 
            coupon_id: coupon.id,
            status: 'applied'
          }
        });

        if (totalUsage >= coupon.usage_limit) {
          return {
            valid: false,
            discount_amount: 0,
            final_amount: orderAmount,
            message: 'Coupon usage limit exceeded'
          };
        }
      }

      // Check per-user usage limit
      const userUsage = await prisma.couponUsage.count({
        where: {
          coupon_id: coupon.id,
          user_id: userId,
          status: 'applied'
        }
      });

      if (userUsage >= (coupon.usage_limit_per_user || 1)) {
        return {
          valid: false,
          discount_amount: 0,
          final_amount: orderAmount,
          message: 'You have already used this coupon'
        };
      }

      // Calculate discount
      let discountAmount = 0;
      
      switch (coupon.type) {
        case 'percentage':
          discountAmount = Math.round((orderAmount * coupon.value / 100) * 100) / 100;
          break;
        case 'fixed_amount':
          discountAmount = Math.min(coupon.value, orderAmount);
          break;
        case 'free_trial_extension':
          // For trial extensions, no monetary discount
          discountAmount = 0;
          break;
      }

      // Apply maximum discount limit
      if (coupon.maximum_discount_amount && discountAmount > coupon.maximum_discount_amount) {
        discountAmount = coupon.maximum_discount_amount;
      }

      const finalAmount = Math.max(0, orderAmount - discountAmount);

      return {
        valid: true,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        message: 'Coupon applied successfully',
        coupon: {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          description: coupon.description || undefined,
          type: coupon.type as Coupon['type'],
          value: coupon.value,
          minimum_order_amount: coupon.minimum_order_amount || undefined,
          maximum_discount_amount: coupon.maximum_discount_amount || undefined,
          usage_limit: coupon.usage_limit || undefined,
          usage_limit_per_user: coupon.usage_limit_per_user || undefined,
          valid_from: coupon.valid_from,
          valid_until: coupon.valid_until,
          applicable_plans: coupon.applicable_plans ? 
            JSON.parse(coupon.applicable_plans) : undefined,
          first_time_users_only: coupon.first_time_users_only,
          status: coupon.status as Coupon['status'],
          created_by: coupon.created_by,
          metadata: coupon.metadata ? JSON.parse(coupon.metadata) : undefined
        }
      };

    } catch (error) {
      console.error('Error validating coupon:', error);
      return {
        valid: false,
        discount_amount: 0,
        final_amount: orderAmount,
        message: 'Error validating coupon'
      };
    }
  }

  /**
   * Apply coupon and record usage
   */
  public async applyCoupon(
    couponCode: string,
    userId: string,
    orderAmount: number,
    orderId?: string,
    subscriptionId?: string,
    planId?: string
  ): Promise<{ success: boolean; usage?: CouponUsage; message: string }> {
    try {
      // Validate coupon first
      const validation = await this.validateCoupon(couponCode, userId, orderAmount, planId);
      
      if (!validation.valid || !validation.coupon) {
        return { 
          success: false, 
          message: validation.message 
        };
      }

      // Record coupon usage
      const usage = await prisma.couponUsage.create({
        data: {
          coupon_id: validation.coupon.id,
          user_id: userId,
          order_id: orderId,
          subscription_id: subscriptionId,
          discount_amount: validation.discount_amount,
          original_amount: orderAmount,
          final_amount: validation.final_amount,
          used_at: new Date(),
          status: 'applied'
        }
      });

      return {
        success: true,
        usage: {
          id: usage.id,
          coupon_id: usage.coupon_id,
          user_id: usage.user_id,
          order_id: usage.order_id || undefined,
          subscription_id: usage.subscription_id || undefined,
          discount_amount: usage.discount_amount,
          original_amount: usage.original_amount,
          final_amount: usage.final_amount,
          used_at: usage.used_at,
          status: usage.status as CouponUsage['status']
        },
        message: `Coupon applied! You saved ₹${validation.discount_amount}`
      };

    } catch (error) {
      console.error('Error applying coupon:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to apply coupon'
      };
    }
  }

  /**
   * Handle referral program
   */
  public async processReferral(
    referrerUserId: string,
    newUserId: string,
    subscriptionId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get referral program settings
      const referralProgram = await this.getReferralProgramSettings();
      
      if (!referralProgram.active) {
        return { success: false, message: 'Referral program is not active' };
      }

      // Check if referrer has reached maximum rewards
      const referrerRewardCount = await prisma.referralReward.count({
        where: { referrer_id: referrerUserId }
      });

      if (referrerRewardCount >= referralProgram.maximum_rewards_per_user) {
        return { success: false, message: 'Referrer has reached maximum rewards' };
      }

      // Create referral record
      await prisma.referral.create({
        data: {
          referrer_id: referrerUserId,
          referee_id: newUserId,
          subscription_id: subscriptionId,
          status: 'pending',
          reward_pending: true,
          created_at: new Date()
        }
      });

      // Schedule reward processing after minimum subscription duration
      // In production, this would be handled by a background job
      setTimeout(async () => {
        await this.processReferralRewards(referrerUserId, newUserId, subscriptionId);
      }, referralProgram.minimum_subscription_duration * 24 * 60 * 60 * 1000);

      return {
        success: true,
        message: 'Referral recorded successfully. Rewards will be processed after minimum subscription period.'
      };

    } catch (error) {
      console.error('Error processing referral:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process referral'
      };
    }
  }

  /**
   * Get user's available coupons
   */
  public async getUserAvailableCoupons(
    userId: string,
    planId?: string,
    orderAmount?: number
  ): Promise<Coupon[]> {
    try {
      const now = new Date();
      
      // Get active coupons
      let coupons = await prisma.coupon.findMany({
        where: {
          status: 'active',
          valid_from: { lte: now },
          valid_until: { gte: now }
        },
        orderBy: { valid_until: 'asc' }
      });

      const availableCoupons: Coupon[] = [];

      for (const coupon of coupons) {
        // Check if user can use this coupon
        const validation = await this.validateCoupon(
          coupon.code, 
          userId, 
          orderAmount || 999999, // Use high amount if not specified
          planId
        );

        if (validation.valid) {
          availableCoupons.push({
            id: coupon.id,
            code: coupon.code,
            name: coupon.name,
            description: coupon.description || undefined,
            type: coupon.type as Coupon['type'],
            value: coupon.value,
            minimum_order_amount: coupon.minimum_order_amount || undefined,
            maximum_discount_amount: coupon.maximum_discount_amount || undefined,
            usage_limit: coupon.usage_limit || undefined,
            usage_limit_per_user: coupon.usage_limit_per_user || undefined,
            valid_from: coupon.valid_from,
            valid_until: coupon.valid_until,
            applicable_plans: coupon.applicable_plans ? 
              JSON.parse(coupon.applicable_plans) : undefined,
            first_time_users_only: coupon.first_time_users_only,
            status: coupon.status as Coupon['status'],
            created_by: coupon.created_by,
            metadata: coupon.metadata ? JSON.parse(coupon.metadata) : undefined
          });
        }
      }

      return availableCoupons;

    } catch (error) {
      console.error('Error getting user available coupons:', error);
      return [];
    }
  }

  // Private helper methods

  private async getReferralProgramSettings(): Promise<ReferralProgram> {
    // In production, this would come from database settings
    return {
      referrer_reward: 50, // ₹50 credit
      referee_reward: 25,  // ₹25 discount on first subscription
      reward_type: 'fixed_amount',
      minimum_subscription_duration: 30, // 30 days
      maximum_rewards_per_user: 10,
      active: true
    };
  }

  private async processReferralRewards(
    referrerUserId: string, 
    newUserId: string, 
    subscriptionId: string
  ): Promise<void> {
    try {
      // Check if new user's subscription is still active
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId }
      });

      if (!subscription || subscription.status !== 'active') {
        return; // Don't process rewards for inactive subscriptions
      }

      const referralProgram = await this.getReferralProgramSettings();

      // Create rewards for both users
      await Promise.all([
        // Referrer reward
        prisma.referralReward.create({
          data: {
            referrer_id: referrerUserId,
            referee_id: newUserId,
            reward_type: 'credit',
            reward_amount: referralProgram.referrer_reward,
            status: 'completed',
            processed_at: new Date()
          }
        }),
        // Referee reward (create coupon for next subscription)
        this.createPersonalizedCoupon(
          newUserId,
          'REFERRAL_REWARD',
          referralProgram.referee_reward
        )
      ]);

      // Update referral status
      await prisma.referral.updateMany({
        where: {
          referrer_id: referrerUserId,
          referee_id: newUserId,
          subscription_id: subscriptionId
        },
        data: {
          status: 'completed',
          reward_pending: false,
          rewards_processed_at: new Date()
        }
      });

    } catch (error) {
      console.error('Error processing referral rewards:', error);
    }
  }

  private async createPersonalizedCoupon(
    userId: string,
    baseCode: string,
    discountAmount: number
  ): Promise<void> {
    const couponCode = `${baseCode}_${userId.slice(-6).toUpperCase()}`;
    
    await prisma.coupon.create({
      data: {
        code: couponCode,
        name: 'Referral Reward',
        description: `₹${discountAmount} off your next subscription`,
        type: 'fixed_amount',
        value: discountAmount,
        usage_limit: 1,
        usage_limit_per_user: 1,
        valid_from: new Date(),
        valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        first_time_users_only: false,
        status: 'active',
        created_by: 'system',
        metadata: JSON.stringify({
          personal_coupon: true,
          eligible_user: userId,
          created_for: 'referral_reward'
        })
      }
    });
  }
}

// Export singleton instance
export const couponService = new CouponService();