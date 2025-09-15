'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UpgradePromptProps {
  feature: string;
  description: string;
  currentUsage?: number;
  limit?: number;
  onClose?: () => void;
  inline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function UpgradePrompt({ 
  feature, 
  description, 
  currentUsage, 
  limit, 
  onClose, 
  inline = false,
  size = 'md'
}: UpgradePromptProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const handleUpgrade = () => {
    router.push('/premium');
  };

  const handleDismiss = () => {
    setDismissed(true);
    onClose?.();
  };

  if (dismissed) return null;

  const sizeClasses = {
    sm: 'p-3 text-sm',
    md: 'p-4',
    lg: 'p-6 text-lg'
  };

  const iconMap: Record<string, string> = {
    'expert_consultations': '💬',
    'unlimited_photo_storage': '📸',
    'health_history_unlimited': '📅',
    'advanced_health_analytics': '📊',
    'custom_dog_id_designs': '🎨',
    'priority_vet_appointments': '🏥',
    'ad_free_experience': '🚫',
    'priority_support': '🆘',
    'health_report_exports': '📄'
  };

  const featureIcon = iconMap[feature] || '⭐';

  if (inline) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 my-4">
        <div className="flex items-start space-x-3">
          <span className="text-2xl">{featureIcon}</span>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-800 mb-1">
              Premium Feature Required
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              {description}
            </p>
            {currentUsage !== undefined && limit !== undefined && (
              <p className="text-xs text-gray-500 mb-3">
                You've used {currentUsage} of {limit} free {feature.replace('_', ' ')} this month
              </p>
            )}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleUpgrade}
                className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upgrade Now
              </button>
              {onClose && (
                <button
                  onClick={handleDismiss}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Maybe Later
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl max-w-md w-full ${sizeClasses[size]}`}>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">{featureIcon}</span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Upgrade to Premium
          </h3>
          <p className="text-gray-600">
            {description}
          </p>
          {currentUsage !== undefined && limit !== undefined && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Usage:</strong> {currentUsage} of {limit} free {feature.replace('_', ' ')} used this month
              </p>
            </div>
          )}
        </div>

        {/* Premium Benefits */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-3">What you'll get:</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span>Unlimited access to all premium features</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span>Priority customer support 24/7</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span>14-day free trial, cancel anytime</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span>Ad-free experience</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleUpgrade}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-colors"
          >
            Start Free Trial
          </button>
          {onClose && (
            <button
              onClick={handleDismiss}
              className="px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Maybe Later
            </button>
          )}
        </div>

        {/* Close button */}
        {onClose && (
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}