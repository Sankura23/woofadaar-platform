import { razorpayClient, RazorpayUtils, SUBSCRIPTION_PLANS } from './razorpay';
import prisma from './db';
import { RevenueCalculator } from './revenue-utils';
import { PREMIUM_SERVICES } from './revenue-config';

// Payment processing status types
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
export type PaymentType = 'subscription' | 'premium_service' | 'dog_id' | 'appointment' | 'partner_subscription' | 'commission_payout';

export interface PaymentRequest {
  userId: string;
  amount: number;
  currency?: string;
  paymentType: PaymentType;
  serviceId?: string;
  dogId?: string;
  partnerId?: string;
  metadata?: Record<string, any>;
  billingPeriod?: 'monthly' | 'yearly';
  autoRenew?: boolean;
}

export interface PaymentResult {
  success: boolean;
  paymentOrderId: string;
  razorpayOrderId?: string;
  amount: number;
  currency: string;
  error?: string;
  paymentConfig?: any;
}

export class PaymentProcessor {
  /**
   * Create a new payment order for various payment types
   */
  static async createPaymentOrder(request: PaymentRequest): Promise<PaymentResult> {
    try {
      const { userId, amount, currency = 'INR', paymentType, serviceId, dogId, partnerId, metadata = {}, billingPeriod = 'monthly', autoRenew = true } = request;

      // Validate user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, phone: true }
      });

      if (!user) {
        return { success: false, paymentOrderId: '', amount: 0, currency, error: 'User not found' };
      }

      // Validate payment type and service
      const validationResult = await this.validatePaymentRequest(request);
      if (!validationResult.isValid) {
        return { success: false, paymentOrderId: '', amount: 0, currency, error: validationResult.error };
      }

      // Calculate final amount with any applicable discounts or taxes
      const finalAmount = await this.calculateFinalAmount(amount, paymentType, serviceId, billingPeriod);

      // Create Razorpay order
      const razorpayOrder = await razorpayClient.createOrder({
        amount: Math.round(finalAmount * 100), // Convert to paise
        currency,
        receipt: `${paymentType}_${Date.now()}_${userId.substring(0, 8)}`,
        notes: {
          user_id: userId,
          user_name: user.name || 'Unknown',
          payment_type: paymentType,
          service_id: serviceId || '',
          dog_id: dogId || '',
          partner_id: partnerId || '',
          billing_period: billingPeriod,
          auto_renew: autoRenew.toString(),
          ...metadata
        }
      });

      // Create payment order record in database
      const paymentOrder = await prisma.paymentOrder.create({
        data: {
          order_id: razorpayOrder.id,
          receipt: razorpayOrder.receipt,
          amount: finalAmount,
          currency,
          status: 'created',
          user_id: userId,
          partner_id: partnerId,
          payment_type: paymentType,
          order_type: 'payment',
          service_id: serviceId,
          dog_id: dogId,
          razorpay_order_data: razorpayOrder,
          metadata: {
            billing_period: billingPeriod,
            auto_renew: autoRenew,
            original_amount: amount,
            final_amount: finalAmount,
            user_details: {
              name: user.name,
              email: user.email,
              phone: user.phone
            },
            ...metadata
          }
        }
      });

      // Prepare payment configuration for frontend
      const paymentConfig = {
        key: process.env.RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'Woofadaar',
        description: this.getPaymentDescription(paymentType, serviceId),
        image: '/logo192.png',
        order_id: razorpayOrder.id,
        handler: 'woofadaar_payment_handler',
        prefill: {
          name: user.name || '',
          email: user.email || '',
          contact: user.phone || ''
        },
        notes: razorpayOrder.notes,
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: 'woofadaar_payment_cancelled'
        }
      };

      return {
        success: true,
        paymentOrderId: paymentOrder.id,
        razorpayOrderId: razorpayOrder.id,
        amount: finalAmount,
        currency,
        paymentConfig
      };

    } catch (error) {
      console.error('Error creating payment order:', error);
      return {
        success: false,
        paymentOrderId: '',
        amount: 0,
        currency: request.currency || 'INR',
        error: error instanceof Error ? error.message : 'Failed to create payment order'
      };
    }
  }

  /**
   * Verify and process a completed payment
   */
  static async verifyAndProcessPayment(
    razorpayPaymentId: string,
    razorpayOrderId: string,
    razorpaySignature: string
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Verify payment signature
      const isValidSignature = RazorpayUtils.verifyPaymentSignature(
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature
      );

      if (!isValidSignature) {
        return { success: false, message: 'Invalid payment signature' };
      }

      // Find payment order
      const paymentOrder = await prisma.paymentOrder.findFirst({
        where: { order_id: razorpayOrderId }
      });

      if (!paymentOrder) {
        return { success: false, message: 'Payment order not found' };
      }

      if (paymentOrder.status === 'completed') {
        return { success: false, message: 'Payment already processed' };
      }

      // Process payment in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update payment order
        const updatedPaymentOrder = await tx.paymentOrder.update({
          where: { id: paymentOrder.id },
          data: {
            status: 'completed',
            razorpay_payment_id: razorpayPaymentId,
            razorpay_signature: razorpaySignature,
            completed_at: new Date(),
            metadata: {
              ...paymentOrder.metadata,
              payment_verified_at: new Date().toISOString(),
              payment_method: 'razorpay'
            }
          }
        });

        // Process based on payment type
        const processResult = await this.processPaymentByType(updatedPaymentOrder, tx);

        // Create revenue transaction
        await this.createRevenueTransaction(updatedPaymentOrder, razorpayPaymentId, tx);

        return { paymentOrder: updatedPaymentOrder, processResult };
      });

      console.log(`Payment verified and processed: ${razorpayPaymentId} for order ${razorpayOrderId}`);

      return {
        success: true,
        message: 'Payment processed successfully',
        data: result
      };

    } catch (error) {
      console.error('Error verifying payment:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Payment verification failed'
      };
    }
  }

  /**
   * Process refund for a payment
   */
  static async processRefund(
    paymentOrderId: string,
    refundAmount?: number,
    refundReason?: string
  ): Promise<{ success: boolean; message: string; refundId?: string }> {
    try {
      // Find payment order
      const paymentOrder = await prisma.paymentOrder.findUnique({
        where: { id: paymentOrderId }
      });

      if (!paymentOrder || !paymentOrder.razorpay_payment_id) {
        return { success: false, message: 'Payment order not found or not completed' };
      }

      if (paymentOrder.status === 'refunded') {
        return { success: false, message: 'Payment already refunded' };
      }

      // Create refund with Razorpay
      const refund = await razorpayClient.refundPayment(paymentOrder.razorpay_payment_id, {
        amount: refundAmount ? Math.round(refundAmount * 100) : undefined, // Convert to paise if partial refund
        notes: {
          refund_reason: refundReason || 'Customer request',
          original_payment_id: paymentOrder.razorpay_payment_id,
          payment_order_id: paymentOrderId
        }
      });

      // Update payment order status
      await prisma.paymentOrder.update({
        where: { id: paymentOrderId },
        data: {
          status: 'refunded',
          metadata: {
            ...paymentOrder.metadata,
            refund_processed_at: new Date().toISOString(),
            refund_id: refund.id,
            refund_amount: refundAmount || paymentOrder.amount,
            refund_reason: refundReason
          }
        }
      });

      // Create refund transaction for revenue tracking
      await this.createRefundTransaction(paymentOrder, refund.id, refundAmount || paymentOrder.amount);

      return {
        success: true,
        message: 'Refund processed successfully',
        refundId: refund.id
      };

    } catch (error) {
      console.error('Error processing refund:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Refund processing failed'
      };
    }
  }

  /**
   * Get payment status and details
   */
  static async getPaymentStatus(paymentOrderId: string): Promise<any> {
    try {
      const paymentOrder = await prisma.paymentOrder.findUnique({
        where: { id: paymentOrderId },
        include: {
          user: {
            select: { name: true, email: true }
          },
          partner: {
            select: { name: true, business_name: true }
          }
        }
      });

      if (!paymentOrder) {
        return { success: false, message: 'Payment order not found' };
      }

      return {
        success: true,
        data: {
          payment_order_id: paymentOrder.id,
          razorpay_order_id: paymentOrder.order_id,
          razorpay_payment_id: paymentOrder.razorpay_payment_id,
          amount: paymentOrder.amount,
          currency: paymentOrder.currency,
          status: paymentOrder.status,
          payment_type: paymentOrder.payment_type,
          created_at: paymentOrder.created_at,
          completed_at: paymentOrder.completed_at,
          user: paymentOrder.user,
          partner: paymentOrder.partner,
          metadata: paymentOrder.metadata
        }
      };

    } catch (error) {
      console.error('Error getting payment status:', error);
      return { success: false, message: 'Failed to get payment status' };
    }
  }

  // Private helper methods

  private static async validatePaymentRequest(request: PaymentRequest): Promise<{ isValid: boolean; error?: string }> {
    const { paymentType, serviceId, dogId, partnerId, amount } = request;

    if (amount <= 0) {
      return { isValid: false, error: 'Invalid payment amount' };
    }

    switch (paymentType) {
      case 'premium_service':
        if (!serviceId || !PREMIUM_SERVICES[serviceId as keyof typeof PREMIUM_SERVICES]) {
          return { isValid: false, error: 'Invalid premium service' };
        }
        break;

      case 'subscription':
        if (!serviceId || !SUBSCRIPTION_PLANS[serviceId as keyof typeof SUBSCRIPTION_PLANS]) {
          return { isValid: false, error: 'Invalid subscription plan' };
        }
        break;

      case 'dog_id':
        if (!dogId) {
          return { isValid: false, error: 'Dog ID is required for Dog ID service' };
        }
        const dog = await prisma.dog.findUnique({ where: { id: dogId } });
        if (!dog) {
          return { isValid: false, error: 'Dog not found' };
        }
        break;

      case 'partner_subscription':
        if (!partnerId) {
          return { isValid: false, error: 'Partner ID is required for partner subscription' };
        }
        const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
        if (!partner || !partner.is_active) {
          return { isValid: false, error: 'Partner not found or inactive' };
        }
        break;
    }

    return { isValid: true };
  }

  private static async calculateFinalAmount(
    baseAmount: number,
    paymentType: PaymentType,
    serviceId?: string,
    billingPeriod?: string
  ): Promise<number> {
    let finalAmount = baseAmount;

    // Apply GST for Indian transactions
    const gstAmount = RazorpayUtils.calculateGST(finalAmount);
    finalAmount += gstAmount;

    // Apply any service-specific discounts
    if (paymentType === 'subscription' && billingPeriod === 'yearly') {
      // 2 months free for yearly subscriptions
      finalAmount = finalAmount * (10 / 12);
    }

    return Math.round(finalAmount * 100) / 100; // Round to 2 decimal places
  }

  private static getPaymentDescription(paymentType: PaymentType, serviceId?: string): string {
    switch (paymentType) {
      case 'subscription':
        return `Woofadaar Premium Subscription${serviceId ? ` - ${serviceId}` : ''}`;
      case 'premium_service':
        return `Premium Service${serviceId ? ` - ${serviceId}` : ''}`;
      case 'dog_id':
        return 'Digital Dog ID Service';
      case 'appointment':
        return 'Vet Appointment Booking';
      case 'partner_subscription':
        return 'Partner Subscription';
      default:
        return 'Woofadaar Service';
    }
  }

  private static async processPaymentByType(paymentOrder: any, tx: any): Promise<any> {
    switch (paymentOrder.payment_type) {
      case 'subscription':
      case 'premium_service':
        return await this.processPremiumServicePayment(paymentOrder, tx);
      
      case 'dog_id':
        return await this.processDogIdPayment(paymentOrder, tx);
      
      case 'partner_subscription':
        return await this.processPartnerSubscriptionPayment(paymentOrder, tx);
      
      default:
        console.log(`No specific processing for payment type: ${paymentOrder.payment_type}`);
        return { type: paymentOrder.payment_type, processed: true };
    }
  }

  private static async processPremiumServicePayment(paymentOrder: any, tx: any): Promise<any> {
    const { user_id, service_id, metadata } = paymentOrder;
    const billingPeriod = metadata?.billing_period || 'monthly';
    
    const expiresAt = new Date();
    if (billingPeriod === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // Check for existing subscription
    const existingSubscription = await tx.userPremiumService.findFirst({
      where: {
        user_id,
        service_id: service_id || 'premium_monthly',
        status: 'active'
      }
    });

    if (existingSubscription) {
      // Extend existing subscription
      return await tx.userPremiumService.update({
        where: { id: existingSubscription.id },
        data: {
          expires_at: new Date(Math.max(new Date(existingSubscription.expires_at).getTime(), expiresAt.getTime())),
          updated_at: new Date()
        }
      });
    } else {
      // Create new subscription
      return await tx.userPremiumService.create({
        data: {
          user_id,
          service_id: service_id || 'premium_monthly',
          service_name: PREMIUM_SERVICES[service_id as keyof typeof PREMIUM_SERVICES]?.name || 'Premium Service',
          service_price: paymentOrder.amount,
          billing_period: billingPeriod,
          status: 'active',
          activated_at: new Date(),
          expires_at: expiresAt,
          auto_renew: metadata?.auto_renew || true
        }
      });
    }
  }

  private static async processDogIdPayment(paymentOrder: any, tx: any): Promise<any> {
    if (!paymentOrder.dog_id) {
      throw new Error('Dog ID required for Dog ID service payment');
    }

    return await tx.dog.update({
      where: { id: paymentOrder.dog_id },
      data: {
        has_premium_id: true,
        premium_id_activated_at: new Date(),
        premium_id_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      }
    });
  }

  private static async processPartnerSubscriptionPayment(paymentOrder: any, tx: any): Promise<any> {
    const { partner_id, metadata } = paymentOrder;
    const tier = metadata?.subscription_tier || 'basic';
    
    return await tx.partnerSubscription.upsert({
      where: { partner_id },
      update: {
        status: 'active',
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        updated_at: new Date()
      },
      create: {
        partner_id,
        subscription_tier: tier,
        status: 'active',
        monthly_rate: paymentOrder.amount,
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
  }

  private static async createRevenueTransaction(paymentOrder: any, paymentId: string, tx: any): Promise<void> {
    const revenueStreamMap: { [key: string]: string } = {
      'subscription': 'Premium Subscriptions',
      'premium_service': 'Premium Services',
      'dog_id': 'Digital Dog ID',
      'appointment': 'Appointment Fees',
      'partner_subscription': 'Partner Subscriptions'
    };

    const streamName = revenueStreamMap[paymentOrder.payment_type];
    if (!streamName) return;

    const revenueStream = await tx.revenueStream.findFirst({
      where: { name: streamName, is_active: true }
    });

    if (revenueStream) {
      await tx.transaction.create({
        data: {
          revenue_stream_id: revenueStream.id,
          user_id: paymentOrder.user_id,
          partner_id: paymentOrder.partner_id,
          dog_id: paymentOrder.dog_id,
          transaction_type: paymentOrder.payment_type,
          amount: paymentOrder.amount,
          currency: paymentOrder.currency,
          status: 'completed',
          payment_method: 'razorpay',
          external_id: paymentId,
          processed_at: new Date(),
          metadata: {
            payment_order_id: paymentOrder.id,
            razorpay_order_id: paymentOrder.order_id
          }
        }
      });
    }
  }

  private static async createRefundTransaction(paymentOrder: any, refundId: string, refundAmount: number): Promise<void> {
    // Find original transaction
    const originalTransaction = await prisma.transaction.findFirst({
      where: {
        external_id: paymentOrder.razorpay_payment_id
      }
    });

    if (originalTransaction) {
      await prisma.transaction.create({
        data: {
          revenue_stream_id: originalTransaction.revenue_stream_id,
          user_id: originalTransaction.user_id,
          partner_id: originalTransaction.partner_id,
          dog_id: originalTransaction.dog_id,
          transaction_type: 'refund',
          amount: -refundAmount, // Negative amount for refund
          currency: originalTransaction.currency,
          status: 'completed',
          payment_method: 'razorpay',
          external_id: refundId,
          processed_at: new Date(),
          metadata: {
            original_transaction_id: originalTransaction.id,
            original_payment_id: paymentOrder.razorpay_payment_id,
            refund_type: 'customer_request'
          }
        }
      });
    }
  }
}