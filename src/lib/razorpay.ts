import crypto from 'crypto';

// Razorpay configuration
export const RAZORPAY_CONFIG = {
  keyId: process.env.RAZORPAY_KEY_ID!,
  keySecret: process.env.RAZORPAY_KEY_SECRET!,
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET!,
  baseURL: 'https://api.razorpay.com/v1',
};

// Subscription plans configuration
export const SUBSCRIPTION_PLANS = {
  premium_monthly: {
    id: 'premium_monthly',
    name: 'Premium Monthly',
    amount: 9900, // ₹99 in paise
    currency: 'INR',
    interval: 'monthly',
    period: 1,
    features: [
      'Advanced health analytics',
      'Priority vet appointments',
      'Ad-free experience',
      'Unlimited photo storage',
      'Custom Dog ID designs',
      'Health report exports',
      'Priority customer support'
    ],
    trial_period_days: 14,
  },
  premium_yearly: {
    id: 'premium_yearly',
    name: 'Premium Yearly',
    amount: 99000, // ₹990 in paise (2 months free)
    currency: 'INR',
    interval: 'yearly',
    period: 1,
    features: [
      'Advanced health analytics',
      'Priority vet appointments',
      'Ad-free experience',
      'Unlimited photo storage',
      'Custom Dog ID designs',
      'Health report exports',
      'Priority customer support',
      '2 months free (₹198 savings)'
    ],
    trial_period_days: 14,
  }
};

// Free tier limitations
export const FREE_TIER_LIMITS = {
  health_history_days: 7,
  expert_consultations_per_month: 1,
  photo_storage_limit: 10,
  basic_dog_id_only: true,
  community_ads: true,
  standard_support: true
};

// Payment utility functions
export class RazorpayUtils {
  static createAuthHeader(): string {
    const credentials = Buffer.from(
      `${RAZORPAY_CONFIG.keyId}:${RAZORPAY_CONFIG.keySecret}`
    ).toString('base64');
    return `Basic ${credentials}`;
  }

  static verifyPaymentSignature(
    paymentId: string,
    orderId: string,
    signature: string
  ): boolean {
    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_CONFIG.keySecret)
      .update(payload)
      .digest('hex');
    
    return expectedSignature === signature;
  }

  static verifyWebhookSignature(
    body: string,
    signature: string
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_CONFIG.webhookSecret)
      .update(body)
      .digest('hex');
    
    return expectedSignature === signature;
  }

  static generateOrderId(): string {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateReceiptId(): string {
    return `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static calculateGST(amount: number): number {
    // 18% GST for Indian transactions
    return Math.round(amount * 0.18);
  }

  static formatAmount(amountInPaise: number): string {
    return `₹${(amountInPaise / 100).toLocaleString('en-IN')}`;
  }

  static isValidPlan(planId: string): boolean {
    return Object.keys(SUBSCRIPTION_PLANS).includes(planId);
  }

  static getPlanDetails(planId: string) {
    return SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS] || null;
  }
}

// Razorpay API client
export class RazorpayClient {
  private baseURL = RAZORPAY_CONFIG.baseURL;
  private authHeader = RazorpayUtils.createAuthHeader();

  async createOrder(options: {
    amount: number;
    currency?: string;
    receipt?: string;
    notes?: Record<string, string>;
  }) {
    const response = await fetch(`${this.baseURL}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: options.amount,
        currency: options.currency || 'INR',
        receipt: options.receipt || RazorpayUtils.generateReceiptId(),
        notes: options.notes || {},
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Razorpay API Error: ${error.error?.description || 'Unknown error'}`);
    }

    return response.json();
  }

  async createSubscription(options: {
    plan_id?: string;
    customer_id?: string;
    total_count?: number;
    customer_notify?: boolean;
    start_at?: number;
    expire_by?: number;
    addons?: Array<{
      item: {
        name: string;
        amount: number;
        currency: string;
      };
    }>;
    notes?: Record<string, string>;
    notify_info?: {
      notify_phone?: string;
      notify_email?: string;
    };
  }) {
    const response = await fetch(`${this.baseURL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Razorpay API Error: ${error.error?.description || 'Unknown error'}`);
    }

    return response.json();
  }

  async getSubscription(subscriptionId: string) {
    const response = await fetch(`${this.baseURL}/subscriptions/${subscriptionId}`, {
      headers: {
        'Authorization': this.authHeader,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Razorpay API Error: ${error.error?.description || 'Unknown error'}`);
    }

    return response.json();
  }

  async cancelSubscription(subscriptionId: string, cancelAtCycleEnd: boolean = false) {
    const response = await fetch(`${this.baseURL}/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancel_at_cycle_end: cancelAtCycleEnd,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Razorpay API Error: ${error.error?.description || 'Unknown error'}`);
    }

    return response.json();
  }

  async pauseSubscription(subscriptionId: string, pauseAt?: number) {
    const response = await fetch(`${this.baseURL}/subscriptions/${subscriptionId}/pause`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pause_at: pauseAt,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Razorpay API Error: ${error.error?.description || 'Unknown error'}`);
    }

    return response.json();
  }

  async resumeSubscription(subscriptionId: string, resumeAt?: number) {
    const response = await fetch(`${this.baseURL}/subscriptions/${subscriptionId}/resume`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resume_at: resumeAt,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Razorpay API Error: ${error.error?.description || 'Unknown error'}`);
    }

    return response.json();
  }

  async createCustomer(options: {
    name: string;
    email: string;
    contact?: string;
    fail_existing?: boolean;
    notes?: Record<string, string>;
  }) {
    const response = await fetch(`${this.baseURL}/customers`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Razorpay API Error: ${error.error?.description || 'Unknown error'}`);
    }

    return response.json();
  }

  async refundPayment(paymentId: string, options?: {
    amount?: number;
    speed?: 'normal' | 'optimum';
    notes?: Record<string, string>;
    receipt?: string;
  }) {
    const response = await fetch(`${this.baseURL}/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options || {}),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Razorpay API Error: ${error.error?.description || 'Unknown error'}`);
    }

    return response.json();
  }
}

// Export default instance
export const razorpayClient = new RazorpayClient();