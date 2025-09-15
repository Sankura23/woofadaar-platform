import { 
  PARTNER_SUBSCRIPTION_TIERS, 
  COMMISSION_RATES, 
  PREMIUM_SERVICES,
  PAYMENT_CONFIG,
  calculateCommission,
  calculateSubscriptionPrice,
  calculatePremiumServicePrice
} from './revenue-config';

// Type definitions for revenue operations
export interface RevenueCalculation {
  baseAmount: number;
  commissionAmount: number;
  gstAmount: number;
  totalAmount: number;
  currency: string;
}

export interface SubscriptionPricing {
  basePrice: number;
  gstAmount: number;
  totalPrice: number;
  currency: string;
  billingCycle: 'monthly' | 'annual';
  trialDays?: number;
}

export interface CommissionCalculation {
  serviceAmount: number;
  commissionRate: number;
  commissionAmount: number;
  minCommission: number;
  platformFee: number;
  partnerEarnings: number;
}

// Revenue calculation utilities
export class RevenueCalculator {
  
  /**
   * Calculate partner subscription pricing with GST
   */
  static calculatePartnerSubscription(
    tier: keyof typeof PARTNER_SUBSCRIPTION_TIERS,
    billingCycle: 'monthly' | 'annual' = 'monthly',
    employeeCount?: number
  ): SubscriptionPricing {
    const tierConfig = PARTNER_SUBSCRIPTION_TIERS[tier];
    if (!tierConfig) {
      throw new Error(`Invalid subscription tier: ${tier}`);
    }

    let basePrice = billingCycle === 'annual' ? tierConfig.annualRate : tierConfig.monthlyRate;
    
    // Apply employee-based scaling for enterprise
    if (tier === 'enterprise' && employeeCount && employeeCount > 100) {
      const extraEmployees = employeeCount - 100;
      const scalingFee = Math.floor(extraEmployees / 50) * 1000; // ₹1000 per 50 extra employees
      basePrice += scalingFee;
    }
    
    const gstAmount = PAYMENT_CONFIG.gst.enabled ? basePrice * PAYMENT_CONFIG.gst.rate : 0;
    
    return {
      basePrice,
      gstAmount,
      totalPrice: basePrice + gstAmount,
      currency: PAYMENT_CONFIG.currency,
      billingCycle,
      trialDays: tierConfig.trialDays
    };
  }

  /**
   * Calculate commission for partner referrals
   */
  static calculateReferralCommission(
    serviceAmount: number,
    serviceType: keyof typeof COMMISSION_RATES,
    partnerTier: keyof typeof PARTNER_SUBSCRIPTION_TIERS = 'basic'
  ): CommissionCalculation {
    const commissionConfig = COMMISSION_RATES[serviceType];
    const tierConfig = PARTNER_SUBSCRIPTION_TIERS[partnerTier];
    
    if (!commissionConfig || !tierConfig) {
      throw new Error('Invalid service type or partner tier');
    }

    let commissionAmount: number;
    
    if (commissionConfig.isFlat) {
      commissionAmount = commissionConfig.rate;
    } else {
      // Use tier-specific commission rate if available, otherwise use service default
      const effectiveRate = tierConfig.commissionRate || commissionConfig.rate;
      commissionAmount = Math.max(serviceAmount * effectiveRate, commissionConfig.minAmount);
    }

    // Platform takes 10% of commission as processing fee
    const platformFee = commissionAmount * 0.1;
    const partnerEarnings = commissionAmount - platformFee;

    return {
      serviceAmount,
      commissionRate: tierConfig.commissionRate,
      commissionAmount,
      minCommission: commissionConfig.minAmount,
      platformFee,
      partnerEarnings
    };
  }

  /**
   * Calculate premium service pricing
   */
  static calculatePremiumService(
    serviceId: keyof typeof PREMIUM_SERVICES
  ): RevenueCalculation {
    const service = PREMIUM_SERVICES[serviceId];
    if (!service) {
      throw new Error(`Invalid premium service: ${serviceId}`);
    }

    const baseAmount = service.price;
    const gstAmount = PAYMENT_CONFIG.gst.enabled ? baseAmount * PAYMENT_CONFIG.gst.rate : 0;
    const totalAmount = baseAmount + gstAmount;

    return {
      baseAmount,
      commissionAmount: 0, // Platform keeps 100%
      gstAmount,
      totalAmount,
      currency: PAYMENT_CONFIG.currency
    };
  }

  /**
   * Calculate revenue split for transactions
   */
  static calculateRevenueSplit(
    totalAmount: number,
    revenueStreamType: 'partner_referrals' | 'premium_subscriptions' | 'partner_subscriptions'
  ) {
    switch (revenueStreamType) {
      case 'partner_referrals':
        const platformFee = totalAmount * 0.1; // 10% platform fee
        const partnerPayout = totalAmount - platformFee;
        return {
          platformRevenue: platformFee,
          partnerPayout,
          totalAmount
        };
        
      case 'premium_subscriptions':
      case 'partner_subscriptions':
        return {
          platformRevenue: totalAmount, // Platform keeps 100%
          partnerPayout: 0,
          totalAmount
        };
        
      default:
        throw new Error(`Invalid revenue stream type: ${revenueStreamType}`);
    }
  }

  /**
   * Calculate monthly recurring revenue (MRR)
   */
  static calculateMRR(subscriptions: Array<{ tier: string; billingCycle: string; amount: number }>) {
    return subscriptions.reduce((mrr, subscription) => {
      const monthlyAmount = subscription.billingCycle === 'annual' 
        ? subscription.amount / 12 
        : subscription.amount;
      return mrr + monthlyAmount;
    }, 0);
  }

  /**
   * Calculate annual recurring revenue (ARR)
   */
  static calculateARR(mrr: number): number {
    return mrr * 12;
  }

  /**
   * Generate next billing date
   */
  static calculateNextBillingDate(
    currentDate: Date,
    billingCycle: 'monthly' | 'annual'
  ): Date {
    const nextDate = new Date(currentDate);
    
    if (billingCycle === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }
    
    return nextDate;
  }

  /**
   * Calculate trial end date
   */
  static calculateTrialEndDate(
    startDate: Date,
    tier: keyof typeof PARTNER_SUBSCRIPTION_TIERS
  ): Date {
    const tierConfig = PARTNER_SUBSCRIPTION_TIERS[tier];
    const trialEndDate = new Date(startDate);
    trialEndDate.setDate(trialEndDate.getDate() + tierConfig.trialDays);
    return trialEndDate;
  }

  /**
   * Check if subscription is in trial period
   */
  static isInTrialPeriod(trialEndDate: Date | null): boolean {
    if (!trialEndDate) return false;
    return new Date() < trialEndDate;
  }

  /**
   * Calculate prorated amount for subscription changes
   */
  static calculateProration(
    oldAmount: number,
    newAmount: number,
    daysRemaining: number,
    totalDaysInPeriod: number
  ): number {
    const dailyOldRate = oldAmount / totalDaysInPeriod;
    const dailyNewRate = newAmount / totalDaysInPeriod;
    
    const refund = dailyOldRate * daysRemaining;
    const charge = dailyNewRate * daysRemaining;
    
    return charge - refund; // Positive = additional charge, Negative = refund
  }

  /**
   * Generate payment receipt data
   */
  static generateReceiptData(
    transactionId: string,
    amount: number,
    description: string,
    customerInfo: {
      name: string;
      email: string;
      phone?: string;
    }
  ) {
    const gstAmount = PAYMENT_CONFIG.gst.enabled ? amount * PAYMENT_CONFIG.gst.rate : 0;
    const baseAmount = amount - gstAmount;
    
    return {
      receiptId: `WOF-${transactionId.slice(-8).toUpperCase()}`,
      date: new Date().toISOString(),
      customerInfo,
      items: [
        {
          description,
          amount: baseAmount,
          gst: gstAmount,
          total: amount
        }
      ],
      baseAmount,
      gstAmount,
      totalAmount: amount,
      currency: PAYMENT_CONFIG.currency,
      paymentMethod: 'Razorpay',
      businessInfo: {
        name: 'Woofadaar Technologies Private Limited',
        address: 'India',
        gstNumber: 'GST_NUMBER_HERE' // TODO: Add actual GST number
      }
    };
  }
}

// Utility functions for formatting
export const formatCurrency = (amount: number, currency = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatPercentage = (rate: number): string => {
  return `${(rate * 100).toFixed(1)}%`;
};

// Date utilities for revenue calculations
export const getDateRange = (period: 'today' | 'week' | 'month' | 'quarter' | 'year') => {
  const now = new Date();
  const startDate = new Date();
  const endDate = new Date();

  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    
    case 'quarter':
      startDate.setMonth(now.getMonth() - 3);
      break;
    
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }

  return { startDate, endDate };
};

// Validation utilities
export const validateSubscriptionTier = (tier: string): tier is keyof typeof PARTNER_SUBSCRIPTION_TIERS => {
  return tier in PARTNER_SUBSCRIPTION_TIERS;
};

export const validateServiceType = (serviceType: string): serviceType is keyof typeof COMMISSION_RATES => {
  return serviceType in COMMISSION_RATES;
};

export const validatePremiumService = (serviceId: string): serviceId is keyof typeof PREMIUM_SERVICES => {
  return serviceId in PREMIUM_SERVICES;
};

// Error classes for revenue operations
export class RevenueError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'RevenueError';
  }
}

export class PaymentError extends Error {
  constructor(message: string, public code: string, public gatewayError?: any) {
    super(message);
    this.name = 'PaymentError';
  }
}

export class SubscriptionError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SubscriptionError';
  }
}