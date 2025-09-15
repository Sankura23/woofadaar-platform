'use client';

import { useState } from 'react';
import BusinessIntelligenceDashboard from '@/components/analytics/BusinessIntelligenceDashboard';
import RealTimeAnalyticsDashboard from '@/components/analytics/RealTimeAnalyticsDashboard';
import AIInsightsPanel from '@/components/analytics/AIInsightsPanel';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'business' | 'realtime' | 'insights'>('business');

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation Tabs */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('business')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'business'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Business Intelligence
              </button>
              <button
                onClick={() => setActiveTab('insights')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'insights'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                AI Insights
              </button>
              <button
                onClick={() => setActiveTab('realtime')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'realtime'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Real-time Analytics
              </button>
            </nav>
          </div>
        </div>

        {/* Dashboard Content */}
        {activeTab === 'business' ? (
          <BusinessIntelligenceDashboard />
        ) : activeTab === 'insights' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AIInsightsPanel />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <RealTimeAnalyticsDashboard />
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}