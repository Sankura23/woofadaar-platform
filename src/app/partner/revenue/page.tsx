'use client';

import { useState, useEffect } from 'react';

interface RevenueData {
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  totalEarnings: number;
  pendingPayouts: number;
  completedPayouts: number;
  commissionRate: number;
  totalCommissions: number;
}

interface Transaction {
  id: string;
  appointment_id: string;
  amount: number;
  commission_amount: number;
  service_type: string;
  status: 'pending' | 'completed' | 'paid_out';
  transaction_date: string;
  payout_date?: string;
  client_name: string;
  payment_method?: string;
}

interface PayoutHistory {
  id: string;
  payout_date: string;
  amount: number;
  transaction_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payout_method: string;
  reference_id?: string;
}

export default function PartnerRevenue() {
  const [revenueData, setRevenueData] = useState<RevenueData>({
    todayEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
    totalEarnings: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    commissionRate: 0,
    totalCommissions: 0
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payouts, setPayouts] = useState<PayoutHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'earnings' | 'transactions' | 'payouts'>('earnings');
  const [dateFilter, setDateFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    fetchRevenueData();
    fetchTransactions();
    fetchPayouts();
  }, [dateFilter]);

  const fetchRevenueData = async () => {
    try {
      const token = localStorage.getItem('partner_token') || localStorage.getItem('woofadaar_token');
      const partnerId = localStorage.getItem('partner_id') || 'current';
      
      const response = await fetch(`/api/partners/${partnerId}/revenue?period=${dateFilter}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setRevenueData(result.data);
      } else {
        setError(result.message || 'Failed to fetch revenue data');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('partner_token') || localStorage.getItem('woofadaar_token');
      const partnerId = localStorage.getItem('partner_id') || 'current';
      
      const response = await fetch(`/api/partners/${partnerId}/transactions?period=${dateFilter}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setTransactions(result.data.transactions);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('partner_token') || localStorage.getItem('woofadaar_token');
      const partnerId = localStorage.getItem('partner_id') || 'current';
      
      const response = await fetch(`/api/partners/${partnerId}/payouts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setPayouts(result.data.payouts);
      }
    } catch (error) {
      console.error('Failed to fetch payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestPayout = async () => {
    if (revenueData.pendingPayouts < 1000) {
      alert('Minimum payout amount is ₹1,000');
      return;
    }

    try {
      const token = localStorage.getItem('partner_token') || localStorage.getItem('woofadaar_token');
      const partnerId = localStorage.getItem('partner_id') || 'current';
      
      const response = await fetch(`/api/partners/${partnerId}/request-payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: revenueData.pendingPayouts,
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        alert('Payout request submitted successfully!');
        fetchRevenueData();
        fetchPayouts();
      } else {
        alert(result.message || 'Failed to request payout');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid_out':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading revenue data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Revenue Dashboard</h1>
          <p className="text-gray-600">Track your earnings and manage payouts.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Date Filter */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Filter by:</span>
            {[
              { key: '7d', label: 'Last 7 days' },
              { key: '30d', label: 'Last 30 days' },
              { key: '90d', label: 'Last 90 days' },
              { key: 'all', label: 'All time' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setDateFilter(key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-green-600 mb-2">
              ₹{revenueData.todayEarnings.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Today's Earnings</div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              ₹{revenueData.weeklyEarnings.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Weekly Earnings</div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              ₹{revenueData.monthlyEarnings.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Monthly Earnings</div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-emerald-600 mb-2">
              ₹{revenueData.totalEarnings.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Earnings</div>
          </div>
        </div>

        {/* Payout Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Pending Payouts</h3>
            <div className="text-2xl font-bold text-yellow-600 mb-2">
              ₹{revenueData.pendingPayouts.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Available for payout
            </div>
            <button
              onClick={requestPayout}
              disabled={revenueData.pendingPayouts < 1000}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {revenueData.pendingPayouts < 1000 
                ? 'Minimum ₹1,000 required'
                : 'Request Payout'
              }
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Commission Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Commission Rate:</span>
                <span className="font-semibold">{revenueData.commissionRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Commissions:</span>
                <span className="font-semibold">₹{revenueData.totalCommissions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completed Payouts:</span>
                <span className="font-semibold">₹{revenueData.completedPayouts.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="flex border-b">
            {[
              { key: 'earnings', label: 'Earnings Overview', count: null },
              { key: 'transactions', label: 'Transactions', count: transactions.length },
              { key: 'payouts', label: 'Payout History', count: payouts.length }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                {label} {count !== null && `(${count})`}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Earnings Tab */}
            {activeTab === 'earnings' && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">Earnings Analytics</h3>
                  <p className="text-gray-500">
                    Detailed earnings analytics and charts will be available here
                  </p>
                </div>
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div className="space-y-4">
                {transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(transaction.status)}`}>
                              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1).replace('_', ' ')}
                            </div>
                            <div className="text-lg font-semibold text-gray-800">
                              {transaction.service_type.replace('_', ' ').toUpperCase()}
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-600">
                            Client: <span className="font-medium">{transaction.client_name}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Date: {formatDate(transaction.transaction_date)}
                          </div>
                          {transaction.payout_date && (
                            <div className="text-sm text-gray-600">
                              Paid out: {formatDate(transaction.payout_date)}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-800">
                            ₹{transaction.amount.toLocaleString()}
                          </div>
                          <div className="text-sm text-green-600">
                            Commission: ₹{transaction.commission_amount.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">💳</div>
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No transactions found</h3>
                    <p className="text-gray-500">Your transaction history will appear here</p>
                  </div>
                )}
              </div>
            )}

            {/* Payouts Tab */}
            {activeTab === 'payouts' && (
              <div className="space-y-4">
                {payouts.length > 0 ? (
                  payouts.map((payout) => (
                    <div key={payout.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payout.status)}`}>
                              {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                            </div>
                            <div className="text-lg font-semibold text-gray-800">
                              ₹{payout.amount.toLocaleString()}
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            {payout.transaction_count} transactions • {formatDate(payout.payout_date)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Method: {payout.payout_method}
                          </div>
                          {payout.reference_id && (
                            <div className="text-sm text-gray-600">
                              Reference: {payout.reference_id}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">💰</div>
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No payouts yet</h3>
                    <p className="text-gray-500">Your payout history will appear here</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 