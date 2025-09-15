import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
import { getDateRange, RevenueCalculator } from '@/lib/revenue-utils';
import { REVENUE_TARGETS } from '@/lib/revenue-config';

const verifyAdminToken = (authHeader: string | null) => {
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Authentication required', status: 401 };
  }
  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    if (!decoded.userId || decoded.userType !== 'admin') {
      return { error: 'Admin access required', status: 403 };
    }
    return { decoded };
  } catch (error) {
    return { error: 'Invalid authentication token', status: 401 };
  }
};

// GET /api/analytics/revenue-dashboard - Comprehensive revenue dashboard with visualization data
export async function GET(request: NextRequest) {
  try {
    const authResult = verifyAdminToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'month') as 'today' | 'week' | 'month' | 'quarter' | 'year';
    const compareWithPrevious = searchParams.get('compare') === 'true';
    const includeForecasting = searchParams.get('forecasting') === 'true';

    const { startDate, endDate } = getDateRange(period);
    
    // Calculate previous period for comparison
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodDuration);
    const previousEndDate = new Date(startDate.getTime());

    // 1. Key Performance Indicators (KPIs)
    const [currentKPIs, previousKPIs] = await Promise.all([
      calculateKPIs(startDate, endDate),
      compareWithPrevious ? calculateKPIs(previousStartDate, previousEndDate) : null
    ]);

    // Calculate growth percentages
    const growthMetrics = compareWithPrevious && previousKPIs ? {
      revenue_growth: calculateGrowthRate(currentKPIs.total_revenue, previousKPIs.total_revenue),
      transaction_growth: calculateGrowthRate(currentKPIs.transaction_count, previousKPIs.transaction_count),
      partner_growth: calculateGrowthRate(currentKPIs.active_partners, previousKPIs.active_partners),
      user_growth: calculateGrowthRate(currentKPIs.premium_users, previousKPIs.premium_users)
    } : null;

    // 2. Revenue Stream Visualization Data
    const revenueStreams = await prisma.transaction.groupBy({
      by: ['revenue_stream_id'],
      where: {
        status: 'completed',
        processed_at: { gte: startDate, lte: endDate }
      },
      _sum: {
        amount: true,
        commission_amount: true
      },
      _count: { _all: true }
    });

    const enhancedRevenueStreams = await Promise.all(
      revenueStreams.map(async (stream) => {
        const streamDetails = await prisma.revenueStream.findUnique({
          where: { id: stream.revenue_stream_id },
          select: { name: true, description: true, category: true }
        });

        return {
          id: stream.revenue_stream_id,
          name: streamDetails?.name || 'Unknown',
          description: streamDetails?.description,
          category: streamDetails?.category,
          revenue: stream._sum.amount || 0,
          commission_paid: stream._sum.commission_amount || 0,
          net_revenue: (stream._sum.amount || 0) - (stream._sum.commission_amount || 0),
          transaction_count: stream._count._all,
          avg_transaction_value: stream._count._all > 0 ? (stream._sum.amount || 0) / stream._count._all : 0
        };
      })
    );

    // 3. Daily Revenue Trend (for chart visualization)
    const dailyTrends = await prisma.$queryRaw`
      SELECT 
        DATE(processed_at) as date,
        SUM(amount) as daily_revenue,
        COUNT(*) as daily_transactions,
        SUM(commission_amount) as daily_commission,
        SUM(amount) - SUM(commission_amount) as daily_net_revenue
      FROM transactions 
      WHERE status = 'completed' 
        AND processed_at >= ${startDate}
        AND processed_at <= ${endDate}
      GROUP BY DATE(processed_at)
      ORDER BY date ASC
    ` as any[];

    // 4. Geographic Revenue Distribution (if location data available)
    const geographicData = await prisma.$queryRaw`
      SELECT 
        u.state as location,
        COUNT(DISTINCT u.id) as user_count,
        SUM(t.amount) as total_revenue,
        COUNT(t.id) as transaction_count
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.status = 'completed' 
        AND t.processed_at >= ${startDate}
        AND t.processed_at <= ${endDate}
        AND u.state IS NOT NULL
      GROUP BY u.state
      ORDER BY total_revenue DESC
      LIMIT 10
    ` as any[];

    // 5. Partner Performance Metrics
    const topPartners = await prisma.referralCommission.groupBy({
      by: ['partner_id'],
      where: {
        status: 'paid',
        paid_at: { gte: startDate, lte: endDate }
      },
      _sum: {
        commission_amount: true,
        referral_amount: true
      },
      _count: { _all: true },
      orderBy: {
        _sum: { commission_amount: 'desc' }
      },
      take: 10
    });

    const enhancedPartners = await Promise.all(
      topPartners.map(async (partner) => {
        const partnerDetails = await prisma.partner.findUnique({
          where: { id: partner.partner_id },
          select: { 
            name: true, 
            business_name: true, 
            partner_type: true,
            rating_average: true 
          }
        });

        return {
          partner_id: partner.partner_id,
          name: partnerDetails?.business_name || partnerDetails?.name || 'Unknown',
          partner_type: partnerDetails?.partner_type,
          rating: partnerDetails?.rating_average,
          commission_earned: partner._sum.commission_amount || 0,
          referral_value: partner._sum.referral_amount || 0,
          referral_count: partner._count._all,
          conversion_rate: partner._count._all > 0 ? 
            ((partner._sum.commission_amount || 0) / (partner._sum.referral_amount || 0)) * 100 : 0
        };
      })
    );

    // 6. Subscription Metrics
    const subscriptionMetrics = await calculateSubscriptionMetrics(startDate, endDate);

    // 7. Target Achievement Analysis
    const targetAnalysis = calculateTargetAchievement(currentKPIs, period);

    // 8. Revenue Forecasting (if requested)
    let forecasting = null;
    if (includeForecasting) {
      forecasting = await generateRevenueForecast(dailyTrends);
    }

    // 9. Customer Lifecycle Metrics
    const customerMetrics = await calculateCustomerMetrics(startDate, endDate);

    const dashboardData = {
      period_info: {
        period,
        start_date: startDate,
        end_date: endDate,
        includes_comparison: compareWithPrevious,
        includes_forecasting: includeForecasting,
        generated_at: new Date()
      },
      kpis: {
        current: currentKPIs,
        ...(compareWithPrevious && previousKPIs && {
          previous: previousKPIs,
          growth: growthMetrics
        })
      },
      revenue_streams: {
        breakdown: enhancedRevenueStreams.sort((a, b) => b.revenue - a.revenue),
        chart_data: enhancedRevenueStreams.map(stream => ({
          name: stream.name,
          value: stream.revenue,
          percentage: currentKPIs.total_revenue > 0 ? (stream.revenue / currentKPIs.total_revenue) * 100 : 0
        }))
      },
      trends: {
        daily_revenue: dailyTrends,
        chart_data: dailyTrends.map((day: any) => ({
          date: day.date,
          revenue: parseFloat(day.daily_revenue || '0'),
          transactions: day.daily_transactions,
          net_revenue: parseFloat(day.daily_net_revenue || '0')
        }))
      },
      geographic_distribution: geographicData,
      partner_performance: {
        top_performers: enhancedPartners,
        summary: {
          total_partners: new Set(topPartners.map(p => p.partner_id)).size,
          total_commission_paid: topPartners.reduce((sum, p) => sum + (p._sum.commission_amount || 0), 0),
          avg_commission_per_partner: topPartners.length > 0 ? 
            topPartners.reduce((sum, p) => sum + (p._sum.commission_amount || 0), 0) / topPartners.length : 0
        }
      },
      subscription_metrics: subscriptionMetrics,
      target_achievement: targetAnalysis,
      customer_metrics: customerMetrics,
      ...(forecasting && { forecasting })
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error generating revenue dashboard:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper functions for dashboard calculations

async function calculateKPIs(startDate: Date, endDate: Date): Promise<any> {
  const [revenueStats, subscriptionStats, partnerStats, userStats] = await Promise.all([
    // Revenue statistics
    prisma.transaction.aggregate({
      where: {
        status: 'completed',
        processed_at: { gte: startDate, lte: endDate }
      },
      _sum: {
        amount: true,
        commission_amount: true
      },
      _count: { _all: true },
      _avg: { amount: true }
    }),

    // Subscription statistics
    prisma.userPremiumService.count({
      where: {
        created_at: { gte: startDate, lte: endDate },
        status: 'active'
      }
    }),

    // Partner statistics
    prisma.partner.count({
      where: {
        created_at: { gte: startDate, lte: endDate },
        status: 'active'
      }
    }),

    // User statistics
    prisma.user.count({
      where: {
        created_at: { gte: startDate, lte: endDate }
      }
    })
  ]);

  const premiumUserCount = await prisma.userPremiumService.groupBy({
    by: ['user_id'],
    where: { status: 'active' },
    _count: { _all: true }
  });

  return {
    total_revenue: revenueStats._sum.amount || 0,
    net_revenue: (revenueStats._sum.amount || 0) - (revenueStats._sum.commission_amount || 0),
    commission_paid: revenueStats._sum.commission_amount || 0,
    transaction_count: revenueStats._count._all,
    avg_transaction_value: revenueStats._avg.amount || 0,
    subscription_revenue: 0, // Will calculate separately
    premium_subscriptions: subscriptionStats,
    active_partners: partnerStats,
    new_users: userStats,
    premium_users: premiumUserCount.length,
    conversion_rate: userStats > 0 ? (premiumUserCount.length / userStats) * 100 : 0
  };
}

function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

async function calculateSubscriptionMetrics(startDate: Date, endDate: Date): Promise<any> {
  const [newSubscriptions, cancelledSubscriptions, activeSubscriptions] = await Promise.all([
    prisma.userPremiumService.count({
      where: {
        created_at: { gte: startDate, lte: endDate },
        status: { in: ['active', 'trialing'] }
      }
    }),

    prisma.userPremiumService.count({
      where: {
        cancelled_at: { gte: startDate, lte: endDate },
        status: 'cancelled'
      }
    }),

    prisma.userPremiumService.count({
      where: {
        status: 'active',
        expires_at: { gt: new Date() }
      }
    })
  ]);

  const churnRate = (newSubscriptions + activeSubscriptions) > 0 ? 
    (cancelledSubscriptions / (newSubscriptions + activeSubscriptions)) * 100 : 0;

  return {
    new_subscriptions: newSubscriptions,
    cancelled_subscriptions: cancelledSubscriptions,
    active_subscriptions: activeSubscriptions,
    churn_rate: churnRate,
    retention_rate: 100 - churnRate
  };
}

function calculateTargetAchievement(kpis: any, period: string): any {
  // Get appropriate targets based on period
  const targets = REVENUE_TARGETS.month6; // Default to month 6 targets
  
  const revenueTarget = targets.total.min;
  const subscriptionTarget = targets.subscription_revenue.min;
  
  return {
    revenue_achievement: {
      target: revenueTarget,
      actual: kpis.total_revenue,
      percentage: revenueTarget > 0 ? (kpis.total_revenue / revenueTarget) * 100 : 0,
      status: kpis.total_revenue >= revenueTarget ? 'achieved' : 'in_progress'
    },
    subscription_achievement: {
      target: subscriptionTarget,
      actual: kpis.subscription_revenue,
      percentage: subscriptionTarget > 0 ? (kpis.subscription_revenue / subscriptionTarget) * 100 : 0,
      status: kpis.subscription_revenue >= subscriptionTarget ? 'achieved' : 'in_progress'
    },
    overall_performance: kpis.total_revenue >= revenueTarget ? 'excellent' : 
                        kpis.total_revenue >= revenueTarget * 0.8 ? 'good' : 
                        kpis.total_revenue >= revenueTarget * 0.5 ? 'fair' : 'needs_improvement'
  };
}

async function generateRevenueForecast(dailyTrends: any[]): Promise<any> {
  if (dailyTrends.length < 7) {
    return {
      message: 'Insufficient data for forecasting',
      minimum_days_required: 7
    };
  }

  // Simple linear regression forecast
  const revenueData = dailyTrends.map((day, index) => ({
    x: index,
    y: parseFloat(day.daily_revenue || '0')
  }));

  const n = revenueData.length;
  const sumX = revenueData.reduce((sum, point) => sum + point.x, 0);
  const sumY = revenueData.reduce((sum, point) => sum + point.y, 0);
  const sumXY = revenueData.reduce((sum, point) => sum + point.x * point.y, 0);
  const sumX2 = revenueData.reduce((sum, point) => sum + point.x * point.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Generate 7-day forecast
  const forecasts = [];
  for (let i = 1; i <= 7; i++) {
    const forecastValue = slope * (n + i - 1) + intercept;
    const forecastDate = new Date(dailyTrends[dailyTrends.length - 1].date);
    forecastDate.setDate(forecastDate.getDate() + i);
    
    forecasts.push({
      date: forecastDate.toISOString().split('T')[0],
      predicted_revenue: Math.max(0, forecastValue),
      confidence: Math.max(0.3, 1 - (i * 0.1))
    });
  }

  return {
    method: 'linear_regression',
    accuracy_score: calculateRSquared(revenueData, slope, intercept),
    forecasts,
    trend_direction: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable'
  };
}

function calculateRSquared(data: Array<{x: number, y: number}>, slope: number, intercept: number): number {
  const meanY = data.reduce((sum, point) => sum + point.y, 0) / data.length;
  
  let totalSumSquares = 0;
  let residualSumSquares = 0;
  
  for (const point of data) {
    const predicted = slope * point.x + intercept;
    totalSumSquares += Math.pow(point.y - meanY, 2);
    residualSumSquares += Math.pow(point.y - predicted, 2);
  }
  
  return Math.max(0, 1 - (residualSumSquares / totalSumSquares));
}

async function calculateCustomerMetrics(startDate: Date, endDate: Date): Promise<any> {
  const [newCustomers, returningCustomers, totalOrders] = await Promise.all([
    prisma.user.count({
      where: {
        created_at: { gte: startDate, lte: endDate }
      }
    }),

    prisma.transaction.groupBy({
      by: ['user_id'],
      where: {
        processed_at: { gte: startDate, lte: endDate },
        status: 'completed'
      },
      _count: { _all: true },
      having: {
        _count: {
          _all: {
            gt: 1
          }
        }
      }
    }).then(result => result.length),

    prisma.transaction.count({
      where: {
        processed_at: { gte: startDate, lte: endDate },
        status: 'completed'
      }
    })
  ]);

  return {
    new_customers: newCustomers,
    returning_customers: returningCustomers,
    total_orders: totalOrders,
    repeat_purchase_rate: newCustomers > 0 ? (returningCustomers / newCustomers) * 100 : 0,
    avg_orders_per_customer: newCustomers > 0 ? totalOrders / newCustomers : 0
  };
}