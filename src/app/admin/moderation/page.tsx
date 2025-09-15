'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface ModerationItem {
  id: string;
  item_id: string;
  item_type: string;
  reason: string;
  severity: string;
  status: string;
  auto_flagged: boolean;
  flag_score?: number;
  created_at: string;
  reported_by_user?: {
    id: string;
    name: string;
  };
  content?: {
    title?: string;
    content: string;
    author: {
      id: string;
      name: string;
    };
  };
}

interface ModerationStats {
  pending: number;
  approved: number;
  rejected: number;
  total_today: number;
  auto_flagged: number;
}

export default function ModerationDashboard() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  useEffect(() => {
    fetchModerationData();
  }, [selectedTab, selectedSeverity]);

  const fetchModerationData = async () => {
    try {
      setLoading(true);
      
      // Fetch moderation queue items
      const params = new URLSearchParams();
      if (selectedTab !== 'all') params.append('status', selectedTab);
      if (selectedSeverity !== 'all') params.append('severity', selectedSeverity);
      
      const itemsResponse = await fetch(`/api/admin/moderation/queue?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      // Fetch stats
      const statsResponse = await fetch('/api/admin/moderation/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      const itemsData = await itemsResponse.json();
      const statsData = await statsResponse.json();

      if (itemsData.success) setItems(itemsData.data.items);
      if (statsData.success) setStats(statsData.data.stats);
      
    } catch (error) {
      console.error('Error fetching moderation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModerationAction = async (itemId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const response = await fetch(`/api/admin/moderation/queue/${itemId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          action,
          notes
        })
      });

      const data = await response.json();
      if (data.success) {
        fetchModerationData(); // Refresh data
      }
    } catch (error) {
      console.error('Error taking moderation action:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Moderation Dashboard</h1>
                <p className="text-gray-600 mt-2">Monitor and manage community content</p>
              </div>
              <Link
                href="/admin"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                ← Back to Admin
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-sm font-medium text-gray-500">Pending Review</div>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-sm font-medium text-gray-500">Approved Today</div>
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-sm font-medium text-gray-500">Rejected Today</div>
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-sm font-medium text-gray-500">Total Today</div>
                <div className="text-2xl font-bold text-gray-900">{stats.total_today}</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-sm font-medium text-gray-500">Auto-Flagged</div>
                <div className="text-2xl font-bold text-purple-600">{stats.auto_flagged}</div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* Status Filter */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <div className="flex space-x-1">
                  {[
                    { key: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
                    { key: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800' },
                    { key: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
                    { key: 'all', label: 'All', color: 'bg-gray-100 text-gray-800' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setSelectedTab(tab.key as any)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        selectedTab === tab.key 
                          ? tab.color 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity Filter */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Severity:</span>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-3 py-1"
                >
                  <option value="all">All</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Moderation Queue */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Moderation Queue ({items.length} items)
              </h2>

              {items.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">✅</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All clear!</h3>
                  <p className="text-gray-600">No items require moderation at this time.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Item Header */}
                          <div className="flex items-center space-x-3 mb-3">
                            <span className="text-sm font-medium text-gray-900 capitalize">
                              {item.item_type}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(item.severity)}`}>
                              {item.severity}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                            {item.auto_flagged && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                🤖 Auto-flagged {item.flag_score && `(${Math.round(item.flag_score * 100)}%)`}
                              </span>
                            )}
                          </div>

                          {/* Reason */}
                          <div className="mb-3">
                            <span className="text-sm font-medium text-gray-700">Reason: </span>
                            <span className="text-sm text-gray-900">{item.reason}</span>
                          </div>

                          {/* Content Preview */}
                          {item.content && (
                            <div className="bg-gray-50 p-3 rounded border mb-3">
                              {item.content.title && (
                                <div className="font-medium text-gray-900 mb-1">{item.content.title}</div>
                              )}
                              <div className="text-sm text-gray-700 line-clamp-2">
                                {item.content.content}
                              </div>
                              <div className="text-xs text-gray-500 mt-2">
                                By: {item.content.author.name}
                              </div>
                            </div>
                          )}

                          {/* Report Info */}
                          <div className="text-xs text-gray-500">
                            Reported: {formatDate(item.created_at)}
                            {item.reported_by_user && (
                              <span> by {item.reported_by_user.name}</span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {item.status === 'pending' && (
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => handleModerationAction(item.id, 'approve')}
                              className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded hover:bg-green-200 transition-colors"
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => handleModerationAction(item.id, 'reject')}
                              className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded hover:bg-red-200 transition-colors"
                            >
                              ❌ Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}