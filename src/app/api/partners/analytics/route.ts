import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

interface DecodedToken {
  userId?: string;
  partnerId?: string;
  email: string;
  userType?: string;
}

async function verifyToken(request: NextRequest): Promise<{ userId?: string; partnerId?: string; email?: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    return {
      userId: decoded.userId,
      partnerId: decoded.partnerId,
      email: decoded.email
    };
  } catch (error) {
    return null;
  }
}

// Helper function to generate time series data
function generateTimeSeries(data: any[], dateField: string, valueField: string, period: string) {
  const timeSeriesMap = new Map();
  
  data.forEach(item => {
    const date = new Date(item[dateField]);
    let key: string;
    
    switch (period) {
      case 'daily':
        key = date.toISOString().split('T')[0];
        break;
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default:
        key = date.toISOString().split('T')[0];
    }
    
    if (!timeSeriesMap.has(key)) {
      timeSeriesMap.set(key, 0);
    }
    
    if (valueField === 'count') {
      timeSeriesMap.set(key, timeSeriesMap.get(key) + 1);
    } else {
      timeSeriesMap.set(key, timeSeriesMap.get(key) + (item[valueField] || 0));
    }
  });
  
  return Array.from(timeSeriesMap.entries()).map(([date, value]) => ({
    date,
    value
  })).sort((a, b) => a.date.localeCompare(b.date));
}

// GET /api/partners/analytics - Get detailed partner analytics and reports
export async function GET(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth || !auth.partnerId) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized - Partner authentication required' 
    }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('report_type') || 'comprehensive';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const granularity = searchParams.get('granularity') || 'daily'; // daily, weekly, monthly

    // Default to last 30 days if no dates provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date(defaultEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const dateRange = {
      start: startDate ? new Date(startDate) : defaultStartDate,
      end: endDate ? new Date(endDate) : defaultEndDate
    };

    // Verify partner exists and is approved
    const partner = await prisma.partner.findUnique({
      where: { id: auth.partnerId },
      select: {
        id: true,
        name: true,
        business_name: true,
        partner_type: true,
        partnership_tier: true,
        status: true,
        verified: true,
        created_at: true
      }
    });

    if (!partner || partner.status !== 'approved' || !partner.verified) {
      return NextResponse.json({
        success: false,
        message: 'Partner not found or not approved'
      }, { status: 403 });
    }

    // Get all relevant data for the date range
    const [appointments, reviews, commissions, healthIdVerifications] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          partner_id: auth.partnerId,
          appointment_date: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        },
        include: {
          user: {
            select: { id: true, name: true, location: true }
          },
          dog: {
            select: { id: true, name: true, breed: true, age_months: true }
          }
        },
        orderBy: { appointment_date: 'asc' }
      }),
      prisma.partnerReview.findMany({
        where: {
          partner_id: auth.partnerId,
          created_at: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        },
        include: {
          user: {
            select: { id: true, name: true }
          },
          dog: {
            select: { id: true, name: true, breed: true }
          }
        },
        orderBy: { created_at: 'asc' }
      }),
      prisma.commissionEarning.findMany({
        where: {
          partner_id: auth.partnerId,
          created_at: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        },
        orderBy: { created_at: 'asc' }
      }),
      prisma.healthIdVerification.findMany({
        where: {
          partner_id: auth.partnerId,
          verification_date: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        },
        include: {
          dog: {
            select: { id: true, name: true, breed: true, user_id: true }
          }
        },
        orderBy: { verification_date: 'asc' }
      })
    ]);

    let analyticsData: any = {
      partner_info: {
        id: partner.id,
        name: partner.name,
        business_name: partner.business_name,
        partner_type: partner.partner_type,
        partnership_tier: partner.partnership_tier
      },
      date_range: {
        start: dateRange.start.toISOString().split('T')[0],
        end: dateRange.end.toISOString().split('T')[0],
        days: Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
      },
      summary: {
        total_appointments: appointments.length,
        total_revenue: appointments.reduce((sum, apt) => sum + (apt.consultation_fee || 0), 0),
        total_reviews: reviews.length,
        average_rating: reviews.length > 0 ? 
          reviews.reduce((sum, rev) => sum + rev.rating, 0) / reviews.length : 0,
        total_commissions: commissions.reduce((sum, comm) => sum + comm.commission_amount, 0),
        health_id_verifications: healthIdVerifications.length,
        unique_clients: new Set(appointments.map(apt => apt.user_id)).size,
        unique_pets: new Set([...appointments.map(apt => apt.dog_id), ...healthIdVerifications.map(ver => ver.dog_id)].filter(Boolean)).size
      }
    };

    // Generate different reports based on report_type
    switch (reportType) {
      case 'comprehensive':
        analyticsData.time_series = {
          appointments: generateTimeSeries(appointments, 'appointment_date', 'count', granularity),
          revenue: generateTimeSeries(appointments, 'appointment_date', 'consultation_fee', granularity),
          reviews: generateTimeSeries(reviews, 'created_at', 'count', granularity),
          health_verifications: generateTimeSeries(healthIdVerifications, 'verification_date', 'count', granularity)
        };

        analyticsData.breakdowns = {
          appointments_by_status: appointments.reduce((acc, apt) => {
            acc[apt.status] = (acc[apt.status] || 0) + 1;
            return acc;
          }, {} as any),
          appointments_by_service: appointments.reduce((acc, apt) => {
            acc[apt.service_type] = (acc[apt.service_type] || 0) + 1;
            return acc;
          }, {} as any),
          appointments_by_meeting_type: appointments.reduce((acc, apt) => {
            acc[apt.meeting_type] = (acc[apt.meeting_type] || 0) + 1;
            return acc;
          }, {} as any),
          reviews_by_rating: reviews.reduce((acc, rev) => {
            acc[rev.rating] = (acc[rev.rating] || 0) + 1;
            return acc;
          }, {} as any),
          commissions_by_type: commissions.reduce((acc, comm) => {
            acc[comm.commission_type] = (acc[comm.commission_type] || 0) + comm.commission_amount;
            return acc;
          }, {} as any)
        };

        analyticsData.client_analysis = {
          top_clients: Array.from(
            appointments.reduce((acc, apt) => {
              const userId = apt.user_id;
              if (!acc.has(userId)) {
                acc.set(userId, {
                  user_id: userId,
                  user_name: apt.user.name,
                  appointments: 0,
                  total_spent: 0
                });
              }
              const client = acc.get(userId);
              client.appointments += 1;
              client.total_spent += apt.consultation_fee || 0;
              return acc;
            }, new Map()).values()
          ).sort((a, b) => b.total_spent - a.total_spent).slice(0, 10),
          
          client_locations: appointments.reduce((acc, apt) => {
            const location = apt.user.location || 'Unknown';
            acc[location] = (acc[location] || 0) + 1;
            return acc;
          }, {} as any),
          
          pet_breeds: [...appointments, ...healthIdVerifications].reduce((acc, item) => {
            const breed = item.dog?.breed || 'Unknown';
            acc[breed] = (acc[breed] || 0) + 1;
            return acc;
          }, {} as any)
        };
        break;

      case 'revenue':
        analyticsData.revenue_analysis = {
          daily_revenue: generateTimeSeries(appointments, 'appointment_date', 'consultation_fee', 'daily'),
          revenue_by_service: appointments.reduce((acc, apt) => {
            if (apt.consultation_fee) {
              acc[apt.service_type] = (acc[apt.service_type] || 0) + apt.consultation_fee;
            }
            return acc;
          }, {} as any),
          commission_breakdown: commissions.reduce((acc, comm) => {
            acc[comm.commission_type] = (acc[comm.commission_type] || {
              total_amount: 0,
              commission_earned: 0,
              count: 0
            });
            acc[comm.commission_type].total_amount += comm.base_amount;
            acc[comm.commission_type].commission_earned += comm.commission_amount;
            acc[comm.commission_type].count += 1;
            return acc;
          }, {} as any),
          average_consultation_fee: appointments.length > 0 ?
            appointments.reduce((sum, apt) => sum + (apt.consultation_fee || 0), 0) / appointments.length : 0,
          highest_earning_day: Math.max(...generateTimeSeries(appointments, 'appointment_date', 'consultation_fee', 'daily').map(d => d.value))
        };
        break;

      case 'performance':
        const completionRate = appointments.length > 0 ?
          (appointments.filter(apt => apt.status === 'completed').length / appointments.length) * 100 : 0;
        
        const cancellationRate = appointments.length > 0 ?
          (appointments.filter(apt => apt.status === 'cancelled').length / appointments.length) * 100 : 0;

        analyticsData.performance_metrics = {
          completion_rate: Math.round(completionRate),
          cancellation_rate: Math.round(cancellationRate),
          average_rating: Math.round((analyticsData.summary.average_rating) * 10) / 10,
          review_rate: appointments.length > 0 ? 
            Math.round((reviews.length / appointments.length) * 100) : 0,
          response_time_analysis: {
            same_day_bookings: appointments.filter(apt => {
              const diffDays = Math.ceil((apt.appointment_date.getTime() - apt.created_at.getTime()) / (1000 * 60 * 60 * 24));
              return diffDays <= 1;
            }).length,
            advance_bookings: appointments.filter(apt => {
              const diffDays = Math.ceil((apt.appointment_date.getTime() - apt.created_at.getTime()) / (1000 * 60 * 60 * 24));
              return diffDays > 7;
            }).length
          },
          peak_hours: appointments.reduce((acc, apt) => {
            const hour = apt.appointment_date.getHours();
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
          }, {} as any)
        };
        break;

      case 'clients':
        const repeatClients = Array.from(
          appointments.reduce((acc, apt) => {
            acc.set(apt.user_id, (acc.get(apt.user_id) || 0) + 1);
            return acc;
          }, new Map())
        ).filter(([_, count]) => count > 1);

        analyticsData.client_insights = {
          total_unique_clients: new Set(appointments.map(apt => apt.user_id)).size,
          repeat_clients: repeatClients.length,
          client_retention_rate: appointments.length > 0 ? 
            Math.round((repeatClients.length / new Set(appointments.map(apt => apt.user_id)).size) * 100) : 0,
          client_demographics: {
            by_location: appointments.reduce((acc, apt) => {
              const location = apt.user.location || 'Unknown';
              acc[location] = (acc[location] || 0) + 1;
              return acc;
            }, {} as any),
            pet_demographics: [...appointments, ...healthIdVerifications].reduce((acc, item) => {
              if (item.dog) {
                const ageGroup = item.dog.age_months < 12 ? 'Puppy' :
                               item.dog.age_months < 84 ? 'Adult' : 'Senior';
                acc[ageGroup] = (acc[ageGroup] || 0) + 1;
              }
              return acc;
            }, {} as any)
          },
          client_lifetime_value: Array.from(
            appointments.reduce((acc, apt) => {
              const userId = apt.user_id;
              if (!acc.has(userId)) {
                acc.set(userId, { total_spent: 0, appointments: 0, first_visit: apt.appointment_date });
              }
              const client = acc.get(userId);
              client.total_spent += apt.consultation_fee || 0;
              client.appointments += 1;
              if (apt.appointment_date < client.first_visit) {
                client.first_visit = apt.appointment_date;
              }
              return acc;
            }, new Map()).values()
          )
        };
        break;
    }

    // Add benchmarking data (mock - in production, compare with similar partners)
    analyticsData.benchmarks = {
      industry_average_rating: 4.2,
      industry_completion_rate: 85,
      industry_cancellation_rate: 12,
      tier_average_revenue: partner.partnership_tier === 'enterprise' ? 50000 :
                           partner.partnership_tier === 'premium' ? 25000 : 12000,
      your_performance: analyticsData.summary.total_revenue > 
        (partner.partnership_tier === 'enterprise' ? 50000 :
         partner.partnership_tier === 'premium' ? 25000 : 12000) ? 'above_average' : 'below_average'
    };

    // Add growth recommendations
    analyticsData.recommendations = generateGrowthRecommendations(analyticsData, partner);

    return NextResponse.json({
      success: true,
      data: analyticsData,
      report_type: reportType,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Partner analytics error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while generating analytics'
    }, { status: 500 });
  }
}

// Helper function to generate growth recommendations
function generateGrowthRecommendations(data: any, partner: any): string[] {
  const recommendations = [];
  
  if (data.summary.average_rating < 4.0) {
    recommendations.push('Focus on improving service quality to increase your rating above 4.0');
  }
  
  if (data.summary.total_reviews < data.summary.total_appointments * 0.3) {
    recommendations.push('Encourage more clients to leave reviews - aim for 30% review rate');
  }
  
  if (partner.partnership_tier === 'basic' && data.summary.total_revenue > 15000) {
    recommendations.push('Consider upgrading to Premium tier for better commission rates');
  }
  
  if (data.breakdowns?.appointments_by_status?.cancelled > data.summary.total_appointments * 0.15) {
    recommendations.push('High cancellation rate detected - review your booking policies');
  }
  
  if (data.client_insights?.repeat_clients < data.client_insights?.total_unique_clients * 0.2) {
    recommendations.push('Focus on client retention strategies to increase repeat business');
  }
  
  if (data.summary.health_id_verifications === 0) {
    recommendations.push('Start offering Health ID verification services to increase revenue');
  }
  
  return recommendations.length > 0 ? recommendations : 
    ['Great job! Your performance metrics are strong. Keep up the excellent work.'];
}