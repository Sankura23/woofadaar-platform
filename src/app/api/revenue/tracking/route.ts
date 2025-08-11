import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

interface DecodedToken {
  userId?: string;
  partnerId?: string;
  email: string;
  userType?: string;
}

async function verifyToken(request: NextRequest): Promise<{ userId?: string; partnerId?: string; email?: string; isAdmin?: boolean } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    
    const isAdmin = decoded.email === 'admin@woofadaar.com' || decoded.userType === 'admin';
    
    return {
      userId: decoded.userId,
      partnerId: decoded.partnerId,
      email: decoded.email,
      isAdmin
    };
  } catch (error) {
    return null;
  }
}

// Helper function to calculate date ranges
function getDateRange(period: string) {
  const now = new Date();
  const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (period) {
    case 'today':
      return {
        start: currentDate,
        end: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
      };
    case 'yesterday':
      const yesterday = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
      return {
        start: yesterday,
        end: currentDate
      };
    case 'this_week':
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      return {
        start: startOfWeek,
        end: new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)
      };
    case 'this_month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 1)
      };
    case 'last_month':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 1)
      };
    case 'this_quarter':
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      return {
        start: quarterStart,
        end: new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 1)
      };
    case 'this_year':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear() + 1, 0, 1)
      };
    case 'last_year':
      return {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: new Date(now.getFullYear(), 0, 1)
      };
    default:
      // Default to this month
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 1)
      };
  }
}

// Helper function to calculate growth percentage
function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// GET /api/revenue/tracking - Get comprehensive revenue tracking and analytics
export async function GET(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized' 
    }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'this_month';
    const partner_id = searchParams.get('partner_id');
    const view = searchParams.get('view') || 'overview'; // overview, detailed, comparison
    const breakdown = searchParams.get('breakdown') || 'partner'; // partner, service, location

    // Get date ranges
    const currentPeriod = getDateRange(period);
    let previousPeriod = { start: new Date(), end: new Date() };
    
    // Calculate comparison period
    const periodLength = currentPeriod.end.getTime() - currentPeriod.start.getTime();
    previousPeriod.end = currentPeriod.start;
    previousPeriod.start = new Date(currentPeriod.start.getTime() - periodLength);

    // Access control
    let partnerFilter: any = {};
    if (!auth.isAdmin) {
      if (auth.partnerId) {
        partnerFilter.partner_id = auth.partnerId;
      } else {
        return NextResponse.json({
          success: false,
          message: 'Access denied - insufficient permissions'
        }, { status: 403 });
      }
    } else if (partner_id) {
      partnerFilter.partner_id = partner_id;
    }

    // Build where clauses for current and previous periods
    const currentWhere = {
      ...partnerFilter,
      appointment_date: {
        gte: currentPeriod.start,
        lt: currentPeriod.end
      },
      status: { in: ['completed', 'confirmed'] }
    };

    const previousWhere = {
      ...partnerFilter,
      appointment_date: {
        gte: previousPeriod.start,
        lt: previousPeriod.end
      },
      status: { in: ['completed', 'confirmed'] }
    };

    // Get revenue data from appointments
    const [currentAppointments, previousAppointments] = await Promise.all([
      prisma.appointment.findMany({
        where: currentWhere,
        include: {
          partner: {
            select: {
              id: true,
              name: true,
              business_name: true,
              partner_type: true,
              partnership_tier: true,
              location: true,
              commission_rate: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              location: true
            }
          }
        }
      }),
      prisma.appointment.findMany({
        where: previousWhere,
        select: {
          consultation_fee: true,
          service_type: true,
          partner: {
            select: {
              commission_rate: true
            }
          }
        }
      })
    ]);

    // Get commission data for the current period
    const currentCommissions = await prisma.commissionEarning.findMany({
      where: {
        ...partnerFilter,
        created_at: {
          gte: currentPeriod.start,
          lt: currentPeriod.end
        }
      },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            business_name: true,
            partner_type: true,
            partnership_tier: true
          }
        }
      }
    });

    // Calculate current period metrics
    const currentMetrics = {
      total_revenue: currentAppointments.reduce((sum, apt) => sum + (apt.consultation_fee || 0), 0),
      total_appointments: currentAppointments.length,
      total_commissions: currentCommissions.reduce((sum, comm) => sum + comm.commission_amount, 0),
      avg_appointment_value: currentAppointments.length > 0 ? 
        currentAppointments.reduce((sum, apt) => sum + (apt.consultation_fee || 0), 0) / currentAppointments.length : 0,
      unique_partners: new Set(currentAppointments.map(apt => apt.partner_id)).size,
      unique_users: new Set(currentAppointments.map(apt => apt.user_id)).size
    };

    // Calculate previous period metrics for comparison
    const previousMetrics = {
      total_revenue: previousAppointments.reduce((sum, apt) => sum + (apt.consultation_fee || 0), 0),
      total_appointments: previousAppointments.length,
      avg_appointment_value: previousAppointments.length > 0 ? 
        previousAppointments.reduce((sum, apt) => sum + (apt.consultation_fee || 0), 0) / previousAppointments.length : 0
    };

    // Calculate growth rates
    const growth = {
      revenue: calculateGrowth(currentMetrics.total_revenue, previousMetrics.total_revenue),
      appointments: calculateGrowth(currentMetrics.total_appointments, previousMetrics.total_appointments),
      avg_value: calculateGrowth(currentMetrics.avg_appointment_value, previousMetrics.avg_appointment_value)
    };

    // Base response data
    let responseData: any = {
      period_info: {
        period: period,
        current_period: {
          start: currentPeriod.start.toISOString().split('T')[0],
          end: currentPeriod.end.toISOString().split('T')[0]
        },
        comparison_period: {
          start: previousPeriod.start.toISOString().split('T')[0],
          end: previousPeriod.end.toISOString().split('T')[0]
        }
      },
      summary: {
        current: currentMetrics,
        growth: growth,
        commission_earnings: {
          total_commissions: currentMetrics.total_commissions,
          commission_count: currentCommissions.length,
          avg_commission: currentCommissions.length > 0 ? 
            Math.round((currentMetrics.total_commissions / currentCommissions.length) * 100) / 100 : 0
        }
      }
    };

    // Add detailed breakdowns based on view and breakdown parameters
    if (view === 'detailed' || view === 'overview') {
      // Revenue breakdown by service type
      const revenueByService = currentAppointments.reduce((acc, apt) => {
        const service = apt.service_type || 'other';
        if (!acc[service]) {
          acc[service] = { revenue: 0, count: 0, avg_value: 0 };
        }
        acc[service].revenue += apt.consultation_fee || 0;
        acc[service].count += 1;
        acc[service].avg_value = Math.round((acc[service].revenue / acc[service].count) * 100) / 100;
        return acc;
      }, {} as any);

      responseData.breakdowns = {
        by_service_type: Object.keys(revenueByService).map(service => ({
          service_type: service,
          ...revenueByService[service],
          percentage: currentMetrics.total_revenue > 0 ? 
            Math.round((revenueByService[service].revenue / currentMetrics.total_revenue) * 100) : 0
        })).sort((a, b) => b.revenue - a.revenue)
      };

      // Revenue breakdown by partner (if admin)
      if (auth.isAdmin && breakdown === 'partner') {
        const revenueByPartner = currentAppointments.reduce((acc, apt) => {
          const partnerId = apt.partner.id;
          if (!acc[partnerId]) {
            acc[partnerId] = {
              partner: apt.partner,
              revenue: 0,  
              appointments: 0,
              avg_value: 0,
              commission_earned: 0
            };
          }
          acc[partnerId].revenue += apt.consultation_fee || 0;
          acc[partnerId].appointments += 1;
          acc[partnerId].avg_value = Math.round((acc[partnerId].revenue / acc[partnerId].appointments) * 100) / 100;
          
          // Calculate commission for this partner
          const commissionRate = apt.partner.commission_rate || 0;
          acc[partnerId].commission_earned += Math.round(((apt.consultation_fee || 0) * commissionRate / 100) * 100) / 100;
          
          return acc;
        }, {} as any);

        responseData.breakdowns.by_partner = Object.values(revenueByPartner)
          .sort((a:any, b:any) => b.revenue - a.revenue)
          .slice(0, 20); // Top 20 partners
      }

      // Revenue breakdown by partnership tier
      const revenueByTier = currentAppointments.reduce((acc, apt) => {
        const tier = apt.partner.partnership_tier || 'basic';
        if (!acc[tier]) {
          acc[tier] = { revenue: 0, appointments: 0, partners: new Set(), avg_value: 0 };
        }
        acc[tier].revenue += apt.consultation_fee || 0;
        acc[tier].appointments += 1;
        acc[tier].partners.add(apt.partner.id);
        acc[tier].avg_value = Math.round((acc[tier].revenue / acc[tier].appointments) * 100) / 100;
        return acc;
      }, {} as any);

      responseData.breakdowns.by_partnership_tier = Object.keys(revenueByTier).map(tier => ({
        tier,
        revenue: revenueByTier[tier].revenue,
        appointments: revenueByTier[tier].appointments,
        partner_count: revenueByTier[tier].partners.size,
        avg_value: revenueByTier[tier].avg_value,
        percentage: currentMetrics.total_revenue > 0 ? 
          Math.round((revenueByTier[tier].revenue / currentMetrics.total_revenue) * 100) : 0
      })).sort((a, b) => b.revenue - a.revenue);
    }

    // Add detailed analysis for comprehensive view
    if (view === 'detailed') {
      // Daily revenue trends
      const dailyRevenue = currentAppointments.reduce((acc, apt) => {
        const date = apt.appointment_date.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { revenue: 0, appointments: 0 };
        }
        acc[date].revenue += apt.consultation_fee || 0;
        acc[date].appointments += 1;
        return acc;
      }, {} as any);

      responseData.trends = {
        daily_revenue: Object.keys(dailyRevenue)
          .sort()
          .map(date => ({
            date,
            revenue: Math.round(dailyRevenue[date].revenue * 100) / 100,
            appointments: dailyRevenue[date].appointments,
            avg_value: Math.round((dailyRevenue[date].revenue / dailyRevenue[date].appointments) * 100) / 100
          }))
      };

      // Commission analysis
      const commissionAnalysis = {
        total_commissions_paid: currentCommissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.commission_amount, 0),
        pending_commissions: currentCommissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commission_amount, 0),
        commission_types: currentCommissions.reduce((acc, comm) => {
          if (!acc[comm.commission_type]) {
            acc[comm.commission_type] = { count: 0, total_amount: 0 };
          }
          acc[comm.commission_type].count += 1;
          acc[comm.commission_type].total_amount += comm.commission_amount;
          return acc;
        }, {} as any)
      };

      responseData.commission_analysis = commissionAnalysis;

      // Performance insights
      responseData.insights = generateRevenueInsights(currentMetrics, growth, currentAppointments, currentCommissions);
    }

    // Add forecasting for admin users
    if (auth.isAdmin && view === 'detailed') {
      const forecast = generateRevenueForecast(currentAppointments, period);
      responseData.forecast = forecast;
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      generated_at: new Date().toISOString(),
      filters: {
        period,
        partner_id,
        view,
        breakdown
      }
    });

  } catch (error) {
    console.error('Revenue tracking error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while fetching revenue data'
    }, { status: 500 });
  }
}

// Helper function to generate revenue insights
function generateRevenueInsights(metrics: any, growth: any, appointments: any[], commissions: any[]): string[] {
  const insights = [];
  
  if (growth.revenue > 20) {
    insights.push(`🚀 Excellent revenue growth of ${growth.revenue}% compared to previous period`);
  } else if (growth.revenue < -10) {
    insights.push(`📉 Revenue declined by ${Math.abs(growth.revenue)}% - consider reviewing pricing or marketing strategies`);
  }
  
  if (metrics.avg_appointment_value > 800) {
    insights.push(`💰 High average appointment value of ₹${Math.round(metrics.avg_appointment_value)} indicates premium service delivery`);
  } else if (metrics.avg_appointment_value < 400) {
    insights.push(`💡 Average appointment value is ₹${Math.round(metrics.avg_appointment_value)} - consider upselling opportunities`);
  }
  
  const enterprisePartners = appointments.filter(apt => apt.partner.partnership_tier === 'enterprise').length;
  const totalAppointments = appointments.length;
  
  if (enterprisePartners > 0 && totalAppointments > 0) {
    const enterprisePercentage = Math.round((enterprisePartners / totalAppointments) * 100);
    if (enterprisePercentage > 30) {
      insights.push(`⭐ ${enterprisePercentage}% of appointments are with Enterprise partners - strong premium partner network`);
    }
  }
  
  const commissionRate = commissions.length > 0 ? 
    (metrics.total_commissions / metrics.total_revenue) * 100 : 0;
  
  if (commissionRate > 15) {
    insights.push(`📊 Commission rate is ${Math.round(commissionRate)}% - high partner engagement and satisfaction`);
  }
  
  return insights.length > 0 ? insights : ['📈 Revenue metrics are within normal ranges'];
}

// Helper function to generate revenue forecast
function generateRevenueForecast(appointments: any[], period: string): any {
  if (appointments.length === 0) {
    return {
      next_period_forecast: 0,
      confidence: 'low',
      factors: ['Insufficient data for forecasting']
    };
  }

  const totalRevenue = appointments.reduce((sum, apt) => sum + (apt.consultation_fee || 0), 0);
  const avgDailyRevenue = totalRevenue / appointments.length;
  
  // Simple linear forecast based on current trends
  let forecastMultiplier = 1.0;
  let forecastPeriod = 'next month';
  
  switch (period) {
    case 'today':
    case 'yesterday':
      forecastMultiplier = 30; // Daily to monthly
      break;
    case 'this_week':
      forecastMultiplier = 4.33; // Weekly to monthly
      break;
    case 'this_month':
      forecastMultiplier = 1; // Monthly
      forecastPeriod = 'next month';
      break;
    case 'this_quarter':
      forecastMultiplier = 1; // Quarterly
      forecastPeriod = 'next quarter';
      break;
  }
  
  const forecast = Math.round(avgDailyRevenue * forecastMultiplier * appointments.length);
  
  return {
    [`${forecastPeriod}_forecast`]: forecast,
    confidence: appointments.length > 10 ? 'medium' : 'low',
    based_on: `${appointments.length} appointments in current period`,
    factors: [
      'Current appointment volume trends',
      'Average consultation fee patterns',
      'Partner engagement levels'
    ]
  };
}