'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  severity?: string;
  impact?: string;
  probability?: number;
  confidence: number;
  actionable: boolean;
  recommendations: string[];
  data: Record<string, any>;
  createdAt: string;
  expiresAt?: string;
  validUntil?: string;
}

interface AIInsightsData {
  user: Insight[];
  business: Insight[];
  predictive: Insight[];
}

interface AIInsightsPanelProps {
  userId?: string;
  className?: string;
}

export default function AIInsightsPanel({ userId, className = '' }: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<AIInsightsData>({
    user: [],
    business: [],
    predictive: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'user' | 'business' | 'predictive'>('business');

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = userId 
        ? `/api/analytics/ai-insights?userId=${userId}`
        : '/api/analytics/ai-insights';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setInsights(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch insights');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch insights');
      console.error('Error fetching AI insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [userId]);

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getImpactColor = (impact?: string) => {
    switch (impact) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-blue-600 bg-blue-50';
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

  const renderInsight = (insight: Insight) => (
    <Card key={insight.id} className={`mb-4 ${getSeverityColor(insight.severity || insight.impact)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{insight.title}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
          </div>
          <div className="flex flex-col items-end text-xs text-gray-500">
            <span>{Math.floor(insight.confidence * 100)}% confidence</span>
            <span>{formatDate(insight.createdAt)}</span>
            {insight.probability && (
              <span className="font-medium text-blue-600">
                {Math.floor(insight.probability * 100)}% probability
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 mt-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(insight.severity || insight.impact)}`}>
            {insight.severity || insight.impact || insight.type}
          </span>
          {insight.actionable && (
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              Actionable
            </span>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {insight.recommendations.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-gray-900 mb-2">Recommendations:</h4>
            <ul className="list-disc list-inside space-y-1">
              {insight.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-gray-700">{rec}</li>
              ))}
            </ul>
          </div>
        )}
        
        {Object.keys(insight.data).length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2 text-xs">Supporting Data:</h4>
            <div className="text-xs text-gray-600">
              {Object.entries(insight.data).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                  <span className="font-medium">
                    {typeof value === 'number' 
                      ? value.toLocaleString() 
                      : Array.isArray(value) 
                        ? value.length 
                        : String(value).slice(0, 50)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className={`${className} p-6`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-48 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} p-6`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Insights</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button 
            onClick={fetchInsights}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const currentInsights = insights[activeTab] || [];

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">AI-Powered Insights</h2>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'business', label: 'Business Insights' },
              { key: 'predictive', label: 'Predictive Analytics' },
              ...(userId ? [{ key: 'user', label: 'User Insights' }] : [])
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                  {insights[tab.key as keyof AIInsightsData]?.length || 0}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Insights Display */}
      <div className="space-y-4">
        {currentInsights.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500">
                <h3 className="text-lg font-medium mb-2">No insights available</h3>
                <p className="text-sm">
                  {activeTab === 'user' 
                    ? 'User needs more activity to generate insights'
                    : 'Insights will be generated as more data becomes available'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          currentInsights
            .sort((a, b) => {
              // Sort by severity/impact and confidence
              const getSeverityScore = (s?: string) => {
                switch (s) {
                  case 'critical': return 4;
                  case 'high': return 3;
                  case 'medium': return 2;
                  case 'low': return 1;
                  default: return 0;
                }
              };
              
              const aScore = getSeverityScore(a.severity || a.impact);
              const bScore = getSeverityScore(b.severity || b.impact);
              
              if (aScore !== bScore) return bScore - aScore;
              return b.confidence - a.confidence;
            })
            .map(renderInsight)
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Generating...' : 'Refresh Insights'}
        </button>
      </div>
    </div>
  );
}