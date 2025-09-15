import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// SIMPLE WORKING APPOINTMENTS API - NO DATABASE DEPENDENCIES

// In-memory storage for demo appointments (resets on server restart)
let demoAppointmentsStorage: Record<string, any[]> = {};

interface DecodedToken {
  userId?: string;
  partnerId?: string;
  email: string;
  userType?: string;
}

async function verifyToken(request: NextRequest): Promise<{ userId?: string; partnerId?: string; userType?: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
  
  try {
    const decoded = jwt.verify(token, jwtSecret) as DecodedToken;
    return {
      userId: decoded.userId,
      partnerId: decoded.partnerId,
      userType: decoded.userType
    };
  } catch (error) {
    return null;
  }
}

// POST /api/auth/working-appointments - Book appointment with partner
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyToken(request);
    
    if (!auth || !auth.userId || auth.userType !== 'pet-parent') {
      return NextResponse.json({ 
        success: false,
        message: 'Unauthorized - Pet parent authentication required' 
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

    // Demo partner data
    const demoPartner = {
      id: partner_id,
      name: 'Dr. Demo Veterinarian',
      business_name: 'Demo Vet Clinic',
      partner_type: 'vet',
      specialization: ['General Practice'],
      phone: '+91 9876543210',
      email: 'demo@vet.com',
      location: 'Mumbai, Maharashtra'
    };

    // Demo user data
    const demoUser = {
      id: auth.userId,
      name: auth.userId === 'user-sanket-123' ? 'Sanket' : 'Demo User',
      email: auth.userId === 'user-sanket-123' ? 'c@s.com' : 'demo@user.com'
    };

    // Demo dog data if provided
    let demoDog = null;
    if (dog_id) {
      demoDog = {
        id: dog_id,
        name: 'Demo Dog',
        breed: 'Golden Retriever',
        health_id: 'WOFDEGOL240815'
      };
    }

    // Calculate consultation fee
    const defaultFees: Record<string, number> = {
      consultation: 800,
      treatment: 1200,
      training: 1000,
      emergency: 1500
    };
    const consultationFee = defaultFees[service_type] || 800;

    // Generate meeting link for video/phone calls
    let meetingLink = null;
    if (meeting_type === 'video_call') {
      meetingLink = `https://meet.woofadaar.com/appointment/${Date.now()}`;
    } else if (meeting_type === 'phone_call') {
      meetingLink = `tel:+91-9876543210`;
    }

    // Create the appointment
    const appointmentId = `apt-${Date.now()}-${auth.userId}`;
    const appointment = {
      id: appointmentId,
      partner_id,
      partner_name: demoPartner.name,
      user_id: auth.userId,
      dog_id: dog_id || null,
      appointment_date: appointmentDateTime.toISOString(),
      appointment_time: appointmentDateTime.toTimeString().slice(0, 5),
      duration_minutes,
      service_type,
      notes: notes || null,
      consultation_fee: consultationFee,
      meeting_type,
      meeting_link: meetingLink,
      status: 'scheduled',
      payment_status: 'pending',
      created_at: new Date().toISOString(),
      partner: demoPartner,
      user: demoUser,
      dog: demoDog
    };

    // Store in memory
    if (!demoAppointmentsStorage[auth.userId]) {
      demoAppointmentsStorage[auth.userId] = [];
    }
    demoAppointmentsStorage[auth.userId].push(appointment);

    // Also store for partner
    if (!demoAppointmentsStorage[partner_id]) {
      demoAppointmentsStorage[partner_id] = [];
    }
    demoAppointmentsStorage[partner_id].push(appointment);

    console.log('Appointment created successfully:', appointmentId);

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
        `Payment of ₹${consultationFee} can be made during or after the appointment`
      ]
    });

  } catch (error) {
    console.error('Appointment booking error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while booking appointment'
    }, { status: 500 });
  }
}

// GET /api/auth/working-appointments - Get user appointments
export async function GET(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth || !auth.userId) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized' 
    }, { status: 401 });
  }

  try {
    // Get user's appointments from storage
    const userAppointments = demoAppointmentsStorage[auth.userId] || [];

    // If no appointments exist, create some demo data for existing users
    if (userAppointments.length === 0 && auth.userId === 'user-sanket-123') {
      const appointmentDate1 = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const appointmentDate2 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      
      const demoAppointments = [
        {
          id: 'apt-1',
          partner_id: 'partner-demo-123',
          partner_name: 'Dr. Demo Veterinarian',
          user_id: auth.userId,
          dog_id: 'dog-1',
          appointment_date: appointmentDate1.toISOString(),
          appointment_time: '10:00',
          duration_minutes: 60,
          service_type: 'consultation',
          notes: 'Regular checkup',
          consultation_fee: 800,
          meeting_type: 'in_person',
          meeting_link: null,
          status: 'scheduled',
          payment_status: 'pending',
          created_at: new Date().toISOString(),
          partner: {
            id: 'partner-demo-123',
            name: 'Dr. Demo Veterinarian',
            business_name: 'Demo Vet Clinic',
            partner_type: 'vet',
            location: 'Mumbai, Maharashtra'
          },
          dog: {
            id: 'dog-1',
            name: 'Buddy',
            breed: 'Golden Retriever',
            health_id: 'WOFBUGOL240815'
          }
        },
        {
          id: 'apt-2',
          partner_id: 'partner-demo-123',
          partner_name: 'Dr. Demo Veterinarian',
          user_id: auth.userId,
          dog_id: 'dog-2',
          appointment_date: appointmentDate2.toISOString(),
          appointment_time: '14:00',
          duration_minutes: 90,
          service_type: 'treatment',
          notes: 'Follow-up treatment',
          consultation_fee: 1200,
          meeting_type: 'video_call',
          meeting_link: 'https://meet.woofadaar.com/appointment/demo',
          status: 'confirmed',
          payment_status: 'paid',
          created_at: new Date().toISOString(),
          partner: {
            id: 'partner-demo-123',
            name: 'Dr. Demo Veterinarian',
            business_name: 'Demo Vet Clinic',
            partner_type: 'vet',
            location: 'Mumbai, Maharashtra'
          },
          dog: {
            id: 'dog-2',
            name: 'Luna',
            breed: 'Labrador Retriever',
            health_id: 'WOFLULAB180815'
          }
        }
      ];
      demoAppointmentsStorage[auth.userId] = demoAppointments;
      
      return NextResponse.json({
        success: true,
        data: { 
          appointments: demoAppointments,
          total: demoAppointments.length
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: { 
        appointments: userAppointments,
        total: userAppointments.length
      }
    });

  } catch (error) {
    console.error('Appointments fetch error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while fetching appointments'
    }, { status: 500 });
  }
}