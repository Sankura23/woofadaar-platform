import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    // Admin authentication (you can implement role-based auth)
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get query parameters for date filtering
    const url = new URL(request.url);
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const period = url.searchParams.get('period') || '30'; // days

    const now = new Date();
    const periodStart = startDate ? new Date(startDate) : new Date(now.getTime() - parseInt(period) * 24 * 60 * 60 * 1000);
    const periodEnd = endDate ? new Date(endDate) : now;

    // Revenue Overview
    const [
      totalRevenue,
      totalPayments,
      activeSubscriptions,
      trialSubscriptions,
      cancelledSubscriptions,
      monthlyRevenue,
      yearlyRevenue
    ] = await Promise.all([
      // Total revenue
      prisma.payment.aggregate({
        where: {
          status: 'paid',
          created_at: { gte: periodStart, lte: periodEnd }
        },
        _sum: { amount: true },
        _count: { id: true }
      }),
      
      // Total payments count
      prisma.payment.count({
        where: {
          status: 'paid',
          created_at: { gte: periodStart, lte: periodEnd }
        }
      }),

      // Active subscriptions
      prisma.subscription.count({
        where: {
          status: 'active',
          created_at: { gte: periodStart, lte: periodEnd }
        }
      }),

      // Trial subscriptions
      prisma.subscription.count({
        where: {
          status: 'trialing',
          created_at: { gte: periodStart, lte: periodEnd }
        }
      }),

      // Cancelled subscriptions
      prisma.subscription.count({
        where: {
          status: 'cancelled',
          updated_at: { gte: periodStart, lte: periodEnd }
        }
      }),

      // Monthly subscriptions revenue
      prisma.payment.aggregate({
        where: {
          status: 'paid',
          subscription: {
            billing_cycle: 'monthly'
          },
          created_at: { gte: periodStart, lte: periodEnd }
        },
        _sum: { amount: true },
        _count: { id: true }
      }),

      // Yearly subscriptions revenue
      prisma.payment.aggregate({
        where: {
          status: 'paid',
          subscription: {
            billing_cycle: 'yearly'
          },
          created_at: { gte: periodStart, lte: periodEnd }
        },
        _sum: { amount: true },
        _count: { id: true }
      })
    ]);

    // Daily revenue breakdown for charts
    const dailyRevenue = await prisma.payment.groupBy({
      by: ['created_at'],
      where: {
        status: 'paid',
        created_at: { gte: periodStart, lte: periodEnd }
      },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { created_at: 'asc' }
    });

    // Process daily data for charts
    const revenueByDay = dailyRevenue.map(day => ({
      date: day.created_at.toISOString().split('T')[0],
      revenue: (day._sum.amount || 0) / 100, // Convert to rupees
      transactions: day._count
    }));

    // Subscription conversion metrics
    const conversionMetrics = await prisma.$queryRaw`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'trialing') as trial_starts,
        COUNT(*) FILTER (WHERE status = 'active' AND trial_end_date < start_date) as trial_conversions,
        AVG(CASE WHEN status = 'cancelled' THEN EXTRACT(epoch FROM (updated_at - start_date))/86400 END) as avg_lifetime_days
      FROM subscriptions 
      WHERE created_at >= ${periodStart} AND created_at <= ${periodEnd}
    ` as any[];

    const conversionData = conversionMetrics[0] || {};
    const conversionRate = conversionData.trial_starts > 0 
      ? ((conversionData.trial_conversions / conversionData.trial_starts) * 100).toFixed(1)
      : '0';

    // Payment method breakdown
    const paymentMethods = await prisma.payment.groupBy({
      by: ['payment_method'],
      where: {
        status: 'paid',
        created_at: { gte: periodStart, lte: periodEnd }
      },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } }
    });

    // Top performing plans
    const planPerformance = await prisma.subscription.groupBy({
      by: ['billing_cycle'],
      where: {
        status: { in: ['active', 'trialing'] },
        created_at: { gte: periodStart, lte: periodEnd }
      },
      _count: { id: true }
    });

    // Monthly recurring revenue (MRR) calculation
    const activeMonthlySubs = await prisma.subscription.count({
      where: {
        status: 'active',
        billing_cycle: 'monthly'
      }
    });

    const activeYearlySubs = await prisma.subscription.count({
      where: {
        status: 'active',
        billing_cycle: 'yearly'
      }
    });

    const mrr = (activeMonthlySubs * 99) + (activeYearlySubs * 999 / 12); // ₹99/month + ₹999/year normalized

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total_revenue: (totalRevenue._sum.amount || 0) / 100,
          total_transactions: totalPayments,
          active_subscriptions: activeSubscriptions,
          trial_subscriptions: trialSubscriptions,
          cancelled_subscriptions: cancelledSubscriptions,
          mrr: Math.round(mrr),
          conversion_rate: parseFloat(conversionRate),
          avg_customer_lifetime_days: Math.round(conversionData.avg_lifetime_days || 0)
        },
        plan_breakdown: {
          monthly: {
            revenue: (monthlyRevenue._sum.amount || 0) / 100,
            count: monthlyRevenue._count,
            subscribers: activeMonthlySubs
          },
          yearly: {
            revenue: (yearlyRevenue._sum.amount || 0) / 100,
            count: yearlyRevenue._count,
            subscribers: activeYearlySubs
          }
        },
        daily_revenue: revenueByDay,
        payment_methods: paymentMethods.map(method => ({
          method: method.payment_method,
          revenue: (method._sum.amount || 0) / 100,
          count: method._count,
          percentage: totalRevenue._sum.amount ? 
            (((method._sum.amount || 0) / totalRevenue._sum.amount) * 100).toFixed(1) : '0'
        })),
        plan_performance: planPerformance.map(plan => ({
          plan: plan.billing_cycle,
          subscribers: plan._count
        })),
        growth_metrics: {
          trial_conversion_rate: parseFloat(conversionRate),
          avg_lifetime_value: conversionData.avg_lifetime_days ? 
            (conversionData.avg_lifetime_days / 30 * 99).toFixed(0) : '0', // Estimated LTV
          churn_rate: cancelledSubscriptions && activeSubscriptions ? 
            ((cancelledSubscriptions / (activeSubscriptions + cancelledSubscriptions)) * 100).toFixed(1) : '0'
        },
        period: {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString(),
          days: Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
        }
      }
    });

  } catch (error) {
    console.error('Revenue analytics error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to get revenue analytics' 
      },
      { status: 500 }
    );
  }
}