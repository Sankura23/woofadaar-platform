'use client';

import { useState, useEffect, ReactNode } from 'react';
import { FeatureName, FeatureAccess } from '@/lib/premium-features';
import UpgradePrompt from './UpgradePrompt';

interface PremiumFeatureGuardProps {
  feature: FeatureName;
  children: ReactNode;
  fallback?: ReactNode;
  showInlinePrompt?: boolean;
  onAccessDenied?: () => void;
  requireAuth?: boolean;
}

export default function PremiumFeatureGuard({ 
  feature, 
  children, 
  fallback, 
  showInlinePrompt = false,
  onAccessDenied,
  requireAuth = true
}: PremiumFeatureGuardProps) {
  const [access, setAccess] = useState<FeatureAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    checkFeatureAccess();
  }, [feature]);

  const checkFeatureAccess = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      
      if (requireAuth && !token) {
        setAccess({
          hasAccess: false,
          reason: 'Authentication required'
        });
        setLoading(false);
        return;
      }

      const response = await fetch('/api/premium/check-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ feature })
      });

      const result = await response.json();
      
      if (result.success) {
        setAccess(result.data);
      } else {
        setAccess({
          hasAccess: false,
          reason: result.message || 'Access check failed'
        });
      }
    } catch (error) {
      console.error('Feature access check error:', error);
      setAccess({
        hasAccess: false,
        reason: 'Failed to check feature access'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccessDenied = () => {
    if (onAccessDenied) {
      onAccessDenied();
    } else if (!showInlinePrompt) {
      setShowUpgradeModal(true);
    }
  };

  const getFeatureDescription = (feature: FeatureName): string => {
    const descriptions: Record<FeatureName, string> = {
      'advanced_health_analytics': 'Get detailed health insights and trends for your dog with advanced analytics.',
      'priority_vet_appointments': 'Book priority veterinary appointments and get faster scheduling.',
      'unlimited_photo_storage': 'Store unlimited photos of your furry friend with no storage limits.',
      'custom_dog_id_designs': 'Create custom Dog ID designs with premium templates and styling options.',
      'health_report_exports': 'Export comprehensive health reports in PDF format for your vet visits.',
      'expert_consultations': 'Get unlimited access to expert veterinary consultations and advice.',
      'ad_free_experience': 'Enjoy Woofadaar without any advertisements for a cleaner experience.',
      'priority_support': 'Get priority customer support with faster response times.',
      'health_history_unlimited': 'Access unlimited health history beyond the 7-day free limit.'
    };
    return descriptions[feature] || 'This premium feature requires a subscription to access.';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Checking access...</span>
      </div>
    );
  }

  if (!access || !access.hasAccess) {
    const description = getFeatureDescription(feature);
    
    if (showInlinePrompt) {
      return (
        <>
          <UpgradePrompt
            feature={feature}
            description={description}
            currentUsage={access?.currentUsage}
            limit={access?.limit}
            inline={true}
          />
          {fallback}
        </>
      );
    }

    if (fallback) {
      return (
        <div onClick={handleAccessDenied} className="cursor-pointer">
          {fallback}
          {showUpgradeModal && (
            <UpgradePrompt
              feature={feature}
              description={description}
              currentUsage={access?.currentUsage}
              limit={access?.limit}
              onClose={() => setShowUpgradeModal(false)}
            />
          )}
        </div>
      );
    }

    return (
      <div className="text-center p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-4xl mb-3">🔒</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Premium Feature</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        {access?.limitReached && (
          <p className="text-sm text-orange-600 mb-4">
            You've reached your free limit: {access.currentUsage} of {access.limit}
          </p>
        )}
        <button
          onClick={() => setShowUpgradeModal(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Upgrade to Premium
        </button>
        {showUpgradeModal && (
          <UpgradePrompt
            feature={feature}
            description={description}
            currentUsage={access?.currentUsage}
            limit={access?.limit}
            onClose={() => setShowUpgradeModal(false)}
          />
        )}
      </div>
    );
  }

  return <>{children}</>;
}