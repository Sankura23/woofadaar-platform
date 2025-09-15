// Revenue Integration Foundation - Configuration Constants
// Week 14: Comprehensive monetization infrastructure

export const PARTNER_SUBSCRIPTION_TIERS = {
  basic: {
    name: 'Basic Partner',
    monthlyRate: 500, // INR
    annualRate: 5000, // INR (2 months free)
    features: [
      'Basic Dog ID verification',
      'Customer referrals',
      'Basic analytics',
      'Email support',
      'Up to 50 referrals/month'
    ],
    commissionRate: 0.05, // 5%
    maxMonthlyReferrals: 50,
    trialDays: 14,
    color: 'blue'
  },
  premium: {
    name: 'Premium Partner',
    monthlyRate: 1500, // INR
    annualRate: 15000, // INR (2 months free)
    features: [
      'Advanced Dog ID integration',
      'Priority customer referrals',
      'Advanced analytics',
      'Phone + email support',
      'Custom branding',
      'Up to 200 referrals/month',
      'Revenue insights'
    ],
    commissionRate: 0.08, // 8%
    maxMonthlyReferrals: 200,
    trialDays: 14,
    color: 'purple'
  },
  enterprise: {
    name: 'Enterprise Partner',
    monthlyRate: 5000, // INR
    annualRate: 50000, // INR (2 months free)
    features: [
      'Full Dog ID system integration',
      'Unlimited referrals',
      'White-label options',
      'Dedicated account manager',
      'Custom integrations',
      'Priority support',
      'Advanced revenue analytics',
      'API access'
    ],
    commissionRate: 0.12, // 12%
    maxMonthlyReferrals: 'unlimited',
    trialDays: 30,
    color: 'gold'
  }
} as const;

export const COMMISSION_RATES = {
  vet_consultation: {
    rate: 0.10, // 10% of consultation fee
    minAmount: 50, // Minimum ₹50 commission
    description: 'Veterinary consultation services'
  },
  training_session: {
    rate: 0.15, // 15% of training fee
    minAmount: 75,
    description: 'Dog training and behavior sessions'
  },
  emergency_visit: {
    rate: 0.08, // 8% of emergency fee
    minAmount: 100,
    description: 'Emergency veterinary services'
  },
  grooming_service: {
    rate: 0.12, // 12% of grooming fee
    minAmount: 40,
    description: 'Pet grooming services'
  },
  boarding_service: {
    rate: 0.10, // 10% of boarding fee
    minAmount: 60,
    description: 'Pet boarding and daycare'
  },
  insurance_referral: {
    rate: 50, // Flat ₹50 per insurance signup
    minAmount: 50,
    description: 'Pet insurance referral commission',
    isFlat: true
  },
  product_sale: {
    rate: 0.05, // 5% of product sales
    minAmount: 25,
    description: 'Pet product sales commission'
  },
  vaccination: {
    rate: 0.08, // 8% of vaccination cost
    minAmount: 30,
    description: 'Vaccination services'
  }
} as const;

export const PREMIUM_SERVICES = {
  premium_dog_id: {
    serviceId: 'premium_dog_id',
    name: 'Premium Dog ID',
    displayName: 'Premium Dog Health ID',
    price: 299, // INR one-time
    billingType: 'one_time',
    category: 'dog_id',
    description: 'Enhanced QR code with premium features and priority support',
    features: [
      'Enhanced QR code design',
      'Priority emergency access',
      'Advanced health tracking',
      'Veterinary quick access',
      '24/7 emergency helpline',
      'Premium badge on profile'
    ],
    icon: '🏥',
    popular: true
  },
  priority_support: {
    serviceId: 'priority_support',
    name: 'Priority Support',
    displayName: '24/7 Priority Support',
    price: 99, // INR monthly
    billingType: 'monthly',
    category: 'support',
    description: 'Get priority access to our support team with 24/7 availability',
    features: [
      '24/7 phone support',
      'Direct chat access',
      'Priority ticket handling',
      'Video call assistance',
      'Emergency support line'
    ],
    icon: '🆘',
    popular: false
  },
  advanced_analytics: {
    serviceId: 'advanced_analytics',
    name: 'Advanced Analytics',
    displayName: 'Advanced Health Analytics',
    price: 199, // INR monthly
    billingType: 'monthly',
    category: 'analytics',
    description: 'Detailed insights into your dog\'s health trends and patterns',
    features: [
      'Detailed health reports',
      'Trend analysis',
      'Predictive health insights',
      'Export capabilities',
      'Veterinary sharing',
      'Custom alerts'
    ],
    icon: '📊',
    popular: false
  },
  premium_community: {
    serviceId: 'premium_community',
    name: 'Premium Community Access',
    displayName: 'VIP Community Access',
    price: 149, // INR monthly
    billingType: 'monthly',
    category: 'community',
    description: 'Exclusive access to premium community features and expert consultations',
    features: [
      'Expert-only forums',
      'Priority question answers',
      'Exclusive webinars',
      'Direct expert messaging',
      'Premium content library'
    ],
    icon: '👑',
    popular: false
  }
} as const;

export const REVENUE_STREAMS = {
  partner_referrals: {
    name: 'Partner Referrals',
    description: 'Commission from partner service referrals',
    commissionRate: 0.10, // Platform takes 10%
    isActive: true
  },
  premium_subscriptions: {
    name: 'Premium Subscriptions',
    description: 'Revenue from user premium service subscriptions',
    commissionRate: 1.0, // Platform keeps 100%
    isActive: true
  },
  partner_subscriptions: {
    name: 'Partner Subscriptions',
    description: 'Monthly/annual partner subscription fees',
    commissionRate: 1.0, // Platform keeps 100%
    isActive: true
  },
  corporate_programs: {
    name: 'Corporate Programs',
    description: 'Revenue from corporate partnership programs',
    commissionRate: 1.0, // Platform keeps 100%
    isActive: true
  }
} as const;

export const PAYMENT_CONFIG = {
  currency: 'INR',
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || ''
  },
  retryConfig: {
    maxRetries: 3,
    retryDelay: 24 * 60 * 60 * 1000, // 24 hours
    backoffMultiplier: 2
  },
  gst: {
    rate: 0.18, // 18% GST in India
    enabled: true
  }
} as const;

// Helper functions for revenue calculations
export const calculateCommission = (amount: number, serviceType: keyof typeof COMMISSION_RATES) => {
  const config = COMMISSION_RATES[serviceType];
  if (!config) return 0;
  
  if (config.isFlat) {
    return config.rate;
  }
  
  const commission = amount * config.rate;
  return Math.max(commission, config.minAmount);
};

export const calculateSubscriptionPrice = (
  tier: keyof typeof PARTNER_SUBSCRIPTION_TIERS, 
  billingCycle: 'monthly' | 'annual' = 'monthly'
) => {
  const tierConfig = PARTNER_SUBSCRIPTION_TIERS[tier];
  if (!tierConfig) return 0;
  
  const basePrice = billingCycle === 'annual' ? tierConfig.annualRate : tierConfig.monthlyRate;
  const gstAmount = PAYMENT_CONFIG.gst.enabled ? basePrice * PAYMENT_CONFIG.gst.rate : 0;
  
  return {
    basePrice,
    gstAmount,
    totalPrice: basePrice + gstAmount,
    currency: PAYMENT_CONFIG.currency
  };
};

export const calculatePremiumServicePrice = (serviceId: keyof typeof PREMIUM_SERVICES) => {
  const service = PREMIUM_SERVICES[serviceId];
  if (!service) return 0;
  
  const basePrice = service.price;
  const gstAmount = PAYMENT_CONFIG.gst.enabled ? basePrice * PAYMENT_CONFIG.gst.rate : 0;
  
  return {
    basePrice,
    gstAmount,
    totalPrice: basePrice + gstAmount,
    currency: PAYMENT_CONFIG.currency,
    billingType: service.billingType
  };
};

// Revenue projections and targets
export const REVENUE_TARGETS = {
  month6: {
    partnerSubscriptions: { min: 25000, max: 250000 }, // 50+ partners
    commissionRevenue: { min: 50000, max: 100000 }, // 10% platform fee
    premiumServices: { min: 49500, max: 149500 }, // 500+ users
    total: { min: 124500, max: 449500 }
  },
  month12: {
    partnerSubscriptions: { min: 100000, max: 500000 },
    commissionRevenue: { min: 200000, max: 400000 },
    premiumServices: { min: 200000, max: 600000 },
    total: { min: 500000, max: 1500000 }
  },
  month18: {
    partnerSubscriptions: { min: 300000, max: 1000000 },
    commissionRevenue: { min: 600000, max: 1200000 },
    premiumServices: { min: 600000, max: 1300000 },
    total: { min: 1500000, max: 3500000 }
  }
} as const;

export const BILLING_CYCLES = {
  monthly: {
    name: 'Monthly',
    description: 'Billed every month',
    discount: 0
  },
  annual: {
    name: 'Annual',
    description: 'Billed yearly (2 months free)',
    discount: 0.167 // ~16.7% discount (2 months free)
  }
} as const;

// Feature flags for revenue system
export const REVENUE_FEATURES = {
  PARTNER_SUBSCRIPTIONS_ENABLED: true,
  PREMIUM_SERVICES_ENABLED: true,
  COMMISSION_TRACKING_ENABLED: true,
  AUTOMATED_BILLING_ENABLED: true,
  REVENUE_ANALYTICS_ENABLED: true,
  RAZORPAY_INTEGRATION_ENABLED: true,
  TRIAL_PERIODS_ENABLED: true,
  DISCOUNT_CODES_ENABLED: false, // Future feature
  CORPORATE_BILLING_ENABLED: true
} as const;