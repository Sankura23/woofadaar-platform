'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SubscriptionPlans from '@/components/payments/SubscriptionPlans';
import PaymentForm from '@/components/payments/PaymentForm';

interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  start_date: string;
  end_date: string;
  trial_end_date: string;
  billing_cycle: string;
  amount_paid: number;
  is_trial: boolean;
  trial_days_remaining: number;
  days_until_expiry: number;
  next_billing_date: string;
  can_cancel: boolean;
  can_pause: boolean;
}

interface Plan {
  type: string;
  id?: string;
  name: string;
  features: string[];
  amount: number;
  currency: string;
  interval: string;
}

interface Usage {
  expert_consultations_used?: number;
  health_logs_this_month?: number;
  photo_storage_used?: number;
  unlimited_access?: boolean;
  can_upgrade?: boolean;
  trial_available?: boolean;
}

interface PaymentHistory {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  invoice_number?: string;
  invoice_url?: string;
}

export default function PremiumPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [usage, setUsage] = useState<Usage>({});
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/subscriptions/current', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to load subscription');
      }

      if (result.success) {
        setSubscription(result.data.subscription);
        setPlan(result.data.plan);
        setUsage(result.data.usage || {});
        setPaymentHistory(result.data.payment_history || []);
      }
    } catch (error) {
      console.error('Load subscription error:', error);
      setError(error instanceof Error ? error.message : 'Failed to load subscription');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = (paymentData: any) => {
    setShowPaymentForm(false);
    setError('');
    // Reload subscription data
    loadSubscriptionData();
    alert('Subscription activated successfully!');
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;
    
    const confirmCancel = confirm(
      'Are you sure you want to cancel your subscription? You\'ll lose access to premium features at the end of your current billing period.'
    );
    
    if (!confirmCancel) return;

    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Subscription cancelled successfully. You can continue using premium features until ' + 
              new Date(subscription.end_date).toLocaleDateString());
        loadSubscriptionData();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      alert('Failed to cancel subscription: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading subscription details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (showPaymentForm && selectedPlanId) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="mb-6">
            <button
              onClick={() => setShowPaymentForm(false)}
              className="text-blue-600 hover:text-blue-700 flex items-center"
            >
              ← Back to plans
            </button>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}
          
          <PaymentForm
            planId={selectedPlanId}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Premium Subscription</h1>
          <p className="text-gray-600">Manage your Woofadaar premium subscription</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Current Plan Status */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Current Plan</h2>
          
          {subscription ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Plan:</span>
                    <span className="font-medium">{plan?.name || 'Premium Plan'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                      subscription.status === 'trialing' ? 'bg-blue-100 text-blue-800' :
                      subscription.status === 'past_due' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {subscription.is_trial ? `Trial (${subscription.trial_days_remaining} days left)` : 
                       subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Billing Cycle:</span>
                    <span className="font-medium capitalize">{subscription.billing_cycle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Next Billing:</span>
                    <span className="font-medium">
                      {new Date(subscription.next_billing_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">₹{subscription.amount_paid / 100} / {subscription.billing_cycle}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-800 mb-3">Usage This Month</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expert Consultations:</span>
                    <span className="text-green-600 font-medium">Unlimited</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Health Logs:</span>
                    <span className="font-medium">{usage.health_logs_this_month || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Photos Stored:</span>
                    <span className="text-green-600 font-medium">
                      {usage.photo_storage_used || 0} (Unlimited)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Health History:</span>
                    <span className="text-green-600 font-medium">Unlimited Access</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="mb-4">
                <span className="text-4xl">🆓</span>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">You're on the Free Plan</h3>
              <p className="text-gray-600 mb-4">
                Upgrade to Premium to unlock unlimited features and priority support
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl mb-1">📅</div>
                  <div className="font-medium">7 Days</div>
                  <div className="text-gray-500">Health History</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">💬</div>
                  <div className="font-medium">1 / month</div>
                  <div className="text-gray-500">Expert Consults</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">📸</div>
                  <div className="font-medium">10</div>
                  <div className="text-gray-500">Photos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">📱</div>
                  <div className="font-medium">Basic</div>
                  <div className="text-gray-500">Dog ID</div>
                </div>
              </div>
            </div>
          )}

          {subscription && subscription.can_cancel && (
            <div className="mt-6 pt-6 border-t flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">
                  Need to make changes to your subscription?
                </p>
              </div>
              <button
                onClick={handleCancelSubscription}
                className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Cancel Subscription
              </button>
            </div>
          )}
        </div>

        {/* Upgrade Options */}
        {!subscription || subscription.status !== 'active' ? (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              {subscription ? 'Change Plan' : 'Choose Your Plan'}
            </h2>
            <SubscriptionPlans
              onPlanSelect={handlePlanSelect}
              currentPlan={plan?.id}
              loading={loading}
            />
          </div>
        ) : null}

        {/* Payment History */}
        {paymentHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Payment History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Method</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((payment) => (
                    <tr key={payment.id} className="border-b">
                      <td className="py-3 px-4">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        ₹{payment.amount / 100}
                      </td>
                      <td className="py-3 px-4 capitalize">
                        {payment.payment_method}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                          payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {payment.invoice_url ? (
                          <a
                            href={payment.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            View Invoice
                          </a>
                        ) : payment.invoice_number ? (
                          <span className="text-gray-600">#{payment.invoice_number}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}