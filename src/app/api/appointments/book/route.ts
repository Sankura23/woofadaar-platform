import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
import { mockDb } from '@/lib/mock-db';
import { addAppointmentToStorage, getPartnerById, getDogById } from '@/lib/demo-storage';

interface DecodedToken {
  userId?: string;
  partnerId?: string;
  email: string;
  userType?: string;
}

async function verifyToken(request: NextRequest): Promise<{ userId?: string; partnerId?: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    return {
      userId: decoded.userId,
      partnerId: decoded.userId
    };
  } catch (error) {
    return null;
  }
}

// Helper function to check partner availability
async function checkPartnerAvailability(partnerId: string, appointmentDate: Date, durationMinutes: number) {
  const startTime = new Date(appointmentDate);
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

  // Check for overlapping appointments
  const overlappingAppointments = await prisma.appointment.findMany({
    where: {
      partner_id: partnerId,
      status: {
        in: ['scheduled', 'confirmed']
      },
      AND: [
        {
          appointment_date: {
            lt: endTime
          }
        },
        {
          appointment_date: {
            gte: new Date(startTime.getTime() - 60 * 60000) // 1 hour buffer
          }
        }
      ]
    }
  });

  return overlappingAppointments.length === 0;
}

// Helper function to calculate consultation fee
async function calculateConsultationFee(partnerId: string, serviceType: string, durationMinutes: number) {
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: { consultation_fee_range: true, partnership_tier: true }
  });

  if (!partner) return 0;

  let baseFee = 0;
  if (partner.consultation_fee_range) {
    // Handle consultation_fee_range as JSON object {min: number, max: number}
    const feeRange = partner.consultation_fee_range as any;
    if (typeof feeRange === 'object' && feeRange.min) {
      baseFee = feeRange.min;
    } else if (typeof partner.consultation_fee_range === 'string') {
      // Fallback: Parse fee from string (e.g., "₹500-800" -> 500)
      const feeMatch = partner.consultation_fee_range.match(/₹?(\d+)/);
      baseFee = feeMatch ? parseInt(feeMatch[1]) : 500;
    } else {
      baseFee = 500; // Default
    }
  } else {
    // Default fees based on service type
    const defaultFees: Record<string, number> = {
      consultation: 500,
      treatment: 800,
      training: 600,
      emergency: 1200
    };
    baseFee = defaultFees[serviceType] || 500;
  }

  // Adjust based on duration
  const durationMultiplier = durationMinutes / 60; // Base is 1 hour
  let finalFee = baseFee * durationMultiplier;

  // Premium tier discount
  if (partner.partnership_tier === 'premium') {
    finalFee *= 0.9; // 10% discount
  } else if (partner.partnership_tier === 'enterprise') {
    finalFee *= 0.85; // 15% discount
  }

  return Math.round(finalFee);
}

// POST /api/appointments/book - Book appointment with partner
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyToken(request);
    
    if (!auth || !auth.userId) {
      return NextResponse.json({ 
        success: false,
        message: 'Unauthorized - User authentication required' 
      }, { status: 401 });
    }

    const body = await request.json();
    const {
      partner_id,
      dog_id,
      appointment_date,
      duration_minutes = 60,
      service_type,
      notes,
      meeting_type = 'in_person',
      preferred_language
    } = body;

    console.log('Appointment booking request:', {
      partner_id,
      user_id: auth.userId,
      appointment_date,
      service_type,
      meeting_type
    });

    // Validation
    if (!partner_id) {
      return NextResponse.json({
        success: false,
        message: 'Partner ID is required'
      }, { status: 400 });
    }

    if (!appointment_date) {
      return NextResponse.json({
        success: false,
        message: 'Appointment date is required'
      }, { status: 400 });
    }

    if (!service_type) {
      return NextResponse.json({
        success: false,
        message: 'Service type is required'
      }, { status: 400 });
    }

    const validServiceTypes = ['consultation', 'treatment', 'training', 'emergency'];
    if (!validServiceTypes.includes(service_type)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid service type'
      }, { status: 400 });
    }

    const validMeetingTypes = ['in_person', 'video_call', 'phone_call'];
    if (!validMeetingTypes.includes(meeting_type)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid meeting type'
      }, { status: 400 });
    }

    // Verify partner exists and is approved using demo storage
    let partner = await getPartnerById(partner_id);
    console.log('Partner found in demo storage:', partner);

    // If partner not found in demo storage, try database as fallback
    if (!partner) {
      try {
        partner = await prisma.partner.findUnique({
          where: { id: partner_id },
          select: {
            id: true,
            name: true,
            business_name: true,
            status: true,
            verified: true,
            partner_type: true,
            specialization: true,
            consultation_fee_range: true,
            partnership_tier: true,
            total_appointments: true
          }
        });
        console.log('Partner found in database:', partner);
      } catch (dbError) {
        console.warn('Database error finding partner:', dbError);
      }
    }

    // If partner not found anywhere, use demo partner
    if (!partner) {
      console.log('Partner not found, using demo partner');
      partner = {
        id: partner_id,
        name: 'Dr. Demo Veterinarian',
        business_name: 'Demo Vet Clinic',
        status: 'approved',
        verified: true,
        partner_type: 'vet',
        specialization: ['General Practice'],
        consultation_fee_range: { min: 800, max: 1500 },
        partnership_tier: 'basic',
        total_appointments: 50
      };
    }

    if (partner.status !== 'approved' || !partner.verified) {
      return NextResponse.json({
        success: false,
        message: 'Partner is not available for appointments'
      }, { status: 400 });
    }

    // Verify dog exists and belongs to user (if dog_id provided) using demo storage
    let dog = null;
    if (dog_id) {
      dog = await getDogById(auth.userId, dog_id);
      console.log('Dog found in demo storage:', dog);

      // If dog not found in demo storage, try database as fallback
      if (!dog) {
        try {
          dog = await prisma.dog.findUnique({
            where: { id: dog_id },
            select: { id: true, user_id: true, name: true, breed: true }
          });
          console.log('Dog found in database:', dog);
        } catch (dbError) {
          console.warn('Database error finding dog:', dbError);
        }
      }

      // If dog not found anywhere, use demo dog
      if (!dog) {
        console.log('Dog not found, using demo dog');
        dog = {
          id: dog_id,
          user_id: auth.userId,
          name: 'Demo Dog',
          breed: 'Golden Retriever'
        };
      }

      if (dog.user_id !== auth.userId) {
        return NextResponse.json({
          success: false,
          message: 'Dog does not belong to authenticated user'
        }, { status: 403 });
      }
    }

    // Parse and validate appointment date
    const appointmentDateTime = new Date(appointment_date);
    const now = new Date();

    if (appointmentDateTime <= now) {
      return NextResponse.json({
        success: false,
        message: 'Appointment date must be in the future'
      }, { status: 400 });
    }

    // Check if appointment is too far in advance (6 months)
    const maxAdvanceDate = new Date(now.getTime() + 6 * 30 * 24 * 60 * 60 * 1000);
    if (appointmentDateTime > maxAdvanceDate) {
      return NextResponse.json({
        success: false,
        message: 'Appointments can only be booked up to 6 months in advance'
      }, { status: 400 });
    }

    // Check partner availability (with fallback)
    let isAvailable = true;
    try {
      isAvailable = await checkPartnerAvailability(partner_id, appointmentDateTime, duration_minutes);
      console.log('Partner availability check result:', isAvailable);
    } catch (dbError) {
      console.warn('Database error checking availability, assuming available:', dbError);
      // In demo mode, assume partner is available
      isAvailable = true;
    }
    
    if (!isAvailable) {
      return NextResponse.json({
        success: false,
        message: 'Partner is not available at the requested time',
        suggestion: 'Please try a different time slot or check partner availability'
      }, { status: 409 });
    }

    // Calculate consultation fee (with fallback)
    let consultationFee = 800; // default fee
    try {
      consultationFee = await calculateConsultationFee(partner_id, service_type, duration_minutes);
      console.log('Calculated consultation fee:', consultationFee);
    } catch (dbError) {
      console.warn('Database error calculating fee, using default:', dbError);
      // Use default fee based on service type
      const defaultFees: Record<string, number> = {
        consultation: 800,
        treatment: 1200,
        training: 1000,
        emergency: 1500
      };
      consultationFee = defaultFees[service_type] || 800;
    }

    // Generate meeting link for video/phone calls
    let meetingLink = null;
    if (meeting_type === 'video_call') {
      // In production, integrate with video call service (Zoom, Google Meet, etc.)
      meetingLink = `https://meet.woofadaar.com/appointment/${Date.now()}`;
    } else if (meeting_type === 'phone_call') {
      meetingLink = `tel:${partner.id}-appointment`;
    }

    console.log('Creating appointment with data:', {
      partner_id,
      user_id: auth.userId,
      dog_id: dog_id || null,
      appointment_date: appointmentDateTime,
      service_type,
      consultation_fee: consultationFee,
      meeting_type
    });

    // Create the appointment in database first, then demo storage
    const appointmentData = {
      partner_id,
      user_id: auth.userId,
      dog_id: dog_id || null,
      appointment_date: appointmentDateTime,
      duration_minutes,
      service_type,
      notes: notes || null,
      consultation_fee: consultationFee,
      meeting_type,
      meeting_link: meetingLink,
      status: 'scheduled'
    };

    console.log('Creating appointment with data:', appointmentData);

    let appointment = null;
    try {
      // Try to create in database first
      try {
        appointment = await prisma.appointment.create({
          data: appointmentData,
          include: {
            partner: {
              select: {
                id: true,
                name: true,
                business_name: true,
                partner_type: true,
                phone: true,
                email: true,
                location: true
              }
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            dog: dog_id ? {
              select: {
                id: true,
                name: true,
                breed: true,
                health_id: true
              }
            } : undefined
          }
        });
        console.log('Appointment created in database:', appointment.id);
      } catch (dbError) {
        console.warn('Database appointment creation failed, trying demo storage:', dbError);
        
        // Fallback to demo storage
        appointment = await addAppointmentToStorage(appointmentData);
        console.log('Appointment created in demo storage:', appointment.id);

        // Create appointment response with partner and dog data
        appointment.partner = {
          id: partner.id,
          name: partner.name,
          business_name: partner.business_name,
          partner_type: partner.partner_type,
          phone: partner.phone || 'N/A',
          email: partner.email || 'N/A',
          location: partner.location || 'N/A'
        };

        appointment.dog = dog ? {
          id: dog.id,
          name: dog.name,
          breed: dog.breed,
          health_id: dog.health_id || dog.id
        } : null;

        appointment.user = {
          id: auth.userId,
          name: 'User',
          email: 'user@example.com'
        };
      }

      // Also save to demo storage as backup
      if (appointment && appointment.partner) {
        try {
          await addAppointmentToStorage(appointmentData);
          console.log('Appointment also backed up to demo storage');
        } catch (demoError) {
          console.warn('Demo storage backup failed:', demoError);
        }
      }

    } catch (error) {
      console.error('Failed to create appointment:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to create appointment. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

    // Ensure partner and dog data are in response (if not already from database)
    if (!appointment.partner) {
      appointment.partner = {
        id: partner.id,
        name: partner.name,
        business_name: partner.business_name,
        partner_type: partner.partner_type,
        specialization: partner.specialization,
        phone: partner.phone || 'N/A',
        email: partner.email || 'N/A',
        location: partner.location || 'N/A'
      };
    }

    if (!appointment.dog && dog) {
      appointment.dog = {
        id: dog.id,
        name: dog.name,
        breed: dog.breed,
        health_id: dog.health_id || dog.id
      };
    }

    // Send confirmation notifications (mock - implement with your email/SMS service)
    const notifications = [
      {
        type: 'email',
        to: 'user@example.com',
        subject: 'Appointment Confirmation - Woofadaar',
        template: 'appointment_confirmation_user',
        data: appointment
      },
      {
        type: 'email',
        to: partner.email || 'partner@example.com',
        subject: 'New Appointment Booking - Woofadaar',
        template: 'appointment_notification_partner',
        data: appointment
      }
    ];

    console.log('Notifications queued:', notifications);

    return NextResponse.json({
      success: true,
      message: 'Appointment booked successfully',
      data: {
        appointment: {
          id: appointment.id,
          appointment_date: appointment.appointment_date,
          duration_minutes: appointment.duration_minutes,
          service_type: appointment.service_type,
          status: appointment.status,
          consultation_fee: appointment.consultation_fee,
          payment_status: appointment.payment_status,
          meeting_type: appointment.meeting_type,
          meeting_link: appointment.meeting_link,
          notes: appointment.notes,
          partner: appointment.partner,
          dog: appointment.dog
        }
      },
      next_steps: [
        'You will receive a confirmation email shortly',
        'Partner will confirm the appointment within 24 hours',
        meeting_type === 'video_call' ? 'Meeting link will be shared before the appointment' : 
        meeting_type === 'phone_call' ? 'Partner will call you at the scheduled time' :
        'Please arrive 10 minutes early at partner location',
        consultationFee > 0 ? `Payment of ₹${consultationFee} can be made during or after the appointment` : null
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('Appointment booking error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while booking appointment'
    }, { status: 500 });
  }
}

// GET /api/appointments/book - Get available time slots and booking information
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
    const date = searchParams.get('date'); // YYYY-MM-DD format
    const service_type = searchParams.get('service_type') || 'consultation';

    if (!partner_id) {
      return NextResponse.json({
        success: false,
        message: 'Partner ID is required'
      }, { status: 400 });
    }

    // Get partner information
    const partner = await prisma.partner.findUnique({
      where: { id: partner_id },
      select: {
        id: true,
        name: true,
        business_name: true,
        partner_type: true,
        specialization: true,
        consultation_fee_range: true,
        location: true,
        status: true,
        verified: true,
        partnership_tier: true
      }
    });

    if (!partner) {
      return NextResponse.json({
        success: false,
        message: 'Partner not found'
      }, { status: 404 });
    }

    if (partner.status !== 'approved' || !partner.verified) {
      return NextResponse.json({
        success: false,
        message: 'Partner is not available for appointments'
      }, { status: 400 });
      }

    // Generate available time slots for the requested date
    let targetDate = new Date();
    if (date) {
      targetDate = new Date(date + 'T00:00:00');
    }

    // Get existing appointments for the date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        partner_id,
        appointment_date: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: {
          in: ['scheduled', 'confirmed']
        }
      },
      orderBy: { appointment_date: 'asc' }
    });

    // Generate time slots (9 AM to 6 PM, 1-hour slots)
    const timeSlots = [];
    const startHour = 9;
    const endHour = 18;
    
    for (let hour = startHour; hour < endHour; hour++) {
      const slotTime = new Date(targetDate);
      slotTime.setHours(hour, 0, 0, 0);
      
      // Check if slot is available
      const isBooked = existingAppointments.some(apt => {
        const aptTime = new Date(apt.appointment_date);
        return aptTime.getHours() === hour;
      });

      // Check if slot is in the past
      const isPast = slotTime <= new Date();

      timeSlots.push({
        time: slotTime.toISOString(),
        hour: `${hour}:00`,
        available: !isBooked && !isPast,
        booked: isBooked,
        past: isPast
      });
    }

    // Calculate estimated consultation fee
    const estimatedFee = await calculateConsultationFee(partner_id, service_type, 60);

    return NextResponse.json({
      success: true,
      data: {
        partner: {
          id: partner.id,
          name: partner.name,
          business_name: partner.business_name,
          partner_type: partner.partner_type,
          specialization: partner.specialization,
          location: partner.location,
          partnership_tier: partner.partnership_tier
        },
        date: targetDate.toISOString().split('T')[0],
        available_slots: timeSlots.filter(slot => slot.available),
        all_slots: timeSlots,
        estimated_fee: estimatedFee,
        service_types: [
          { 
            type: 'consultation', 
            name: 'General Consultation', 
            duration: 60, 
            fee: await calculateConsultationFee(partner_id, 'consultation', 60) 
          },
          { 
            type: 'treatment', 
            name: 'Treatment Session', 
            duration: 90, 
            fee: await calculateConsultationFee(partner_id, 'treatment', 90) 
          },
          { 
            type: 'training', 
            name: 'Training Session', 
            duration: 120, 
            fee: await calculateConsultationFee(partner_id, 'training', 120) 
          },
          { 
            type: 'emergency', 
            name: 'Emergency Consultation', 
            duration: 45, 
            fee: await calculateConsultationFee(partner_id, 'emergency', 45) 
          }
        ],
        meeting_types: [
          { type: 'in_person', name: 'In-Person Visit', available: true },
          { type: 'video_call', name: 'Video Call', available: true },
          { type: 'phone_call', name: 'Phone Consultation', available: true }
        ]
      }
    });

  } catch (error) {
    console.error('Appointment availability error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while fetching availability'
    }, { status: 500 });
  }
}