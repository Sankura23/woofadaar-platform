'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ModerationMetrics {
  totalActions: number;
  accuracyRate: number;
  responseTime: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  communityAgreementRate: number;
  automationRate: number;
  contentVolumeProcessed: number;
}

interface TrendPrediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
  timeframe: string;
  factors: string[];
}

interface ContentAnalysisInsight {
  contentType: string;
  pattern: string;
  frequency: number;
  impact: 'positive' | 'negative' | 'neutral';
  recommendation: string;
  examples: string[];
}

interface UserBehaviorPattern {
  pattern: string;
  userCount: number;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  indicators: string[];
  suggestedActions: string[];
}

interface PerformanceOptimization {
  area: string;
  currentEfficiency: number;
  potentialImprovement: number;
  implementationCost: 'low' | 'medium' | 'high';
  priority: number;
  description: string;
  steps: string[];
}

interface PredictiveAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  prediction: string;
  probability: number;
  timeframe: string;
  impact: string;
  recommendedActions: string[];
  createdAt: Date;
}

export default function AdvancedAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const [activeView, setActiveView] = useState<'overview' | 'trends' | 'insights' | 'optimizations'>('overview');
  const [data, setData] = useState<{
    overview: ModerationMetrics;
    trends: TrendPrediction[];
    contentInsights: ContentAnalysisInsight[];
    userPatterns: UserBehaviorPattern[];
    optimizations: PerformanceOptimization[];
    predictiveAlerts: PredictiveAlert[];
    recommendations: string[];
  } | null>(null);

  const [realTimeMetrics, setRealTimeMetrics] = useState<any>(null);

  useEffect(() => {
    fetchAnalyticsData();
    // Set up real-time updates
    const interval = setInterval(fetchRealTimeMetrics, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [timeframe]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`/api/moderation/analytics?action=comprehensive&period=${timeframe}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.success) {
        setData(result.data.report);
        setError('');
      } else {
        setError(result.error || 'Failed to fetch analytics data');
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError('Failed to connect to analytics service');
    } finally {
      setLoading(false);
    }
  };

  const fetchRealTimeMetrics = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) return;

      const response = await fetch('/api/moderation/analytics?action=real_time', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.success) {
        setRealTimeMetrics(result.data);
      }
    } catch (err) {
      console.error('Real-time metrics fetch error:', err);
    }
  };

  const formatValue = (value: number, type: 'percentage' | 'number' | 'time' = 'number'): string => {
    if (type === 'percentage') {
      return `${(value * 100).toFixed(1)}%`;
    } else if (type === 'time') {
      return `${value.toFixed(0)}ms`;
    } else {
      return value.toLocaleString();
    }
  };

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      case 'stable': return '➡️';
      default: return '📊';
    }
  };

  const getRiskColor = (level: string): string => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      case 'critical': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCostColor = (cost: string): string => {
    switch (cost) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center">
          <svg className="w-6 h-6 text-blue-600 animate-spin mr-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading advanced analytics...
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
            onClick={fetchAnalyticsData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              📊 Advanced Moderation Analytics
            </h3>
            <p className="text-gray-600 mt-1">
              Predictive insights and performance optimization recommendations
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Real-time Status */}
            {realTimeMetrics && (
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  realTimeMetrics.metrics.systemHealth === 'healthy' ? 'bg-green-500' :
                  realTimeMetrics.metrics.systemHealth === 'warning' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}></div>
                <span className="text-gray-600">
                  System {realTimeMetrics.metrics.systemHealth} • {realTimeMetrics.metrics.contentProcessed} processed
                </span>
              </div>
            )}

            {/* Timeframe Selector */}
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="day">Last 24 Hours</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>

            <button
              onClick={fetchAnalyticsData}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
              title="Refresh Analytics"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-6 mt-6">
          {[
            { id: 'overview', label: 'Performance Overview', icon: '📈' },
            { id: 'trends', label: 'Predictive Trends', icon: '🔮' },
            { id: 'insights', label: 'Content Insights', icon: '🔍' },
            { id: 'optimizations', label: 'Optimizations', icon: '⚡' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`flex items-center space-x-2 pb-2 border-b-2 transition-colors ${
                activeView === tab.id
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

      {/* Main Content */}
      <div className="p-6">
        {activeView === 'overview' && (
          <div className="space-y-8">
            {/* Key Metrics Grid */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Accuracy Rate</p>
                      <p className="text-3xl font-bold">{formatValue(data.overview.accuracyRate, 'percentage')}</p>
                    </div>
                    <div className="text-3xl opacity-80">🎯</div>
                  </div>
                  <div className="mt-2 text-sm text-blue-100">
                    Target: 85%+
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Response Time</p>
                      <p className="text-3xl font-bold">{formatValue(data.overview.responseTime, 'time')}</p>
                    </div>
                    <div className="text-3xl opacity-80">⚡</div>
                  </div>
                  <div className="mt-2 text-sm text-green-100">
                    Target: &lt;500ms
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">Automation Rate</p>
                      <p className="text-3xl font-bold">{formatValue(data.overview.automationRate, 'percentage')}</p>
                    </div>
                    <div className="text-3xl opacity-80">🤖</div>
                  </div>
                  <div className="mt-2 text-sm text-purple-100">
                    Target: 70%+
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm">Content Processed</p>
                      <p className="text-3xl font-bold">{formatValue(data.overview.contentVolumeProcessed)}</p>
                    </div>
                    <div className="text-3xl opacity-80">📊</div>
                  </div>
                  <div className="mt-2 text-sm text-orange-100">
                    This {timeframe}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Quality Metrics */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Quality Metrics</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-900">False Positive Rate</h5>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      data.overview.falsePositiveRate < 0.1 ? 'bg-green-100 text-green-800' :
                      data.overview.falsePositiveRate < 0.2 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {formatValue(data.overview.falsePositiveRate, 'percentage')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Content incorrectly flagged as problematic
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-900">False Negative Rate</h5>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      data.overview.falseNegativeRate < 0.05 ? 'bg-green-100 text-green-800' :
                      data.overview.falseNegativeRate < 0.1 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {formatValue(data.overview.falseNegativeRate, 'percentage')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Problematic content missed by system
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-900">Community Agreement</h5>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      data.overview.communityAgreementRate > 0.8 ? 'bg-green-100 text-green-800' :
                      data.overview.communityAgreementRate > 0.6 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {formatValue(data.overview.communityAgreementRate, 'percentage')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Community consensus with AI decisions
                  </div>
                </div>
              </div>
            </div>

            {/* Active Alerts */}
            {data.predictiveAlerts.filter(alert => alert.severity === 'high' || alert.severity === 'critical').length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">🚨 Active Alerts</h4>
                <div className="space-y-3">
                  {data.predictiveAlerts
                    .filter(alert => alert.severity === 'high' || alert.severity === 'critical')
                    .map((alert) => (
                    <div key={alert.id} className={`border-l-4 rounded-lg p-4 ${
                      alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                      'border-orange-500 bg-orange-50'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {alert.severity.toUpperCase()}
                            </span>
                            <span className="text-sm text-gray-600">{alert.type.replace('_', ' ')}</span>
                          </div>
                          <p className="font-medium text-gray-900 mb-1">{alert.prediction}</p>
                          <p className="text-sm text-gray-600 mb-3">{alert.impact}</p>
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Recommended Actions:</p>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {alert.recommendedActions.map((action, idx) => (
                                <li key={idx} className="flex items-start">
                                  <span className="text-blue-500 mr-2">•</span>
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-lg font-bold">{Math.round(alert.probability * 100)}%</div>
                          <div className="text-xs text-gray-500">confidence</div>
                          <div className="text-xs text-gray-500 mt-1">{alert.timeframe}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Recommendations */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">💡 Priority Recommendations</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.recommendations.slice(0, 6).map((recommendation, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg"
                  >
                    <div className="text-blue-600 mt-0.5">
                      {recommendation.charAt(0)}
                    </div>
                    <p className="text-sm text-gray-700 flex-1">{recommendation.slice(2)}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'trends' && (
          <div className="space-y-8">
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-6">🔮 Predictive Trend Analysis</h4>
              <div className="space-y-6">
                {data.trends.map((trend, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border border-gray-200 rounded-lg p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="text-2xl">{getTrendIcon(trend.trend)}</span>
                          <h5 className="text-lg font-medium text-gray-900">{trend.metric}</h5>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-500">Current</p>
                            <p className="text-xl font-bold">
                              {typeof trend.currentValue === 'number' && trend.currentValue < 1 
                                ? formatValue(trend.currentValue, 'percentage')
                                : formatValue(trend.currentValue)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Predicted ({trend.timeframe})</p>
                            <p className={`text-xl font-bold ${
                              trend.trend === 'increasing' ? 'text-green-600' :
                              trend.trend === 'decreasing' ? 'text-red-600' :
                              'text-gray-600'
                            }`}>
                              {typeof trend.predictedValue === 'number' && trend.predictedValue < 1 
                                ? formatValue(trend.predictedValue, 'percentage')
                                : formatValue(trend.predictedValue)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Confidence</p>
                            <p className="text-xl font-bold text-blue-600">
                              {formatValue(trend.confidence, 'percentage')}
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Contributing Factors:</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {trend.factors.map((factor, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="text-blue-500 mr-2">•</span>
                                <span>{factor}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'insights' && (
          <div className="space-y-8">
            {/* Content Pattern Insights */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-6">📋 Content Pattern Analysis</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {data.contentInsights.map((insight, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`border-l-4 rounded-lg p-6 ${
                      insight.impact === 'negative' ? 'border-red-500 bg-red-50' :
                      insight.impact === 'positive' ? 'border-green-500 bg-green-50' :
                      'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          insight.impact === 'negative' ? 'bg-red-100 text-red-800' :
                          insight.impact === 'positive' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {insight.contentType}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{insight.frequency}</div>
                        <div className="text-xs text-gray-500">occurrences</div>
                      </div>
                    </div>
                    
                    <h5 className="font-medium text-gray-900 mb-2">{insight.pattern.replace('_', ' ')}</h5>
                    <p className="text-sm text-gray-700 mb-3">{insight.recommendation}</p>
                    
                    {insight.examples.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Examples:</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {insight.examples.slice(0, 3).map((example, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="text-gray-400 mr-2">•</span>
                              <span>{example}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* User Behavior Patterns */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-6">👥 User Behavior Patterns</h4>
              <div className="space-y-4">
                {data.userPatterns.map((pattern, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border border-gray-200 rounded-lg p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(pattern.riskLevel)}`}>
                            {pattern.riskLevel.toUpperCase()} RISK
                          </span>
                          <h5 className="font-medium text-gray-900">{pattern.pattern.replace('_', ' ')}</h5>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-4">{pattern.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Indicators:</p>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {pattern.indicators.map((indicator, idx) => (
                                <li key={idx} className="flex items-start">
                                  <span className="text-blue-500 mr-2">•</span>
                                  <span>{indicator}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Suggested Actions:</p>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {pattern.suggestedActions.map((action, idx) => (
                                <li key={idx} className="flex items-start">
                                  <span className="text-green-500 mr-2">•</span>
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold">{pattern.userCount}</div>
                        <div className="text-xs text-gray-500">users affected</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'optimizations' && (
          <div className="space-y-8">
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-6">⚡ Performance Optimization Opportunities</h4>
              
              {/* Quick Wins */}
              <div className="mb-8">
                <h5 className="font-medium text-green-600 mb-4">🎯 Quick Wins (Low Cost, High Impact)</h5>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {data.optimizations
                    .filter(opt => opt.implementationCost === 'low' && opt.priority >= 7)
                    .map((optimization, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="border border-green-200 bg-green-50 rounded-lg p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <h6 className="font-medium text-gray-900">{optimization.area}</h6>
                        <div className="flex space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCostColor(optimization.implementationCost)}`}>
                            {optimization.implementationCost} cost
                          </span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            Priority {optimization.priority}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Current</p>
                          <p className="text-lg font-bold">{optimization.currentEfficiency}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Potential Gain</p>
                          <p className="text-lg font-bold text-green-600">+{optimization.potentialImprovement}%</p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-4">{optimization.description}</p>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Implementation Steps:</p>
                        <ol className="text-sm text-gray-600 space-y-1">
                          {optimization.steps.map((step, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="text-blue-500 mr-2">{idx + 1}.</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* All Optimizations */}
              <div>
                <h5 className="font-medium text-gray-700 mb-4">📊 All Optimization Opportunities</h5>
                <div className="space-y-4">
                  {data.optimizations
                    .sort((a, b) => b.priority - a.priority)
                    .map((optimization, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border border-gray-200 rounded-lg p-6"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h6 className="font-medium text-gray-900">{optimization.area}</h6>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCostColor(optimization.implementationCost)}`}>
                              {optimization.implementationCost} cost
                            </span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              Priority {optimization.priority}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-4">{optimization.description}</p>
                          
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${optimization.currentEfficiency}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500">
                            Current: {optimization.currentEfficiency}% • Potential: +{optimization.potentialImprovement}%
                          </div>
                        </div>
                        
                        <div className="text-right ml-6">
                          <div className="text-2xl font-bold text-green-600">+{optimization.potentialImprovement}%</div>
                          <div className="text-xs text-gray-500">improvement</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}