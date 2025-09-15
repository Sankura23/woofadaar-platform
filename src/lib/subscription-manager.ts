// Week 25 Phase 1: Enhanced Subscription Management System
// Advanced subscription lifecycle management with dunning, retries, and family plans

import prisma from './db';
import { razorpayClient, SUBSCRIPTION_PLANS } from './razorpay';

export interface EnhancedSubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number; // in INR
  currency: string;
  interval: 'month' | 'year';
  trialDays: number;
  features: string[];
  limits: {
    dogs?: number | 'unlimited';
    healthLogs?: number | 'unlimited';
    expertConsultations?: number | 'unlimited';
    photoStorage?: number | 'unlimited';
    familyMembers?: number;
  };
  benefits: string[];
  popular?: boolean;
  discountPercentage?: number;
  razorpayPlanId?: string;
}

export interface SubscriptionStatus {
  isActive: boolean;
  plan: EnhancedSubscriptionPlan | null;
  trialStatus: {
    inTrial: boolean;
    daysRemaining: number;
    trialEndDate: Date | null;
  };
  billingInfo: {
    nextBillingDate: Date | null;
    lastPaymentDate: Date | null;
    amount: number;
    currency: string;
    billingCycle: string;
  };
  paymentIssues: {
    hasIssues: boolean;
    failedAttempts: number;
    nextRetryDate: Date | null;
    gracePeriodEnd: Date | null;
  };
}

export const ENHANCED_SUBSCRIPTION_PLANS: EnhancedSubscriptionPlan[] = [
  {
    id: 'premium_monthly',
    name: 'Premium Paw',
    displayName: 'Premium Monthly',
    description: 'Perfect for dedicated dog parents who want full access to premium features',
    price: 99,
    currency: 'INR',
    interval: 'month',
    trialDays: 14,
    features: [
      'Unlimited health tracking',
      'Priority vet consultations',
      'Advanced health analytics',
      'Ad-free experience',
      'Custom Dog ID designs',
      'Health report exports',
      'Priority customer support',
      'Unlimited photo storage',
      'Expert webinars access'
    ],
    limits: {
      dogs: 'unlimited',
      healthLogs: 'unlimited',
      expertConsultations: 'unlimited',
      photoStorage: 'unlimited'
    },
    benefits: [
      'Save time with automated health tracking',
      'Get expert advice when you need it',
      'Beautiful custom Dog IDs',
      'Peace of mind with comprehensive records'
    ],
    razorpayPlanId: process.env.RAZORPAY_PREMIUM_MONTHLY_PLAN_ID
  },
  {
    id: 'premium_yearly',
    name: 'Premium Paw',
    displayName: 'Premium Yearly',
    description: 'Best value plan with 2 months free - ideal for committed dog parents',
    price: 990, // ₹99 * 10 months (2 months free)
    currency: 'INR',
    interval: 'year',
    trialDays: 14,
    features: [
      'All Premium Monthly features',
      '2 months free (₹198 savings)',
      'Priority feature requests',
      'Exclusive yearly member perks',
      'Advanced health trend analysis',
      'Premium community access'
    ],
    limits: {
      dogs: 'unlimited',
      healthLogs: 'unlimited',
      expertConsultations: 'unlimited',
      photoStorage: 'unlimited'
    },
    benefits: [
      '17% savings compared to monthly',
      'Locked-in pricing for full year',
      'Exclusive yearly member benefits',
      'Priority support and features'
    ],
    popular: true,
    discountPercentage: 17,
    razorpayPlanId: process.env.RAZORPAY_PREMIUM_YEARLY_PLAN_ID
  },
  {
    id: 'family_monthly',
    name: 'Family Pack',
    displayName: 'Family Monthly',
    description: 'Perfect for households with multiple dog parents and pets',
    price: 149,
    currency: 'INR',
    interval: 'month',
    trialDays: 14,
    features: [
      'All Premium features',
      'Up to 5 family member accounts',
      'Shared dog profiles',
      'Family health dashboard',
      'Group vet consultations',
      'Family challenges and rewards',
      'Shared photo albums',
      'Multi-user calendar sync'
    ],
    limits: {
      dogs: 'unlimited',
      healthLogs: 'unlimited',
      expertConsultations: 'unlimited',
      photoStorage: 'unlimited',
      familyMembers: 5
    },
    benefits: [
      'Perfect for multi-pet families',
      'Share responsibilities across family',
      'Coordinated care for all pets',
      'Better value than multiple accounts'
    ],
    razorpayPlanId: process.env.RAZORPAY_FAMILY_MONTHLY_PLAN_ID
  },
  {
    id: 'family_yearly',
    name: 'Family Pack',
    displayName: 'Family Yearly',
    description: 'Ultimate family plan with maximum savings',
    price: 1490, // ₹149 * 10 months
    currency: 'INR',
    interval: 'year',
    trialDays: 14,
    features: [
      'All Family Monthly features',
      '2 months free (₹298 savings)',
      'Family priority support',
      'Exclusive family challenges',
      'Advanced family insights',
      'Premium family community access'
    ],
    limits: {
      dogs: 'unlimited',
      healthLogs: 'unlimited',
      expertConsultations: 'unlimited',
      photoStorage: 'unlimited',
      familyMembers: 5
    },
    benefits: [
      'Maximum family value',
      'Year-round family coordination',
      '17% savings vs monthly',
      'Premium family experience'
    ],
    discountPercentage: 17,
    razorpayPlanId: process.env.RAZORPAY_FAMILY_YEARLY_PLAN_ID
  }
];

export class AdvancedSubscriptionManager {
  /**
   * Get user's current subscription status with comprehensive details
   */
  public async getUserSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          user_id: userId,
          status: { in: ['active', 'trialing', 'past_due', 'paused'] }
        },
        orderBy: { created_at: 'desc' }
      });

      if (!subscription) {
        return {
          isActive: false,
          plan: null,
          trialStatus: {
            inTrial: false,
            daysRemaining: 0,
            trialEndDate: null
          },
          billingInfo: {
            nextBillingDate: null,
            lastPaymentDate: null,
            amount: 0,
            currency: 'INR',
            billingCycle: ''
          },
          paymentIssues: {
            hasIssues: false,
            failedAttempts: 0,
            nextRetryDate: null,
            gracePeriodEnd: null
          }
        };
      }

      // Get plan details
      const planId = this.extractPlanIdFromMetadata(subscription);
      const plan = this.getPlanById(planId) || null;

      // Calculate trial status
      const now = new Date();
      const trialEndDate = subscription.trial_end_date;
      const inTrial = trialEndDate && now < trialEndDate;
      const daysRemaining = trialEndDate ? 
        Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

      // Get payment issues
      const paymentIssues = await this.getPaymentIssues(userId);

      // Get last payment
      const lastPayment = await prisma.payment.findFirst({
        where: {
          user_id: userId,
          subscription_id: subscription.id,
          status: 'paid'
        },
        orderBy: { created_at: 'desc' }
      });

      return {
        isActive: ['active', 'trialing'].includes(subscription.status),
        plan,
        trialStatus: {
          inTrial: !!inTrial,
          daysRemaining,
          trialEndDate
        },
        billingInfo: {
          nextBillingDate: subscription.end_date,
          lastPaymentDate: lastPayment?.created_at || null,
          amount: subscription.amount_paid,
          currency: subscription.currency,
          billingCycle: subscription.billing_cycle
        },
        paymentIssues
      };

    } catch (error) {
      console.error('Error getting subscription status:', error);
      throw error;
    }
  }

  /**
   * Create or upgrade subscription with enhanced features
   */
  public async createSubscription(
    userId: string,
    planId: string,
    paymentMethodId?: string,
    prorationMode: 'immediate' | 'next_cycle' = 'immediate'
  ): Promise<{
    success: boolean;
    subscriptionId?: string;
    trialEndDate?: Date;
    nextBillingDate?: Date;
    prorationAmount?: number;
    message: string;
  }> {
    try {
      const plan = this.getPlanById(planId);
      if (!plan) {
        return { success: false, message: 'Invalid subscription plan' };
      }

      // Check for existing subscription
      const existingSubscription = await this.getUserSubscriptionStatus(userId);
      
      if (existingSubscription.isActive) {
        // Handle upgrade/downgrade
        return await this.changeSubscription(userId, planId, prorationMode);
      }

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, phone: true }
      });

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Calculate dates
      const now = new Date();
      const trialEndDate = new Date(now);
      trialEndDate.setDate(trialEndDate.getDate() + plan.trialDays);
      
      const nextBillingDate = new Date(trialEndDate);
      if (plan.interval === 'year') {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      } else {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      }

      // Create subscription in database
      const subscription = await prisma.subscription.create({
        data: {
          user_id: userId,
          plan_type: plan.name,
          status: 'trialing',
          start_date: now,
          trial_end_date: trialEndDate,
          end_date: nextBillingDate,
          amount_paid: 0, // No charge during trial
          currency: plan.currency,
          billing_cycle: plan.interval === 'year' ? 'yearly' : 'monthly',
          auto_renew: true,
          metadata: JSON.stringify({
            plan_id: planId,
            plan_name: plan.name,
            trial_days: plan.trialDays,
            features: plan.features,
            limits: plan.limits,
            created_via: 'api'
          })
        }
      });

      // Create Razorpay subscription if plan has Razorpay Plan ID
      if (plan.razorpayPlanId) {
        try {
          const razorpaySubscription = await razorpayClient.createSubscription({
            plan_id: plan.razorpayPlanId,
            customer_notify: true,
            total_count: plan.interval === 'year' ? 10 : 120, // 10 years or 10 years monthly
            start_at: Math.floor(trialEndDate.getTime() / 1000),
            notes: {
              user_id: userId,
              user_name: user.name || '',
              plan_id: planId,
              subscription_id: subscription.id
            }
          });

          // Update subscription with Razorpay ID
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              metadata: JSON.stringify({
                ...JSON.parse(subscription.metadata || '{}'),
                razorpay_subscription_id: razorpaySubscription.id
              })
            }
          });
        } catch (razorpayError) {
          console.error('Failed to create Razorpay subscription:', razorpayError);
          // Continue without Razorpay subscription - will handle manually
        }
      }

      return {
        success: true,
        subscriptionId: subscription.id,
        trialEndDate,
        nextBillingDate,
        message: `Successfully subscribed to ${plan.name} with ${plan.trialDays}-day trial`
      };

    } catch (error) {
      console.error('Error creating subscription:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create subscription'
      };
    }
  }

  /**
   * Handle subscription upgrades and downgrades with proration
   */
  public async changeSubscription(
    userId: string,
    newPlanId: string,
    prorationMode: 'immediate' | 'next_cycle' = 'immediate'
  ): Promise<{
    success: boolean;
    prorationAmount?: number;
    effectiveDate?: Date;
    message: string;
  }> {
    try {
      const currentStatus = await this.getUserSubscriptionStatus(userId);
      if (!currentStatus.isActive || !currentStatus.plan) {
        return { success: false, message: 'No active subscription found' };
      }

      const newPlan = this.getPlanById(newPlanId);
      if (!newPlan) {
        return { success: false, message: 'Invalid new plan' };
      }

      const currentPlan = currentStatus.plan;
      
      // Calculate proration
      const prorationResult = this.calculateProration(
        currentPlan,
        newPlan,
        currentStatus.billingInfo.nextBillingDate!,
        prorationMode
      );

      // Get current subscription
      const subscription = await prisma.subscription.findFirst({
        where: {
          user_id: userId,
          status: { in: ['active', 'trialing'] }
        }
      });

      if (!subscription) {
        return { success: false, message: 'Current subscription not found' };
      }

      if (prorationMode === 'immediate') {
        // Apply change immediately
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            plan_type: newPlan.name,
            amount_paid: newPlan.price,
            billing_cycle: newPlan.interval === 'year' ? 'yearly' : 'monthly',
            metadata: JSON.stringify({
              ...JSON.parse(subscription.metadata || '{}'),
              plan_id: newPlanId,
              plan_name: newPlan.name,
              changed_from: currentPlan.id,
              change_date: new Date().toISOString(),
              proration_amount: prorationResult.amount
            }),
            updated_at: new Date()
          }
        });

        // Create proration payment record if needed
        if (prorationResult.amount > 0) {
          await prisma.payment.create({
            data: {
              user_id: userId,
              subscription_id: subscription.id,
              amount: prorationResult.amount,
              currency: 'INR',
              status: 'pending',
              payment_method: 'proration',
              invoice_number: `PRO-${Date.now()}`,
              metadata: JSON.stringify({
                type: 'proration',
                from_plan: currentPlan.id,
                to_plan: newPlanId,
                calculation: prorationResult
              })
            }
          });
        }

        return {
          success: true,
          prorationAmount: prorationResult.amount,
          effectiveDate: new Date(),
          message: `Successfully ${prorationResult.amount >= 0 ? 'upgraded' : 'downgraded'} to ${newPlan.name}`
        };

      } else {
        // Schedule change for next billing cycle
        await prisma.subscriptionChange.create({
          data: {
            user_id: userId,
            subscription_id: subscription.id,
            from_plan_id: currentPlan.id,
            to_plan_id: newPlanId,
            change_type: newPlan.price > currentPlan.price ? 'upgrade' : 'downgrade',
            scheduled_date: currentStatus.billingInfo.nextBillingDate!,
            proration_amount: 0, // No proration for next cycle changes
            status: 'scheduled'
          }
        });

        return {
          success: true,
          effectiveDate: currentStatus.billingInfo.nextBillingDate!,
          message: `Scheduled ${newPlan.price > currentPlan.price ? 'upgrade' : 'downgrade'} to ${newPlan.name} for next billing cycle`
        };
      }

    } catch (error) {
      console.error('Error changing subscription:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to change subscription'
      };
    }
  }

  /**
   * Cancel subscription with options
   */
  public async cancelSubscription(
    userId: string,
    cancelAtPeriodEnd: boolean = true,
    cancellationReason?: string
  ): Promise<{
    success: boolean;
    effectiveDate?: Date;
    refundAmount?: number;
    message: string;
  }> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          user_id: userId,
          status: { in: ['active', 'trialing'] }
        }
      });

      if (!subscription) {
        return { success: false, message: 'No active subscription found' };
      }

      if (cancelAtPeriodEnd) {
        // Cancel at end of billing period
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'cancelling',
            cancelled_at: new Date(),
            metadata: JSON.stringify({
              ...JSON.parse(subscription.metadata || '{}'),
              cancellation_reason: cancellationReason,
              cancel_at_period_end: true,
              cancelled_by: 'user'
            }),
            updated_at: new Date()
          }
        });

        return {
          success: true,
          effectiveDate: subscription.end_date,
          message: `Subscription will be cancelled at the end of current billing period (${subscription.end_date.toLocaleDateString()})`
        };

      } else {
        // Cancel immediately with potential refund
        const refundAmount = this.calculateRefund(subscription);

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'cancelled',
            cancelled_at: new Date(),
            end_date: new Date(), // End immediately
            metadata: JSON.stringify({
              ...JSON.parse(subscription.metadata || '{}'),
              cancellation_reason: cancellationReason,
              cancel_at_period_end: false,
              cancelled_by: 'user',
              refund_amount: refundAmount
            }),
            updated_at: new Date()
          }
        });

        return {
          success: true,
          effectiveDate: new Date(),
          refundAmount,
          message: 'Subscription cancelled immediately' + (refundAmount > 0 ? `. Refund of ₹${refundAmount} will be processed.` : '')
        };
      }

    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cancel subscription'
      };
    }
  }

  /**
   * Pause subscription (family plans only)
   */
  public async pauseSubscription(
    userId: string,
    pauseDuration: number // days
  ): Promise<{ success: boolean; resumeDate?: Date; message: string }> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          user_id: userId,
          status: 'active'
        }
      });

      if (!subscription) {
        return { success: false, message: 'No active subscription found' };
      }

      const metadata = JSON.parse(subscription.metadata || '{}');
      const planId = metadata.plan_id;

      // Only allow pausing for family plans
      if (!planId?.includes('family')) {
        return { success: false, message: 'Only family plans can be paused' };
      }

      const resumeDate = new Date();
      resumeDate.setDate(resumeDate.getDate() + pauseDuration);

      // Extend end date by pause duration
      const extendedEndDate = new Date(subscription.end_date);
      extendedEndDate.setDate(extendedEndDate.getDate() + pauseDuration);

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'paused',
          end_date: extendedEndDate,
          metadata: JSON.stringify({
            ...metadata,
            paused_at: new Date().toISOString(),
            pause_duration: pauseDuration,
            resume_date: resumeDate.toISOString(),
            original_end_date: subscription.end_date.toISOString()
          }),
          updated_at: new Date()
        }
      });

      return {
        success: true,
        resumeDate,
        message: `Subscription paused for ${pauseDuration} days. Will resume on ${resumeDate.toLocaleDateString()}`
      };

    } catch (error) {
      console.error('Error pausing subscription:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to pause subscription'
      };
    }
  }

  // Private helper methods

  private getPlanById(planId: string): EnhancedSubscriptionPlan | null {
    return ENHANCED_SUBSCRIPTION_PLANS.find(plan => plan.id === planId) || null;
  }

  private extractPlanIdFromMetadata(subscription: any): string {
    try {
      const metadata = JSON.parse(subscription.metadata || '{}');
      return metadata.plan_id || subscription.plan_type || 'premium_monthly';
    } catch {
      return 'premium_monthly';
    }
  }

  private async getPaymentIssues(userId: string): Promise<{
    hasIssues: boolean;
    failedAttempts: number;
    nextRetryDate: Date | null;
    gracePeriodEnd: Date | null;
  }> {
    // Get recent failed payments
    const failedPayments = await prisma.payment.findMany({
      where: {
        user_id: userId,
        status: 'failed',
        created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      },
      orderBy: { created_at: 'desc' }
    });

    const hasIssues = failedPayments.length > 0;
    const failedAttempts = failedPayments.length;

    // Calculate next retry date (simplified logic)
    const nextRetryDate = hasIssues ? 
      new Date(Date.now() + 24 * 60 * 60 * 1000) : null; // Next day

    // Grace period ends 7 days after first failure
    const gracePeriodEnd = hasIssues && failedPayments[0] ?
      new Date(failedPayments[0].created_at.getTime() + 7 * 24 * 60 * 60 * 1000) : null;

    return {
      hasIssues,
      failedAttempts,
      nextRetryDate,
      gracePeriodEnd
    };
  }

  private calculateProration(
    currentPlan: EnhancedSubscriptionPlan,
    newPlan: EnhancedSubscriptionPlan,
    nextBillingDate: Date,
    mode: 'immediate' | 'next_cycle'
  ): { amount: number; description: string } {
    if (mode === 'next_cycle') {
      return { amount: 0, description: 'No proration for next cycle changes' };
    }

    const now = new Date();
    const daysUntilBilling = Math.ceil((nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const totalDaysInCycle = currentPlan.interval === 'year' ? 365 : 30;
    
    const unusedAmount = (currentPlan.price * daysUntilBilling) / totalDaysInCycle;
    const newAmount = (newPlan.price * daysUntilBilling) / totalDaysInCycle;
    
    const prorationAmount = Math.round((newAmount - unusedAmount) * 100) / 100;

    return {
      amount: prorationAmount,
      description: `Proration for ${daysUntilBilling} days: ${prorationAmount >= 0 ? 'charge' : 'credit'} ₹${Math.abs(prorationAmount)}`
    };
  }

  private calculateRefund(subscription: any): number {
    const now = new Date();
    const endDate = subscription.end_date;
    const totalPaid = subscription.amount_paid;

    if (now >= endDate) return 0;

    const totalDays = subscription.billing_cycle === 'yearly' ? 365 : 30;
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const refundAmount = (totalPaid * daysRemaining) / totalDays;

    return Math.round(refundAmount * 100) / 100;
  }
}

// Create models for new database tables needed

export const SUBSCRIPTION_CHANGE_MODEL = `
model SubscriptionChange {
  id               String   @id @default(cuid())
  user_id          String
  subscription_id  String
  from_plan_id     String
  to_plan_id       String
  change_type      String   // upgrade, downgrade, pause, resume
  scheduled_date   DateTime
  processed_date   DateTime?
  proration_amount Float    @default(0)
  status           String   @default("scheduled") // scheduled, processed, cancelled
  created_at       DateTime @default(now())
  updated_at       DateTime @default(now()) @updatedAt
  
  user             User         @relation(fields: [user_id], references: [id], onDelete: Cascade)
  subscription     Subscription @relation(fields: [subscription_id], references: [id], onDelete: Cascade)
  
  @@map("subscription_changes")
}`;

// Export singleton instance
export const subscriptionManager = new AdvancedSubscriptionManager();