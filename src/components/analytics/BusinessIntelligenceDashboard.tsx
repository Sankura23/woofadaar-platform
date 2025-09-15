'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BusinessMetrics {
  total_users: number;
  active_users_daily: number;
  active_users_monthly: number;
  new_registrations: number;
  premium_conversions: number;
  total_revenue: number;
  partner_commissions: number;
  dog_ids_generated: number;
  appointments_booked: number;
  churn_rate: number;
  user_acquisition_cost: number;
  customer_lifetime_value: number;
  retention_rate_30d: number;
  conversion_rate: number;
}

interface PlatformMetrics {
  totalEvents: number;
  uniqueSessions: number;
  topEvents: Array<{ name: string; count: number }>;
  deviceBreakdown: Array<{ type: string; count: number }>;
}

interface UserBehaviorSummary {
  totalEvents: number;
  totalSessions: number;
  totalPageViews: number;
  totalFeatureUsage: number;
  conversions: number;
  avgSessionDuration: number;
}

interface AnalyticsData {
  businessMetrics: BusinessMetrics | null;
  platformMetrics: PlatformMetrics | null;
  userBehavior: UserBehaviorSummary | null;
}

export default function BusinessIntelligenceDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    businessMetrics: null,
    platformMetrics: null,
    userBehavior: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<number>(7);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [businessResponse, platformResponse] = await Promise.all([
        fetch('/api/analytics/business-metrics'),
        fetch(`/api/analytics/platform-metrics?days=${timeframe}`)
      ]);

      let businessMetrics = null;
      let platformMetrics = null;

      if (businessResponse.ok) {
        const businessData = await businessResponse.json();
        businessMetrics = businessData.data;
      }

      if (platformResponse.ok) {
        const platformData = await platformResponse.json();
        platformMetrics = platformData.data;
      }

      setAnalyticsData({
        businessMetrics,
        platformMetrics,
        userBehavior: null
      });
    } catch (err) {
      setError('Failed to fetch analytics data');
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeframe]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-lg">Loading analytics dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={fetchAnalyticsData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { businessMetrics, platformMetrics } = analyticsData;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Business Intelligence Dashboard</h1>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Key Performance Indicators */}
      {businessMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-blue-100">Total Users</p>
                  <p className="text-2xl font-bold">{formatNumber(businessMetrics.total_users)}</p>
                </div>
                <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
                  👥
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-green-100">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(businessMetrics.total_revenue)}</p>
                </div>
                <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center">
                  💰
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-purple-100">Premium Conversions</p>
                  <p className="text-2xl font-bold">{formatNumber(businessMetrics.premium_conversions)}</p>
                </div>
                <div className="w-8 h-8 bg-purple-400 rounded-full flex items-center justify-center">
                  ⭐
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-orange-100">Daily Active Users</p>
                  <p className="text-2xl font-bold">{formatNumber(businessMetrics.active_users_daily)}</p>
                </div>
                <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center">
                  📊
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Metrics */}
        {businessMetrics && (
          <Card>
            <CardHeader>
              <CardTitle>Revenue & Growth Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Customer Lifetime Value</span>
                  <span className="font-semibold">{formatCurrency(businessMetrics.customer_lifetime_value)}</span>
                </div>
                <div className="flex justify-between">
                  <span>User Acquisition Cost</span>
                  <span className="font-semibold">{formatCurrency(businessMetrics.user_acquisition_cost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Conversion Rate</span>
                  <span className="font-semibold">{formatPercentage(businessMetrics.conversion_rate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>30-day Retention Rate</span>
                  <span className="font-semibold">{formatPercentage(businessMetrics.retention_rate_30d)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Churn Rate</span>
                  <span className="font-semibold text-red-600">{formatPercentage(businessMetrics.churn_rate)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Platform Activity */}
        {businessMetrics && (
          <Card>
            <CardHeader>
              <CardTitle>Platform Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Monthly Active Users</span>
                  <span className="font-semibold">{formatNumber(businessMetrics.active_users_monthly)}</span>
                </div>
                <div className="flex justify-between">
                  <span>New Registrations</span>
                  <span className="font-semibold">{formatNumber(businessMetrics.new_registrations)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Appointments Booked</span>
                  <span className="font-semibold">{formatNumber(businessMetrics.appointments_booked)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dog IDs Generated</span>
                  <span className="font-semibold">{formatNumber(businessMetrics.dog_ids_generated)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Partner Commissions</span>
                  <span className="font-semibold">{formatCurrency(businessMetrics.partner_commissions)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Behavior Insights */}
        {platformMetrics && (
          <Card>
            <CardHeader>
              <CardTitle>User Behavior Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Events Tracked</span>
                  <span className="font-semibold">{formatNumber(platformMetrics.totalEvents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Unique Sessions</span>
                  <span className="font-semibold">{formatNumber(platformMetrics.uniqueSessions)}</span>
                </div>
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Top User Actions</h4>
                  <div className="space-y-2">
                    {platformMetrics.topEvents.slice(0, 5).map((event, index) => (
                      <div key={event.name} className="flex justify-between text-sm">
                        <span>{event.name.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{formatNumber(event.count)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Device Breakdown */}
        {platformMetrics && (
          <Card>
            <CardHeader>
              <CardTitle>Device Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {platformMetrics.deviceBreakdown.map((device) => {
                  const total = platformMetrics.deviceBreakdown.reduce((sum, d) => sum + d.count, 0);
                  const percentage = ((device.count / total) * 100).toFixed(1);
                  
                  return (
                    <div key={device.type || 'unknown'} className="flex items-center space-x-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{device.type || 'Unknown'}</span>
                          <span>{percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Real-time Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Analytics System: Active</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Behavior Tracking: Running</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span>Last Updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}