import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// GET /api/partners/analytics/enhanced - Get comprehensive partner analytics
export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const partnerId = decoded.partnerId;
    if (!partnerId) {
      return NextResponse.json(
        { error: 'Partner ID not found in token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7'; // days
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Calculate date range
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

    // Verify partner exists
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        name: true,
        partner_type: true,
        verified: true,
        status: true
      }
    });

    if (!partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    // Get analytics data in parallel
    const [
      dogIdVerifications,
      appointments,
      medicalRecords,
      emergencyAccesses,
      analytics,
      recentActivity,
      performanceMetrics
    ] = await Promise.all([
      // Dog ID Verifications
      prisma.partnerDogVerification.findMany({
        where: {
          partner_id: partnerId,
          created_at: { gte: start, lte: end }
        },
        include: {
          dog: {
            select: {
              name: true,
              breed: true,
              User: { select: { location: true } }
            }
          }
        }
      }),

      // Enhanced Appointments
      prisma.vetAppointmentEnhanced.findMany({
        where: {
          partner_id: partnerId,
          created_at: { gte: start, lte: end }
        },
        include: {
          dog: {
            select: {
              name: true,
              breed: true
            }
          }
        }
      }),

      // Medical Records Created
      prisma.medicalRecordEnhanced.findMany({
        where: {
          partner_id: partnerId,
          created_at: { gte: start, lte: end }
        },
        select: {
          id: true,
          record_type: true,
          is_emergency_accessible: true,
          created_at: true,
          dog: {
            select: {
              name: true
            }
          }
        }
      }),

      // Emergency Accesses
      prisma.dogIdVerification.findMany({
        where: {
          partner_id: partnerId,
          verification_type: 'emergency',
          verified_at: { gte: start, lte: end }
        }
      }),

      // Partner Analytics Records
      prisma.partnerAnalytics.findMany({
        where: {
          partner_id: partnerId,
          date: {
            gte: start.toISOString().split('T')[0],
            lte: end.toISOString().split('T')[0]
          }
        },
        orderBy: { date: 'asc' }
      }),

      // Recent Activity (last 10 activities)
      prisma.dogIdVerification.findMany({
        where: { partner_id: partnerId },
        include: {
          dog: {
            select: {
              name: true,
              breed: true,
              User: { select: { name: true, location: true } }
            }
          }
        },
        orderBy: { verified_at: 'desc' },
        take: 10
      }),

      // Performance Metrics
      prisma.securityAuditLog.findMany({
        where: {
          partner_id: partnerId,
          created_at: { gte: start, lte: end },
          action_type: 'dog_id_access'
        }
      })
    ]);

    // Process analytics data
    const analyticsData = {
      overview: {
        total_verifications: dogIdVerifications.length,
        total_appointments: appointments.length,
        total_medical_records: medicalRecords.length,
        emergency_accesses: emergencyAccesses.length,
        success_rate: performanceMetrics.length > 0 
          ? (performanceMetrics.filter(m => m.success).length / performanceMetrics.length * 100)
          : 100,
        total_revenue: appointments.reduce((sum, apt) => sum + (apt.consultation_fee || 0), 0)
      },

      daily_stats: [] as any[],

      verification_breakdown: {
        by_type: {} as Record<string, number>,
        by_access_level: {} as Record<string, number>,
        by_location: {} as Record<string, number>
      },

      appointment_analytics: {
        by_type: {} as Record<string, number>,
        by_urgency: {} as Record<string, number>,
        by_status: {} as Record<string, number>,
        avg_duration: appointments.length > 0 
          ? appointments.reduce((sum, apt) => sum + apt.duration_minutes, 0) / appointments.length
          : 0,
        dog_id_integration_rate: appointments.length > 0
          ? (appointments.filter(apt => apt.dog_id_verified).length / appointments.length * 100)
          : 0
      },

      medical_records_analytics: {
        by_type: {} as Record<string, number>,
        emergency_accessible_count: medicalRecords.filter(r => r.is_emergency_accessible).length,
        total_created: medicalRecords.length
      },

      performance_metrics: {
        avg_response_time: null as number | null,
        peak_hours: {} as Record<string, number>,
        geographical_reach: new Set<string>(),
        customer_satisfaction: null as number | null
      },

      recent_activity: recentActivity.map(activity => ({
        id: activity.id,
        type: 'dog_id_verification',
        dog_name: activity.dog.name,
        dog_breed: activity.dog.breed,
        owner_name: activity.dog.User.name,
        owner_location: activity.dog.User.location,
        verification_type: activity.verification_type,
        timestamp: activity.verified_at,
        access_reason: activity.access_reason
      }))
    };

    // Generate daily statistics
    const daysBetween = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    for (let i = 0; i < daysBetween; i++) {
      const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayVerifications = dogIdVerifications.filter(v => 
        v.created_at.toISOString().split('T')[0] === dateStr
      );
      const dayAppointments = appointments.filter(a => 
        a.created_at.toISOString().split('T')[0] === dateStr
      );
      
      analyticsData.daily_stats.push({
        date: dateStr,
        verifications: dayVerifications.length,
        appointments: dayAppointments.length,
        revenue: dayAppointments.reduce((sum, apt) => sum + (apt.consultation_fee || 0), 0),
        unique_dogs: new Set([...dayVerifications.map(v => v.dog_id), ...dayAppointments.map(a => a.dog_id)]).size
      });
    }

    // Process verification breakdown
    dogIdVerifications.forEach(verification => {
      // By type
      const type = verification.verification_type;
      analyticsData.verification_breakdown.by_type[type] = 
        (analyticsData.verification_breakdown.by_type[type] || 0) + 1;

      // By access level
      const accessLevel = verification.access_level;
      analyticsData.verification_breakdown.by_access_level[accessLevel] = 
        (analyticsData.verification_breakdown.by_access_level[accessLevel] || 0) + 1;

      // By location
      const location = verification.dog.User?.location || 'Unknown';
      analyticsData.verification_breakdown.by_location[location] = 
        (analyticsData.verification_breakdown.by_location[location] || 0) + 1;

      // Add to geographical reach
      if (location !== 'Unknown') {
        analyticsData.performance_metrics.geographical_reach.add(location);
      }
    });

    // Process appointment analytics
    appointments.forEach(appointment => {
      // By type
      const type = appointment.appointment_type;
      analyticsData.appointment_analytics.by_type[type] = 
        (analyticsData.appointment_analytics.by_type[type] || 0) + 1;

      // By urgency
      const urgency = appointment.urgency_level;
      analyticsData.appointment_analytics.by_urgency[urgency] = 
        (analyticsData.appointment_analytics.by_urgency[urgency] || 0) + 1;

      // By status
      const status = appointment.status;
      analyticsData.appointment_analytics.by_status[status] = 
        (analyticsData.appointment_analytics.by_status[status] || 0) + 1;

      // Peak hours analysis
      const hour = new Date(appointment.appointment_date).getHours();
      analyticsData.performance_metrics.peak_hours[hour] = 
        (analyticsData.performance_metrics.peak_hours[hour] || 0) + 1;
    });

    // Process medical records analytics
    medicalRecords.forEach(record => {
      const type = record.record_type;
      analyticsData.medical_records_analytics.by_type[type] = 
        (analyticsData.medical_records_analytics.by_type[type] || 0) + 1;
    });

    // Calculate performance metrics
    analyticsData.performance_metrics.geographical_reach = 
      Array.from(analyticsData.performance_metrics.geographical_reach);

    // Get aggregated analytics from database
    const aggregatedAnalytics = analytics.reduce((acc, record) => {
      acc.total_revenue += record.total_revenue;
      acc.total_appointments += record.total_appointments;
      acc.total_verifications += record.total_dog_ids_verified;
      
      if (record.avg_response_time) {
        acc.response_times.push(record.avg_response_time);
      }
      
      if (record.customer_satisfaction) {
        acc.satisfaction_scores.push(record.customer_satisfaction);
      }
      
      return acc;
    }, {
      total_revenue: 0,
      total_appointments: 0,
      total_verifications: 0,
      response_times: [] as number[],
      satisfaction_scores: [] as number[]
    });

    // Calculate averages
    if (aggregatedAnalytics.response_times.length > 0) {
      analyticsData.performance_metrics.avg_response_time = 
        aggregatedAnalytics.response_times.reduce((a, b) => a + b, 0) / 
        aggregatedAnalytics.response_times.length;
    }

    if (aggregatedAnalytics.satisfaction_scores.length > 0) {
      analyticsData.performance_metrics.customer_satisfaction = 
        aggregatedAnalytics.satisfaction_scores.reduce((a, b) => a + b, 0) / 
        aggregatedAnalytics.satisfaction_scores.length;
    }

    // Generate insights and recommendations
    const insights = [];

    if (analyticsData.overview.success_rate < 95) {
      insights.push({
        type: 'warning',
        title: 'Low Success Rate',
        message: `Your verification success rate is ${analyticsData.overview.success_rate.toFixed(1)}%. Consider reviewing common failure reasons.`,
        action: 'Review recent failed attempts in audit logs'
      });
    }

    if (analyticsData.appointment_analytics.dog_id_integration_rate < 80) {
      insights.push({
        type: 'suggestion',
        title: 'Improve Dog ID Integration',
        message: `Only ${analyticsData.appointment_analytics.dog_id_integration_rate.toFixed(1)}% of appointments use Dog ID verification. This could improve efficiency.`,
        action: 'Enable automatic Dog ID verification for appointments'
      });
    }

    if (analyticsData.overview.emergency_accesses > 0) {
      insights.push({
        type: 'info',
        title: 'Emergency Accesses',
        message: `You've handled ${analyticsData.overview.emergency_accesses} emergency cases this period.`,
        action: 'Review emergency response protocols'
      });
    }

    const topPerformingHour = Object.entries(analyticsData.performance_metrics.peak_hours)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topPerformingHour) {
      insights.push({
        type: 'info',
        title: 'Peak Activity Hour',
        message: `Your busiest hour is ${topPerformingHour[0]}:00 with ${topPerformingHour[1]} appointments.`,
        action: 'Consider adjusting availability during peak hours'
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        partner: {
          id: partner.id,
          name: partner.name,
          type: partner.partner_type
        },
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
          days: daysBetween
        },
        analytics: analyticsData,
        insights,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Enhanced partner analytics error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// POST /api/partners/analytics/enhanced - Update analytics metrics
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const partnerId = decoded.partnerId;
    if (!partnerId) {
      return NextResponse.json(
        { error: 'Partner ID not found in token' },
        { status: 401 }
      );
    }

    const {
      metricType,
      metricValue,
      metricData = {},
      customerSatisfaction,
      responseTime,
      date = new Date().toISOString().split('T')[0]
    } = await request.json();

    if (!metricType || metricValue === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Metric type and value are required'
      }, { status: 400 });
    }

    // Update or create analytics record
    const analytics = await prisma.partnerAnalytics.upsert({
      where: {
        partner_id_date: {
          partner_id: partnerId,
          date: date
        }
      },
      update: {
        metric_value: { increment: metricValue },
        metric_data: metricData,
        avg_response_time: responseTime || undefined,
        customer_satisfaction: customerSatisfaction || undefined,
        updated_at: new Date()
      },
      create: {
        partner_id: partnerId,
        metric_type: metricType,
        metric_value: metricValue,
        date: date,
        metric_data: metricData,
        avg_response_time: responseTime,
        customer_satisfaction: customerSatisfaction
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Analytics updated successfully',
      data: analytics
    });

  } catch (error) {
    console.error('Update analytics error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update analytics'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}