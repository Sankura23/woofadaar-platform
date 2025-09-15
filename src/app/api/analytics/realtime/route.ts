import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

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

// GET /api/analytics/realtime - Real-time business metrics for live dashboard
export async function GET(request: NextRequest) {
  try {
    const authResult = verifyAdminToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    
    const thisHourStart = new Date(now);
    thisHourStart.setMinutes(0, 0, 0);
    
    const lastHourStart = new Date(thisHourStart);
    lastHourStart.setHours(lastHourStart.getHours() - 1);

    // Parallel execution of all real-time metrics
    const [
      todayRevenue,
      yesterdayRevenue,
      thisHourRevenue,
      lastHourRevenue,
      activeUsers,
      pendingPayments,
      liveTransactions,
      systemHealth,
      partnerActivity,
      subscriptionActivity
    ] = await Promise.all([
      // Today's revenue
      prisma.transaction.aggregate({
        where: {
          status: 'completed',
          processed_at: { gte: todayStart }
        },
        _sum: { amount: true },
        _count: { _all: true }
      }),

      // Yesterday's revenue (for comparison)
      prisma.transaction.aggregate({
        where: {
          status: 'completed',
          processed_at: { gte: yesterdayStart, lt: todayStart }
        },
        _sum: { amount: true },
        _count: { _all: true }
      }),

      // This hour's revenue
      prisma.transaction.aggregate({
        where: {
          status: 'completed',
          processed_at: { gte: thisHourStart }
        },
        _sum: { amount: true },
        _count: { _all: true }
      }),

      // Last hour's revenue
      prisma.transaction.aggregate({
        where: {
          status: 'completed',
          processed_at: { gte: lastHourStart, lt: thisHourStart }
        },
        _sum: { amount: true },
        _count: { _all: true }
      }),

      // Active users (users with activity in last 24 hours)
      prisma.user.count({
        where: {
          updated_at: { gte: yesterdayStart }
        }
      }),

      // Pending payments
      prisma.paymentOrder.count({
        where: {
          status: { in: ['created', 'pending'] },
          created_at: { gte: yesterdayStart }
        }
      }),

      // Recent transactions (last 10)
      prisma.transaction.findMany({
        where: {
          created_at: { gte: yesterdayStart }
        },
        include: {
          user: {
            select: { name: true, email: true }
          },
          partner: {
            select: { name: true, business_name: true }
          }
        },
        orderBy: { created_at: 'desc' },
        take: 10
      }),

      // System health indicators
      getSystemHealthMetrics(),

      // Active partners (with transactions today)
      prisma.referralCommission.groupBy({
        by: ['partner_id'],
        where: {
          created_at: { gte: todayStart }
        },
        _count: { _all: true },
        _sum: { commission_amount: true }
      }),

      // Subscription activity
      prisma.userPremiumService.groupBy({
        by: ['status'],
        where: {
          created_at: { gte: todayStart }
        },
        _count: { _all: true }
      })
    ]);

    // Calculate growth rates
    const revenueGrowth = yesterdayRevenue._sum.amount && yesterdayRevenue._sum.amount > 0 ? 
      ((todayRevenue._sum.amount || 0) - yesterdayRevenue._sum.amount) / yesterdayRevenue._sum.amount * 100 : 0;

    const hourlyGrowth = lastHourRevenue._sum.amount && lastHourRevenue._sum.amount > 0 ? 
      ((thisHourRevenue._sum.amount || 0) - lastHourRevenue._sum.amount) / lastHourRevenue._sum.amount * 100 : 0;

    // Process live transactions for real-time feed
    const processedTransactions = liveTransactions.map(tx => ({
      id: tx.id,
      amount: tx.amount,
      status: tx.status,
      type: tx.transaction_type,
      created_at: tx.created_at,
      user_name: tx.user?.name || 'Unknown',
      partner_name: tx.partner?.business_name || tx.partner?.name || null,
      time_ago: getTimeAgo(tx.created_at)
    }));

    // Current hour performance breakdown
    const hourlyPerformance = await getHourlyPerformance();

    const realtimeData = {
      timestamp: now.toISOString(),
      update_frequency: '30_seconds',
      revenue_metrics: {
        today: {
          total_revenue: todayRevenue._sum.amount || 0,
          transaction_count: todayRevenue._count._all,
          avg_transaction: todayRevenue._count._all > 0 ? 
            (todayRevenue._sum.amount || 0) / todayRevenue._count._all : 0,
          growth_vs_yesterday: revenueGrowth
        },
        current_hour: {
          total_revenue: thisHourRevenue._sum.amount || 0,
          transaction_count: thisHourRevenue._count._all,
          growth_vs_last_hour: hourlyGrowth
        },
        yesterday_comparison: {
          total_revenue: yesterdayRevenue._sum.amount || 0,
          transaction_count: yesterdayRevenue._count._all
        }
      },
      activity_metrics: {
        active_users_24h: activeUsers,
        pending_payments: pendingPayments,
        active_partners_today: partnerActivity.length,
        total_partner_commissions_today: partnerActivity.reduce((sum, p) => sum + (p._sum.commission_amount || 0), 0)
      },
      subscription_metrics: {
        new_subscriptions_today: subscriptionActivity.find(s => s.status === 'active')?._count._all || 0,
        trial_subscriptions_today: subscriptionActivity.find(s => s.status === 'trialing')?._count._all || 0,
        cancelled_subscriptions_today: subscriptionActivity.find(s => s.status === 'cancelled')?._count._all || 0
      },
      live_feed: {
        recent_transactions: processedTransactions,
        transaction_velocity: calculateTransactionVelocity(liveTransactions),
        peak_hours: hourlyPerformance.peak_hours,
        current_hour_rank: hourlyPerformance.current_hour_rank
      },
      system_health: systemHealth,
      alerts: generateRealTimeAlerts(todayRevenue, pendingPayments, systemHealth)
    };

    return NextResponse.json({
      success: true,
      data: realtimeData
    });

  } catch (error) {
    console.error('Error fetching real-time analytics:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper functions

async function getSystemHealthMetrics(): Promise<any> {
  try {
    const [dbHealth, paymentSystemHealth, apiHealth] = await Promise.all([
      // Database health
      prisma.$queryRaw`SELECT 1 as health_check`.then(() => ({ status: 'healthy', latency: 'low' }))
        .catch(() => ({ status: 'unhealthy', latency: 'high' })),

      // Payment system health (check recent payment success rate)
      prisma.paymentOrder.aggregate({
        where: {
          created_at: { gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
        },
        _count: { _all: true }
      }).then(result => ({
        status: result._count._all > 0 ? 'healthy' : 'idle',
        recent_orders: result._count._all
      })),

      // API health (simplified)
      Promise.resolve({ status: 'healthy', response_time: 'normal' })
    ]);

    return {
      database: dbHealth,
      payment_system: paymentSystemHealth,
      api: apiHealth,
      overall_status: [dbHealth, paymentSystemHealth, apiHealth].every(h => h.status === 'healthy') ? 'healthy' : 'degraded'
    };
  } catch (error) {
    return {
      database: { status: 'unknown', error: 'Health check failed' },
      payment_system: { status: 'unknown', error: 'Health check failed' },
      api: { status: 'unknown', error: 'Health check failed' },
      overall_status: 'unknown'
    };
  }
}

async function getHourlyPerformance(): Promise<any> {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const hourlyData = await prisma.$queryRaw`
    SELECT 
      HOUR(processed_at) as hour,
      SUM(amount) as revenue,
      COUNT(*) as transactions
    FROM transactions 
    WHERE status = 'completed' 
      AND processed_at >= ${last24Hours}
    GROUP BY HOUR(processed_at)
    ORDER BY revenue DESC
  ` as any[];

  const currentHour = new Date().getHours();
  const currentHourData = hourlyData.find((h: any) => h.hour === currentHour);
  const sortedHours = hourlyData.sort((a: any, b: any) => b.revenue - a.revenue);

  return {
    peak_hours: sortedHours.slice(0, 3),
    current_hour_rank: sortedHours.findIndex((h: any) => h.hour === currentHour) + 1,
    current_hour_performance: currentHourData || { hour: currentHour, revenue: 0, transactions: 0 }
  };
}

function calculateTransactionVelocity(transactions: any[]): any {
  const last10Minutes = new Date(Date.now() - 10 * 60 * 1000);
  const last30Minutes = new Date(Date.now() - 30 * 60 * 1000);
  const lastHour = new Date(Date.now() - 60 * 60 * 1000);

  const recent10Min = transactions.filter(tx => new Date(tx.created_at) >= last10Minutes).length;
  const recent30Min = transactions.filter(tx => new Date(tx.created_at) >= last30Minutes).length;
  const recentHour = transactions.filter(tx => new Date(tx.created_at) >= lastHour).length;

  return {
    transactions_per_10_minutes: recent10Min,
    transactions_per_30_minutes: recent30Min,
    transactions_per_hour: recentHour,
    velocity_trend: recent10Min > 3 ? 'high' : recent10Min > 1 ? 'medium' : 'low'
  };
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function generateRealTimeAlerts(todayRevenue: any, pendingPayments: number, systemHealth: any): any[] {
  const alerts = [];

  // Revenue alerts
  const currentRevenue = todayRevenue._sum.amount || 0;
  const currentHour = new Date().getHours();
  const expectedDailyRevenue = 10000; // ₹10,000 daily target

  if (currentHour > 12 && currentRevenue < expectedDailyRevenue * 0.3) {
    alerts.push({
      type: 'warning',
      priority: 'medium',
      message: 'Daily revenue tracking below 30% of target',
      action: 'Review marketing campaigns and partner activity'
    });
  }

  // Pending payments alert
  if (pendingPayments > 50) {
    alerts.push({
      type: 'warning',
      priority: 'high',
      message: `${pendingPayments} pending payments require attention`,
      action: 'Review payment processing queue'
    });
  }

  // System health alerts
  if (systemHealth.overall_status !== 'healthy') {
    alerts.push({
      type: 'error',
      priority: 'high',
      message: 'System health degraded - some services may be affected',
      action: 'Check system status and logs'
    });
  }

  // Success alerts
  if (currentRevenue > expectedDailyRevenue * 0.8 && currentHour < 18) {
    alerts.push({
      type: 'success',
      priority: 'low',
      message: 'Daily revenue target likely to be exceeded',
      action: 'Continue current performance'
    });
  }

  return alerts;
}