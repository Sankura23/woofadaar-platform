import { PaymentStatus, PaymentType } from './payment-processor';
import { PREMIUM_SERVICES } from './revenue-config';
import { SUBSCRIPTION_PLANS, RazorpayUtils } from './razorpay';

// Payment validation utilities
export class PaymentValidator {
  /**
   * Validate payment amount based on service type
   */
  static validateAmount(amount: number, paymentType: PaymentType, serviceId?: string): { isValid: boolean; error?: string; suggestedAmount?: number } {
    if (!amount || amount <= 0) {
      return { isValid: false, error: 'Amount must be greater than 0' };
    }

    // Check minimum amounts
    const MIN_AMOUNTS: { [key in PaymentType]: number } = {
      subscription: 99,
      premium_service: 50,
      dog_id: 299,
      appointment: 200,
      partner_subscription: 500,
      commission_payout: 1
    };

    const minAmount = MIN_AMOUNTS[paymentType];
    if (amount < minAmount) {
      return {
        isValid: false,
        error: `Minimum amount for ${paymentType} is ₹${minAmount}`,
        suggestedAmount: minAmount
      };
    }

    // Validate against service-specific amounts
    if (paymentType === 'premium_service' && serviceId) {
      const service = PREMIUM_SERVICES[serviceId as keyof typeof PREMIUM_SERVICES];
      if (service && Math.abs(amount - service.price) > 1) {
        return {
          isValid: false,
          error: `Expected amount ₹${service.price} for service ${service.name}`,
          suggestedAmount: service.price
        };
      }
    }

    if (paymentType === 'subscription' && serviceId) {
      const plan = SUBSCRIPTION_PLANS[serviceId as keyof typeof SUBSCRIPTION_PLANS];
      if (plan) {
        const expectedAmount = plan.amount / 100; // Convert from paise
        const tolerance = expectedAmount * 0.1; // 10% tolerance for taxes/discounts
        
        if (Math.abs(amount - expectedAmount) > tolerance) {
          return {
            isValid: false,
            error: `Expected amount around ₹${expectedAmount} for ${plan.name}`,
            suggestedAmount: expectedAmount
          };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Validate currency
   */
  static validateCurrency(currency: string): { isValid: boolean; error?: string } {
    const supportedCurrencies = ['INR', 'USD'];
    
    if (!supportedCurrencies.includes(currency.toUpperCase())) {
      return {
        isValid: false,
        error: `Unsupported currency. Supported: ${supportedCurrencies.join(', ')}`
      };
    }

    return { isValid: true };
  }

  /**
   * Validate payment method
   */
  static validatePaymentMethod(method: string): { isValid: boolean; error?: string } {
    const supportedMethods = ['razorpay', 'card', 'upi', 'netbanking', 'wallet'];
    
    if (!supportedMethods.includes(method.toLowerCase())) {
      return {
        isValid: false,
        error: `Unsupported payment method. Supported: ${supportedMethods.join(', ')}`
      };
    }

    return { isValid: true };
  }

  /**
   * Validate Razorpay webhook signature
   */
  static validateWebhookSignature(body: string, signature: string): { isValid: boolean; error?: string } {
    try {
      const isValid = RazorpayUtils.verifyWebhookSignature(body, signature);
      return {
        isValid,
        error: isValid ? undefined : 'Invalid webhook signature'
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Signature validation failed'
      };
    }
  }
}

// Payment formatting utilities
export class PaymentFormatter {
  /**
   * Format amount in Indian currency
   */
  static formatAmount(amount: number, currency: string = 'INR'): string {
    if (currency === 'INR') {
      return RazorpayUtils.formatAmount(Math.round(amount * 100)); // Convert to paise for RazorpayUtils
    }
    
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Format payment status for display
   */
  static formatPaymentStatus(status: PaymentStatus): { text: string; color: string; icon: string } {
    const statusMap: { [key in PaymentStatus]: { text: string; color: string; icon: string } } = {
      pending: { text: 'Pending', color: 'orange', icon: '⏳' },
      processing: { text: 'Processing', color: 'blue', icon: '🔄' },
      completed: { text: 'Completed', color: 'green', icon: '✅' },
      failed: { text: 'Failed', color: 'red', icon: '❌' },
      cancelled: { text: 'Cancelled', color: 'gray', icon: '🚫' },
      refunded: { text: 'Refunded', color: 'purple', icon: '↩️' }
    };

    return statusMap[status];
  }

  /**
   * Format payment type for display
   */
  static formatPaymentType(type: PaymentType): string {
    const typeMap: { [key in PaymentType]: string } = {
      subscription: 'Subscription',
      premium_service: 'Premium Service',
      dog_id: 'Dog ID Service',
      appointment: 'Appointment',
      partner_subscription: 'Partner Subscription',
      commission_payout: 'Commission Payout'
    };

    return typeMap[type] || type;
  }

  /**
   * Generate payment receipt data
   */
  static generateReceiptData(paymentOrder: any): any {
    return {
      receipt_number: paymentOrder.receipt || `WD-${paymentOrder.id.substring(0, 8)}`,
      payment_date: paymentOrder.completed_at || paymentOrder.created_at,
      amount: this.formatAmount(paymentOrder.amount, paymentOrder.currency),
      payment_method: 'Razorpay',
      transaction_id: paymentOrder.razorpay_payment_id || paymentOrder.id,
      order_id: paymentOrder.order_id,
      status: this.formatPaymentStatus(paymentOrder.status),
      service_description: this.getServiceDescription(paymentOrder),
      tax_breakdown: this.calculateTaxBreakdown(paymentOrder.amount),
      customer_info: {
        name: paymentOrder.user?.name || 'N/A',
        email: paymentOrder.user?.email || 'N/A'
      }
    };
  }

  private static getServiceDescription(paymentOrder: any): string {
    switch (paymentOrder.payment_type) {
      case 'subscription':
        return `Woofadaar Premium Subscription${paymentOrder.service_id ? ` (${paymentOrder.service_id})` : ''}`;
      case 'premium_service':
        const service = PREMIUM_SERVICES[paymentOrder.service_id as keyof typeof PREMIUM_SERVICES];
        return service ? service.name : 'Premium Service';
      case 'dog_id':
        return 'Digital Dog ID Service';
      case 'appointment':
        return 'Veterinary Appointment Booking';
      case 'partner_subscription':
        return 'Partner Subscription';
      default:
        return 'Woofadaar Service';
    }
  }

  private static calculateTaxBreakdown(amount: number): any {
    const baseAmount = amount / 1.18; // Remove GST to get base amount
    const gstAmount = amount - baseAmount;
    
    return {
      base_amount: this.formatAmount(baseAmount),
      gst_18_percent: this.formatAmount(gstAmount),
      total_amount: this.formatAmount(amount)
    };
  }
}

// Payment error handling utilities
export class PaymentErrorHandler {
  /**
   * Map Razorpay error codes to user-friendly messages
   */
  static getErrorMessage(errorCode: string, errorDescription?: string): string {
    const errorMessages: { [key: string]: string } = {
      'BAD_REQUEST_ERROR': 'Invalid request. Please check your payment details.',
      'GATEWAY_ERROR': 'Payment gateway error. Please try again.',
      'INTERNAL_ERROR': 'Internal error occurred. Please contact support.',
      'SERVER_ERROR': 'Server error. Please try again later.',
      'NETWORK_ERROR': 'Network error. Please check your connection.',
      'PAYMENT_FAILED': 'Payment failed. Please try with a different payment method.',
      'PAYMENT_CANCELLED': 'Payment was cancelled by user.',
      'INSUFFICIENT_FUNDS': 'Insufficient funds in your account.',
      'CARD_DECLINED': 'Your card was declined. Please try with a different card.',
      'EXPIRED_CARD': 'Your card has expired. Please use a different card.',
      'INVALID_CARD': 'Invalid card details. Please check and try again.',
      'BANK_ERROR': 'Bank error occurred. Please contact your bank.',
      'RISK_CHECK_FAILED': 'Payment failed security check. Please contact support.',
      'INVALID_REQUEST': 'Invalid payment request. Please refresh and try again.'
    };

    return errorMessages[errorCode] || errorDescription || 'An unknown error occurred. Please try again.';
  }

  /**
   * Determine if error is retryable
   */
  static isRetryableError(errorCode: string): boolean {
    const retryableErrors = [
      'GATEWAY_ERROR',
      'NETWORK_ERROR',
      'SERVER_ERROR',
      'INTERNAL_ERROR'
    ];

    return retryableErrors.includes(errorCode);
  }

  /**
   * Get suggested action for error
   */
  static getSuggestedAction(errorCode: string): string {
    const actionMap: { [key: string]: string } = {
      'INSUFFICIENT_FUNDS': 'Please ensure sufficient balance in your account',
      'CARD_DECLINED': 'Try with a different card or contact your bank',
      'EXPIRED_CARD': 'Please use a valid, non-expired card',
      'INVALID_CARD': 'Check card number, expiry date, and CVV',
      'BANK_ERROR': 'Contact your bank or try with a different card',
      'NETWORK_ERROR': 'Check your internet connection and retry',
      'GATEWAY_ERROR': 'Please wait a moment and try again',
      'PAYMENT_CANCELLED': 'Complete the payment to continue'
    };

    return actionMap[errorCode] || 'Please try again or contact support';
  }

  /**
   * Create standardized error response
   */
  static createErrorResponse(error: any, context?: string): any {
    const errorCode = error.code || error.error?.code || 'UNKNOWN_ERROR';
    const errorDescription = error.description || error.error?.description || error.message;
    
    return {
      success: false,
      error: {
        code: errorCode,
        message: this.getErrorMessage(errorCode, errorDescription),
        description: errorDescription,
        is_retryable: this.isRetryableError(errorCode),
        suggested_action: this.getSuggestedAction(errorCode),
        context: context,
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Payment analytics utilities
export class PaymentAnalytics {
  /**
   * Calculate payment conversion rate
   */
  static calculateConversionRate(totalOrders: number, completedPayments: number): number {
    if (totalOrders === 0) return 0;
    return (completedPayments / totalOrders) * 100;
  }

  /**
   * Calculate average order value
   */
  static calculateAverageOrderValue(payments: any[]): number {
    if (payments.length === 0) return 0;
    const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
    return total / payments.length;
  }

  /**
   * Group payments by status
   */
  static groupPaymentsByStatus(payments: any[]): { [key: string]: number } {
    return payments.reduce((acc, payment) => {
      acc[payment.status] = (acc[payment.status] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Calculate revenue trend
   */
  static calculateRevenueTrend(payments: any[], periodDays: number = 7): any[] {
    const now = new Date();
    const trends = [];

    for (let i = periodDays - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayPayments = payments.filter(payment => {
        const paymentDate = new Date(payment.completed_at || payment.created_at);
        return paymentDate >= date && paymentDate < nextDate && payment.status === 'completed';
      });

      trends.push({
        date: date.toISOString().split('T')[0],
        revenue: dayPayments.reduce((sum, payment) => sum + payment.amount, 0),
        transaction_count: dayPayments.length,
        avg_order_value: dayPayments.length > 0 ? 
          dayPayments.reduce((sum, payment) => sum + payment.amount, 0) / dayPayments.length : 0
      });
    }

    return trends;
  }

  /**
   * Identify payment patterns and insights
   */
  static generatePaymentInsights(payments: any[]): any {
    const completedPayments = payments.filter(p => p.status === 'completed');
    const failedPayments = payments.filter(p => p.status === 'failed');
    
    const insights = {
      total_payments: payments.length,
      success_rate: this.calculateConversionRate(payments.length, completedPayments.length),
      average_order_value: this.calculateAverageOrderValue(completedPayments),
      total_revenue: completedPayments.reduce((sum, p) => sum + p.amount, 0),
      most_popular_payment_type: this.getMostPopularPaymentType(completedPayments),
      peak_payment_hours: this.getPeakPaymentHours(completedPayments),
      failure_rate: this.calculateConversionRate(payments.length, failedPayments.length),
      retry_potential: failedPayments.filter(p => PaymentErrorHandler.isRetryableError(p.error_code || '')).length
    };

    return insights;
  }

  private static getMostPopularPaymentType(payments: any[]): { type: string; count: number; percentage: number } | null {
    if (payments.length === 0) return null;

    const typeCounts = payments.reduce((acc, payment) => {
      acc[payment.payment_type] = (acc[payment.payment_type] || 0) + 1;
      return acc;
    }, {});

    const mostPopular = Object.entries(typeCounts).reduce((max, [type, count]) => 
      (count as number) > max.count ? { type, count: count as number } : max, 
      { type: '', count: 0 }
    );

    return {
      ...mostPopular,
      percentage: (mostPopular.count / payments.length) * 100
    };
  }

  private static getPeakPaymentHours(payments: any[]): number[] {
    const hourCounts = Array(24).fill(0);
    
    payments.forEach(payment => {
      const hour = new Date(payment.completed_at || payment.created_at).getHours();
      hourCounts[hour]++;
    });

    const maxCount = Math.max(...hourCounts);
    return hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter(({ count }) => count === maxCount)
      .map(({ hour }) => hour);
  }
}

// All utilities are exported as classes above