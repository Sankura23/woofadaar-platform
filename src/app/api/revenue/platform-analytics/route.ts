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

// Helper function to calculate platform revenue metrics
async function calculatePlatformRevenue(startDate: Date, endDate: Date) {
  // Get all completed appointments in date range
  const appointments = await prisma.appointment.findMany({
    where: {
      status: 'completed',
      appointment_date: { gte: startDate, lte: endDate },
      consultation_fee: { gt: 0 }
    },
    include: {
      partner: {
        select: {
          id: true,
          partnership_tier: true,
          partner_type: true
        }
      }
    }
  });

  // Get all commissions in date range
  const commissions = await prisma.commissionEarning.findMany({
    where: {
      created_at: { gte: startDate, lte: endDate }
    },
    include: {
      partner: {
        select: {
          partnership_tier: true,
          partner_type: true
        }
      }
    }
  });

  // Get corporate enrollments
  const corporateEnrollments = await prisma.corporateEnrollment.findMany({
    where: {
      created_at: { gte: startDate, lte: endDate },
      status: 'active'
    }
  });

  // Calculate total gross revenue (before commissions)
  const grossRevenue = appointments.reduce((sum, apt) => sum + (apt.consultation_fee || 0), 0);
  
  // Calculate platform commission revenue (what we keep)
  const platformCommissions = appointments.reduce((sum, apt) => {
    const tierRate = apt.partner.partnership_tier === 'enterprise' ? 0.20 : 
                    apt.partner.partnership_tier === 'premium' ? 0.15 : 0.10;
    const platformKeeps = (apt.consultation_fee || 0) * (1 - tierRate); // We keep what's left after partner commission
    return sum + platformKeeps;
  }, 0);

  // Calculate partner commission payouts
  const partnerCommissions = commissions.reduce((sum, comm) => sum + comm.commission_amount, 0);

  // Calculate corporate revenue
  const corporateRevenue = corporateEnrollments.reduce((sum, corp) => sum + corp.monthly_fee, 0);

  // Revenue breakdown by partner tier
  const revenueByTier = appointments.reduce((acc, apt) => {
    const tier = apt.partner.partnership_tier;
    if (!acc[tier]) {
      acc[tier] = { appointments: 0, revenue: 0, partners: new Set() };
    }
    acc[tier].appointments += 1;
    acc[tier].revenue += apt.consultation_fee || 0;
    acc[tier].partners.add(apt.partner.id);
    return acc;
  }, {} as any);

  // Revenue breakdown by partner type
  const revenueByType = appointments.reduce((acc, apt) => {
    const type = apt.partner.partner_type;
    if (!acc[type]) {
      acc[type] = { appointments: 0, revenue: 0, partners: new Set() };
    }
    acc[type].appointments += 1;
    acc[type].revenue += apt.consultation_fee || 0;
    acc[type].partners.add(apt.partner.id);
    return acc;
  }, {} as any);

  return {
    gross_revenue: Math.round(grossRevenue * 100) / 100,
    platform_revenue: Math.round(platformCommissions * 100) / 100,
    partner_commissions: Math.round(partnerCommissions * 100) / 100,
    corporate_revenue: Math.round(corporateRevenue * 100) / 100,
    total_platform_earnings: Math.round((platformCommissions + corporateRevenue) * 100) / 100,
    revenue_by_tier: Object.keys(revenueByTier).reduce((acc, tier) => {
      acc[tier] = {
        appointments: revenueByTier[tier].appointments,
        revenue: Math.round(revenueByTier[tier].revenue * 100) / 100,
        unique_partners: revenueByTier[tier].partners.size
      };
      return acc;
    }, {} as any),
    revenue_by_type: Object.keys(revenueByType).reduce((acc, type) => {
      acc[type] = {
        appointments: revenueByType[type].appointments,
        revenue: Math.round(revenueByType[type].revenue * 100) / 100,
        unique_partners: revenueByType[type].partners.size
      };
      return acc;
    }, {} as any),
    metrics: {
      total_appointments: appointments.length,
      average_appointment_value: appointments.length > 0 ? Math.round((grossRevenue / appointments.length) * 100) / 100 : 0,
      platform_margin: grossRevenue > 0 ? Math.round(((platformCommissions / grossRevenue) * 100) * 100) / 100 : 0,
      active_corporate_clients: corporateEnrollments.length
    }
  };
}

// Helper function to get growth metrics
async function calculateGrowthMetrics(currentPeriod: any, previousPeriod: any) {
  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
  };

  return {
    gross_revenue_growth: calculateGrowth(currentPeriod.gross_revenue, previousPeriod.gross_revenue),
    platform_revenue_growth: calculateGrowth(currentPeriod.platform_revenue, previousPeriod.platform_revenue),
    appointment_growth: calculateGrowth(currentPeriod.metrics.total_appointments, previousPeriod.metrics.total_appointments),
    corporate_revenue_growth: calculateGrowth(currentPeriod.corporate_revenue, previousPeriod.corporate_revenue),
    average_value_growth: calculateGrowth(currentPeriod.metrics.average_appointment_value, previousPeriod.metrics.average_appointment_value)
  };
}

// GET /api/revenue/platform-analytics - Get comprehensive platform revenue analytics (Admin only)
export async function GET(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth || !auth.isAdmin) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized - Admin access required' 
    }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'current_month';
    const include_forecasting = searchParams.get('include_forecasting') === 'true';
    const breakdown_level = searchParams.get('breakdown_level') || 'summary'; // summary, detailed, comprehensive

    // Calculate date ranges
    const now = new Date();
    let currentPeriodStart: Date, currentPeriodEnd: Date, previousPeriodStart: Date, previousPeriodEnd: Date;

    switch (period) {
      case 'current_month':
        currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case 'quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        currentPeriodStart = quarterStart;
        currentPeriodEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0, 23, 59, 59);
        previousPeriodStart = new Date(quarterStart.getFullYear(), quarterStart.getMonth() - 3, 1);
        previousPeriodEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth(), 0, 23, 59, 59);
        break;
      case 'year':
        currentPeriodStart = new Date(now.getFullYear(), 0, 1);
        currentPeriodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        previousPeriodStart = new Date(now.getFullYear() - 1, 0, 1);
        previousPeriodEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        break;
      default:
        currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    }

    // Calculate current and previous period metrics
    const [currentPeriodData, previousPeriodData] = await Promise.all([
      calculatePlatformRevenue(currentPeriodStart, currentPeriodEnd),
      calculatePlatformRevenue(previousPeriodStart, previousPeriodEnd)
    ]);

    // Calculate growth metrics
    const growthMetrics = await calculateGrowthMetrics(currentPeriodData, previousPeriodData);

    // Get partner performance data
    const partnerPerformance = await getTopPerformingPartners(currentPeriodStart, currentPeriodEnd);

    // Base analytics data
    let analyticsData: any = {
      period_info: {
        period: period,
        current_period: {
          start: currentPeriodStart.toISOString().split('T')[0],
          end: currentPeriodEnd.toISOString().split('T')[0]
        },
        previous_period: {
          start: previousPeriodStart.toISOString().split('T')[0],
          end: previousPeriodEnd.toISOString().split('T')[0]
        }
      },
      revenue_summary: currentPeriodData,
      growth_metrics: growthMetrics,
      top_performers: partnerPerformance
    };

    // Add detailed breakdown based on breakdown_level
    if (breakdown_level === 'detailed' || breakdown_level === 'comprehensive') {
      // Monthly revenue trends (last 12 months)
      const monthlyTrends = [];
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        const monthData = await calculatePlatformRevenue(monthStart, monthEnd);
        
        monthlyTrends.push({
          month: monthStart.toISOString().substr(0, 7),
          ...monthData
        });
      }

      analyticsData.monthly_trends = monthlyTrends;

      // Geographic distribution
      const geographicData = await getGeographicDistribution(currentPeriodStart, currentPeriodEnd);
      analyticsData.geographic_distribution = geographicData;

      // Service type analysis
      const serviceAnalysis = await getServiceTypeAnalysis(currentPeriodStart, currentPeriodEnd);
      analyticsData.service_analysis = serviceAnalysis;
    }

    if (breakdown_level === 'comprehensive') {
      // Customer acquisition costs and lifetime value
      const customerMetrics = await getCustomerMetrics(currentPeriodStart, currentPeriodEnd);
      analyticsData.customer_metrics = customerMetrics;

      // Partner churn and retention
      const partnerMetrics = await getPartnerRetentionMetrics();
      analyticsData.partner_metrics = partnerMetrics;

      // Corporate client analysis
      const corporateAnalysis = await getCorporateClientAnalysis(currentPeriodStart, currentPeriodEnd);
      analyticsData.corporate_analysis = corporateAnalysis;
    }

    // Add forecasting if requested
    if (include_forecasting) {
      const forecast = generateRevenueForecast(analyticsData.monthly_trends || []);
      analyticsData.revenue_forecast = forecast;
    }

    // Add operational insights
    analyticsData.operational_insights = generateOperationalInsights(currentPeriodData, growthMetrics);

    return NextResponse.json({
      success: true,
      data: analyticsData,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Platform analytics error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while generating platform analytics'
    }, { status: 500 });
  }
}

// Helper functions for detailed analytics
async function getTopPerformingPartners(startDate: Date, endDate: Date) {
  const partnerPerformance = await prisma.appointment.groupBy({
    by: ['partner_id'],
    where: {
      status: 'completed',
      appointment_date: { gte: startDate, lte: endDate },
      consultation_fee: { gt: 0 }
    },
    _sum: {
      consultation_fee: true
    },
    _count: {
      id: true
    },
    orderBy: {
      _sum: {
        consultation_fee: 'desc'
      }
    },
    take: 10
  });

  // Get partner details
  const partnersWithDetails = await Promise.all(
    partnerPerformance.map(async (perf) => {
      const partner = await prisma.partner.findUnique({
        where: { id: perf.partner_id },
        select: {
          id: true,
          name: true,
          business_name: true,
          partner_type: true,
          partnership_tier: true,
          location: true
        }
      });

      return {
        partner: partner,
        appointments: perf._count.id,
        total_revenue: Math.round((perf._sum.consultation_fee || 0) * 100) / 100,
        average_per_appointment: Math.round(((perf._sum.consultation_fee || 0) / perf._count.id) * 100) / 100
      };
    })
  );

  return partnersWithDetails;
}

async function getGeographicDistribution(startDate: Date, endDate: Date) {
  // Get appointment distribution by partner location
  const locationData = await prisma.appointment.findMany({
    where: {
      status: 'completed',
      appointment_date: { gte: startDate, lte: endDate }
    },
    include: {
      partner: {
        select: { location: true }
      }
    }
  });

  const distribution = locationData.reduce((acc, apt) => {
    const location = apt.partner?.location || 'Unknown';
    if (!acc[location]) {
      acc[location] = { appointments: 0, revenue: 0 };
    }
    acc[location].appointments += 1;
    acc[location].revenue += apt.consultation_fee || 0;
    return acc;
  }, {} as any);

  return Object.keys(distribution).map(location => ({
    location,
    appointments: distribution[location].appointments,
    revenue: Math.round(distribution[location].revenue * 100) / 100,
    percentage: Math.round((distribution[location].appointments / locationData.length) * 100 * 100) / 100
  })).sort((a, b) => b.revenue - a.revenue);
}

async function getServiceTypeAnalysis(startDate: Date, endDate: Date) {
  const serviceData = await prisma.appointment.groupBy({
    by: ['service_type'],
    where: {
      status: 'completed',
      appointment_date: { gte: startDate, lte: endDate }
    },
    _sum: {
      consultation_fee: true
    },
    _count: {
      id: true
    },
    _avg: {
      consultation_fee: true
    }
  });

  return serviceData.map(service => ({
    service_type: service.service_type,
    appointments: service._count.id,
    total_revenue: Math.round((service._sum.consultation_fee || 0) * 100) / 100,
    average_fee: Math.round((service._avg.consultation_fee || 0) * 100) / 100
  })).sort((a, b) => b.total_revenue - a.total_revenue);
}

async function getCustomerMetrics(startDate: Date, endDate: Date) {
  // New customers in period
  const newCustomers = await prisma.user.count({
    where: {
      created_at: { gte: startDate, lte: endDate }
    }
  });

  // Customer lifetime value calculation (simplified)
  const customerLTV = await prisma.appointment.aggregate({
    where: {
      status: 'completed',
      appointment_date: { gte: startDate, lte: endDate }
    },
    _avg: {
      consultation_fee: true
    }
  });

  return {
    new_customers: newCustomers,
    estimated_customer_ltv: Math.round((customerLTV._avg.consultation_fee || 0) * 3), // Assume 3 appointments average
    acquisition_cost: 150, // Mock - would calculate from marketing spend
    ltv_cac_ratio: Math.round(((customerLTV._avg.consultation_fee || 0) * 3) / 150 * 100) / 100
  };
}

async function getPartnerRetentionMetrics() {
  const totalPartners = await prisma.partner.count({
    where: { status: 'approved' }
  });

  const activePartners = await prisma.partner.count({
    where: { 
      status: 'approved',
      Appointments: {
        some: {
          appointment_date: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }
    }
  });

  return {
    total_approved_partners: totalPartners,
    active_partners_30_days: activePartners,
    activity_rate: totalPartners > 0 ? Math.round((activePartners / totalPartners) * 100 * 100) / 100 : 0,
    retention_insights: 'Monthly partner activity tracking'
  };
}

async function getCorporateClientAnalysis(startDate: Date, endDate: Date) {
  const corporateClients = await prisma.corporateEnrollment.findMany({
    where: {
      created_at: { gte: startDate, lte: endDate }
    },
    include: {
      employees: true
    }
  });

  const totalRevenue = corporateClients.reduce((sum, corp) => sum + corp.monthly_fee, 0);
  const totalEmployees = corporateClients.reduce((sum, corp) => sum + corp.employees.length, 0);

  return {
    new_corporate_clients: corporateClients.length,
    total_corporate_revenue: Math.round(totalRevenue * 100) / 100,
    total_enrolled_employees: totalEmployees,
    average_revenue_per_client: corporateClients.length > 0 ? 
      Math.round((totalRevenue / corporateClients.length) * 100) / 100 : 0,
    package_distribution: corporateClients.reduce((acc, corp) => {
      acc[corp.package_type] = (acc[corp.package_type] || 0) + 1;
      return acc;
    }, {} as any)
  };
}

function generateRevenueForecast(monthlyTrends: any[]) {
  if (monthlyTrends.length < 3) {
    return {
      next_month: 0,
      next_quarter: 0,
      confidence: 'low',
      methodology: 'insufficient_data'
    };
  }

  // Simple linear regression for forecasting
  const recentTrends = monthlyTrends.slice(-6); // Last 6 months
  const revenues = recentTrends.map(trend => trend.total_platform_earnings);
  
  // Calculate average growth rate
  const growthRates = [];
  for (let i = 1; i < revenues.length; i++) {
    if (revenues[i - 1] > 0) {
      growthRates.push((revenues[i] - revenues[i - 1]) / revenues[i - 1]);
    }
  }

  const avgGrowthRate = growthRates.length > 0 ? 
    growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length : 0;

  const lastMonthRevenue = revenues[revenues.length - 1] || 0;
  const nextMonthForecast = lastMonthRevenue * (1 + avgGrowthRate);
  const nextQuarterForecast = nextMonthForecast * 3 * (1 + avgGrowthRate / 2); // Conservative quarterly

  return {
    next_month: Math.max(0, Math.round(nextMonthForecast * 100) / 100),
    next_quarter: Math.max(0, Math.round(nextQuarterForecast * 100) / 100),
    confidence: recentTrends.length >= 6 ? 'medium' : 'low',
    methodology: 'linear_trend_analysis',
    growth_rate: Math.round(avgGrowthRate * 100 * 100) / 100
  };
}

function generateOperationalInsights(currentData: any, growthMetrics: any): string[] {
  const insights = [];

  if (growthMetrics.gross_revenue_growth > 20) {
    insights.push('🚀 Strong revenue growth indicates healthy platform expansion');
  } else if (growthMetrics.gross_revenue_growth < -10) {
    insights.push('⚠️ Revenue decline requires immediate attention and strategy review');
  }

  if (currentData.platform_revenue > currentData.partner_commissions * 2) {
    insights.push('💰 Healthy platform margins - consider investing in partner growth');
  } else if (currentData.platform_revenue < currentData.partner_commissions) {
    insights.push('📊 Low platform margins - review commission structure or pricing');
  }

  if (currentData.metrics.total_appointments > 1000) {
    insights.push('📈 High appointment volume - scale operations and partner network');
  }

  if (currentData.corporate_revenue > currentData.platform_revenue * 0.3) {
    insights.push('🏢 Corporate revenue is significant - invest in enterprise features');
  }

  if (growthMetrics.appointment_growth > growthMetrics.gross_revenue_growth) {
    insights.push('💡 Appointment growth exceeds revenue growth - optimize pricing strategy');
  }

  return insights.length > 0 ? insights : 
    ['📊 Platform performance is stable - continue monitoring key metrics'];
}