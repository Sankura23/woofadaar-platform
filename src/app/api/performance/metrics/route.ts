import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import DatabaseOptimizer from '@/lib/db-optimization';
import CacheService from '@/lib/cache-service';

// GET /api/performance/metrics - Get system performance metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '1h'; // 1h, 6h, 24h, 7d
    const metric_type = searchParams.get('type'); // db, cache, api, search
    
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
    
    // Get performance metrics from database
    const performanceMetrics = await prisma.performanceMetric.findMany({
      where: {
        timestamp: {
          gte: startTime
        },
        ...(metric_type && { metric_name: { contains: metric_type } })
      },
      orderBy: { timestamp: 'desc' },
      take: 1000
    });
    
    // Aggregate metrics by type
    const metricsByType = performanceMetrics.reduce((acc: any, metric) => {
      const type = metric.metric_name.split('_')[0]; // Extract type prefix
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          avg_value: 0,
          min_value: Number.MAX_VALUE,
          max_value: Number.MIN_VALUE,
          total_value: 0,
          recent_values: []
        };
      }
      
      acc[type].count++;
      acc[type].total_value += metric.metric_value;
      acc[type].min_value = Math.min(acc[type].min_value, metric.metric_value);
      acc[type].max_value = Math.max(acc[type].max_value, metric.metric_value);
      acc[type].recent_values.push({
        value: metric.metric_value,
        timestamp: metric.timestamp,
        unit: metric.measurement_unit
      });
      
      return acc;
    }, {});
    
    // Calculate averages
    Object.keys(metricsByType).forEach(type => {
      const stats = metricsByType[type];
      stats.avg_value = stats.total_value / stats.count;
      stats.recent_values = stats.recent_values.slice(-20); // Keep only recent 20 values
      delete stats.total_value; // Remove internal counter
    });
    
    // Get API response times from user behavior analytics
    const apiMetrics = await prisma.userBehaviorAnalytics.findMany({
      where: {
        timestamp: {
          gte: startTime
        },
        action_type: {
          in: ['api_call', 'page_load', 'search_query']
        },
        time_spent_seconds: {
          not: null
        }
      },
      select: {
        action_type: true,
        time_spent_seconds: true,
        timestamp: true,
        page_url: true
      },
      take: 500
    });
    
    // Calculate API performance stats
    const apiStats = apiMetrics.reduce((acc: any, metric) => {
      const type = metric.action_type;
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          total_time: 0,
          avg_time: 0,
          min_time: Number.MAX_VALUE,
          max_time: Number.MIN_VALUE
        };
      }
      
      const timeMs = (metric.time_spent_seconds || 0) * 1000;
      acc[type].count++;
      acc[type].total_time += timeMs;
      acc[type].min_time = Math.min(acc[type].min_time, timeMs);
      acc[type].max_time = Math.max(acc[type].max_time, timeMs);
      
      return acc;
    }, {});
    
    // Calculate averages for API stats
    Object.keys(apiStats).forEach(type => {
      const stats = apiStats[type];
      stats.avg_time = stats.total_time / stats.count;
      delete stats.total_time;
    });
    
    // System health indicators
    const systemHealth = {
      database: {
        status: dbHealth.status,
        connection_time_ms: parseFloat(dbHealth.connection_time || '0'),
        query_performance: dbStats ? {
          total_queries: dbStats.total_queries,
          avg_duration_ms: parseFloat(dbStats.average_duration),
          max_duration_ms: parseFloat(dbStats.max_duration),
          slow_query_rate: parseFloat(dbStats.slow_query_rate)
        } : null
      },
      cache: {
        status: 'healthy',
        hit_rate: cacheStats.hitRate,
        memory_usage: cacheStats.memoryUsage,
        operations: {
          hits: cacheStats.hits,
          misses: cacheStats.misses,
          sets: cacheStats.sets,
          deletes: cacheStats.deletes
        }
      },
      api_performance: apiStats
    };
    
    // Performance thresholds and alerts
    const alerts = [];
    
    if (dbStats && parseFloat(dbStats.slow_query_rate) > 5) {
      alerts.push({
        type: 'warning',
        message: `High slow query rate: ${dbStats.slow_query_rate}%`,
        metric: 'database_performance'
      });
    }
    
    if (parseFloat(cacheStats.hitRate) < 70) {
      alerts.push({
        type: 'warning',
        message: `Low cache hit rate: ${cacheStats.hitRate}`,
        metric: 'cache_performance'
      });
    }
    
    // Check for high API response times
    Object.entries(apiStats).forEach(([type, stats]: [string, any]) => {
      if (stats.avg_time > 2000) { // 2 seconds
        alerts.push({
          type: 'warning',
          message: `High average response time for ${type}: ${stats.avg_time.toFixed(0)}ms`,
          metric: 'api_performance'
        });
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        timeframe,
        period: {
          start: startTime.toISOString(),
          end: new Date().toISOString(),
          duration_ms: timeRangeMs
        },
        system_health: systemHealth,
        performance_metrics: metricsByType,
        alerts,
        summary: {
          total_metrics_collected: performanceMetrics.length,
          database_queries_monitored: dbStats?.total_queries || 0,
          cache_operations: cacheStats.hits + cacheStats.misses + cacheStats.sets + cacheStats.deletes,
          api_calls_tracked: Object.values(apiStats).reduce((sum: number, stats: any) => sum + stats.count, 0)
        }
      }
    });
    
  } catch (error) {
    console.error('Performance metrics error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve performance metrics',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

// POST /api/performance/metrics - Record custom performance metric
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      metric_name,
      metric_value,
      measurement_unit = 'ms',
      endpoint,
      metadata = {}
    } = body;
    
    // Validation
    if (!metric_name || typeof metric_value !== 'number') {
      return NextResponse.json({
        success: false,
        message: 'metric_name and numeric metric_value are required'
      }, { status: 400 });
    }
    
    if (metric_value < 0 || metric_value > 3600000) { // Max 1 hour
      return NextResponse.json({
        success: false,
        message: 'metric_value must be between 0 and 3600000'
      }, { status: 400 });
    }
    
    // Create performance metric
    const performanceMetric = await prisma.performanceMetric.create({
      data: {
        metric_name,
        metric_value,
        measurement_unit,
        endpoint,
        metadata
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Performance metric recorded successfully',
      data: {
        id: performanceMetric.id,
        metric_name: performanceMetric.metric_name,
        metric_value: performanceMetric.metric_value,
        measurement_unit: performanceMetric.measurement_unit,
        timestamp: performanceMetric.timestamp
      }
    });
    
  } catch (error) {
    console.error('Record performance metric error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to record performance metric'
    }, { status: 500 });
  }
}

// DELETE /api/performance/metrics - Cleanup old metrics
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    
    if (days < 1 || days > 365) {
      return NextResponse.json({
        success: false,
        message: 'Days must be between 1 and 365'
      }, { status: 400 });
    }
    
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const deletedCount = await prisma.performanceMetric.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up performance metrics older than ${days} days`,
      data: {
        deleted_count: deletedCount.count,
        cutoff_date: cutoffDate.toISOString()
      }
    });
    
  } catch (error) {
    console.error('Cleanup performance metrics error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to cleanup performance metrics'
    }, { status: 500 });
  }
}