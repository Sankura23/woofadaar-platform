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

// Helper function to calculate earnings breakdown
async function calculateEarningsBreakdown(partnerId: string, startDate?: Date, endDate?: Date) {
  const dateFilter = startDate && endDate ? {
    gte: startDate,
    lte: endDate
  } : {};

  // Get appointment earnings
  const appointments = await prisma.appointment.findMany({
    where: {
      partner_id: partnerId,
      status: 'completed',
      consultation_fee: { gt: 0 },
      ...(Object.keys(dateFilter).length > 0 && { appointment_date: dateFilter })
    }
  });

  // Get commission earnings
  const commissions = await prisma.commissionEarning.findMany({
    where: {
      partner_id: partnerId,
      ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter })
    }
  });

  // Calculate direct appointment earnings
  const appointmentEarnings = appointments.reduce((sum, apt) => sum + (apt.consultation_fee || 0), 0);
  
  // Calculate commission earnings by type
  const commissionBreakdown = commissions.reduce((acc, comm) => {
    if (!acc[comm.commission_type]) {
      acc[comm.commission_type] = {
        count: 0,
        total_commission: 0,
        total_base_amount: 0,
        pending: 0,
        approved: 0,
        paid: 0
      };
    }
    
    acc[comm.commission_type].count += 1;
    acc[comm.commission_type].total_commission += comm.commission_amount;
    acc[comm.commission_type].total_base_amount += comm.base_amount;
    
    if (comm.status === 'pending') {
      acc[comm.commission_type].pending += comm.commission_amount;
    } else if (comm.status === 'approved') {
      acc[comm.commission_type].approved += comm.commission_amount;
    } else if (comm.status === 'paid') {
      acc[comm.commission_type].paid += comm.commission_amount;
    }
    
    return acc;
  }, {} as any);

  const totalCommissions = commissions.reduce((sum, comm) => sum + comm.commission_amount, 0);
  const paidCommissions = commissions.filter(comm => comm.status === 'paid').reduce((sum, comm) => sum + comm.commission_amount, 0);
  const pendingCommissions = commissions.filter(comm => comm.status === 'pending').reduce((sum, comm) => sum + comm.commission_amount, 0);

  return {
    appointment_earnings: Math.round(appointmentEarnings * 100) / 100,
    commission_earnings: Math.round(totalCommissions * 100) / 100,
    total_earnings: Math.round((appointmentEarnings + totalCommissions) * 100) / 100,
    paid_earnings: Math.round((appointmentEarnings + paidCommissions) * 100) / 100,
    pending_earnings: Math.round(pendingCommissions * 100) / 100,
    earnings_breakdown: {
      appointments: {
        count: appointments.length,
        total: Math.round(appointmentEarnings * 100) / 100,
        average_per_appointment: appointments.length > 0 ? Math.round((appointmentEarnings / appointments.length) * 100) / 100 : 0
      },
      commissions: commissionBreakdown
    }
  };
}

// Helper function to generate earnings forecast
function generateEarningsForecast(historicalData: any[], partner: any) {
  if (historicalData.length < 3) {
    return {
      next_month_projection: 0,
      confidence: 'low',
      growth_trend: 'insufficient_data'
    };
  }

  // Simple linear trend calculation
  const monthlyEarnings = historicalData.map(data => data.total_earnings);
  const avgGrowth = monthlyEarnings.slice(1).reduce((sum, current, index) => {
    const previous = monthlyEarnings[index];
    return sum + (previous > 0 ? (current - previous) / previous : 0);
  }, 0) / (monthlyEarnings.length - 1);

  const lastMonthEarnings = monthlyEarnings[monthlyEarnings.length - 1] || 0;
  const projectedEarnings = lastMonthEarnings * (1 + avgGrowth);

  return {
    next_month_projection: Math.max(0, Math.round(projectedEarnings * 100) / 100),
    confidence: historicalData.length >= 6 ? 'high' : 'medium',
    growth_trend: avgGrowth > 0.05 ? 'growing' : avgGrowth < -0.05 ? 'declining' : 'stable',
    average_monthly_growth: Math.round(avgGrowth * 100),
    tier_potential: getTierUpgradePotential(partner, lastMonthEarnings)
  };
}

// Helper function to assess tier upgrade potential
function getTierUpgradePotential(partner: any, monthlyEarnings: number) {
  const tierThresholds = {
    premium: 15000,   // ₹15,000/month to justify premium
    enterprise: 40000 // ₹40,000/month to justify enterprise
  };

  if (partner.partnership_tier === 'basic' && monthlyEarnings >= tierThresholds.premium) {
    return {
      recommended_tier: 'premium',
      potential_additional_earnings: monthlyEarnings * 0.05, // 5% increase from premium
      reason: 'Monthly earnings support premium tier benefits'
    };
  } else if (partner.partnership_tier === 'premium' && monthlyEarnings >= tierThresholds.enterprise) {
    return {
      recommended_tier: 'enterprise',
      potential_additional_earnings: monthlyEarnings * 0.05, // Additional 5% from enterprise
      reason: 'High volume justifies enterprise tier benefits'
    };
  }

  return null;
}

// GET /api/revenue/partner-earnings - Get comprehensive partner earnings data
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
    const partner_id = searchParams.get('partner_id');
    const period = searchParams.get('period') || 'current_month'; // current_month, last_month, quarter, year, custom
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const include_forecast = searchParams.get('include_forecast') === 'true';

    // Determine target partner ID
    let targetPartnerId = partner_id;
    if (!auth.isAdmin && auth.partnerId) {
      targetPartnerId = auth.partnerId; // Partners can only see their own earnings
    } else if (!auth.isAdmin && !auth.partnerId) {
      return NextResponse.json({
        success: false,
        message: 'Access denied'
      }, { status: 403 });
    }

    if (!targetPartnerId) {
      return NextResponse.json({
        success: false,
        message: 'Partner ID is required'
      }, { status: 400 });
    }

    // Get partner information
    const partner = await prisma.partner.findUnique({
      where: { id: targetPartnerId },
      select: {
        id: true,
        name: true,
        business_name: true,
        partner_type: true,
        partnership_tier: true,
        commission_rate: true,
        monthly_revenue: true,
        total_appointments: true,
        rating_average: true,
        created_at: true
      }
    });

    if (!partner) {
      return NextResponse.json({
        success: false,
        message: 'Partner not found'
      }, { status: 404 });
    }

    // Calculate date range based on period
    let dateRange: { start: Date; end: Date };
    const now = new Date();
    
    switch (period) {
      case 'current_month':
        dateRange = {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        };
        break;
      case 'last_month':
        dateRange = {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
        };
        break;
      case 'quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        dateRange = {
          start: quarterStart,
          end: new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0, 23, 59, 59)
        };
        break;
      case 'year':
        dateRange = {
          start: new Date(now.getFullYear(), 0, 1),
          end: new Date(now.getFullYear(), 11, 31, 23, 59, 59)
        };
        break;
      case 'custom':
        if (!start_date || !end_date) {
          return NextResponse.json({
            success: false,
            message: 'Start and end dates are required for custom period'
          }, { status: 400 });
        }
        dateRange = {
          start: new Date(start_date),
          end: new Date(end_date)
        };
        break;
      default:
        dateRange = {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        };
    }

    // Calculate earnings breakdown
    const earningsBreakdown = await calculateEarningsBreakdown(targetPartnerId, dateRange.start, dateRange.end);

    // Get historical earnings for trends (last 12 months)
    const historicalEarnings = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthlyData = await calculateEarningsBreakdown(targetPartnerId, monthStart, monthEnd);
      
      historicalEarnings.push({
        month: monthStart.toISOString().substr(0, 7), // YYYY-MM format
        ...monthlyData
      });
    }

    // Calculate performance metrics
    const performanceMetrics = {
      earnings_growth: calculateEarningsGrowth(historicalEarnings),
      tier_performance: analyzeTierPerformance(partner, earningsBreakdown),
      efficiency_metrics: calculateEfficiencyMetrics(partner, earningsBreakdown),
      ranking_info: await getPartnerRanking(targetPartnerId, partner.partner_type)
    };

    // Generate forecast if requested
    let forecast = null;
    if (include_forecast) {
      forecast = generateEarningsForecast(historicalEarnings, partner);
    }

    // Get recent high-value transactions
    const recentHighValueTransactions = await prisma.appointment.findMany({
      where: {
        partner_id: targetPartnerId,
        status: 'completed',
        consultation_fee: { gte: 1000 }, // High-value threshold
        appointment_date: { gte: dateRange.start, lte: dateRange.end }
      },
      include: {
        user: {
          select: { id: true, name: true }
        },
        dog: {
          select: { id: true, name: true, breed: true }
        }
      },
      orderBy: { consultation_fee: 'desc' },
      take: 10
    });

    const earningsData = {
      partner_info: partner,
      period_info: {
        period: period,
        start_date: dateRange.start.toISOString().split('T')[0],
        end_date: dateRange.end.toISOString().split('T')[0],
        days_in_period: Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
      },
      earnings_summary: earningsBreakdown,
      historical_trends: historicalEarnings.slice(-6), // Last 6 months
      performance_metrics: performanceMetrics,
      recent_high_value: recentHighValueTransactions.map(apt => ({
        appointment_id: apt.id,
        date: apt.appointment_date,
        service_type: apt.service_type,
        consultation_fee: apt.consultation_fee,
        client: apt.user.name,
        pet: `${apt.dog?.name} (${apt.dog?.breed})`
      })),
      earnings_forecast: forecast
    };

    return NextResponse.json({
      success: true,
      data: earningsData
    });

  } catch (error) {
    console.error('Partner earnings error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while fetching earnings data'
    }, { status: 500 });
  }
}

// POST /api/revenue/partner-earnings - Update partner revenue tracking
export async function POST(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth || (!auth.isAdmin && !auth.partnerId)) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized' 
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, partner_id, revenue_data, payout_request } = body;

    if (!action) {
      return NextResponse.json({
        success: false,
        message: 'Action is required'
      }, { status: 400 });
    }

    const validActions = ['update_monthly_revenue', 'request_payout', 'mark_commissions_paid'];
    if (!validActions.includes(action)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid action'
      }, { status: 400 });
    }

    // Determine target partner
    let targetPartnerId = partner_id;
    if (!auth.isAdmin && auth.partnerId) {
      targetPartnerId = auth.partnerId;
    }

    if (!targetPartnerId) {
      return NextResponse.json({
        success: false,
        message: 'Partner ID is required'
      }, { status: 400 });
    }

    let result: any = {};

    switch (action) {
      case 'update_monthly_revenue':
        if (!auth.isAdmin) {
          return NextResponse.json({
            success: false,
            message: 'Admin privileges required for revenue updates'
          }, { status: 403 });
        }

        if (!revenue_data || typeof revenue_data.monthly_revenue !== 'number') {
          return NextResponse.json({
            success: false,
            message: 'Valid monthly revenue data is required'
          }, { status: 400 });
        }

        const updatedPartner = await prisma.partner.update({
          where: { id: targetPartnerId },
          data: {
            monthly_revenue: revenue_data.monthly_revenue
          }
        });

        result = {
          partner_id: updatedPartner.id,
          previous_revenue: updatedPartner.monthly_revenue,
          new_revenue: revenue_data.monthly_revenue,
          message: 'Monthly revenue updated successfully'
        };
        break;

      case 'request_payout':
        if (!payout_request) {
          return NextResponse.json({
            success: false,
            message: 'Payout request data is required'
          }, { status: 400 });
        }

        // Get pending commissions for the partner
        const pendingCommissions = await prisma.commissionEarning.findMany({
          where: {
            partner_id: targetPartnerId,
            status: 'approved'
          }
        });

        const totalPendingAmount = pendingCommissions.reduce((sum, comm) => sum + comm.commission_amount, 0);

        if (totalPendingAmount === 0) {
          return NextResponse.json({
            success: false,
            message: 'No approved commissions available for payout'
          }, { status: 400 });
        }

        // Create payout request record (would be a separate PayoutRequest model in production)
        result = {
          payout_request_id: `payout_${Date.now()}`,
          partner_id: targetPartnerId,
          requested_amount: totalPendingAmount,
          commission_count: pendingCommissions.length,
          status: 'pending_review',
          requested_at: new Date(),
          message: 'Payout request submitted successfully'
        };
        break;

      case 'mark_commissions_paid':
        if (!auth.isAdmin) {
          return NextResponse.json({
            success: false,
            message: 'Admin privileges required for marking commissions as paid'
          }, { status: 403 });
        }

        const { commission_ids } = body;
        if (!commission_ids || !Array.isArray(commission_ids)) {
          return NextResponse.json({
            success: false,
            message: 'Commission IDs array is required'
          }, { status: 400 });
        }

        const paidCommissions = await prisma.commissionEarning.updateMany({
          where: {
            id: { in: commission_ids },
            partner_id: targetPartnerId,
            status: 'approved'
          },
          data: {
            status: 'paid',
            paid_at: new Date()
          }
        });

        result = {
          paid_count: paidCommissions.count,
          message: `Marked ${paidCommissions.count} commission records as paid`
        };
        break;
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Partner earnings update error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error during earnings update'
    }, { status: 500 });
  }
}

// Helper functions
function calculateEarningsGrowth(historicalData: any[]) {
  if (historicalData.length < 2) return { growth_rate: 0, trend: 'insufficient_data' };

  const currentMonth = historicalData[historicalData.length - 1];
  const previousMonth = historicalData[historicalData.length - 2];

  if (previousMonth.total_earnings === 0) return { growth_rate: 0, trend: 'no_baseline' };

  const growthRate = ((currentMonth.total_earnings - previousMonth.total_earnings) / previousMonth.total_earnings) * 100;

  return {
    growth_rate: Math.round(growthRate * 100) / 100,
    trend: growthRate > 10 ? 'strong_growth' : growthRate > 0 ? 'growing' : growthRate < -10 ? 'declining' : 'stable',
    absolute_change: Math.round((currentMonth.total_earnings - previousMonth.total_earnings) * 100) / 100
  };
}

function analyzeTierPerformance(partner: any, earnings: any) {
  const tierCommissionRates = {
    basic: 10,
    premium: 15,
    enterprise: 20
  };

  const currentRate = tierCommissionRates[partner.partnership_tier as keyof typeof tierCommissionRates] || 10;
  const potentialEarningsAtNextTier = partner.partnership_tier === 'basic' ? 
    earnings.total_earnings * 1.5 : partner.partnership_tier === 'premium' ? 
    earnings.total_earnings * 1.33 : earnings.total_earnings;

  return {
    current_tier: partner.partnership_tier,
    current_commission_rate: currentRate,
    tier_efficiency: Math.min(100, (earnings.commission_earnings / (earnings.appointment_earnings * (currentRate / 100))) * 100),
    upgrade_potential: potentialEarningsAtNextTier - earnings.total_earnings
  };
}

function calculateEfficiencyMetrics(partner: any, earnings: any) {
  return {
    earnings_per_appointment: partner.total_appointments > 0 ? 
      Math.round((earnings.appointment_earnings / partner.total_appointments) * 100) / 100 : 0,
    commission_to_appointment_ratio: earnings.appointment_earnings > 0 ? 
      Math.round((earnings.commission_earnings / earnings.appointment_earnings) * 100) / 100 : 0,
    monthly_earning_efficiency: earnings.total_earnings > 0 ? 'active' : 'inactive'
  };
}

async function getPartnerRanking(partnerId: string, partnerType: string) {
  // Mock ranking - in production, this would calculate actual rankings
  const partnersInType = await prisma.partner.count({
    where: { 
      partner_type: partnerType,
      status: 'approved'
    }
  });

  return {
    type_ranking: Math.floor(Math.random() * partnersInType) + 1,
    total_in_type: partnersInType,
    percentile: Math.floor(Math.random() * 100) + 1
  };
}