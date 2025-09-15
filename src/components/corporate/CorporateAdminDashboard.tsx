'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  CreditCard, 
  TrendingUp, 
  Dog, 
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';

interface DashboardStats {
  total_employees: number;
  active_employees: number;
  total_corporate_pets: number;
  pending_claims: number;
  monthly_revenue?: number;
  subscription_tier: string;
}

interface CompanyInfo {
  id: string;
  name: string;
  email_domain: string;
  subscription_tier: string;
  logo_url?: string;
  employee_count?: number;
}

export default function CorporateAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [recentBilling, setRecentBilling] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      // Fetch admin info with company details
      const adminResponse = await fetch('/api/auth/corporate-admin', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!adminResponse.ok) {
        throw new Error('Failed to fetch admin data');
      }

      const adminData = await adminResponse.json();
      setCompany(adminData.data.company);
      setStats(adminData.data.statistics);

      // Fetch recent billing
      const billingResponse = await fetch('/api/corporate/billing?limit=5', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (billingResponse.ok) {
        const billingData = await billingResponse.json();
        setRecentBilling(billingData.data.billing_records || []);
      }

    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionTierColor = (tier: string) => {
    switch (tier) {
      case 'basic': return 'bg-blue-500';
      case 'premium': return 'bg-purple-500';
      case 'enterprise': return 'bg-gold-500';
      default: return 'bg-gray-500';
    }
  };

  const getSubscriptionTierPrice = (tier: string) => {
    switch (tier) {
      case 'basic': return '₹2,500/month';
      case 'premium': return '₹8,000/month';
      case 'enterprise': return '₹15,000/month';
      default: return 'Custom pricing';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3bbca8] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading corporate dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center space-x-2 text-red-600 mb-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-red-700">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {company?.logo_url && (
                <img 
                  src={company.logo_url} 
                  alt={company.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {company?.name} Dashboard
                </h1>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-1 text-xs font-medium text-white rounded-full ${getSubscriptionTierColor(company?.subscription_tier || '')}`}>
                    {company?.subscription_tier?.toUpperCase()}
                  </span>
                  <span className="text-gray-500 text-sm">
                    {getSubscriptionTierPrice(company?.subscription_tier || '')}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Corporate Domain</p>
              <p className="font-medium text-gray-900">@{company?.email_domain}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.total_employees || 0}</p>
                <p className="text-xs text-green-600 mt-1">
                  {stats?.active_employees || 0} active
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Corporate Pets</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.total_corporate_pets || 0}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {stats?.total_employees ? Math.round(((stats?.total_corporate_pets || 0) / stats.total_employees) * 100) : 0}% adoption rate
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Dog className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Claims</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.pending_claims || 0}</p>
                <p className="text-xs text-orange-600 mt-1">
                  Requires review
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Spend</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getSubscriptionTierPrice(company?.subscription_tier || '').split('/')[0]}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {company?.subscription_tier} tier
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Users className="w-5 h-5 text-[#3bbca8]" />
              <h3 className="font-medium text-gray-900">Employee Management</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Add, manage, and track employee pet benefit enrollments
            </p>
            <button className="w-full px-4 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] transition-colors">
              Manage Employees
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Dog className="w-5 h-5 text-[#3bbca8]" />
              <h3 className="font-medium text-gray-900">Bulk Dog ID Generation</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Generate corporate-branded Dog IDs for employee pets
            </p>
            <button className="w-full px-4 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] transition-colors">
              Generate Dog IDs
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-4">
              <FileText className="w-5 h-5 text-[#3bbca8]" />
              <h3 className="font-medium text-gray-900">Claims Management</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Review and approve employee pet benefit claims
            </p>
            <button className="w-full px-4 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] transition-colors">
              Review Claims
            </button>
          </div>
        </div>

        {/* Recent Billing */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Recent Billing</h3>
              <button className="text-[#3bbca8] hover:text-[#2daa96] text-sm font-medium">
                View All
              </button>
            </div>
          </div>
          <div className="p-6">
            {recentBilling.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No billing records found</p>
            ) : (
              <div className="space-y-4">
                {recentBilling.slice(0, 5).map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        bill.status === 'paid' ? 'bg-green-100' :
                        bill.status === 'overdue' ? 'bg-red-100' : 'bg-yellow-100'
                      }`}>
                        {bill.status === 'paid' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : bill.status === 'overdue' ? (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(bill.billing_period_start).toLocaleDateString()} - {new Date(bill.billing_period_end).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {bill.employee_count} employees • {bill.pet_count} pets
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">₹{bill.total_amount.toLocaleString()}</p>
                      <p className={`text-sm capitalize ${
                        bill.status === 'paid' ? 'text-green-600' :
                        bill.status === 'overdue' ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {bill.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}