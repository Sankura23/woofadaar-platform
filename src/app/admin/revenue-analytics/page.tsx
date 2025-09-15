'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RevenueData {
  overview: {
    total_revenue: number;
    total_transactions: number;
    active_subscriptions: number;
    trial_subscriptions: number;
    cancelled_subscriptions: number;
    mrr: number;
    conversion_rate: number;
    avg_customer_lifetime_days: number;
  };
  plan_breakdown: {
    monthly: { revenue: number; count: number; subscribers: number };
    yearly: { revenue: number; count: number; subscribers: number };
  };
  daily_revenue: Array<{ date: string; revenue: number; transactions: number }>;
  payment_methods: Array<{ method: string; revenue: number; count: number; percentage: string }>;
  plan_performance: Array<{ plan: string; subscribers: number }>;
  growth_metrics: {
    trial_conversion_rate: number;
    avg_lifetime_value: string;
    churn_rate: string;
  };
  period: {
    start: string;
    end: string;
    days: number;
  };
}

export default function RevenueAnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    loadAnalyticsData();
  }, [period]);

  const loadAnalyticsData = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch(`/api/admin/revenue-analytics?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to load analytics');
      }

      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Analytics error:', error);
      setError(error instanceof Error ? error.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const StatCard = ({ title, value, subtitle, icon, trend }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    trend?: { value: number; isPositive: boolean };
  }) => (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-2xl">{icon}</div>
        {trend && (
          <span className={`text-sm font-medium ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-1">{value}</h3>
        <p className="text-gray-600 text-sm">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading revenue analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Analytics</h2>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Revenue Analytics</h1>
              <p className="text-gray-600">
                {data.period.days}-day overview • {new Date(data.period.start).toLocaleDateString()} - {new Date(data.period.end).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 3 months</option>
                <option value="365">Last year</option>
              </select>
              <button
                onClick={() => loadAnalyticsData()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(data.overview.total_revenue)}
            subtitle={`${data.overview.total_transactions} transactions`}
            icon="💰"
          />
          <StatCard
            title="Monthly Recurring Revenue"
            value={formatCurrency(data.overview.mrr)}
            subtitle="Active subscriptions"
            icon="🔄"
          />
          <StatCard
            title="Active Subscribers"
            value={data.overview.active_subscriptions}
            subtitle={`${data.overview.trial_subscriptions} on trial`}
            icon="👥"
          />
          <StatCard
            title="Conversion Rate"
            value={`${data.overview.conversion_rate}%`}
            subtitle="Trial to paid conversion"
            icon="📈"
          />
        </div>

        {/* Plan Performance */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Plan Performance</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-gray-800">Monthly Plan</h3>
                  <p className="text-sm text-gray-600">₹99/month</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {data.plan_breakdown.monthly.subscribers}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatCurrency(data.plan_breakdown.monthly.revenue)} revenue
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-gray-800">Yearly Plan</h3>
                  <p className="text-sm text-gray-600">₹999/year</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-600">
                    {data.plan_breakdown.yearly.subscribers}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatCurrency(data.plan_breakdown.yearly.revenue)} revenue
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Key Metrics</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Average Lifetime Value</span>
                <span className="font-semibold">₹{data.growth_metrics.avg_lifetime_value}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Churn Rate</span>
                <span className="font-semibold text-red-600">{data.growth_metrics.churn_rate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Avg Customer Lifetime</span>
                <span className="font-semibold">{data.overview.avg_customer_lifetime_days} days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Cancelled Subscriptions</span>
                <span className="font-semibold">{data.overview.cancelled_subscriptions}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods & Daily Revenue */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Payment Methods</h2>
            <div className="space-y-3">
              {data.payment_methods.map((method, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                    <span className="text-gray-700 capitalize">{method.method}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(method.revenue)}</div>
                    <div className="text-sm text-gray-500">
                      {method.percentage}% • {method.count} transactions
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Recent Daily Revenue</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.daily_revenue.slice(-10).reverse().map((day, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600 text-sm">
                    {new Date(day.date).toLocaleDateString()}
                  </span>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(day.revenue)}</div>
                    <div className="text-xs text-gray-500">{day.transactions} transactions</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Growth Insights */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Growth Insights</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="font-semibold text-gray-800 mb-1">Revenue Growth</h3>
              <p className="text-sm text-gray-600">
                Total revenue of {formatCurrency(data.overview.total_revenue)} in {data.period.days} days
              </p>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="font-semibold text-gray-800 mb-1">Customer Acquisition</h3>
              <p className="text-sm text-gray-600">
                {data.overview.trial_subscriptions} new trials with {data.overview.conversion_rate}% conversion
              </p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl mb-2">🏆</div>
              <h3 className="font-semibold text-gray-800 mb-1">Plan Preference</h3>
              <p className="text-sm text-gray-600">
                {data.plan_breakdown.yearly.subscribers > data.plan_breakdown.monthly.subscribers 
                  ? 'Yearly plans preferred' 
                  : 'Monthly plans preferred'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}