'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Zap,
  Globe,
  Smartphone,
  Monitor
} from 'lucide-react';

// Types for analytics data
interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  threshold?: number;
}

interface UserBehavior {
  active_users: number;
  page_views: number;
  bounce_rate: number;
  avg_session_duration: number;
  top_pages: Array<{ page: string; views: number }>;
  user_flow: Array<{ step: string; count: number; conversion_rate: number }>;
}

interface SystemHealth {
  database: {
    status: 'healthy' | 'warning' | 'critical';
    connection_time_ms: number;
    query_performance: {
      avg_duration_ms: number;
      slow_query_rate: number;
    };
  };
  cache: {
    hit_rate: string;
    memory_usage: any;
    operations: {
      hits: number;
      misses: number;
    };
  };
  api_performance: {
    [key: string]: {
      count: number;
      avg_time: number;
      min_time: number;
      max_time: number;
    };
  };
}

interface AnalyticsData {
  timestamp: string;
  user_behavior: UserBehavior;
  performance_metrics: PerformanceMetric[];
  system_health: SystemHealth;
  alerts: Array<{
    type: 'info' | 'warning' | 'error';
    message: string;
    metric: string;
  }>;
}

const RealTimeAnalyticsDashboard: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket connection management
  const connectWebSocket = () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/analytics/live`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('Analytics WebSocket connected');
        setIsConnected(true);
        
        // Send initial subscription
        wsRef.current?.send(JSON.stringify({
          type: 'subscribe',
          timeframe: selectedTimeframe
        }));
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'analytics_update') {
            setAnalyticsData(data.data);
            setLastUpdate(new Date());
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('Analytics WebSocket disconnected');
        setIsConnected(false);
        
        // Auto-reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };
      
      wsRef.current.onerror = (error) => {
        console.warn('Analytics WebSocket error (expected in development):', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  };

  // Initialize with mock data immediately for demo
  useEffect(() => {
    // Set mock data immediately
    const mockData: AnalyticsData = {
      timestamp: new Date().toISOString(),
      user_behavior: {
        active_users: 127,
        page_views: 2843,
        bounce_rate: 35,
        avg_session_duration: 247,
        top_pages: [
          { page: '/appointments', views: 584 },
          { page: '/partners/directory', views: 421 },
          { page: '/health', views: 312 },
          { page: '/community', views: 189 },
          { page: '/mobile-demo', views: 156 }
        ],
        user_flow: []
      },
      performance_metrics: [
        { name: 'Page Load Time', value: 1.2, unit: 's', trend: 'stable' },
        { name: 'API Response', value: 145, unit: 'ms', trend: 'up' },
        { name: 'Database Query', value: 23, unit: 'ms', trend: 'down' },
        { name: 'Cache Hit Rate', value: 94.5, unit: '%', trend: 'up' }
      ],
      system_health: {
        database: {
          status: 'healthy',
          connection_time_ms: 15,
          query_performance: {
            avg_duration_ms: 23.4,
            slow_query_rate: 2.1
          }
        },
        cache: {
          hit_rate: '94.5%',
          memory_usage: null,
          operations: {
            hits: 1247,
            misses: 73
          }
        },
        api_performance: {
          '/api/partners': { count: 142, avg_time: 89, min_time: 23, max_time: 234 },
          '/api/appointments': { count: 89, avg_time: 156, min_time: 45, max_time: 412 },
          '/api/health': { count: 67, avg_time: 73, min_time: 12, max_time: 189 },
          '/api/community': { count: 34, avg_time: 203, min_time: 78, max_time: 567 }
        }
      },
      alerts: []
    };
    
    setAnalyticsData(mockData);
    setLastUpdate(new Date());
    
    // Try WebSocket connection in background
    setTimeout(() => {
      connectWebSocket();
    }, 100);
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Update timeframe
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'timeframe_change',
        timeframe: selectedTimeframe
      }));
    }
  }, [selectedTimeframe]);

  // Fallback to HTTP polling if WebSocket fails
  useEffect(() => {
    if (!isConnected && !wsRef.current) {
      const fetchAnalytics = async () => {
        try {
          const response = await fetch(`/api/performance/metrics?timeframe=${selectedTimeframe}`);
          const data = await response.json();
          
          if (data.success) {
            // Transform HTTP response to match WebSocket format
            const transformedData: AnalyticsData = {
              timestamp: new Date().toISOString(),
              user_behavior: {
                active_users: 0,
                page_views: 0,
                bounce_rate: 0,
                avg_session_duration: 0,
                top_pages: [],
                user_flow: []
              },
              performance_metrics: Object.entries(data.data.performance_metrics).map(([name, metrics]: [string, any]) => ({
                name,
                value: metrics.avg_value,
                unit: 'ms',
                trend: 'stable' as const
              })),
              system_health: data.data.system_health,
              alerts: data.data.alerts
            };
            
            setAnalyticsData(transformedData);
            setLastUpdate(new Date());
          }
        } catch (error) {
          console.error('Failed to fetch analytics:', error);
        }
      };

      const interval = setInterval(fetchAnalytics, 10000); // Poll every 10 seconds
      fetchAnalytics(); // Initial fetch

      return () => clearInterval(interval);
    }
  }, [isConnected, selectedTimeframe]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  if (!analyticsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with connection status and controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold text-gray-900">Real-Time Analytics</h1>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Live' : 'Reconnecting...'}
            </span>
            {lastUpdate && (
              <span className="text-xs text-gray-500">
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {['1h', '6h', '24h', '7d'].map((timeframe) => (
            <Button
              key={timeframe}
              variant={selectedTimeframe === timeframe ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeframe(timeframe)}
            >
              {timeframe}
            </Button>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {analyticsData.alerts && analyticsData.alerts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-yellow-800">
              <AlertTriangle className="h-4 w-4 mr-2" />
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analyticsData.alerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-yellow-700">{alert.message}</span>
                  <Badge variant={alert.type === 'error' ? 'destructive' : 'secondary'}>
                    {alert.metric}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Database Health</CardTitle>
            <Database className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-2xl font-bold ${getStatusColor(analyticsData.system_health.database.status)}`}>
                {analyticsData.system_health.database.status}
              </span>
              {getStatusIcon(analyticsData.system_health.database.status)}
            </div>
            <div className="space-y-1 text-xs text-gray-600">
              <div>Connection: {analyticsData.system_health.database.connection_time_ms}ms</div>
              {analyticsData.system_health.database.query_performance && (
                <div>Avg Query: {analyticsData.system_health.database.query_performance.avg_duration_ms.toFixed(1)}ms</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cache Performance</CardTitle>
            <Zap className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-blue-600">
                {analyticsData.system_health.cache.hit_rate}
              </span>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div className="space-y-1 text-xs text-gray-600">
              <div>Hits: {formatNumber(analyticsData.system_health.cache.operations.hits)}</div>
              <div>Misses: {formatNumber(analyticsData.system_health.cache.operations.misses)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-green-600">
                {formatNumber(analyticsData.user_behavior.active_users)}
              </span>
              <Activity className="h-4 w-4 text-green-600" />
            </div>
            <div className="space-y-1 text-xs text-gray-600">
              <div>Page Views: {formatNumber(analyticsData.user_behavior.page_views)}</div>
              <div>Bounce Rate: {analyticsData.user_behavior.bounce_rate}%</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analyticsData.performance_metrics.map((metric, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">{metric.name}</span>
                  {metric.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : metric.trend === 'down' ? (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  ) : (
                    <Activity className="h-4 w-4 text-blue-600" />
                  )}
                </div>
                <div className="text-2xl font-bold mb-1">
                  {metric.value.toFixed(1)}{metric.unit}
                </div>
                {metric.threshold && (
                  <Progress 
                    value={(metric.value / metric.threshold) * 100} 
                    className="h-1"
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Performance */}
      <Card>
        <CardHeader>
          <CardTitle>API Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(analyticsData.system_health.api_performance).map(([endpoint, stats]) => (
              <div key={endpoint} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{endpoint}</h4>
                  <p className="text-sm text-gray-600">{stats.count} calls</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">
                    {stats.avg_time.toFixed(0)}ms
                  </div>
                  <div className="text-xs text-gray-500">
                    {stats.min_time.toFixed(0)}ms - {stats.max_time.toFixed(0)}ms
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Pages */}
      {analyticsData.user_behavior.top_pages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.user_behavior.top_pages.map((page, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="font-medium">{page.page}</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{formatNumber(page.views)}</Badge>
                    {page.page.includes('mobile') ? (
                      <Smartphone className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Monitor className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RealTimeAnalyticsDashboard;