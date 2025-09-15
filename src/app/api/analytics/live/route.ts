import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import DatabaseOptimizer from '@/lib/db-optimization';
import CacheService from '@/lib/cache-service';

// WebSocket connection management
const clients = new Map<string, {
  response: Response;
  controller: ReadableStreamDefaultController;
  timeframe: string;
  lastUpdate: number;
}>();

// Cleanup inactive connections
setInterval(() => {
  const now = Date.now();
  for (const [clientId, client] of clients) {
    if (now - client.lastUpdate > 60000) { // 1 minute timeout
      try {
        client.controller.close();
        clients.delete(clientId);
      } catch (error) {
        console.log('Error closing inactive connection:', error);
      }
    }
  }
}, 30000); // Check every 30 seconds

// Generate analytics data
async function generateAnalyticsData(timeframe: string = '1h') {
  try {
    // Calculate time range
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    
    const timeRangeMs = timeRanges[timeframe as keyof typeof timeRanges] || timeRanges['1h'];
    const startTime = new Date(Date.now() - timeRangeMs);
    
    // Get database performance metrics
    const dbOptimizer = DatabaseOptimizer.getInstance();
    const dbStats = dbOptimizer.getPerformanceStats();
    const dbHealth = await dbOptimizer.healthCheck();
    
    // Get cache performance metrics
    const cacheService = CacheService.getInstance();
    const cacheStats = cacheService.getStats();
    
    // Get user behavior analytics
    const userBehavior = await prisma.userBehaviorAnalytics.findMany({
      where: {
        timestamp: {
          gte: startTime
        }
      },
      select: {
        action_type: true,
        page_url: true,
        time_spent_seconds: true,
        timestamp: true,
        device_type: true,
        user_agent: true
      },
      orderBy: { timestamp: 'desc' },
      take: 1000
    });
    
    // Calculate user behavior metrics
    const activeUsers = new Set(userBehavior.map(b => b.user_agent)).size;
    const pageViews = userBehavior.filter(b => b.action_type === 'page_view').length;
    const sessions = userBehavior.filter(b => b.action_type === 'session_start').length;
    const bounces = userBehavior.filter(b => b.action_type === 'bounce').length;
    const bounceRate = sessions > 0 ? (bounces / sessions) * 100 : 0;
    
    // Calculate average session duration
    const sessionDurations = userBehavior
      .filter(b => b.time_spent_seconds && b.time_spent_seconds > 0)
      .map(b => b.time_spent_seconds || 0);
    const avgSessionDuration = sessionDurations.length > 0 
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length 
      : 0;
    
    // Get top pages
    const pageViewCounts = userBehavior
      .filter(b => b.action_type === 'page_view' && b.page_url)
      .reduce((acc: any, b) => {
        const page = b.page_url || '';
        acc[page] = (acc[page] || 0) + 1;
        return acc;
      }, {});
    
    const topPages = Object.entries(pageViewCounts)
      .map(([page, views]) => ({ page, views: views as number }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
    
    // Get performance metrics from database
    const performanceMetrics = await prisma.performanceMetric.findMany({
      where: {
        timestamp: {
          gte: startTime
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    
    // Process performance metrics
    const metricsByType = performanceMetrics.reduce((acc: any, metric) => {
      const type = metric.metric_name.split('_')[0];
      if (!acc[type]) {
        acc[type] = {
          name: type,
          values: [],
          avg_value: 0,
          unit: metric.measurement_unit
        };
      }
      acc[type].values.push(metric.metric_value);
      return acc;
    }, {});
    
    // Calculate averages and trends
    const processedMetrics = Object.values(metricsByType).map((metric: any) => {
      const values = metric.values;
      const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
      
      // Simple trend calculation (compare recent vs older values)
      const recent = values.slice(0, Math.floor(values.length / 2));
      const older = values.slice(Math.floor(values.length / 2));
      const recentAvg = recent.length > 0 ? recent.reduce((a: number, b: number) => a + b, 0) / recent.length : avg;
      const olderAvg = older.length > 0 ? older.reduce((a: number, b: number) => a + b, 0) / older.length : avg;
      
      let trend = 'stable';
      if (recentAvg > olderAvg * 1.1) trend = 'up';
      else if (recentAvg < olderAvg * 0.9) trend = 'down';
      
      return {
        name: metric.name,
        value: avg,
        unit: metric.unit,
        trend,
        threshold: metric.name.includes('response') ? 2000 : undefined // 2s for response times
      };
    });
    
    // Get API performance from user behavior
    const apiMetrics = userBehavior
      .filter(b => b.action_type === 'api_call' && b.time_spent_seconds)
      .reduce((acc: any, b) => {
        const endpoint = b.page_url?.split('?')[0] || 'unknown';
        if (!acc[endpoint]) {
          acc[endpoint] = {
            count: 0,
            total_time: 0,
            min_time: Number.MAX_VALUE,
            max_time: Number.MIN_VALUE
          };
        }
        
        const timeMs = (b.time_spent_seconds || 0) * 1000;
        acc[endpoint].count++;
        acc[endpoint].total_time += timeMs;
        acc[endpoint].min_time = Math.min(acc[endpoint].min_time, timeMs);
        acc[endpoint].max_time = Math.max(acc[endpoint].max_time, timeMs);
        
        return acc;
      }, {});
    
    // Calculate API averages
    Object.keys(apiMetrics).forEach(endpoint => {
      const stats = apiMetrics[endpoint];
      stats.avg_time = stats.total_time / stats.count;
      delete stats.total_time;
    });
    
    // Generate alerts
    const alerts = [];
    
    if (dbStats && parseFloat(dbStats.slow_query_rate) > 5) {
      alerts.push({
        type: 'warning' as const,
        message: `High slow query rate: ${dbStats.slow_query_rate}%`,
        metric: 'database_performance'
      });
    }
    
    if (parseFloat(cacheStats.hitRate) < 70) {
      alerts.push({
        type: 'warning' as const,
        message: `Low cache hit rate: ${cacheStats.hitRate}`,
        metric: 'cache_performance'
      });
    }
    
    if (bounceRate > 70) {
      alerts.push({
        type: 'info' as const,
        message: `High bounce rate: ${bounceRate.toFixed(1)}%`,
        metric: 'user_engagement'
      });
    }
    
    // User flow analysis (simple funnel)
    const userFlow = [
      { 
        step: 'Landing', 
        count: pageViews, 
        conversion_rate: 100 
      },
      { 
        step: 'Profile View', 
        count: userBehavior.filter(b => b.page_url?.includes('/profile')).length,
        conversion_rate: pageViews > 0 ? (userBehavior.filter(b => b.page_url?.includes('/profile')).length / pageViews) * 100 : 0
      },
      { 
        step: 'Feature Usage', 
        count: userBehavior.filter(b => b.action_type === 'feature_use').length,
        conversion_rate: pageViews > 0 ? (userBehavior.filter(b => b.action_type === 'feature_use').length / pageViews) * 100 : 0
      }
    ];
    
    return {
      timestamp: new Date().toISOString(),
      user_behavior: {
        active_users: activeUsers,
        page_views: pageViews,
        bounce_rate: Math.round(bounceRate * 100) / 100,
        avg_session_duration: Math.round(avgSessionDuration * 100) / 100,
        top_pages: topPages,
        user_flow: userFlow
      },
      performance_metrics: processedMetrics,
      system_health: {
        database: {
          status: dbHealth.status === 'ok' ? 'healthy' as const : 'warning' as const,
          connection_time_ms: parseFloat(dbHealth.connection_time || '0'),
          query_performance: dbStats ? {
            avg_duration_ms: parseFloat(dbStats.average_duration),
            slow_query_rate: parseFloat(dbStats.slow_query_rate)
          } : null
        },
        cache: {
          hit_rate: cacheStats.hitRate,
          memory_usage: cacheStats.memoryUsage,
          operations: {
            hits: cacheStats.hits,
            misses: cacheStats.misses
          }
        },
        api_performance: apiMetrics
      },
      alerts
    };
    
  } catch (error) {
    console.error('Error generating analytics data:', error);
    return {
      timestamp: new Date().toISOString(),
      user_behavior: {
        active_users: 0,
        page_views: 0,
        bounce_rate: 0,
        avg_session_duration: 0,
        top_pages: [],
        user_flow: []
      },
      performance_metrics: [],
      system_health: {
        database: {
          status: 'warning' as const,
          connection_time_ms: 0,
          query_performance: null
        },
        cache: {
          hit_rate: '0%',
          memory_usage: {},
          operations: {
            hits: 0,
            misses: 0
          }
        },
        api_performance: {}
      },
      alerts: [{
        type: 'error' as const,
        message: 'Failed to generate analytics data',
        metric: 'system_health'
      }]
    };
  }
}

// Broadcast to all connected clients
async function broadcastAnalytics() {
  if (clients.size === 0) return;
  
  const timeframes = new Set(Array.from(clients.values()).map(c => c.timeframe));
  
  for (const timeframe of timeframes) {
    const data = await generateAnalyticsData(timeframe);
    const message = JSON.stringify({
      type: 'analytics_update',
      data
    });
    
    for (const [clientId, client] of clients) {
      if (client.timeframe === timeframe) {
        try {
          client.controller.enqueue(`data: ${message}\n\n`);
          client.lastUpdate = Date.now();
        } catch (error) {
          console.log('Error sending to client:', error);
          clients.delete(clientId);
        }
      }
    }
  }
}

// Start broadcasting interval
setInterval(broadcastAnalytics, 5000); // Broadcast every 5 seconds

export async function GET(request: NextRequest) {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timeframe = new URL(request.url).searchParams.get('timeframe') || '1h';
  
  const stream = new ReadableStream({
    start(controller) {
      // Store client connection
      clients.set(clientId, {
        response: new Response(),
        controller,
        timeframe,
        lastUpdate: Date.now()
      });
      
      // Send initial connection message
      controller.enqueue('data: {"type":"connected","message":"Analytics stream connected"}\n\n');
      
      // Send initial data
      generateAnalyticsData(timeframe).then(data => {
        const message = JSON.stringify({
          type: 'analytics_update',
          data
        });
        controller.enqueue(`data: ${message}\n\n`);
      }).catch(error => {
        console.error('Error sending initial data:', error);
      });
    },
    cancel() {
      // Clean up when client disconnects
      clients.delete(clientId);
      console.log(`Analytics client ${clientId} disconnected`);
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, timeframe, clientId } = body;
    
    if (type === 'timeframe_change' && clientId && clients.has(clientId)) {
      const client = clients.get(clientId);
      if (client) {
        client.timeframe = timeframe;
        
        // Send updated data immediately
        const data = await generateAnalyticsData(timeframe);
        const message = JSON.stringify({
          type: 'analytics_update',
          data
        });
        
        try {
          client.controller.enqueue(`data: ${message}\n\n`);
          client.lastUpdate = Date.now();
        } catch (error) {
          console.error('Error updating client timeframe:', error);
        }
      }
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Analytics live API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Invalid request' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}