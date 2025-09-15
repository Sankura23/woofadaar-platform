'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentFormProps {
  planId: string;
  onSuccess: (paymentData: any) => void;
  onError: (error: string) => void;
  loading?: boolean;
}

interface PaymentOrder {
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  plan_details: {
    name: string;
    amount: string;
    gst: string;
    total: string;
    features: string[];
    trial_days: number;
  };
}

export default function PaymentForm({ planId, onSuccess, onError, loading = false }: PaymentFormProps) {
  const router = useRouter();
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [userDetails, setUserDetails] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  const loadRazorpayScript = () => {
    if (window.Razorpay) {
      setRazorpayLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => onError('Failed to load payment gateway');
    document.head.appendChild(script);
  };

  const createPaymentOrder = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) {
        onError('Please login to continue');
        return;
      }

      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan_id: planId }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to create payment order');
      }

      if (!result.success) {
        throw new Error(result.message);
      }

      setPaymentOrder(result.data);
      setUserDetails({
        name: result.data.prefill.name || '',
        email: result.data.prefill.email || '',
        phone: result.data.prefill.contact || ''
      });

    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to create payment order');
    }
  };

  const initiatePayment = () => {
    if (!razorpayLoaded || !paymentOrder) {
      onError('Payment gateway not ready');
      return;
    }

    setProcessingPayment(true);

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      name: paymentOrder.name,
      description: paymentOrder.description,
      image: paymentOrder.image,
      order_id: paymentOrder.order_id,
      prefill: {
        name: userDetails.name,
        email: userDetails.email,
        contact: userDetails.phone,
      },
      theme: paymentOrder.theme,
      modal: {
        ondismiss: () => {
          setProcessingPayment(false);
          onError('Payment cancelled');
        }
      },
      handler: async (response: any) => {
        try {
          await verifyPayment(response);
        } catch (error) {
          setProcessingPayment(false);
          onError(error instanceof Error ? error.message : 'Payment verification failed');
        }
      },
      retry: {
        enabled: true,
        max_count: 3
      },
      timeout: 300, // 5 minutes
      remember_customer: true,
      config: {
        display: {
          blocks: {
            banks: {
              name: 'Most Used Methods',
              instruments: [
                { method: 'upi' },
                { method: 'card' },
                { method: 'wallet' },
                { method: 'netbanking' }
              ]
            }
          },
          sequence: ['block.banks'],
          preferences: {
            show_default_blocks: true
          }
        }
      }
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  const verifyPayment = async (paymentResponse: any) => {
    const token = localStorage.getItem('woofadaar_token');
    
    const response = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_signature: paymentResponse.razorpay_signature,
        payment_method: paymentResponse.method || 'unknown'
      }),
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Payment verification failed');
    }

    setProcessingPayment(false);
    onSuccess(result.data);
    
    // Redirect to success page with payment details
    const successUrl = `/payment/success?payment_id=${result.data.payment_id}&order_id=${result.data.order_id}`;
    router.push(successUrl);
  };

  useEffect(() => {
    if (razorpayLoaded && planId) {
      createPaymentOrder();
    }
  }, [razorpayLoaded, planId]);

  if (!paymentOrder) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* Order Summary */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Summary</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Plan:</span>
            <span className="font-medium">{paymentOrder.plan_details.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Plan Amount:</span>
            <span className="font-medium">{paymentOrder.plan_details.amount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">GST (18%):</span>
            <span className="font-medium">{paymentOrder.plan_details.gst}</span>
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between text-lg">
              <span className="font-semibold text-gray-800">Total Amount:</span>
              <span className="font-bold text-green-600">{paymentOrder.plan_details.total}</span>
            </div>
          </div>
          <div className="text-center">
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              Includes {paymentOrder.plan_details.trial_days} Days Free Trial
            </span>
          </div>
        </div>
      </div>

      {/* User Details */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Billing Details</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={userDetails.name}
              onChange={(e) => setUserDetails({...userDetails, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={userDetails.email}
              onChange={(e) => setUserDetails({...userDetails, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={userDetails.phone}
              onChange={(e) => setUserDetails({...userDetails, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+91 98765 43210"
            />
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Methods</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center justify-center p-3 border border-gray-200 rounded-lg">
            <span className="text-2xl">💳</span>
            <span className="ml-2 text-sm font-medium">Cards</span>
          </div>
          <div className="flex items-center justify-center p-3 border border-gray-200 rounded-lg">
            <span className="text-2xl">📱</span>
            <span className="ml-2 text-sm font-medium">UPI</span>
          </div>
          <div className="flex items-center justify-center p-3 border border-gray-200 rounded-lg">
            <span className="text-2xl">🏦</span>
            <span className="ml-2 text-sm font-medium">Net Banking</span>
          </div>
          <div className="flex items-center justify-center p-3 border border-gray-200 rounded-lg">
            <span className="text-2xl">👛</span>
            <span className="ml-2 text-sm font-medium">Wallets</span>
          </div>
        </div>
      </div>

      {/* Features Included */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">What's Included</h3>
        <ul className="space-y-2">
          {paymentOrder.plan_details.features.map((feature, index) => (
            <li key={index} className="flex items-start space-x-2">
              <span className="flex-shrink-0 w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm mt-0.5">
                ✓
              </span>
              <span className="text-sm text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Payment Button */}
      <button
        onClick={initiatePayment}
        disabled={processingPayment || loading || !razorpayLoaded}
        className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
      >
        {processingPayment ? (
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Processing Payment...
          </div>
        ) : (
          `Start ${paymentOrder.plan_details.trial_days}-Day Free Trial`
        )}
      </button>

      {/* Security Info */}
      <div className="mt-4 text-center">
        <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
          <span className="flex items-center">
            <span className="mr-1">🔒</span>
            SSL Secured
          </span>
          <span className="flex items-center">
            <span className="mr-1">🛡️</span>
            RBI Compliant
          </span>
          <span className="flex items-center">
            <span className="mr-1">✅</span>
            No Hidden Charges
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          You can cancel anytime. No questions asked.
        </p>
      </div>
    </div>
  );
}