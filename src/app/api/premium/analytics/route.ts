import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
import { getDateRange } from '@/lib/revenue-utils';

const verifyToken = (authHeader: string | null) => {
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Authentication required', status: 401 };
  }
  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    if (!decoded.userId) {
      return { error: 'Invalid authentication token', status: 401 };
    }
    return { decoded };
  } catch (error) {
    return { error: 'Invalid authentication token', status: 401 };
  }
};

const isAdmin = (userType: string) => userType === 'admin';

// GET /api/premium/analytics - Get premium services analytics and insights
export async function GET(request: NextRequest) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const { searchParams } = new URL(request.url);
    
    // Admin can view system-wide analytics, users can only see their own
    const isAdminRequest = isAdmin(decoded.userType);
    const period = (searchParams.get('period') || 'month') as 'today' | 'week' | 'month' | 'quarter' | 'year';
    const userId = isAdminRequest ? searchParams.get('user_id') : decoded.userId;
    const serviceId = searchParams.get('service_id');

    const { startDate, endDate } = getDateRange(period);

    if (!isAdminRequest && userId && userId !== decoded.userId) {
      return NextResponse.json({
        success: false,
        message: 'Access denied: You can only view your own analytics'
      }, { status: 403 });
    }

    if (isAdminRequest) {
      // Admin analytics - system-wide premium services performance
      const [
        subscriptionStats,
        revenueStats,
        userEngagement,
        servicePopularity,
        churnAnalysis
      ] = await Promise.all([
        // Subscription statistics
        prisma.userPremiumService.groupBy({
          by: ['status'],
          where: {
            created_at: { gte: startDate, lte: endDate },
            ...(serviceId && { service_id: serviceId })
          },
          _count: { _all: true },
          _sum: { service_price: true }
        }),

        // Revenue from premium services
        prisma.userPremiumService.aggregate({
          where: {
            created_at: { gte: startDate, lte: endDate },
            status: { in: ['active', 'completed'] },
            ...(serviceId && { service_id: serviceId })
          },
          _sum: { service_price: true },
          _count: { _all: true },
          _avg: { service_price: true }
        }),

        // User engagement with premium features
        prisma.userPremiumService.groupBy({
          by: ['billing_period'],
          where: {
            created_at: { gte: startDate, lte: endDate },
            ...(serviceId && { service_id: serviceId })
          },
          _count: { _all: true },
          _sum: { service_price: true }
        }),

        // Service popularity
        prisma.userPremiumService.groupBy({
          by: ['service_id'],
          where: {
            created_at: { gte: startDate, lte: endDate }
          },
          _count: { _all: true },
          _sum: { service_price: true },
          _avg: { service_price: true }
        }),

        // Churn analysis (cancelled/expired in period)
        prisma.userPremiumService.groupBy({
          by: ['status'],
          where: {
            OR: [
              { cancelled_at: { gte: startDate, lte: endDate } },
              { expires_at: { gte: startDate, lte: endDate }, status: 'expired' }
            ],
            ...(serviceId && { service_id: serviceId })
          },
          _count: { _all: true }
        })
      ]);

      // Calculate conversion rates and trends
      const totalUsers = await prisma.user.count();
      const premiumUsers = await prisma.userPremiumService.groupBy({
        by: ['user_id'],
        where: { status: 'active' },
        _count: { _all: true }
      });

      const conversionRate = totalUsers > 0 ? (premiumUsers.length / totalUsers) * 100 : 0;

      // Monthly trend analysis
      const monthlyTrends = await prisma.$queryRaw`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as month,
          COUNT(*) as subscription_count,
          SUM(service_price) as revenue,
          COUNT(DISTINCT user_id) as unique_users
        FROM user_premium_services 
        WHERE created_at >= ${startDate} 
          AND created_at <= ${endDate}
          ${serviceId ? prisma.$queryRaw`AND service_id = ${serviceId}` : prisma.$queryRaw``}
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month ASC
      `;

      return NextResponse.json({
        success: true,
        data: {
          admin_analytics: {
            subscription_overview: {
              total_subscriptions: revenueStats._count._all,
              total_revenue: revenueStats._sum.service_price || 0,
              average_subscription_value: revenueStats._avg.service_price || 0,
              conversion_rate: conversionRate
            },
            subscription_breakdown: subscriptionStats,
            revenue_stats: revenueStats,
            billing_period_analysis: userEngagement,
            service_popularity: servicePopularity.sort((a, b) => b._count._all - a._count._all),
            churn_analysis: churnAnalysis,
            monthly_trends: monthlyTrends,
            period_info: {
              period,
              start_date: startDate,
              end_date: endDate,
              service_filter: serviceId
            }
          }
        }
      });

    } else {
      // User analytics - personal premium service usage and insights
      const userSubscriptions = await prisma.userPremiumService.findMany({
        where: {
          user_id: decoded.userId,
          ...(serviceId && { service_id: serviceId })
        },
        orderBy: { created_at: 'desc' }
      });

      if (userSubscriptions.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            user_analytics: {
              message: 'No premium service subscriptions found',
              recommendations: [
                {
                  service: 'premium_monthly',
                  reason: 'Get unlimited access to all premium features',
                  benefits: ['Unlimited photo storage', 'Advanced analytics', 'Priority support']
                }
              ]
            }
          }
        });
      }

      // Calculate user's premium service ROI and usage patterns
      const totalSpent = userSubscriptions.reduce((sum, sub) => sum + sub.service_price, 0);
      const activeSubscriptions = userSubscriptions.filter(sub => 
        sub.status === 'active' && new Date(sub.expires_at) > new Date()
      );

      // Get user's dogs for personalized insights
      const userDogs = await prisma.dog.findMany({
        where: { owner_id: decoded.userId },
        select: { id: true, name: true, breed: true, age: true }
      });

      // Get health activity for premium users
      const healthActivity = await prisma.healthLog.aggregate({
        where: {
          user_id: decoded.userId,
          created_at: { gte: startDate, lte: endDate }
        },
        _count: { _all: true }
      });

      // Get appointment usage
      const appointmentUsage = await prisma.appointment.aggregate({
        where: {
          user_id: decoded.userId,
          appointment_date: { gte: startDate, lte: endDate }
        },
        _count: { _all: true }
      });

      // Calculate savings and benefits
      const savingsCalculation = calculateUserSavings(userSubscriptions, healthActivity._count._all, appointmentUsage._count._all);

      return NextResponse.json({
        success: true,
        data: {
          user_analytics: {
            subscription_summary: {
              total_subscriptions: userSubscriptions.length,
              active_subscriptions: activeSubscriptions.length,
              total_spent: totalSpent,
              current_monthly_savings: savingsCalculation.monthly_savings,
              estimated_annual_savings: savingsCalculation.annual_savings
            },
            subscription_history: userSubscriptions,
            usage_insights: {
              dogs_managed: userDogs.length,
              health_logs_created: healthActivity._count._all,
              appointments_booked: appointmentUsage._count._all,
              engagement_level: calculateEngagementLevel(healthActivity._count._all, appointmentUsage._count._all, userDogs.length)
            },
            premium_benefits_utilized: calculateBenefitsUtilized(activeSubscriptions, healthActivity._count._all, appointmentUsage._count._all),
            recommendations: generateUserRecommendations(activeSubscriptions, userDogs.length, healthActivity._count._all)
          }
        }
      });
    }

  } catch (error) {
    console.error('Error fetching premium analytics:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper functions for analytics calculations

function calculateUserSavings(subscriptions: any[], healthLogs: number, appointments: number): any {
  // Calculate estimated savings compared to pay-per-use pricing
  const standardHealthLogCost = 10; // ₹10 per detailed health log
  const standardAppointmentCost = 200; // ₹200 per appointment booking
  const standardPhotoStorageCost = 2; // ₹2 per photo stored

  const estimatedPayPerUseCost = (healthLogs * standardHealthLogCost) + 
                                (appointments * standardAppointmentCost) + 
                                (healthLogs * 3 * standardPhotoStorageCost); // Assuming 3 photos per log

  const totalPremiumSpent = subscriptions.reduce((sum, sub) => sum + sub.service_price, 0);
  const monthlySavings = Math.max(0, estimatedPayPerUseCost - totalPremiumSpent);
  
  return {
    monthly_savings: monthlySavings,
    annual_savings: monthlySavings * 12,
    break_even_point: totalPremiumSpent > 0 ? Math.ceil(totalPremiumSpent / standardHealthLogCost) : 0
  };
}

function calculateEngagementLevel(healthLogs: number, appointments: number, dogCount: number): string {
  const totalActivity = healthLogs + appointments;
  const averageActivityPerDog = dogCount > 0 ? totalActivity / dogCount : 0;

  if (averageActivityPerDog >= 20) return 'High';
  if (averageActivityPerDog >= 10) return 'Medium';
  if (averageActivityPerDog >= 5) return 'Low';
  return 'Minimal';
}

function calculateBenefitsUtilized(activeSubscriptions: any[], healthLogs: number, appointments: number): any[] {
  const benefits = [];

  if (activeSubscriptions.length > 0) {
    benefits.push({
      benefit: 'Ad-free Experience',
      status: 'Active',
      estimated_value: '₹50/month'
    });

    if (healthLogs > 10) {
      benefits.push({
        benefit: 'Unlimited Photo Storage',
        status: 'Heavily Used',
        estimated_value: `₹${healthLogs * 6}/month`
      });
    }

    if (appointments > 0) {
      benefits.push({
        benefit: 'Priority Appointment Booking',
        status: 'Utilized',
        estimated_value: '₹100/month'
      });
    }

    benefits.push({
      benefit: 'Advanced Health Analytics',
      status: healthLogs > 5 ? 'Utilized' : 'Available',
      estimated_value: '₹150/month'
    });
  }

  return benefits;
}

function generateUserRecommendations(activeSubscriptions: any[], dogCount: number, healthLogs: number): any[] {
  const recommendations = [];

  if (activeSubscriptions.length === 0) {
    recommendations.push({
      type: 'upgrade',
      service: 'premium_monthly',
      reason: 'Unlock unlimited features for all your pets',
      potential_savings: '₹200/month'
    });
  }

  if (dogCount > 3 && !activeSubscriptions.some(sub => sub.billing_period === 'yearly')) {
    recommendations.push({
      type: 'billing_optimization',
      suggestion: 'Switch to yearly billing',
      reason: 'Save 2 months worth of subscription fees',
      potential_savings: '₹198/year'
    });
  }

  if (healthLogs < 5 && activeSubscriptions.length > 0) {
    recommendations.push({
      type: 'feature_utilization',
      suggestion: 'Use health logging more frequently',
      reason: 'Get better health insights and maximize your subscription value',
      benefit: 'Better health tracking for your pets'
    });
  }

  return recommendations;
}