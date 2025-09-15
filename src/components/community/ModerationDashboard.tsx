'use client';

import { useState, useEffect } from 'react';

interface ModerationQueueItem {
  id: string;
  item_id: string;
  item_type: 'question' | 'answer' | 'comment';
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  auto_flagged: boolean;
  flag_score?: number;
  created_at: string;
  reported_by_user?: {
    id: string;
    name: string;
  };
  moderator?: {
    id: string;
    name: string;
  };
}

interface ModerationStats {
  total_pending: number;
  critical_items: number;
  auto_flagged: number;
}

export default function ModerationDashboard() {
  const [queueItems, setQueueItems] = useState<ModerationQueueItem[]>([]);
  const [stats, setStats] = useState<ModerationStats>({
    total_pending: 0,
    critical_items: 0,
    auto_flagged: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    fetchModerationQueue();
  }, [selectedSeverity, selectedType]);

  const fetchModerationQueue = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) return;

      const params = new URLSearchParams();
      if (selectedSeverity !== 'all') params.append('severity', selectedSeverity);
      if (selectedType !== 'all') params.append('itemType', selectedType);

      const response = await fetch(`/api/moderation/queue?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setQueueItems(data.data.queue_items || []);
          setStats(data.data.stats || { total_pending: 0, critical_items: 0, auto_flagged: 0 });
        }
      }
    } catch (error) {
      console.error('Error fetching moderation queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModerationAction = async (queueItemId: string, action: string, notes?: string) => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) return;

      const response = await fetch('/api/moderation/queue', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          queueItemId,
          action,
          moderatorNotes: notes
        })
      });

      if (response.ok) {
        // Refresh the queue
        fetchModerationQueue();
      }
    } catch (error) {
      console.error('Error processing moderation action:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (itemType: string) => {
    const icons = {
      question: '❓',
      answer: '💬',
      comment: '💭'
    };
    return icons[itemType as keyof typeof icons] || '📄';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Moderation Dashboard</h2>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-blue-600 text-2xl mr-3">📋</div>
              <div>
                <div className="text-2xl font-bold text-blue-900">{stats.total_pending}</div>
                <div className="text-sm text-blue-600">Pending Review</div>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-red-600 text-2xl mr-3">🚨</div>
              <div>
                <div className="text-2xl font-bold text-red-900">{stats.critical_items}</div>
                <div className="text-sm text-red-600">Critical Issues</div>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-green-600 text-2xl mr-3">🤖</div>
              <div>
                <div className="text-2xl font-bold text-green-900">{stats.auto_flagged}</div>
                <div className="text-sm text-green-600">Auto-Flagged</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex space-x-4">
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="question">Questions</option>
            <option value="answer">Answers</option>
            <option value="comment">Comments</option>
          </select>
        </div>
      </div>

      {/* Queue Items */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
            Loading moderation queue...
          </div>
        ) : queueItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-6xl mb-4">✅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
            <p className="text-gray-600">No items in the moderation queue.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {queueItems.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getTypeIcon(item.item_type)}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium capitalize">{item.item_type}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(item.severity)}`}>
                          {item.severity.toUpperCase()}
                        </span>
                        {item.auto_flagged && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            AUTO-FLAGGED
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        ID: {item.item_id} • {formatDate(item.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  {item.flag_score && (
                    <div className="text-right">
                      <div className="text-sm font-medium">Confidence</div>
                      <div className="text-lg font-bold text-red-600">
                        {Math.round(item.flag_score * 100)}%
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <div className="text-sm font-medium text-gray-700 mb-1">Reason:</div>
                  <div className="text-sm text-gray-600">{item.reason}</div>
                </div>

                {item.reported_by_user && (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-700 mb-1">Reported by:</div>
                    <div className="text-sm text-gray-600">{item.reported_by_user.name}</div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleModerationAction(item.id, 'approve')}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                  >
                    ✓ Approve
                  </button>
                  
                  <button
                    onClick={() => handleModerationAction(item.id, 'reject', 'Content violates community guidelines')}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                  >
                    ✗ Reject
                  </button>
                  
                  <button
                    onClick={() => handleModerationAction(item.id, 'warn', 'User warned about content policy')}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm"
                  >
                    ⚠️ Warn
                  </button>
                  
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm">
                    👁️ View Content
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}