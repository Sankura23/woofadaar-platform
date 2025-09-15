import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
import { getDateRange, RevenueCalculator } from '@/lib/revenue-utils';

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

// GET /api/revenue/analytics/dashboard - Get comprehensive revenue dashboard data
export async function GET(request: NextRequest) {
  try {
    const authResult = verifyAdminToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'month') as 'today' | 'week' | 'month' | 'quarter' | 'year';
    
    const { startDate, endDate } = getDateRange(period);
    const currentDate = new Date();
    
    // Calculate previous period for comparison
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodDuration);
    const previousEndDate = new Date(startDate.getTime());

    // 1. Overall Revenue Summary
    const [currentPeriodStats, previousPeriodStats] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          status: 'completed',
          processed_at: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          amount: true,
          commission_amount: true
        },
        _count: {
          _all: true
        },
        _avg: {
          amount: true
        }
      }),
      prisma.transaction.aggregate({
        where: {
          status: 'completed',
          processed_at: {
            gte: previousStartDate,
            lte: previousEndDate
          }
        },
        _sum: {
          amount: true,
          commission_amount: true
        },
        _count: {
          _all: true
        }
      })
    ]);

    const currentRevenue = currentPeriodStats._sum.amount || 0;
    const previousRevenue = previousPeriodStats._sum.amount || 0;
    const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    
    const currentTransactions = currentPeriodStats._count._all;
    const previousTransactions = previousPeriodStats._count._all;
    const transactionGrowth = previousTransactions > 0 ? ((currentTransactions - previousTransactions) / previousTransactions) * 100 : 0;

    // 2. Revenue Stream Breakdown
    const revenueStreamBreakdown = await prisma.transaction.groupBy({
      by: ['revenue_stream_id'],
      where: {
        status: 'completed',
        processed_at: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        amount: true,
        commission_amount: true
      },
      _count: {
        _all: true
      },
      _avg: {
        amount: true
      }
    });

    // Enhance with stream details
    const enhancedStreamBreakdown = await Promise.all(
      revenueStreamBreakdown.map(async (item) => {
        const stream = await prisma.revenueStream.findUnique({
          where: { id: item.revenue_stream_id },
          select: { name: true, description: true, is_active: true }
        });
        return {
          revenue_stream_id: item.revenue_stream_id,
          name: stream?.name || 'Unknown',
          description: stream?.description,
          is_active: stream?.is_active,
          total_revenue: item._sum.amount || 0,
          commission_paid: item._sum.commission_amount || 0,
          transaction_count: item._count._all,
          avg_transaction_value: item._avg.amount || 0,
          net_revenue: (item._sum.amount || 0) - (item._sum.commission_amount || 0)
        };
      })
    );

    // 3. Partner Subscription Analytics
    const partnerSubscriptionStats = await prisma.partnerSubscription.groupBy({
      by: ['subscription_tier', 'status'],
      _count: {
        _all: true
      },
      _sum: {
        monthly_rate: true
      }
    });

    const subscriptionMRR = partnerSubscriptionStats
      .filter(item => item.status === 'active')
      .reduce((sum, item) => sum + (item._sum.monthly_rate || 0), 0);

    const subscriptionARR = RevenueCalculator.calculateARR(subscriptionMRR);

    // 4. Premium Services Analytics
    const premiumServicesStats = await prisma.userPremiumService.aggregate({
      where: {
        status: 'active',
        created_at: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        _all: true
      }
    });

    // 5. Commission Analytics
    const commissionStats = await prisma.referralCommission.aggregate({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        commission_amount: true,
        referral_amount: true
      },
      _count: {
        _all: true
      }
    });

    const commissionByStatus = await prisma.referralCommission.groupBy({
      by: ['status'],
      where: {
        created_at: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        commission_amount: true
      },
      _count: {
        _all: true
      }
    });

    // 6. Daily Revenue Trend (last 30 days)
    const dailyRevenueTrend = await prisma.$queryRaw`
      SELECT 
        DATE(processed_at) as date,
        SUM(amount) as daily_revenue,
        COUNT(*) as daily_transactions,
        SUM(commission_amount) as daily_commission
      FROM transactions 
      WHERE status = 'completed' 
        AND processed_at >= ${new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000)}
        AND processed_at <= ${currentDate}
      GROUP BY DATE(processed_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    // 7. Top Performing Partners (by commission earned)
    const topPartners = await prisma.referralCommission.groupBy({
      by: ['partner_id'],
      where: {
        status: 'paid',
        paid_at: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        commission_amount: true,
        referral_amount: true
      },
      _count: {
        _all: true
      },
      orderBy: {
        _sum: {
          commission_amount: 'desc'
        }
      },
      take: 10
    });

    // Enhance with partner details
    const enhancedTopPartners = await Promise.all(
      topPartners.map(async (item) => {
        const partner = await prisma.partner.findUnique({
          where: { id: item.partner_id },
          select: { 
            id: true, 
            name: true, 
            business_name: true, 
            partner_type: true,
            rating_average: true
          }
        });
        return {
          partner_id: item.partner_id,
          partner_name: partner?.name || 'Unknown',
          business_name: partner?.business_name,
          partner_type: partner?.partner_type,
          rating_average: partner?.rating_average,
          total_commission_earned: item._sum.commission_amount || 0,
          total_referral_value: item._sum.referral_amount || 0,
          referral_count: item._count._all,
          avg_referral_value: item._count._all > 0 ? (item._sum.referral_amount || 0) / item._count._all : 0
        };
      })
    );

    // 8. Revenue Targets vs Actual
    const monthlyTarget = 124500; // From revenue config - minimum target for month 6
    const actualMonthlyRevenue = currentPeriod === 'month' ? currentRevenue : 0;
    const targetAchievement = monthlyTarget > 0 ? (actualMonthlyRevenue / monthlyTarget) * 100 : 0;

    const dashboardData = {
      period_info: {
        period,
        start_date: startDate,
        end_date: endDate,
        generated_at: currentDate
      },
      revenue_summary: {
        current_period: {
          total_revenue: currentRevenue,
          total_transactions: currentTransactions,
          avg_transaction_value: currentPeriodStats._avg.amount || 0,
          total_commission_paid: currentPeriodStats._sum.commission_amount || 0,
          net_revenue: currentRevenue - (currentPeriodStats._sum.commission_amount || 0)
        },
        previous_period: {
          total_revenue: previousRevenue,
          total_transactions: previousTransactions
        },
        growth: {
          revenue_growth_percentage: revenueGrowth,
          transaction_growth_percentage: transactionGrowth
        },
        targets: {
          monthly_target: monthlyTarget,
          actual_monthly: actualMonthlyRevenue,
          achievement_percentage: targetAchievement
        }
      },
      revenue_streams: {
        breakdown: enhancedStreamBreakdown,
        total_streams: enhancedStreamBreakdown.length,
        most_profitable: enhancedStreamBreakdown.sort((a, b) => b.net_revenue - a.net_revenue)[0] || null
      },
      subscriptions: {
        partner_subscriptions: {
          breakdown: partnerSubscriptionStats,
          monthly_recurring_revenue: subscriptionMRR,
          annual_recurring_revenue: subscriptionARR
        },
        premium_services: {
          active_subscriptions: premiumServicesStats._count._all,
          new_subscriptions_this_period: premiumServicesStats._count._all
        }
      },
      commissions: {
        total_commission_amount: commissionStats._sum.commission_amount || 0,
        total_referral_value: commissionStats._sum.referral_amount || 0,
        commission_count: commissionStats._count._all,
        status_breakdown: commissionByStatus,
        avg_commission_rate: commissionStats._sum.referral_amount ? 
          (commissionStats._sum.commission_amount || 0) / (commissionStats._sum.referral_amount || 0) : 0
      },
      trends: {
        daily_revenue: dailyRevenueTrend
      },
      top_performers: {
        partners: enhancedTopPartners
      }
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error fetching revenue dashboard:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}