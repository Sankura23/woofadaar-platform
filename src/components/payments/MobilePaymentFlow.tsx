'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface MobilePaymentFlowProps {
  planId: string;
  onSuccess: (paymentData: any) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

interface Plan {
  name: string;
  amount: string;
  features: string[];
  trial_days: number;
}

export default function MobilePaymentFlow({ planId, onSuccess, onError, onCancel }: MobilePaymentFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Plan Review, 2: Payment Options, 3: Processing
  const [plan, setPlan] = useState<Plan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'wallet' | 'netbanking'>('upi');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPlanDetails();
  }, [planId]);

  const loadPlanDetails = async () => {
    try {
      const response = await fetch(`/api/plans/${planId}`);
      if (!response.ok) {
        throw new Error('Failed to load plan details');
      }
      const result = await response.json();
      setPlan(result.data);
    } catch (error) {
      onError('Failed to load plan details');
    } finally {
      setLoading(false);
    }
  };

  const initiateMobilePayment = async () => {
    setProcessing(true);
    setStep(3);

    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) {
        throw new Error('Please login to continue');
      }

      // Create payment order
      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan_id: planId }),
      });

      const orderResult = await orderResponse.json();
      
      if (!orderResult.success) {
        throw new Error(orderResult.message);
      }

      // Mobile-specific Razorpay options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderResult.data.amount,
        currency: 'INR',
        name: 'Woofadaar Premium',
        description: `${plan?.name} Subscription`,
        order_id: orderResult.data.order_id,
        prefill: orderResult.data.prefill,
        theme: {
          color: '#3B82F6'
        },
        modal: {
          backdropclose: false,
          escape: false,
          handleback: true,
          confirm_close: true,
          ondismiss: () => {
            setProcessing(false);
            setStep(2);
            onError('Payment cancelled');
          }
        },
        config: {
          display: {
            language: 'en',
            hide: {
              email: false,
              contact: false,
              name: false
            },
            blocks: {
              utib: { // UPI block
                name: 'Pay using UPI',
                instruments: [
                  { method: 'upi', flows: ['intent', 'qr', 'collect'] }
                ]
              },
              other: { // Other payment methods
                name: 'Other Payment Methods',
                instruments: [
                  { method: 'card' },
                  { method: 'netbanking' },
                  { method: 'wallet' }
                ]
              }
            },
            sequence: paymentMethod === 'upi' ? ['block.utib', 'block.other'] : ['block.other', 'block.utib'],
            preferences: {
              show_default_blocks: true
            }
          }
        },
        handler: async (response: any) => {
          try {
            await verifyPayment(response);
          } catch (error) {
            setProcessing(false);
            setStep(2);
            onError(error instanceof Error ? error.message : 'Payment verification failed');
          }
        },
        retry: {
          enabled: true,
          max_count: 3
        }
      };

      // Load Razorpay and open checkout
      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        throw new Error('Payment gateway not available');
      }

    } catch (error) {
      setProcessing(false);
      setStep(2);
      onError(error instanceof Error ? error.message : 'Payment failed');
    }
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

    setProcessing(false);
    onSuccess(result.data);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load plan details</p>
          <button
            onClick={onCancel}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={step > 1 ? () => setStep(step - 1) : onCancel}
            className="text-gray-600 hover:text-gray-800"
            disabled={processing}
          >
            ← Back
          </button>
          <h1 className="text-lg font-semibold text-gray-800">
            {step === 1 ? 'Plan Review' : step === 2 ? 'Payment Method' : 'Processing'}
          </h1>
          <div className="w-8"></div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white px-4 py-2">
        <div className="flex items-center space-x-2">
          {[1, 2, 3].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= stepNum 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {stepNum}
              </div>
              {stepNum < 3 && (
                <div className={`flex-1 h-1 mx-2 ${
                  step > stepNum ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-4">
        {step === 1 && (
          <div className="space-y-6">
            {/* Plan Details */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">{plan.name}</h2>
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-blue-600 mb-2">{plan.amount}</div>
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium inline-block">
                  {plan.trial_days} Days Free Trial
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <h3 className="font-semibold text-gray-800">What's included:</h3>
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm">
                      ✓
                    </span>
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Info */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-sm text-blue-800">
                <span>🔒</span>
                <span>Secure payment • Cancel anytime • No hidden charges</span>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
            >
              Continue to Payment
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {/* Payment Method Selection */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Choose Payment Method</h2>
              
              <div className="space-y-3">
                {[
                  { id: 'upi', name: 'UPI', icon: '📱', description: 'Pay using any UPI app' },
                  { id: 'card', name: 'Credit/Debit Card', icon: '💳', description: 'Visa, Mastercard, RuPay' },
                  { id: 'wallet', name: 'Digital Wallets', icon: '👛', description: 'Paytm, PhonePe, etc.' },
                  { id: 'netbanking', name: 'Net Banking', icon: '🏦', description: 'All major banks' }
                ].map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === method.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={paymentMethod === method.id}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="sr-only"
                    />
                    <span className="text-2xl mr-4">{method.icon}</span>
                    <div>
                      <div className="font-medium text-gray-800">{method.name}</div>
                      <div className="text-sm text-gray-600">{method.description}</div>
                    </div>
                    <div className="ml-auto">
                      <div className={`w-5 h-5 rounded-full border-2 ${
                        paymentMethod === method.id 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300'
                      }`}>
                        {paymentMethod === method.id && (
                          <div className="w-3 h-3 bg-white rounded-full mx-auto mt-0.5"></div>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Order Summary</h3>
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-bold text-green-600">{plan.amount}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Includes 18% GST • {plan.trial_days} days free trial
              </p>
            </div>

            <button
              onClick={initiateMobilePayment}
              disabled={processing}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              {processing ? 'Processing...' : `Pay with ${paymentMethod.toUpperCase()}`}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Processing Payment</h2>
            <p className="text-gray-600 mb-6">
              Please complete the payment in the popup window
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                Don't close this page or refresh the browser during payment
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Fixed Info (for step 1 & 2) */}
      {step < 3 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
          <div className="text-center text-sm text-gray-600">
            <div className="flex items-center justify-center space-x-4 mb-2">
              <span>🔒 SSL Secured</span>
              <span>🏦 RBI Compliant</span>
              <span>✅ Instant Activation</span>
            </div>
            <p>Cancel anytime • No hidden charges • 24/7 support</p>
          </div>
        </div>
      )}
    </div>
  );
}