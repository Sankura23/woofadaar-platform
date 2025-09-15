'use client';

import { useState } from 'react';
import { SUBSCRIPTION_PLANS } from '@/lib/razorpay';

interface SubscriptionPlansProps {
  onPlanSelect: (planId: string) => void;
  currentPlan?: string;
  loading?: boolean;
}

export default function SubscriptionPlans({ 
  onPlanSelect, 
  currentPlan, 
  loading = false 
}: SubscriptionPlansProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>('premium_monthly');

  const plans = [
    {
      ...SUBSCRIPTION_PLANS.premium_monthly,
      recommended: false,
      savings: null
    },
    {
      ...SUBSCRIPTION_PLANS.premium_yearly,
      recommended: true,
      savings: '₹198 (2 months free!)'
    }
  ];

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    onPlanSelect(planId);
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Choose Your Premium Plan</h2>
        <p className="text-lg text-gray-600">
          Unlock advanced features and get priority support for your furry friends
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all duration-200 ${
              selectedPlan === plan.id
                ? 'border-blue-600 bg-blue-50 shadow-lg'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
            } ${plan.recommended ? 'ring-2 ring-blue-600 ring-opacity-50' : ''}`}
            onClick={() => handlePlanSelect(plan.id)}
          >
            {plan.recommended && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
              <div className="flex items-center justify-center mb-2">
                <span className="text-4xl font-bold text-gray-800">
                  ₹{Math.round(plan.amount / 100)}
                </span>
                <span className="text-gray-600 ml-2">
                  /{plan.interval === 'yearly' ? 'year' : 'month'}
                </span>
              </div>
              {plan.savings && (
                <p className="text-green-600 font-medium text-sm">{plan.savings}</p>
              )}
              {plan.interval === 'yearly' && (
                <p className="text-gray-500 text-sm">
                  ₹{Math.round(plan.amount / 12 / 100)} per month
                </p>
              )}
            </div>

            <div className="space-y-3 mb-6">
              <div className="text-center">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {plan.trial_period_days} Days Free Trial
                </span>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm">
                    ✓
                  </span>
                  <span className="text-gray-700 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <div className={`w-4 h-4 rounded-full border-2 mx-auto ${
              selectedPlan === plan.id
                ? 'bg-blue-600 border-blue-600'
                : 'border-gray-300'
            }`}>
              {selectedPlan === plan.id && (
                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Free vs Premium Comparison */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
          Free vs Premium Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">Features</th>
                <th className="text-center py-2 px-4 text-gray-600">Free</th>
                <th className="text-center py-2 px-4 text-blue-600">Premium</th>
              </tr>
            </thead>
            <tbody className="space-y-2">
              <tr className="border-b">
                <td className="py-2 px-4">Health History</td>
                <td className="text-center py-2 px-4 text-gray-600">7 days</td>
                <td className="text-center py-2 px-4 text-blue-600">Unlimited</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-4">Expert Consultations</td>
                <td className="text-center py-2 px-4 text-gray-600">1 per month</td>
                <td className="text-center py-2 px-4 text-blue-600">Unlimited</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-4">Photo Storage</td>
                <td className="text-center py-2 px-4 text-gray-600">10 photos</td>
                <td className="text-center py-2 px-4 text-blue-600">Unlimited</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-4">Dog ID Features</td>
                <td className="text-center py-2 px-4 text-gray-600">Basic</td>
                <td className="text-center py-2 px-4 text-blue-600">Custom designs</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-4">Vet Appointments</td>
                <td className="text-center py-2 px-4 text-gray-600">Standard</td>
                <td className="text-center py-2 px-4 text-blue-600">Priority booking</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-4">Community Experience</td>
                <td className="text-center py-2 px-4 text-gray-600">With ads</td>
                <td className="text-center py-2 px-4 text-blue-600">Ad-free</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-4">Customer Support</td>
                <td className="text-center py-2 px-4 text-gray-600">Standard</td>
                <td className="text-center py-2 px-4 text-blue-600">Priority 24/7</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Security & Trust */}
      <div className="bg-blue-50 rounded-lg p-6 text-center">
        <div className="flex items-center justify-center space-x-6 mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🔒</span>
            <span className="text-sm font-medium text-gray-700">256-bit SSL Encryption</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🏦</span>
            <span className="text-sm font-medium text-gray-700">RBI Approved Payments</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🛡️</span>
            <span className="text-sm font-medium text-gray-700">No Hidden Charges</span>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Your payment information is secure and protected. Cancel anytime.
        </p>
      </div>

      {/* Current Plan Status */}
      {currentPlan && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-center">
            You currently have a <strong>Premium</strong> subscription. 
            Upgrade to change billing cycle or features.
          </p>
        </div>
      )}
    </div>
  );
}