'use client';

import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  AlertTriangle, 
  Info, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp,
  Activity,
  Heart,
  Scale,
  Utensils,
  Eye,
  X,
  RefreshCw,
  Calendar
} from 'lucide-react';

interface HealthInsightsProps {
  dogId: string;
  autoRefresh?: boolean;
}

interface HealthInsight {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  confidence: number;
  category: string;
  recommendations: string[];
  data_analyzed: number;
  pattern_detected: string;
  is_read: boolean;
  created_at: string;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Critical'
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'Warning'
  },
  info: {
    icon: Info,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Info'
  }
};

const CATEGORY_ICONS = {
  weight_management: Scale,
  behavioral_health: Heart,
  activity_level: Activity,
  nutrition: Utensils,
  symptom_tracking: AlertCircle,
  behavioral_insights: Brain,
  data_collection: Calendar
};

export default function HealthInsights({ dogId, autoRefresh = false }: HealthInsightsProps) {
  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetchInsights();
    
    if (autoRefresh) {
      const interval = setInterval(fetchInsights, 5 * 60 * 1000); // Refresh every 5 minutes
      return () => clearInterval(interval);
    }
  }, [dogId, autoRefresh]);

  const fetchInsights = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch(`/api/health/insights?dog_id=${dogId}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInsights(data.data.insights || []);
        setSummary(data.data.summary || {});
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewInsights = async () => {
    try {
      setGenerating(true);
      const token = localStorage.getItem('woofadaar_token');
      
      const response = await fetch('/api/health/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dog_id: dogId, analysis_period: 30 })
      });

      if (response.ok) {
        await fetchInsights(); // Refresh the list
      }
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setGenerating(false);
    }
  };

  const markAsRead = async (insightId: string, isRead: boolean) => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      
      await fetch(`/api/health/insights/${insightId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_read: isRead })
      });

      // Update local state
      setInsights(prev => prev.map(insight => 
        insight.id === insightId ? { ...insight, is_read: isRead } : insight
      ));
    } catch (error) {
      console.error('Error updating insight:', error);
    }
  };

  const deleteInsight = async (insightId: string) => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      
      await fetch(`/api/health/insights/${insightId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Remove from local state
      setInsights(prev => prev.filter(insight => insight.id !== insightId));
    } catch (error) {
      console.error('Error deleting insight:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6 text-[#3bbca8]" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Health Insights</h2>
              <p className="text-sm text-gray-600">
                Pattern recognition and health recommendations
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={generateNewInsights}
              disabled={generating}
              className="inline-flex items-center px-3 py-2 text-sm bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Insights
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{summary.totalInsights || 0}</div>
              <div className="text-sm text-gray-600">Total Insights</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{summary.unreadInsights || 0}</div>
              <div className="text-sm text-gray-600">Unread</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summary.criticalInsights || 0}</div>
              <div className="text-sm text-gray-600">Critical</div>
            </div>
          </div>
        )}

        {/* Insights List */}
        {insights.length > 0 ? (
          <div className="space-y-4">
            {insights.map((insight) => {
              const severityConfig = SEVERITY_CONFIG[insight.severity];
              const CategoryIcon = CATEGORY_ICONS[insight.category as keyof typeof CATEGORY_ICONS] || TrendingUp;
              const SeverityIcon = severityConfig.icon;

              return (
                <div
                  key={insight.id}
                  className={`p-4 border rounded-lg transition-all duration-200 ${
                    insight.is_read ? 'opacity-75' : 'shadow-sm'
                  } ${severityConfig.bgColor} ${severityConfig.borderColor}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex items-center space-x-2">
                        <SeverityIcon className={`w-5 h-5 ${severityConfig.color}`} />
                        <CategoryIcon className={`w-4 h-4 ${severityConfig.color}`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`font-semibold ${insight.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                            {insight.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {insight.confidence}% confidence
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${severityConfig.color} ${severityConfig.bgColor}`}>
                              {severityConfig.label}
                            </span>
                          </div>
                        </div>
                        
                        <p className={`text-sm mb-3 ${insight.is_read ? 'text-gray-600' : 'text-gray-700'}`}>
                          {insight.description}
                        </p>

                        {/* Pattern Details */}
                        <div className="mb-3 p-2 bg-white rounded text-xs text-gray-600">
                          <strong>Pattern:</strong> {insight.pattern_detected} 
                          <span className="ml-2">
                            ({insight.data_analyzed} data points analyzed)
                          </span>
                        </div>

                        {/* Recommendations */}
                        {insight.recommendations.length > 0 && (
                          <div className="mb-3">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations:</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {insight.recommendations.map((rec, index) => (
                                <li key={index} className="flex items-start">
                                  <CheckCircle className="w-3 h-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Generated {formatDate(insight.created_at)}</span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => markAsRead(insight.id, !insight.is_read)}
                              className="flex items-center hover:text-[#3bbca8] transition-colors"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              {insight.is_read ? 'Mark unread' : 'Mark read'}
                            </button>
                            <button
                              onClick={() => deleteInsight(insight.id)}
                              className="flex items-center hover:text-red-500 transition-colors"
                            >
                              <X className="w-3 h-3 mr-1" />
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No health insights available yet</p>
            <button
              onClick={generateNewInsights}
              disabled={generating}
              className="inline-flex items-center px-4 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Analyzing Health Data...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Generate First Insights
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}