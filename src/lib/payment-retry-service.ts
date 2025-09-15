// Week 25 Phase 1: Advanced Payment Retry Logic and Dunning Management
// Smart retry mechanisms, grace periods, and customer communication

import prisma from './db';
import { razorpayClient } from './razorpay';

export interface RetrySchedule {
  attemptNumber: number;
  scheduledDate: Date;
  retryMethod: 'same_payment_method' | 'alternative_method' | 'manual_intervention';
  gracePeriodActive: boolean;
  communicationSent: boolean;
  notes?: string;
}

export interface PaymentRetryResult {
  success: boolean;
  retryId?: string;
  nextRetryDate?: Date;
  gracePeriodEnd?: Date;
  recommendedAction?: string;
  message: string;
}

export interface DunningCampaign {
  id: string;
  userId: string;
  subscriptionId: string;
  campaignType: 'payment_failed' | 'payment_retry' | 'grace_period' | 'final_notice';
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  currentStep: number;
  totalSteps: number;
  nextActionDate: Date;
  communicationsSent: number;
  responseReceived: boolean;
}

export class PaymentRetryService {
  
  // Standard retry schedule for subscription payments
  private readonly RETRY_SCHEDULE = [
    { dayOffset: 1, method: 'same_payment_method', gracePeriod: true },
    { dayOffset: 3, method: 'same_payment_method', gracePeriod: true },
    { dayOffset: 7, method: 'alternative_method', gracePeriod: true },
    { dayOffset: 14, method: 'manual_intervention', gracePeriod: false }
  ];

  private readonly GRACE_PERIOD_DAYS = 7;
  private readonly MAX_RETRY_ATTEMPTS = 4;

  /**
   * Handle payment failure and initiate retry process
   */
  public async handlePaymentFailure(
    paymentId: string,
    subscriptionId: string,
    failureReason: string,
    errorCode?: string
  ): Promise<PaymentRetryResult> {
    try {
      // Get payment and subscription details
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          subscription: {
            include: {
              user: {
                select: { id: true, name: true, email: true, phone: true }
              }
            }
          }
        }
      });

      if (!payment || !payment.subscription) {
        return {
          success: false,
          message: 'Payment or subscription not found'
        };
      }

      // Check if payment is retryable based on error code
      const isRetryable = this.isErrorRetryable(errorCode || '', failureReason);
      
      if (!isRetryable) {
        await this.handleNonRetryableFailure(payment);
        return {
          success: false,
          message: 'Payment failure is not retryable. Manual intervention required.',
          recommendedAction: 'Contact customer to update payment method'
        };
      }

      // Get existing retry attempts for this subscription
      const existingRetries = await prisma.paymentRetry.findMany({
        where: {
          subscription_id: subscriptionId,
          created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        },
        orderBy: { attempt_number: 'desc' }
      });

      const nextAttemptNumber = (existingRetries[0]?.attempt_number || 0) + 1;

      // Check if we've exceeded max attempts
      if (nextAttemptNumber > this.MAX_RETRY_ATTEMPTS) {
        await this.handleMaxRetriesExceeded(payment);
        return {
          success: false,
          message: 'Maximum retry attempts reached. Subscription will be suspended.',
          recommendedAction: 'Customer must manually update payment and retry'
        };
      }

      // Calculate next retry date
      const retryConfig = this.RETRY_SCHEDULE[nextAttemptNumber - 1];
      const nextRetryDate = new Date();
      nextRetryDate.setDate(nextRetryDate.getDate() + retryConfig.dayOffset);

      // Calculate grace period end
      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + this.GRACE_PERIOD_DAYS);

      // Create retry record
      const retryRecord = await prisma.paymentRetry.create({
        data: {
          subscription_id: subscriptionId,
          payment_id: paymentId,
          attempt_number: nextAttemptNumber,
          scheduled_at: nextRetryDate,
          status: 'scheduled',
          retry_method: retryConfig.method,
          failure_reason: failureReason,
          error_code: errorCode,
          grace_period_active: retryConfig.gracePeriod,
          metadata: JSON.stringify({
            original_failure_date: new Date(),
            retry_config: retryConfig,
            customer_notified: false
          })
        }
      });

      // Update subscription status to indicate payment issues
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: retryConfig.gracePeriod ? 'past_due' : 'payment_failed',
          metadata: JSON.stringify({
            ...JSON.parse(payment.subscription.metadata || '{}'),
            payment_retry_active: true,
            retry_attempt: nextAttemptNumber,
            grace_period_end: gracePeriodEnd.toISOString(),
            last_payment_failure: new Date().toISOString()
          }),
          updated_at: new Date()
        }
      });

      // Start dunning campaign
      await this.startDunningCampaign(
        payment.subscription.user_id,
        subscriptionId,
        'payment_failed',
        nextAttemptNumber
      );

      // Send immediate notification to customer
      await this.sendPaymentFailureNotification(
        payment.subscription.user,
        payment,
        nextRetryDate,
        gracePeriodEnd
      );

      return {
        success: true,
        retryId: retryRecord.id,
        nextRetryDate,
        gracePeriodEnd: retryConfig.gracePeriod ? gracePeriodEnd : undefined,
        message: `Payment retry scheduled for ${nextRetryDate.toLocaleDateString()}. Customer has been notified.`
      };

    } catch (error) {
      console.error('Error handling payment failure:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to handle payment failure'
      };
    }
  }

  /**
   * Execute scheduled payment retry
   */
  public async executePaymentRetry(retryId: string): Promise<PaymentRetryResult> {
    try {
      const retry = await prisma.paymentRetry.findUnique({
        where: { id: retryId },
        include: {
          payment: {
            include: {
              subscription: {
                include: {
                  user: {
                    select: { id: true, name: true, email: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!retry || !retry.payment?.subscription) {
        return { success: false, message: 'Retry record or associated data not found' };
      }

      // Check if retry is due
      if (new Date() < retry.scheduled_at) {
        return { success: false, message: 'Retry not yet scheduled' };
      }

      // Update retry record
      await prisma.paymentRetry.update({
        where: { id: retryId },
        data: {
          attempted_at: new Date(),
          status: 'attempting'
        }
      });

      let paymentResult;

      try {
        // Attempt payment based on retry method
        switch (retry.retry_method) {
          case 'same_payment_method':
            paymentResult = await this.retryWithSameMethod(retry.payment);
            break;
          case 'alternative_method':
            paymentResult = await this.retryWithAlternativeMethod(retry.payment);
            break;
          case 'manual_intervention':
            paymentResult = await this.requestManualIntervention(retry.payment);
            break;
          default:
            throw new Error('Invalid retry method');
        }

        if (paymentResult.success) {
          // Payment succeeded
          await prisma.paymentRetry.update({
            where: { id: retryId },
            data: {
              status: 'succeeded',
              succeeded_at: new Date(),
              new_payment_id: paymentResult.paymentId
            }
          });

          // Update subscription status
          await prisma.subscription.update({
            where: { id: retry.payment.subscription.id },
            data: {
              status: 'active',
              metadata: JSON.stringify({
                ...JSON.parse(retry.payment.subscription.metadata || '{}'),
                payment_retry_active: false,
                last_successful_payment: new Date().toISOString(),
                payment_method_updated: paymentResult.methodUpdated || false
              }),
              updated_at: new Date()
            }
          });

          // Cancel any active dunning campaigns
          await this.cancelDunningCampaign(retry.payment.subscription.user_id, retry.payment.subscription.id);

          // Send success notification
          await this.sendPaymentSuccessNotification(retry.payment.subscription.user, paymentResult);

          return {
            success: true,
            message: 'Payment retry succeeded. Subscription is now active.'
          };

        } else {
          // Payment failed again
          await prisma.paymentRetry.update({
            where: { id: retryId },
            data: {
              status: 'failed',
              failure_reason: paymentResult.error,
              next_retry_at: this.calculateNextRetryDate(retry.attempt_number)
            }
          });

          // Check if we should try again or give up
          if (retry.attempt_number >= this.MAX_RETRY_ATTEMPTS) {
            return await this.handleMaxRetriesExceeded(retry.payment);
          } else {
            // Schedule next retry
            return await this.handlePaymentFailure(
              retry.payment.id,
              retry.payment.subscription.id,
              paymentResult.error || 'Retry failed'
            );
          }
        }

      } catch (paymentError) {
        // Payment attempt threw an error
        await prisma.paymentRetry.update({
          where: { id: retryId },
          data: {
            status: 'failed',
            failure_reason: paymentError instanceof Error ? paymentError.message : 'Payment retry error'
          }
        });

        return {
          success: false,
          message: `Payment retry failed: ${paymentError instanceof Error ? paymentError.message : 'Unknown error'}`
        };
      }

    } catch (error) {
      console.error('Error executing payment retry:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to execute payment retry'
      };
    }
  }

  /**
   * Start dunning campaign for failed payments
   */
  public async startDunningCampaign(
    userId: string,
    subscriptionId: string,
    campaignType: DunningCampaign['campaignType'],
    triggerAttempt: number
  ): Promise<string> {
    try {
      // Check if campaign already exists
      const existingCampaign = await prisma.dunningCampaign.findFirst({
        where: {
          user_id: userId,
          subscription_id: subscriptionId,
          status: 'active'
        }
      });

      if (existingCampaign) {
        // Update existing campaign
        await prisma.dunningCampaign.update({
          where: { id: existingCampaign.id },
          data: {
            campaign_type: campaignType,
            current_step: triggerAttempt,
            next_action_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            updated_at: new Date()
          }
        });
        return existingCampaign.id;
      }

      // Create new campaign
      const campaign = await prisma.dunningCampaign.create({
        data: {
          user_id: userId,
          subscription_id: subscriptionId,
          campaign_type: campaignType,
          status: 'active',
          current_step: 1,
          total_steps: this.getDunningSteps(campaignType),
          next_action_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
          communications_sent: 0,
          response_received: false,
          metadata: JSON.stringify({
            triggered_by: `payment_retry_attempt_${triggerAttempt}`,
            start_date: new Date().toISOString()
          })
        }
      });

      return campaign.id;

    } catch (error) {
      console.error('Error starting dunning campaign:', error);
      throw error;
    }
  }

  // Private helper methods

  private isErrorRetryable(errorCode: string, failureReason: string): boolean {
    const retryableErrors = [
      'GATEWAY_ERROR',
      'BAD_REQUEST_ERROR',
      'SERVER_ERROR',
      'NETWORK_ERROR',
      'INSUFFICIENT_FUNDS', // Temporarily retryable
      'BANK_ERROR'
    ];

    const nonRetryableErrors = [
      'CARD_LOST',
      'CARD_STOLEN',
      'CARD_EXPIRED',
      'INVALID_CARD',
      'CARD_BLOCKED',
      'AUTHENTICATION_ERROR'
    ];

    if (nonRetryableErrors.includes(errorCode)) return false;
    if (retryableErrors.includes(errorCode)) return true;

    // Default to retryable for unknown errors
    return !failureReason.toLowerCase().includes('card') || 
           !failureReason.toLowerCase().includes('expired');
  }

  private async handleNonRetryableFailure(payment: any): Promise<void> {
    // Immediately suspend subscription and request payment method update
    await prisma.subscription.update({
      where: { id: payment.subscription_id },
      data: {
        status: 'payment_method_required',
        metadata: JSON.stringify({
          ...JSON.parse(payment.subscription?.metadata || '{}'),
          payment_method_required: true,
          requires_immediate_action: true,
          failure_type: 'non_retryable'
        })
      }
    });

    // Send urgent notification to update payment method
    await this.sendPaymentMethodUpdateRequest(payment.subscription.user);
  }

  private async handleMaxRetriesExceeded(payment: any): Promise<PaymentRetryResult> {
    // Suspend subscription
    await prisma.subscription.update({
      where: { id: payment.subscription_id },
      data: {
        status: 'suspended',
        suspended_at: new Date(),
        metadata: JSON.stringify({
          ...JSON.parse(payment.subscription?.metadata || '{}'),
          suspension_reason: 'max_payment_retries_exceeded',
          requires_manual_reactivation: true
        })
      }
    });

    // Send final notice
    await this.sendFinalSuspensionNotice(payment.subscription.user, payment.subscription);

    return {
      success: false,
      message: 'Subscription suspended due to repeated payment failures',
      recommendedAction: 'Customer must contact support to reactivate'
    };
  }

  private async retryWithSameMethod(payment: any): Promise<{ success: boolean; paymentId?: string; error?: string }> {
    try {
      // Use existing payment method from payment record
      const newOrderResult = await razorpayClient.createOrder({
        amount: payment.amount * 100, // Convert to paise
        currency: payment.currency,
        receipt: `retry_${payment.id}_${Date.now()}`,
        notes: {
          original_payment_id: payment.id,
          retry_attempt: 'same_method',
          user_id: payment.user_id
        }
      });

      // In a real implementation, you would trigger the payment with the stored payment method
      // For now, we'll create a pending payment that requires user action
      const newPayment = await prisma.payment.create({
        data: {
          user_id: payment.user_id,
          subscription_id: payment.subscription_id,
          razorpay_order_id: newOrderResult.id,
          amount: payment.amount,
          currency: payment.currency,
          status: 'retry_pending',
          payment_method: payment.payment_method,
          metadata: JSON.stringify({
            original_payment_id: payment.id,
            retry_type: 'same_method',
            created_via: 'auto_retry'
          })
        }
      });

      return { success: false, error: 'User action required to complete payment' };

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Retry failed' };
    }
  }

  private async retryWithAlternativeMethod(payment: any): Promise<{ success: boolean; methodUpdated?: boolean; error?: string }> {
    // Request user to add alternative payment method
    // This would typically send an email/notification with a link to update payment method
    
    await this.sendAlternativeMethodRequest(payment.subscription.user);
    
    return { 
      success: false, 
      error: 'Alternative payment method request sent to customer',
      methodUpdated: false 
    };
  }

  private async requestManualIntervention(payment: any): Promise<{ success: boolean; error?: string }> {
    // Create support ticket or flag for manual review
    await prisma.supportTicket.create({
      data: {
        user_id: payment.user_id,
        type: 'payment_failure',
        priority: 'high',
        subject: 'Payment Retry Requires Manual Intervention',
        description: `Payment ${payment.id} for subscription ${payment.subscription_id} has failed multiple times and requires manual review.`,
        status: 'open',
        assigned_to: null, // Will be auto-assigned to payment team
        metadata: JSON.stringify({
          payment_id: payment.id,
          subscription_id: payment.subscription_id,
          failure_reason: 'max_auto_retries_exceeded'
        })
      }
    });

    return { success: false, error: 'Manual intervention required - support ticket created' };
  }

  private calculateNextRetryDate(currentAttempt: number): Date | null {
    if (currentAttempt >= this.MAX_RETRY_ATTEMPTS) return null;

    const nextConfig = this.RETRY_SCHEDULE[currentAttempt];
    if (!nextConfig) return null;

    const nextRetryDate = new Date();
    nextRetryDate.setDate(nextRetryDate.getDate() + nextConfig.dayOffset);
    return nextRetryDate;
  }

  private getDunningSteps(campaignType: DunningCampaign['campaignType']): number {
    const stepMapping = {
      'payment_failed': 5,
      'payment_retry': 3,
      'grace_period': 3,
      'final_notice': 2
    };
    return stepMapping[campaignType] || 3;
  }

  private async cancelDunningCampaign(userId: string, subscriptionId: string): Promise<void> {
    await prisma.dunningCampaign.updateMany({
      where: {
        user_id: userId,
        subscription_id: subscriptionId,
        status: 'active'
      },
      data: {
        status: 'completed',
        completed_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  // Notification methods (to be implemented with actual email/SMS service)

  private async sendPaymentFailureNotification(user: any, payment: any, nextRetryDate: Date, gracePeriodEnd: Date): Promise<void> {
    console.log(`Sending payment failure notification to ${user.email}`);
    // Implementation would send email/SMS notification
  }

  private async sendPaymentSuccessNotification(user: any, paymentResult: any): Promise<void> {
    console.log(`Sending payment success notification to ${user.email}`);
    // Implementation would send success notification
  }

  private async sendPaymentMethodUpdateRequest(user: any): Promise<void> {
    console.log(`Sending payment method update request to ${user.email}`);
    // Implementation would send urgent update request
  }

  private async sendAlternativeMethodRequest(user: any): Promise<void> {
    console.log(`Sending alternative payment method request to ${user.email}`);
    // Implementation would send alternative method request
  }

  private async sendFinalSuspensionNotice(user: any, subscription: any): Promise<void> {
    console.log(`Sending final suspension notice to ${user.email}`);
    // Implementation would send final notice
  }
}

// Database models for new tables needed
export const PAYMENT_RETRY_MODEL = `
model PaymentRetry {
  id               String    @id @default(cuid())
  subscription_id  String
  payment_id       String?
  attempt_number   Int
  scheduled_at     DateTime
  attempted_at     DateTime?
  succeeded_at     DateTime?
  status           String    @default("scheduled") // scheduled, attempting, succeeded, failed
  retry_method     String    // same_payment_method, alternative_method, manual_intervention
  failure_reason   String?
  error_code       String?
  grace_period_active Boolean @default(true)
  next_retry_at    DateTime?
  new_payment_id   String?
  metadata         Json?
  created_at       DateTime  @default(now())
  
  subscription     Subscription @relation(fields: [subscription_id], references: [id], onDelete: Cascade)
  payment          Payment?     @relation(fields: [payment_id], references: [id])
  
  @@map("payment_retries")
}

model DunningCampaign {
  id                   String    @id @default(cuid())
  user_id              String
  subscription_id      String
  campaign_type        String    // payment_failed, payment_retry, grace_period, final_notice
  status               String    @default("active") // active, paused, completed, cancelled
  current_step         Int       @default(1)
  total_steps          Int
  next_action_date     DateTime
  communications_sent  Int       @default(0)
  response_received    Boolean   @default(false)
  completed_at         DateTime?
  metadata             Json?
  created_at           DateTime  @default(now())
  updated_at           DateTime  @default(now()) @updatedAt
  
  user                 User         @relation(fields: [user_id], references: [id], onDelete: Cascade)
  subscription         Subscription @relation(fields: [subscription_id], references: [id], onDelete: Cascade)
  
  @@map("dunning_campaigns")
}

model SupportTicket {
  id          String    @id @default(cuid())
  user_id     String
  type        String    // payment_failure, technical_issue, billing_question, etc.
  priority    String    @default("medium") // low, medium, high, urgent
  subject     String
  description String
  status      String    @default("open") // open, in_progress, resolved, closed
  assigned_to String?
  resolved_at DateTime?
  metadata    Json?
  created_at  DateTime  @default(now())
  updated_at  DateTime  @default(now()) @updatedAt
  
  user        User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@map("support_tickets")
}`;

// Export singleton instance
export const paymentRetryService = new PaymentRetryService();