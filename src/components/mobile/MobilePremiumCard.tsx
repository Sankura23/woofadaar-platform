'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PremiumStatus {
  tier: 'free' | 'trial' | 'premium';
  trial_days_left?: number;
  expiry_date?: string;
  features_used?: {
    ai_insights: number;
    expert_consultations: number;
    priority_bookings: number;
  };
  monthly_limits?: {
    ai_insights: number;
    expert_consultations: number;
  };
}

interface MobilePremiumCardProps {
  className?: string;
}

export default function MobilePremiumCard({ className = '' }: MobilePremiumCardProps) {
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPremiumStatus();
  }, []);

  const fetchPremiumStatus = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/premium/features?check_access=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPremiumStatus(data.user_status || { tier: 'free' });
      }
    } catch (error) {
      console.error('Error fetching premium status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-gray-50 rounded-2xl p-4 animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (!premiumStatus) return null;

  const { tier, trial_days_left, features_used, monthly_limits } = premiumStatus;

  // Free user card
  if (tier === 'free') {
    return (
      <div className={`bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 rounded-2xl border border-purple-100 overflow-hidden ${className}`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">⭐</span>
              <div>
                <h3 className="font-bold text-purple-900">Try Premium Free!</h3>
                <p className="text-sm text-purple-700">14-day trial, then ₹99/month</p>
              </div>
            </div>
            <Link 
              href="/premium"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm"
            >
              Start Trial
            </Link>
          </div>

          <div className="space-y-2 mb-4">
            <PremiumFeatureItem icon="🧠" text="AI Health Insights" />
            <PremiumFeatureItem icon="👨‍⚕️" text="Expert Consultations" />
            <PremiumFeatureItem icon="⚡" text="Priority Booking" />
            <PremiumFeatureItem icon="📊" text="Advanced Analytics" />
          </div>

          <div className="bg-white/60 rounded-lg p-3 text-center">
            <p className="text-sm text-purple-800 font-medium">
              Join 5,000+ premium pet parents
            </p>
            <p className="text-xs text-purple-600 mt-1">
              ⭐ 4.8/5 rating • 💯 Money-back guarantee
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Trial user card
  if (tier === 'trial') {
    const daysLeft = trial_days_left || 0;
    const isExpiringSoon = daysLeft <= 3;

    return (
      <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border ${isExpiringSoon ? 'border-orange-200' : 'border-blue-100'} ${className}`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🎉</span>
              <div>
                <h3 className="font-bold text-blue-900">Free Trial Active</h3>
                <p className={`text-sm ${isExpiringSoon ? 'text-orange-700' : 'text-blue-700'}`}>
                  {daysLeft} days left
                </p>
              </div>
            </div>
            {isExpiringSoon && (
              <Link 
                href="/premium"
                className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
              >
                Subscribe
              </Link>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <TrialUsageItem 
              label="AI Insights" 
              used={features_used?.ai_insights || 0} 
              limit={monthly_limits?.ai_insights || 20} 
            />
            <TrialUsageItem 
              label="Consultations" 
              used={features_used?.expert_consultations || 0} 
              limit={monthly_limits?.expert_consultations || 3} 
            />
            <TrialUsageItem 
              label="Priority" 
              used={features_used?.priority_bookings || 0} 
              limit={999} 
              unlimited 
            />
          </div>

          {isExpiringSoon ? (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800 font-medium">
                ⏰ Trial expires in {daysLeft} days
              </p>
              <p className="text-xs text-orange-600 mt-1">
                Subscribe now to keep your premium features
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-blue-800 font-medium">
                🚀 Enjoying premium features?
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Continue for just ₹99/month after trial
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Premium user card
  return (
    <div className={`bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">💎</span>
            <div>
              <h3 className="font-bold text-emerald-900">Premium Active</h3>
              <p className="text-sm text-emerald-700">All features unlocked</p>
            </div>
          </div>
          <Link 
            href="/premium"
            className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            Manage
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <PremiumUsageItem 
            label="AI Insights" 
            used={features_used?.ai_insights || 0} 
            limit={monthly_limits?.ai_insights || 50} 
          />
          <PremiumUsageItem 
            label="Consultations" 
            used={features_used?.expert_consultations || 0} 
            limit={monthly_limits?.expert_consultations || 3} 
          />
          <PremiumUsageItem 
            label="Priority" 
            used={features_used?.priority_bookings || 0} 
            unlimited 
          />
        </div>

        <div className="bg-emerald-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-800 font-medium">
                ✨ Premium member since Jan 2024
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                Next billing: Feb 28, 2024
              </p>
            </div>
            <span className="text-emerald-600">💚</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PremiumFeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm">{icon}</span>
      <span className="text-sm text-purple-800 font-medium">{text}</span>
      <span className="text-xs text-purple-600">✓</span>
    </div>
  );
}

function TrialUsageItem({ 
  label, 
  used, 
  limit, 
  unlimited = false 
}: { 
  label: string; 
  used: number; 
  limit?: number; 
  unlimited?: boolean; 
}) {
  const percentage = unlimited ? 100 : Math.min((used / (limit || 1)) * 100, 100);
  const isLow = percentage > 80;

  return (
    <div className="bg-white/60 rounded-lg p-2 text-center">
      <p className="text-xs font-medium text-blue-900">{label}</p>
      <p className={`text-sm ${isLow ? 'text-orange-600' : 'text-blue-700'} font-bold`}>
        {unlimited ? '∞' : `${used}/${limit}`}
      </p>
      {!unlimited && (
        <div className="w-full bg-blue-200 rounded-full h-1 mt-1">
          <div 
            className={`h-1 rounded-full transition-all duration-300 ${
              isLow ? 'bg-orange-400' : 'bg-blue-400'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

function PremiumUsageItem({ 
  label, 
  used, 
  limit, 
  unlimited = false 
}: { 
  label: string; 
  used: number; 
  limit?: number; 
  unlimited?: boolean; 
}) {
  const percentage = unlimited ? 100 : Math.min((used / (limit || 1)) * 100, 100);

  return (
    <div className="bg-white/60 rounded-lg p-2 text-center">
      <p className="text-xs font-medium text-emerald-900">{label}</p>
      <p className="text-sm text-emerald-700 font-bold">
        {unlimited ? '∞' : `${used}/${limit}`}
      </p>
      {!unlimited && (
        <div className="w-full bg-emerald-200 rounded-full h-1 mt-1">
          <div 
            className="h-1 rounded-full bg-emerald-400 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}