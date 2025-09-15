// Week 26 Phase 2: Expert Consultation Credit System
// Manage consultation credits for premium users with expert access

import prisma from './db';

export interface ConsultationCreditAllocation {
  monthly_credits: number;
  emergency_credits: number;
  rollover_limit: number;
  credit_types: {
    text_consultation: number;
    video_consultation: number;
    emergency_consultation: number;
    follow_up: number;
  };
}

export interface CreditUsage {
  user_id: string;
  consultation_type: 'text' | 'video' | 'emergency' | 'follow_up';
  credits_used: number;
  expert_id: string;
  consultation_id: string;
  used_at: Date;
}

export interface CreditBalance {
  total_credits: number;
  used_credits: number;
  available_credits: number;
  emergency_credits: number;
  rollover_credits: number;
  next_refresh_date: Date;
  subscription_tier: string;
}

export class ExpertConsultationCreditService {

  /**
   * Premium credit allocation per subscription tier
   */
  private static readonly CREDIT_ALLOCATIONS: { [tier: string]: ConsultationCreditAllocation } = {
    'premium': {
      monthly_credits: 5,
      emergency_credits: 2,
      rollover_limit: 3,
      credit_types: {
        text_consultation: 1,
        video_consultation: 2,
        emergency_consultation: 3,
        follow_up: 0.5
      }
    },
    'premium_plus': {
      monthly_credits: 10,
      emergency_credits: 5,
      rollover_limit: 5,
      credit_types: {
        text_consultation: 1,
        video_consultation: 2,
        emergency_consultation: 2,
        follow_up: 0.5
      }
    }
  };

  /**
   * Get user's current credit balance
   */
  static async getCreditBalance(userId: string): Promise<CreditBalance | null> {
    try {
      // Check premium subscription
      const subscription = await prisma.subscription.findFirst({
        where: {
          user_id: userId,
          status: 'active'
        }
      });

      if (!subscription) {
        return null; // Not premium user
      }

      // Get current credit record
      let creditRecord = await prisma.consultationCredit.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' }
      });

      // Create initial credit record if doesn't exist
      if (!creditRecord) {
        creditRecord = await this.initializeUserCredits(userId, subscription.plan_type);
      }

      // Check if credits need refresh (monthly cycle)
      const needsRefresh = this.shouldRefreshCredits(creditRecord.last_refresh_date);
      if (needsRefresh) {
        creditRecord = await this.refreshMonthlyCredits(userId, subscription.plan_type);
      }

      // Calculate usage for current period
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const usageThisMonth = await prisma.consultationCredit.aggregate({
        where: {
          user_id: userId,
          created_at: { gte: currentMonth }
        },
        _sum: { credits_used: true }
      });

      const usedCredits = usageThisMonth._sum.credits_used || 0;

      return {
        total_credits: creditRecord.available_credits + usedCredits,
        used_credits: usedCredits,
        available_credits: creditRecord.available_credits,
        emergency_credits: creditRecord.emergency_credits_remaining,
        rollover_credits: creditRecord.rollover_credits,
        next_refresh_date: this.getNextRefreshDate(creditRecord.last_refresh_date),
        subscription_tier: subscription.plan_type
      };

    } catch (error) {
      console.error('Error fetching credit balance:', error);
      throw new Error('Failed to fetch credit balance');
    }
  }

  /**
   * Use credits for a consultation
   */
  static async useCredits(
    userId: string,
    consultationType: 'text' | 'video' | 'emergency' | 'follow_up',
    expertId: string,
    consultationId: string
  ): Promise<{ success: boolean; message: string; remaining_credits?: number }> {
    try {
      const creditBalance = await this.getCreditBalance(userId);
      
      if (!creditBalance) {
        return {
          success: false,
          message: 'Premium subscription required for expert consultations. Upgrade to ₹99/month for instant access.'
        };
      }

      // Get credit cost for consultation type
      const subscription = await prisma.subscription.findFirst({
        where: { user_id: userId, status: 'active' }
      });

      const allocation = this.CREDIT_ALLOCATIONS[subscription!.plan_type] || this.CREDIT_ALLOCATIONS['premium'];
      const creditsRequired = allocation.credit_types[consultationType];

      // Check if user has enough credits
      if (consultationType === 'emergency') {
        if (creditBalance.emergency_credits < creditsRequired) {
          return {
            success: false,
            message: `Insufficient emergency credits. Need ${creditsRequired} credits, have ${creditBalance.emergency_credits}.`
          };
        }
      } else {
        if (creditBalance.available_credits < creditsRequired) {
          return {
            success: false,
            message: `Insufficient credits. Need ${creditsRequired} credits, have ${creditBalance.available_credits}. Next refresh: ${creditBalance.next_refresh_date.toLocaleDateString()}.`
          };
        }
      }

      // Deduct credits
      let updateData: any = {
        credits_used: { increment: creditsRequired },
        last_used_at: new Date()
      };

      if (consultationType === 'emergency') {
        updateData.emergency_credits_remaining = { decrement: creditsRequired };
      } else {
        updateData.available_credits = { decrement: creditsRequired };
      }

      await prisma.consultationCredit.updateMany({
        where: { user_id: userId },
        data: updateData
      });

      // Log the credit usage
      await prisma.consultationCredit.create({
        data: {
          user_id: userId,
          consultation_type: consultationType,
          credits_used: creditsRequired,
          expert_id: expertId,
          consultation_id: consultationId,
          credit_balance_after: consultationType === 'emergency' 
            ? creditBalance.emergency_credits - creditsRequired
            : creditBalance.available_credits - creditsRequired,
          metadata: {
            consultation_type: consultationType,
            expert_id: expertId,
            timestamp: new Date().toISOString()
          }
        }
      });

      const remainingCredits = consultationType === 'emergency' 
        ? creditBalance.emergency_credits - creditsRequired
        : creditBalance.available_credits - creditsRequired;

      return {
        success: true,
        message: `Successfully used ${creditsRequired} ${consultationType === 'emergency' ? 'emergency ' : ''}credits. ${remainingCredits} credits remaining.`,
        remaining_credits: remainingCredits
      };

    } catch (error) {
      console.error('Error using credits:', error);
      return {
        success: false,
        message: 'Failed to process credit usage. Please try again.'
      };
    }
  }

  /**
   * Get user's consultation history with credit usage
   */
  static async getConsultationHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const isPremium = await this.checkPremiumAccess(userId);
      if (!isPremium) {
        return [];
      }

      const consultations = await prisma.expertConsultation.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        include: {
          expert: {
            select: {
              id: true,
              name: true,
              ExpertProfile: {
                select: {
                  specializations: true,
                  rating_average: true,
                  consultation_count: true
                }
              }
            }
          },
          dog: {
            select: { id: true, name: true, breed: true }
          },
          credit_usage: true
        }
      });

      return consultations.map(consultation => ({
        id: consultation.id,
        dog: consultation.dog,
        expert: {
          id: consultation.expert.id,
          name: consultation.expert.name,
          specializations: consultation.expert.ExpertProfile?.specializations || [],
          rating: consultation.expert.ExpertProfile?.rating_average || 0,
          total_consultations: consultation.expert.ExpertProfile?.consultation_count || 0
        },
        consultation_type: consultation.consultation_type,
        question: consultation.question,
        status: consultation.status,
        created_at: consultation.created_at,
        responded_at: consultation.responded_at,
        rating: consultation.rating,
        is_follow_up: consultation.is_follow_up,
        credits_used: consultation.credit_usage?.credits_used || 0,
        consultation_cost: this.getConsultationCost(consultation.consultation_type),
        response_time_hours: consultation.responded_at && consultation.created_at
          ? Math.round((consultation.responded_at.getTime() - consultation.created_at.getTime()) / (1000 * 60 * 60))
          : null
      }));

    } catch (error) {
      console.error('Error fetching consultation history:', error);
      throw new Error('Failed to fetch consultation history');
    }
  }

  /**
   * Purchase additional credits (one-time purchase)
   */
  static async purchaseAdditionalCredits(
    userId: string,
    creditCount: number,
    paymentId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const isPremium = await this.checkPremiumAccess(userId);
      if (!isPremium) {
        return {
          success: false,
          message: 'Premium subscription required to purchase additional credits'
        };
      }

      // Add purchased credits to user's account
      const existingRecord = await prisma.consultationCredit.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' }
      });

      if (!existingRecord) {
        return {
          success: false,
          message: 'No credit record found. Please contact support.'
        };
      }

      await prisma.consultationCredit.update({
        where: { id: existingRecord.id },
        data: {
          available_credits: { increment: creditCount },
          purchased_credits_total: { increment: creditCount }
        }
      });

      // Log the purchase
      await prisma.consultationCredit.create({
        data: {
          user_id: userId,
          consultation_type: 'credit_purchase',
          credits_used: -creditCount, // Negative indicates addition
          payment_id: paymentId,
          credit_balance_after: existingRecord.available_credits + creditCount,
          metadata: {
            purchase_type: 'additional_credits',
            credit_count: creditCount,
            payment_id: paymentId,
            timestamp: new Date().toISOString()
          }
        }
      });

      return {
        success: true,
        message: `Successfully purchased ${creditCount} credits. Your new balance is ${existingRecord.available_credits + creditCount} credits.`
      };

    } catch (error) {
      console.error('Error purchasing credits:', error);
      return {
        success: false,
        message: 'Failed to purchase credits. Please try again.'
      };
    }
  }

  /**
   * Get available experts for consultation
   */
  static async getAvailableExperts(
    specialization?: string,
    consultationType: 'text' | 'video' | 'emergency' = 'text'
  ): Promise<any[]> {
    try {
      const whereClause: any = {
        verification_status: 'verified',
        availability_status: 'available'
      };

      if (specialization) {
        whereClause.specializations = {
          hasSome: [specialization]
        };
      }

      // For emergency consultations, prioritize experts with emergency availability
      if (consultationType === 'emergency') {
        whereClause.emergency_available = true;
      }

      const experts = await prisma.expertProfile.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: [
          { response_time_hours: 'asc' },
          { rating_average: 'desc' },
          { consultation_count: 'desc' }
        ],
        take: consultationType === 'emergency' ? 5 : 20
      });

      return experts.map(expert => ({
        id: expert.user.id,
        name: expert.user.name,
        specializations: expert.specializations,
        rating: expert.rating_average,
        total_consultations: expert.consultation_count,
        response_time: `${expert.response_time_hours} hours`,
        languages: expert.languages_spoken,
        experience_years: expert.experience_years,
        consultation_rate: expert.consultation_rate_per_session,
        available_slots: expert.available_time_slots,
        emergency_available: expert.emergency_available,
        video_consultation_enabled: expert.video_consultation_enabled,
        consultation_cost: this.getConsultationCost(consultationType)
      }));

    } catch (error) {
      console.error('Error fetching available experts:', error);
      throw new Error('Failed to fetch available experts');
    }
  }

  // Helper Methods
  private static async initializeUserCredits(userId: string, planType: string) {
    const allocation = this.CREDIT_ALLOCATIONS[planType] || this.CREDIT_ALLOCATIONS['premium'];
    
    return await prisma.consultationCredit.create({
      data: {
        user_id: userId,
        available_credits: allocation.monthly_credits,
        emergency_credits_remaining: allocation.emergency_credits,
        rollover_credits: 0,
        credits_used: 0,
        last_refresh_date: new Date(),
        subscription_tier: planType,
        metadata: {
          initialized: true,
          plan_type: planType,
          timestamp: new Date().toISOString()
        }
      }
    });
  }

  private static async refreshMonthlyCredits(userId: string, planType: string) {
    const allocation = this.CREDIT_ALLOCATIONS[planType] || this.CREDIT_ALLOCATIONS['premium'];
    
    // Get current record to calculate rollover
    const currentRecord = await prisma.consultationCredit.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });

    const rolloverCredits = Math.min(
      currentRecord?.available_credits || 0, 
      allocation.rollover_limit
    );

    return await prisma.consultationCredit.update({
      where: { id: currentRecord!.id },
      data: {
        available_credits: allocation.monthly_credits + rolloverCredits,
        emergency_credits_remaining: allocation.emergency_credits,
        rollover_credits: rolloverCredits,
        credits_used: 0, // Reset monthly usage
        last_refresh_date: new Date()
      }
    });
  }

  private static shouldRefreshCredits(lastRefreshDate: Date): boolean {
    const now = new Date();
    const lastRefresh = new Date(lastRefreshDate);
    
    // Refresh if it's a new month
    return now.getMonth() !== lastRefresh.getMonth() || 
           now.getFullYear() !== lastRefresh.getFullYear();
  }

  private static getNextRefreshDate(lastRefreshDate: Date): Date {
    const nextRefresh = new Date(lastRefreshDate);
    nextRefresh.setMonth(nextRefresh.getMonth() + 1);
    nextRefresh.setDate(1);
    nextRefresh.setHours(0, 0, 0, 0);
    return nextRefresh;
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

  private static getConsultationCost(consultationType: string): number {
    const costs = {
      text: 1,
      video: 2,
      emergency: 3,
      follow_up: 0.5
    };
    return costs[consultationType as keyof typeof costs] || 1;
  }
}