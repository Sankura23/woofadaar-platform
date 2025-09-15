'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CommissionSummary {
  total_earnings: number;
  pending_earnings: number;
  paid_earnings: number;
  total_transactions: number;
}

interface ServiceBreakdown {
  service_type: string;
  earnings: number;
  transaction_count: number;
}

interface Commission {
  id: string;
  service_type: string;
  base_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  created_at: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  reference_id: string;
}

interface EarningsData {
  summary: CommissionSummary;
  service_breakdown: ServiceBreakdown[];
}

export default function PartnerEarningsPage() {
  const router = useRouter();
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [commissionsLoading, setCommissionsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadEarningsData();
  }, []);

  useEffect(() => {
    loadCommissions();
  }, [selectedStatus, currentPage]);

  const loadEarningsData = async () => {
    try {
      const token = localStorage.getItem('woofadaar_partner_token');
      if (!token) {
        router.push('/partner/auth/login');
        return;
      }

      const response = await fetch('/api/partner/commissions/summary', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to load earnings');
      }

      if (result.success) {
        setEarningsData(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Earnings error:', error);
      setError(error instanceof Error ? error.message : 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  const loadCommissions = async () => {
    setCommissionsLoading(true);
    try {
      const token = localStorage.getItem('woofadaar_partner_token');
      const status = selectedStatus === 'all' ? '' : selectedStatus;
      
      const response = await fetch(
        `/api/partner/commissions?page=${currentPage}&status=${status}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const result = await response.json();

      if (result.success) {
        setCommissions(result.data.commissions);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Load commissions error:', error);
    } finally {
      setCommissionsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getServiceTypeDisplay = (serviceType: string) => {
    const displayMap: Record<string, string> = {
      'vet_consultation': 'Consultation',
      'vet_health_analysis': 'Health Analysis',
      'vet_subscription_referral': 'Subscription Referral',
      'corporate_employee_subscription': 'Employee Subscription',
      'corporate_wellness_program': 'Wellness Program'
    };
    return displayMap[serviceType] || serviceType;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      'processing': { bg: 'bg-blue-100', text: 'text-blue-800' },
      'paid': { bg: 'bg-green-100', text: 'text-green-800' },
      'failed': { bg: 'bg-red-100', text: 'text-red-800' }
    };

    const { bg, text } = statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading earnings data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!earningsData) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Partner Earnings</h1>
          <p className="text-gray-600">Track your commissions and payouts</p>
        </div>

        {/* Earnings Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-center">
              <div className="text-3xl mb-2">💰</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-1">
                {formatCurrency(earningsData.summary.total_earnings)}
              </h3>
              <p className="text-gray-600 text-sm">Total Earnings</p>
              <p className="text-xs text-gray-500 mt-1">
                {earningsData.summary.total_transactions} transactions
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-center">
              <div className="text-3xl mb-2">⏳</div>
              <h3 className="text-2xl font-bold text-yellow-600 mb-1">
                {formatCurrency(earningsData.summary.pending_earnings)}
              </h3>
              <p className="text-gray-600 text-sm">Pending</p>
              <p className="text-xs text-gray-500 mt-1">
                Awaiting payout
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-center">
              <div className="text-3xl mb-2">✅</div>
              <h3 className="text-2xl font-bold text-green-600 mb-1">
                {formatCurrency(earningsData.summary.paid_earnings)}
              </h3>
              <p className="text-gray-600 text-sm">Paid Out</p>
              <p className="text-xs text-gray-500 mt-1">
                Received
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-center">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="text-2xl font-bold text-blue-600 mb-1">
                {Math.round((earningsData.summary.paid_earnings / earningsData.summary.total_earnings) * 100) || 0}%
              </h3>
              <p className="text-gray-600 text-sm">Payout Rate</p>
              <p className="text-xs text-gray-500 mt-1">
                Overall efficiency
              </p>
            </div>
          </div>
        </div>

        {/* Service Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Earnings by Service</h2>
          <div className="space-y-4">
            {earningsData.service_breakdown.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-800">
                    {getServiceTypeDisplay(service.service_type)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {service.transaction_count} transactions
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-800">
                    {formatCurrency(service.earnings)}
                  </div>
                  <div className="text-sm text-gray-500">
                    ₹{Math.round(service.earnings / service.transaction_count)} avg
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Commission History */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Commission History</h2>
            <div className="flex items-center space-x-3">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          {commissionsLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading commissions...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Service</th>
                    <th className="text-left py-3 px-4">Customer</th>
                    <th className="text-left py-3 px-4">Base Amount</th>
                    <th className="text-left py-3 px-4">Commission</th>
                    <th className="text-left py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((commission) => (
                    <tr key={commission.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {new Date(commission.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {getServiceTypeDisplay(commission.service_type)}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{commission.user.name}</div>
                          <div className="text-xs text-gray-500">{commission.user.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {formatCurrency(commission.base_amount)}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-green-600">
                            {formatCurrency(commission.commission_amount)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {commission.commission_rate}% commission
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(commission.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {commissions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No commissions found for the selected criteria
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}