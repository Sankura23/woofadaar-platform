import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// POST /api/appointments/enhanced - Book enhanced vet appointment with Dog ID integration
export async function POST(request: NextRequest) {
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

    // Extract booking details
    const {
      dogId,
      partnerId,
      appointmentDate,
      appointmentType = 'consultation',
      reasonForVisit,
      symptoms = [],
      urgencyLevel = 'normal',
      meetingType = 'in_person',
      meetingLink,
      consultationFee,
      durationMinutes = 60,
      autoLoadMedicalHistory = true
    } = await request.json();

    // Validate required fields
    if (!dogId || !partnerId || !appointmentDate || !reasonForVisit) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: dogId, partnerId, appointmentDate, reasonForVisit'
      }, { status: 400 });
    }

    const userId = decoded.userId;

    // Verify dog exists and belongs to user
    const dog = await prisma.dog.findFirst({
      where: {
        OR: [
          { id: dogId },
          { health_id: dogId }
        ],
        user_id: userId
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!dog) {
      return NextResponse.json({
        success: false,
        error: 'Dog not found or access denied'
      }, { status: 404 });
    }

    // Verify partner exists and is available
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        name: true,
        partner_type: true,
        verified: true,
        status: true,
        dog_id_access_level: true,
        consultation_fee_range: true,
        business_hours: true
      }
    });

    if (!partner) {
      return NextResponse.json({
        success: false,
        error: 'Partner not found'
      }, { status: 404 });
    }

    if (!partner.verified || partner.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: 'Partner is not verified or active'
      }, { status: 403 });
    }

    // Check for conflicting appointments
    const conflictingAppointment = await prisma.vetAppointmentEnhanced.findFirst({
      where: {
        partner_id: partnerId,
        status: { in: ['scheduled', 'confirmed', 'in_progress'] },
        appointment_date: {
          gte: new Date(new Date(appointmentDate).getTime() - 30 * 60 * 1000), // 30 mins before
          lte: new Date(new Date(appointmentDate).getTime() + (durationMinutes + 30) * 60 * 1000) // appointment duration + 30 mins after
        }
      }
    });

    if (conflictingAppointment) {
      return NextResponse.json({
        success: false,
        error: 'Partner is not available at the requested time'
      }, { status: 409 });
    }

    // Check/Create Dog ID verification for appointment
    let dogIdVerified = false;
    let dogIdAccessGranted = null;
    let medicalHistoryLoaded = false;

    if (autoLoadMedicalHistory && partner.dog_id_access_level !== 'basic') {
      // Create or update Dog ID verification for this appointment
      const verification = await prisma.partnerDogVerification.upsert({
        where: {
          partner_id_dog_id: {
            partner_id: partnerId,
            dog_id: dog.id
          }
        },
        update: {
          verification_type: 'appointment_only',
          last_accessed: new Date(),
          access_count: { increment: 1 },
          verification_notes: `Appointment booking: ${reasonForVisit}`,
          updated_at: new Date()
        },
        create: {
          partner_id: partnerId,
          dog_id: dog.id,
          verification_type: 'appointment_only',
          access_level: partner.dog_id_access_level || 'read_only',
          granted_by: userId,
          verification_method: 'appointment_booking',
          verification_notes: `Auto-granted for appointment: ${reasonForVisit}`,
          permissions: {
            medical_records: true,
            appointment_access: true,
            emergency_contact: true
          },
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      });

      dogIdVerified = true;
      dogIdAccessGranted = new Date();
      medicalHistoryLoaded = true;
    }

    // Create enhanced vet appointment
    const appointment = await prisma.vetAppointmentEnhanced.create({
      data: {
        dog_id: dog.id,
        partner_id: partnerId,
        user_id: userId,
        appointment_date: new Date(appointmentDate),
        appointment_type: appointmentType,
        reason_for_visit: reasonForVisit,
        symptoms: symptoms,
        urgency_level: urgencyLevel,
        duration_minutes: durationMinutes,
        consultation_fee: consultationFee,
        meeting_type: meetingType,
        meeting_link: meetingLink,
        dog_id_verified: dogIdVerified,
        dog_id_access_granted: dogIdAccessGranted,
        medical_history_loaded: medicalHistoryLoaded,
        status: 'scheduled'
      },
      include: {
        dog: {
          select: {
            id: true,
            name: true,
            breed: true,
            health_id: true,
            age_months: true,
            weight_kg: true,
            photo_url: true
          }
        },
        partner: {
          select: {
            id: true,
            name: true,
            partner_type: true,
            phone: true,
            address: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    // Log appointment booking in analytics
    await prisma.partnerAnalytics.upsert({
      where: {
        partner_id_date: {
          partner_id: partnerId,
          date: new Date().toISOString().split('T')[0]
        }
      },
      update: {
        total_appointments: { increment: 1 },
        total_revenue: { increment: consultationFee || 0 },
        metric_value: { increment: 1 }
      },
      create: {
        partner_id: partnerId,
        metric_type: 'appointments_booked',
        metric_value: 1,
        date: new Date().toISOString().split('T')[0],
        total_appointments: 1,
        total_revenue: consultationFee || 0,
        metric_data: {
          appointment_type: appointmentType,
          urgency_level: urgencyLevel,
          dog_id_integrated: dogIdVerified
        }
      }
    });

    // Create partner notification
    await prisma.partnerNotification.create({
      data: {
        partner_id: partnerId,
        notification_type: 'new_appointment',
        title: 'New Appointment Booked',
        message: `New ${appointmentType} appointment for ${dog.name} on ${new Date(appointmentDate).toLocaleDateString()}`,
        action_url: `/partner/appointments/${appointment.id}`,
        priority: urgencyLevel === 'emergency' ? 'urgent' : 
                 urgencyLevel === 'high' ? 'high' : 'normal'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Enhanced appointment booked successfully',
      data: {
        appointment,
        dogIdIntegration: {
          verified: dogIdVerified,
          accessGranted: dogIdAccessGranted,
          medicalHistoryLoaded: medicalHistoryLoaded
        }
      }
    });

  } catch (error) {
    console.error('Enhanced appointment booking error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to book enhanced appointment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// GET /api/appointments/enhanced - Get enhanced appointments with Dog ID data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partnerId');
    const userId = searchParams.get('userId');
    const dogId = searchParams.get('dogId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const whereClause: any = {};

    if (partnerId) whereClause.partner_id = partnerId;
    if (userId) whereClause.user_id = userId;
    if (dogId) {
      whereClause.OR = [
        { dog_id: dogId },
        { dog: { health_id: dogId } }
      ];
    }
    if (status) whereClause.status = status;

    // Get appointments with full relations
    const [appointments, total] = await Promise.all([
      prisma.vetAppointmentEnhanced.findMany({
        where: whereClause,
        include: {
          dog: {
            select: {
              id: true,
              name: true,
              breed: true,
              health_id: true,
              age_months: true,
              weight_kg: true,
              photo_url: true,
              vaccination_status: true,
              emergency_contact: true,
              emergency_phone: true
            }
          },
          partner: {
            select: {
              id: true,
              name: true,
              partner_type: true,
              phone: true,
              address: true,
              business_hours: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              location: true
            }
          }
        },
        orderBy: { appointment_date: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.vetAppointmentEnhanced.count({
        where: whereClause
      })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        appointments,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });

  } catch (error) {
    console.error('Get enhanced appointments error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch enhanced appointments'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}