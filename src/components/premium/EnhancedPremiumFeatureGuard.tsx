'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface FeatureAccess {
  hasAccess: boolean;
  reason?: string;
  limitReached?: boolean;
  currentUsage?: number;
  limit?: number;
  upgradeRequired?: boolean;
  trialExpired?: boolean;
}

interface PremiumFeatureGuardProps {
  children: React.ReactNode;
  feature: string;
  fallback?: React.ReactNode;
  showPreview?: boolean;
  previewHeight?: string;
  className?: string;
}

export default function EnhancedPremiumFeatureGuard({ 
  children, 
  feature, 
  fallback, 
  showPreview = true, 
  previewHeight = "200px",
  className = "" 
}: PremiumFeatureGuardProps) {
  const [featureAccess, setFeatureAccess] = useState<FeatureAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    checkFeatureAccess();
  }, [feature]);

  const checkFeatureAccess = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) {
        setFeatureAccess({ hasAccess: false, upgradeRequired: true, reason: 'Login required' });
        setLoading(false);
        return;
      }

      // Check current subscription status
      const subResponse = await fetch('/api/subscriptions/current', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (subResponse.ok) {
        const subResult = await subResponse.json();
        setSubscription(subResult.data);
        
        // If user has active subscription, allow access
        if (subResult.data.subscription && 
            ['active', 'trialing'].includes(subResult.data.subscription.status)) {
          setFeatureAccess({ hasAccess: true });
          setLoading(false);
          return;
        }
      }

      // For demo purposes, simulate feature access check
      // In real implementation, this would call your premium features API
      setFeatureAccess({ 
        hasAccess: false, 
        upgradeRequired: true,
        reason: 'Premium feature requires subscription',
        currentUsage: 1,
        limit: 3
      });
      setLoading(false);
    } catch (error) {
      console.error('Feature access check error:', error);
      setFeatureAccess({ hasAccess: false, upgradeRequired: true });
      setLoading(false);
    }
  };

  const getFeatureDisplayName = (featureName: string) => {
    const featureNames: Record<string, string> = {
      'advanced_health_analytics': 'Advanced Health Analytics',
      'priority_vet_appointments': 'Priority Vet Appointments',
      'unlimited_photo_storage': 'Unlimited Photo Storage',
      'custom_dog_id_designs': 'Custom Dog ID Designs',
      'health_report_exports': 'Health Report Exports',
      'expert_consultations': 'Expert Consultations',
      'ad_free_experience': 'Ad-Free Experience',
      'priority_support': 'Priority Support',
      'health_history_unlimited': 'Complete Health History'
    };
    return featureNames[featureName] || 'Premium Feature';
  };

  const getUpgradeMessage = (access: FeatureAccess) => {
    if (access.limitReached && access.currentUsage && access.limit) {
      return `You've reached your limit of ${access.limit} ${feature.replace('_', ' ')} this month. Upgrade for unlimited access.`;
    }
    
    if (access.trialExpired) {
      return 'Your free trial has expired. Upgrade to continue using premium features.';
    }

    return access.reason || 'This premium feature requires a subscription to access.';
  };

  if (loading) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
          <span className="text-gray-600">Checking access...</span>
        </div>
      </div>
    );
  }

  // User has access - show the actual content
  if (featureAccess?.hasAccess) {
    return <div className={className}>{children}</div>;
  }

  // User doesn't have access - show upgrade prompt
  const displayName = getFeatureDisplayName(feature);
  const message = getUpgradeMessage(featureAccess!);

  if (fallback) {
    return <div className={className}>{fallback}</div>;
  }

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-dashed border-blue-200 ${className}`}>
      {showPreview && (
        <div 
          className="relative overflow-hidden rounded-t-lg bg-gray-100"
          style={{ height: previewHeight }}
        >
          <div className="absolute inset-0 bg-white bg-opacity-90 backdrop-blur-sm">
            <div className="h-full opacity-30">
              {children}
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="bg-white bg-opacity-90 rounded-lg px-4 py-2">
                <h3 className="font-semibold text-gray-800">{displayName}</h3>
                <p className="text-sm text-gray-600">Premium Feature</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-4">
            ⭐
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            {displayName}
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {message}
          </p>

          {/* Usage Stats */}
          {featureAccess?.currentUsage !== undefined && featureAccess?.limit && (
            <div className="mb-6">
              <div className="bg-white rounded-lg p-4 border">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>This month's usage</span>
                  <span>{featureAccess.currentUsage} / {featureAccess.limit}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((featureAccess.currentUsage / featureAccess.limit) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Trial Info */}
          {subscription && !subscription.subscription && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-center text-green-700 text-sm">
                <span className="mr-2">🎉</span>
                <span>Start your <strong>14-day free trial</strong> to unlock this feature</span>
              </div>
            </div>
          )}

          {/* Upgrade Button */}
          <div className="space-y-3">
            <Link
              href="/premium"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 inline-block text-center"
            >
              {subscription?.subscription ? 'Manage Subscription' : 'Start Free Trial'}
            </Link>
            
            <Link
              href="/premium"
              className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors inline-block text-center"
            >
              View All Premium Features
            </Link>
          </div>

          {/* Benefits Preview */}
          <div className="mt-6 text-left">
            <h4 className="font-medium text-gray-800 mb-3 text-center">Premium Benefits Include:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center space-x-2 text-gray-600">
                <span className="text-green-500">✓</span>
                <span>Unlimited health tracking</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <span className="text-green-500">✓</span>
                <span>Priority support</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <span className="text-green-500">✓</span>
                <span>Advanced analytics</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <span className="text-green-500">✓</span>
                <span>Export reports</span>
              </div>
            </div>
          </div>

          {/* Satisfaction Guarantee */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
              <span className="flex items-center">
                <span className="mr-1">🔒</span>
                Secure Payment
              </span>
              <span className="flex items-center">
                <span className="mr-1">↩️</span>
                Cancel Anytime
              </span>
              <span className="flex items-center">
                <span className="mr-1">💝</span>
                14-Day Trial
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}