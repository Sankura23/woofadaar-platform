import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
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

// GET /api/revenue/analytics/trends - Get revenue trends and forecasting
export async function GET(request: NextRequest) {
  try {
    const authResult = verifyAdminToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '12'; // months
    const granularity = searchParams.get('granularity') || 'monthly'; // daily, weekly, monthly
    const includeForecasting = searchParams.get('include_forecasting') === 'true';

    const months = parseInt(timeframe);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // 1. Revenue Trend Analysis
    let dateGrouping: string;
    let dateFormat: string;
    
    switch (granularity) {
      case 'daily':
        dateGrouping = 'DATE(processed_at)';
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'weekly':
        dateGrouping = 'DATE_TRUNC(\'week\', processed_at)';
        dateFormat = 'YYYY-"W"WW';
        break;
      default: // monthly
        dateGrouping = 'DATE_TRUNC(\'month\', processed_at)';
        dateFormat = 'YYYY-MM';
    }

    const revenueTrend = await prisma.$queryRaw`
      SELECT 
        ${dateGrouping} as period,
        SUM(amount) as total_revenue,
        COUNT(*) as transaction_count,
        AVG(amount) as avg_transaction_value,
        SUM(commission_amount) as total_commission,
        SUM(amount) - SUM(commission_amount) as net_revenue
      FROM transactions 
      WHERE status = 'completed' 
        AND processed_at >= ${startDate}
        AND processed_at <= ${endDate}
      GROUP BY ${dateGrouping}
      ORDER BY period ASC
    `;

    // 2. Revenue Stream Trends
    const revenueStreamTrends = await prisma.$queryRaw`
      SELECT 
        ${dateGrouping} as period,
        revenue_stream_id,
        SUM(amount) as stream_revenue,
        COUNT(*) as stream_transactions
      FROM transactions t
      WHERE status = 'completed' 
        AND processed_at >= ${startDate}
        AND processed_at <= ${endDate}
      GROUP BY ${dateGrouping}, revenue_stream_id
      ORDER BY period ASC, stream_revenue DESC
    `;

    // Enhance with stream names
    const revenueStreams = await prisma.revenueStream.findMany({
      select: { id: true, name: true, description: true }
    });

    const streamLookup = revenueStreams.reduce((acc, stream) => {
      acc[stream.id] = stream;
      return acc;
    }, {} as any);

    const enhancedStreamTrends = revenueStreamTrends.map((trend: any) => ({
      ...trend,
      stream_name: streamLookup[trend.revenue_stream_id]?.name || 'Unknown',
      stream_description: streamLookup[trend.revenue_stream_id]?.description
    }));

    // 3. Growth Rate Analysis
    const growthRates = [];
    for (let i = 1; i < revenueTrend.length; i++) {
      const current = revenueTrend[i] as any;
      const previous = revenueTrend[i - 1] as any;
      
      const revenueGrowth = previous.total_revenue > 0 ? 
        ((current.total_revenue - previous.total_revenue) / previous.total_revenue) * 100 : 0;
      
      const transactionGrowth = previous.transaction_count > 0 ?
        ((current.transaction_count - previous.transaction_count) / previous.transaction_count) * 100 : 0;

      growthRates.push({
        period: current.period,
        revenue_growth_percentage: revenueGrowth,
        transaction_growth_percentage: transactionGrowth,
        net_revenue_growth_percentage: previous.net_revenue > 0 ?
          ((current.net_revenue - previous.net_revenue) / previous.net_revenue) * 100 : 0
      });
    }

    // 4. Seasonal Analysis
    const seasonalAnalysis = await prisma.$queryRaw`
      SELECT 
        EXTRACT(month FROM processed_at) as month,
        EXTRACT(quarter FROM processed_at) as quarter,
        AVG(amount) as avg_revenue,
        COUNT(*) as avg_transactions,
        STDDEV(amount) as revenue_volatility
      FROM transactions 
      WHERE status = 'completed' 
        AND processed_at >= ${startDate}
        AND processed_at <= ${endDate}
      GROUP BY EXTRACT(month FROM processed_at), EXTRACT(quarter FROM processed_at)
      ORDER BY month ASC
    `;

    // 5. Partner Performance Trends
    const partnerTrends = await prisma.$queryRaw`
      SELECT 
        ${dateGrouping} as period,
        COUNT(DISTINCT partner_id) as active_partners,
        AVG(commission_amount) as avg_commission,
        SUM(commission_amount) as total_commission_paid
      FROM referral_commissions 
      WHERE created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY ${dateGrouping}
      ORDER BY period ASC
    `;

    // 6. Customer Acquisition Cost (CAC) and Lifetime Value (LTV) trends
    const customerMetrics = await prisma.$queryRaw`
      SELECT 
        ${dateGrouping} as period,
        COUNT(DISTINCT user_id) as new_users,
        AVG(amount) as avg_first_transaction,
        SUM(amount) / COUNT(DISTINCT user_id) as revenue_per_user
      FROM transactions 
      WHERE status = 'completed' 
        AND processed_at >= ${startDate}
        AND processed_at <= ${endDate}
      GROUP BY ${dateGrouping}
      ORDER BY period ASC
    `;

    // 7. Forecasting (if requested)
    let forecasting = null;
    if (includeForecasting && revenueTrend.length >= 3) {
      // Simple linear regression for forecasting
      const revenueData = revenueTrend.map((item: any, index) => ({
        x: index,
        y: parseFloat(item.total_revenue)
      }));

      const n = revenueData.length;
      const sumX = revenueData.reduce((sum, point) => sum + point.x, 0);
      const sumY = revenueData.reduce((sum, point) => sum + point.y, 0);
      const sumXY = revenueData.reduce((sum, point) => sum + point.x * point.y, 0);
      const sumX2 = revenueData.reduce((sum, point) => sum + point.x * point.x, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Generate forecasts for the next 6 periods
      const forecasts = [];
      for (let i = 1; i <= 6; i++) {
        const forecastValue = slope * (n + i - 1) + intercept;
        const forecastDate = new Date(endDate);
        
        if (granularity === 'monthly') {
          forecastDate.setMonth(forecastDate.getMonth() + i);
        } else if (granularity === 'weekly') {
          forecastDate.setDate(forecastDate.getDate() + (i * 7));
        } else { // daily
          forecastDate.setDate(forecastDate.getDate() + i);
        }

        forecasts.push({
          period: forecastDate,
          predicted_revenue: Math.max(0, forecastValue),
          confidence: Math.max(0.3, 1 - (i * 0.1)) // Decreasing confidence over time
        });
      }

      forecasting = {
        method: 'linear_regression',
        slope,
        intercept,
        r_squared: calculateRSquared(revenueData, slope, intercept),
        forecasts,
        target_comparison: {
          month6_target: REVENUE_TARGETS.month6.total,
          month12_target: REVENUE_TARGETS.month12.total,
          month18_target: REVENUE_TARGETS.month18.total
        }
      };
    }

    // 8. Key Performance Indicators (KPIs)
    const currentMonthRevenue = revenueTrend.length > 0 ? parseFloat((revenueTrend[revenueTrend.length - 1] as any).total_revenue) : 0;
    const previousMonthRevenue = revenueTrend.length > 1 ? parseFloat((revenueTrend[revenueTrend.length - 2] as any).total_revenue) : 0;
    
    const kpis = {
      month_over_month_growth: previousMonthRevenue > 0 ? 
        ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : 0,
      
      revenue_run_rate: currentMonthRevenue * 12, // Annualized
      
      average_monthly_growth: growthRates.length > 0 ?
        growthRates.reduce((sum, rate) => sum + rate.revenue_growth_percentage, 0) / growthRates.length : 0,
      
      revenue_volatility: revenueTrend.length > 1 ? 
        calculateStandardDeviation(revenueTrend.map((item: any) => parseFloat(item.total_revenue))) : 0,
      
      time_to_target: forecasting ? estimateTimeToTarget(forecasting, REVENUE_TARGETS.month6.total.min) : null
    };

    return NextResponse.json({
      success: true,
      data: {
        analysis_period: {
          start_date: startDate,
          end_date: endDate,
          timeframe_months: months,
          granularity
        },
        revenue_trend: revenueTrend,
        revenue_stream_trends: enhancedStreamTrends,
        growth_rates: growthRates,
        seasonal_analysis: seasonalAnalysis,
        partner_trends: partnerTrends,
        customer_metrics: customerMetrics,
        forecasting,
        key_performance_indicators: kpis,
        insights: generateInsights(revenueTrend, growthRates, forecasting)
      }
    });

  } catch (error) {
    console.error('Error generating revenue trends:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper functions
function calculateRSquared(data: Array<{x: number, y: number}>, slope: number, intercept: number): number {
  const meanY = data.reduce((sum, point) => sum + point.y, 0) / data.length;
  
  let totalSumSquares = 0;
  let residualSumSquares = 0;
  
  for (const point of data) {
    const predicted = slope * point.x + intercept;
    totalSumSquares += Math.pow(point.y - meanY, 2);
    residualSumSquares += Math.pow(point.y - predicted, 2);
  }
  
  return 1 - (residualSumSquares / totalSumSquares);
}

function calculateStandardDeviation(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function estimateTimeToTarget(forecasting: any, target: number): { months: number, probability: number } | null {
  if (!forecasting || !forecasting.forecasts) return null;
  
  for (let i = 0; i < forecasting.forecasts.length; i++) {
    const forecast = forecasting.forecasts[i];
    if (forecast.predicted_revenue >= target) {
      return {
        months: i + 1,
        probability: forecast.confidence
      };
    }
  }
  
  return null;
}

function generateInsights(revenueTrend: any[], growthRates: any[], forecasting: any): string[] {
  const insights = [];
  
  if (revenueTrend.length >= 3) {
    const latestRevenue = parseFloat(revenueTrend[revenueTrend.length - 1].total_revenue);
    const firstRevenue = parseFloat(revenueTrend[0].total_revenue);
    const totalGrowth = firstRevenue > 0 ? ((latestRevenue - firstRevenue) / firstRevenue) * 100 : 0;
    
    if (totalGrowth > 50) {
      insights.push(`Revenue has grown by ${totalGrowth.toFixed(1)}% over the analysis period, indicating strong business momentum.`);
    } else if (totalGrowth < -20) {
      insights.push(`Revenue has declined by ${Math.abs(totalGrowth).toFixed(1)}% over the analysis period, requiring immediate attention.`);
    }
  }
  
  if (growthRates.length > 0) {
    const avgGrowth = growthRates.reduce((sum, rate) => sum + rate.revenue_growth_percentage, 0) / growthRates.length;
    if (avgGrowth > 10) {
      insights.push(`Average month-over-month growth of ${avgGrowth.toFixed(1)}% suggests healthy business expansion.`);
    }
  }
  
  if (forecasting && forecasting.r_squared > 0.8) {
    insights.push(`Revenue forecasting model shows high accuracy (R² = ${forecasting.r_squared.toFixed(2)}), providing reliable predictions.`);
  }
  
  return insights;
}