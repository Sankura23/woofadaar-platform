'use client';

import { useState, useEffect, useCallback } from 'react';

interface DashboardStats {
  overview: {
    pendingReports: number;
    activeQueueItems: number;
    criticalAlerts: number;
    automationRate: number;
  };
  actionStats: {
    today: Record<string, number>;
    week: Record<string, number>;
    month: Record<string, number>;
  };
  contentAnalysis: {
    topFlaggedTypes: Array<{
      contentType: string;
      count: number;
      avgSpamScore: number;
      avgToxicityScore: number;
    }>;
  };
  moderatorPerformance: Array<{
    moderator: {
      id: string;
      name: string;
      profile_image_url?: string;
    };
    actionsThisWeek: number;
  }>;
  automationEffectiveness: {
    results: Array<{
      result: string;
      count: number;
      avgConfidence: number;
      avgProcessingTime: number;
    }>;
    totalProcessed: number;
  };
  alerts: {
    critical: Array<{
      id: string;
      contentType: string;
      contentId: string;
      category: string;
      reason: string;
      priority: string;
      reporter: string;
      createdAt: string;
      timeSincereported: number;
    }>;
  };
}

interface QueueItem {
  id: string;
  contentType: string;
  contentId: string;
  queueType: string;
  priority: number;
  status: string;
  reason: string;
  addedBy: string;
  addedAt: string;
  assignedTo?: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
  waitingTime: number;
}

export default function EnhancedModerationDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('/api/moderation/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setStats(data.data.stats);
        setQueue(data.data.queue);
        setError('');
      } else {
        setError(data.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to connect to moderation service');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchDashboardData]);

  const handleBulkAction = async () => {
    if (!bulkAction || selectedItems.size === 0) return;

    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const items = Array.from(selectedItems).map(id => {
        const queueItem = queue.find(q => q.id === id);
        return {
          type: 'queue',
          id: id
        };
      });

      const response = await fetch('/api/moderation/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: bulkAction,
          items,
          reason: bulkReason
        })
      });

      const data = await response.json();

      if (data.success) {
        setSelectedItems(new Set());
        setBulkAction('');
        setBulkReason('');
        fetchDashboardData(); // Refresh data
      } else {
        setError(data.error || 'Bulk action failed');
      }
    } catch (err) {
      console.error('Bulk action error:', err);
      setError('Failed to execute bulk action');
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const selectAll = () => {
    if (selectedItems.size === queue.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(queue.map(item => item.id)));
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
  };

  const getPriorityColor = (priority: number): string => {
    if (priority >= 8) return 'bg-red-500';
    if (priority >= 6) return 'bg-orange-500';
    if (priority >= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-600 animate-spin mr-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-lg">Loading moderation dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700">{error}</p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            🛡️ Enhanced Moderation Dashboard
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Last updated: just now</span>
            <button
              onClick={fetchDashboardData}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
              title="Refresh Dashboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-6 mt-6">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'queue', label: 'Moderation Queue', icon: '📋' },
            { id: 'analytics', label: 'Analytics', icon: '📈' },
            { id: 'automation', label: 'Automation', icon: '🤖' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 pb-4 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Pending Reports</p>
                    <p className="text-2xl font-bold">{stats.overview.pendingReports}</p>
                  </div>
                  <div className="text-3xl opacity-80">📋</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm">Active Queue</p>
                    <p className="text-2xl font-bold">{stats.overview.activeQueueItems}</p>
                  </div>
                  <div className="text-3xl opacity-80">⚡</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm">Critical Alerts</p>
                    <p className="text-2xl font-bold">{stats.overview.criticalAlerts}</p>
                  </div>
                  <div className="text-3xl opacity-80">🚨</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Auto Actions</p>
                    <p className="text-2xl font-bold">{stats.overview.automationRate}</p>
                  </div>
                  <div className="text-3xl opacity-80">🤖</div>
                </div>
              </div>
            </div>

            {/* Critical Alerts */}
            {stats.alerts.critical.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">🚨 Critical Alerts</h3>
                <div className="space-y-3">
                  {stats.alerts.critical.map((alert) => (
                    <div key={alert.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                              {alert.priority.toUpperCase()}
                            </span>
                            <span className="font-medium">{alert.contentType}</span>
                            <span className="text-gray-500">#{alert.contentId.slice(-8)}</span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{alert.reason}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Reported by {alert.reporter} • {formatTime(alert.timeSincereported)} ago
                          </p>
                        </div>
                        <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm">
                          Review Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'queue' && (
          <div className="space-y-6">
            {/* Bulk Actions */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={selectAll}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {selectedItems.size === queue.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-sm text-gray-500">
                    {selectedItems.size} of {queue.length} selected
                  </span>
                </div>

                {selectedItems.size > 0 && (
                  <div className="flex items-center space-x-3">
                    <select
                      value={bulkAction}
                      onChange={(e) => setBulkAction(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select Action...</option>
                      <option value="approve">✅ Approve</option>
                      <option value="reject">❌ Reject</option>
                      <option value="assign">👤 Assign to Me</option>
                      <option value="escalate">⬆️ Escalate</option>
                      <option value="hide">🙈 Hide Content</option>
                    </select>
                    
                    <input
                      type="text"
                      value={bulkReason}
                      onChange={(e) => setBulkReason(e.target.value)}
                      placeholder="Reason..."
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    />
                    
                    <button
                      onClick={handleBulkAction}
                      disabled={!bulkAction}
                      className="px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      Execute
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Queue Items */}
            <div className="space-y-4">
              {queue.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                        className="mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(item.priority)}`}></div>
                          <span className="font-medium capitalize">{item.contentType}</span>
                          <span className="text-gray-500">#{item.contentId.slice(-8)}</span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            Priority {item.priority}
                          </span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {item.queueType}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-2">{item.reason}</p>
                        
                        <div className="flex items-center text-xs text-gray-500 space-x-4">
                          <span>Added by: {item.addedBy}</span>
                          <span>Waiting: {formatTime(item.waitingTime)}</span>
                          {item.assignedTo && (
                            <span>Assigned to: {item.assignedTo.name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">
                        ✓ Approve
                      </button>
                      <button className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm">
                        ✗ Reject
                      </button>
                      <button className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm">
                        👁️ View
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {queue.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-6xl mb-4">✅</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Queue is Clear!</h3>
                  <p className="text-gray-600">No items requiring moderation at the moment.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Moderator Performance */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">👥 Moderator Performance (This Week)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.moderatorPerformance.map((mod, index) => (
                  <div key={mod.moderator.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {mod.moderator.profile_image_url ? (
                          <img
                            src={mod.moderator.profile_image_url}
                            alt={mod.moderator.name}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm">
                            {mod.moderator.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium">{mod.moderator.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{mod.actionsThisWeek}</div>
                        <div className="text-xs text-gray-500">actions</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Analysis */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">📊 Top Flagged Content Types</h3>
              <div className="space-y-3">
                {stats.contentAnalysis.topFlaggedTypes.map((type, index) => (
                  <div key={type.contentType} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium capitalize">{type.contentType}</span>
                        <div className="text-sm text-gray-500">
                          Avg Spam: {type.avgSpamScore}% • Avg Toxicity: {type.avgToxicityScore}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{type.count}</div>
                        <div className="text-xs text-gray-500">flagged</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'automation' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">🤖 Automation Effectiveness</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.automationEffectiveness.results.map((result) => (
                  <div key={result.result} className="bg-gray-50 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{result.count}</div>
                      <div className="text-sm text-gray-600 capitalize">{result.result}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {result.avgConfidence}% confidence
                      </div>
                      <div className="text-xs text-gray-500">
                        ~{result.avgProcessingTime}ms avg
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center text-sm text-gray-500 mt-4">
                Total processed by automation: {stats.automationEffectiveness.totalProcessed} items
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}