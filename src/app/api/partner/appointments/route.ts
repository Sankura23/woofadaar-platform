import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

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
      partnerId: decoded.partnerId
    };
  } catch (error) {
    return null;
  }
}

// GET /api/partner/appointments - Get partner's appointments
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyToken(request);
    
    if (!auth) {
      return NextResponse.json({ 
        success: false,
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    let partnerId = auth.partnerId;
    
    console.log('Partner Appointments API - Auth info:', auth);
    console.log('Partner ID from token:', partnerId);
    console.log('Status filter:', status);

    // Check if this is a working auth demo partner - only the specific demo partners should get demo data
    const isDemoPartner = partnerId && (partnerId.includes('demo') || partnerId === 'cmevi7bvn0000yghdnv9mkvge');
    
    // For real partners, try to extract partner ID from token
    if (!partnerId || !isDemoPartner) {
      try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
          throw new Error('No auth header');
        }
        const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET!) as any;
        if (decoded.email && !isDemoPartner) {
          const partner = await prisma.partner.findUnique({
            where: { email: decoded.email },
            select: { id: true }
          });
          if (partner) {
            partnerId = partner.id;
          }
        }
      } catch (error) {
        console.warn('Could not extract partner ID from token');
      }
    }

    let appointments = [];

    if (isDemoPartner) {
      console.log('Demo partner detected, providing realistic appointment data');
      
      // Generate realistic appointments for demo partner
      const currentDate = new Date();
      
      // Generate realistic appointments in the format expected by frontend
      const demoAppointments = [
        {
          id: 'demo_appointment_1',
          dog_id: 'demo_dog_1',
          dog_name: 'Buddy',
          owner_name: 'Sanket Chitnis',
          owner_phone: '+91 9876543210',
          scheduled_at: new Date(currentDate.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
          duration_minutes: 60,
          appointment_type: 'Health Checkup',
          reason: 'Regular health check-up for senior dog. Owner reports mild lethargy.',
          status: 'scheduled',
          consultation_fee: 800,
          payment_status: 'pending',
          meeting_type: 'in_person',
          created_at: new Date(currentDate.getTime() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
          // Additional fields for compatibility
          service_type: 'consultation',
          notes: 'Regular health check-up for senior dog. Owner reports mild lethargy.',
          user: {
            id: 'demo_user_1',
            name: 'Sanket Chitnis',
            email: 'chitnissanket@gmail.com'
          },
          dog: {
            id: 'demo_dog_1',
            name: 'Buddy',
            breed: 'Golden Retriever'
          }
        },
        {
          id: 'demo_appointment_2',
          dog_id: 'demo_dog_2',
          dog_name: 'Luna',
          owner_name: 'Priya Sharma',
          owner_phone: '+91 9876543211',
          scheduled_at: new Date(currentDate.getTime() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
          duration_minutes: 90,
          appointment_type: 'Vaccination',
          reason: 'Follow-up vaccination and ear cleaning. Second dose of annual vaccines.',
          status: 'scheduled',
          consultation_fee: 1200,
          payment_status: 'pending',
          meeting_type: 'in_person',
          created_at: new Date(currentDate.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          // Additional fields for compatibility
          service_type: 'treatment',
          notes: 'Follow-up vaccination and ear cleaning. Second dose of annual vaccines.',
          user: {
            id: 'demo_user_2',
            name: 'Priya Sharma',
            email: 'priya.sharma@gmail.com'
          },
          dog: {
            id: 'demo_dog_2',
            name: 'Luna',
            breed: 'Labrador Mix'
          }
        },
        {
          id: 'demo_appointment_3',
          dog_id: 'demo_dog_3',
          dog_name: 'Max',
          owner_name: 'Raj Patel',
          owner_phone: '+91 9876543212',
          scheduled_at: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          duration_minutes: 45,
          appointment_type: 'Emergency',
          reason: 'URGENT: Dog swallowed foreign object. X-ray needed immediately.',
          status: 'confirmed',
          consultation_fee: 1500,
          payment_status: 'paid',
          meeting_type: 'in_person',
          created_at: new Date(currentDate.getTime() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          // Additional fields for compatibility
          service_type: 'emergency',
          notes: 'URGENT: Dog swallowed foreign object. X-ray needed immediately.',
          user: {
            id: 'demo_user_3',
            name: 'Raj Patel',
            email: 'raj.patel@example.com'
          },
          dog: {
            id: 'demo_dog_3',
            name: 'Max',
            breed: 'German Shepherd'
          }
        },
        {
          id: 'demo_appointment_4',
          dog_id: 'demo_dog_4',
          dog_name: 'Charlie',
          owner_name: 'Anjali Nair',
          owner_phone: '+91 9876543213',
          scheduled_at: new Date(currentDate.getTime() + 48 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
          duration_minutes: 60,
          appointment_type: 'Behavior Consultation',
          reason: 'Virtual consultation for behavior issues. Dog showing separation anxiety.',
          status: 'scheduled',
          consultation_fee: 800,
          payment_status: 'pending',
          meeting_type: 'video_call',
          created_at: new Date(currentDate.getTime() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
          // Additional fields for compatibility
          service_type: 'consultation',
          notes: 'Virtual consultation for behavior issues. Dog showing separation anxiety.',
          user: {
            id: 'demo_user_4',
            name: 'Anjali Nair',
            email: 'anjali.nair@gmail.com'
          },
          dog: {
            id: 'demo_dog_4',
            name: 'Charlie',
            breed: 'Beagle'
          }
        },
        {
          id: 'demo_appointment_5',
          dog_id: 'demo_dog_5',
          dog_name: 'Rocky',
          owner_name: 'Vikram Singh',
          owner_phone: '+91 9876543214',
          scheduled_at: new Date(currentDate.getTime() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday - completed
          duration_minutes: 75,
          appointment_type: 'Dental Treatment',
          reason: 'Dental cleaning completed successfully. Prescribed antibiotics for mild gum infection.',
          status: 'completed',
          consultation_fee: 1100,
          payment_status: 'paid',
          meeting_type: 'in_person',
          created_at: new Date(currentDate.getTime() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
          // Additional fields for compatibility
          service_type: 'treatment',
          notes: 'Dental cleaning completed successfully. Prescribed antibiotics for mild gum infection.',
          user: {
            id: 'demo_user_5',
            name: 'Vikram Singh',
            email: 'vikram.singh@gmail.com'
          },
          dog: {
            id: 'demo_dog_5',
            name: 'Rocky',
            breed: 'Indian Pariah'
          }
        }
      ];
      
      appointments = demoAppointments;
      
      // Filter by status if specified
      if (status && status !== 'all') {
        appointments = appointments.filter(apt => apt.status === status);
      }
      
      console.log(`Generated ${appointments.length} demo appointments (filtered by: ${status || 'all'})`);
      
    } else if (partnerId) {
      // Try to get real appointments from database first, then demo storage
      try {
        console.log('Fetching real appointments for partner:', partnerId);
        
        // Build where clause
        const where: any = { partner_id: partnerId };
        if (status && status !== 'all') {
          where.status = status;
        }

        console.log('Query where clause:', where);

        // Get real appointments from database
        appointments = await prisma.appointment.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            dog: {
              select: {
                id: true,
                name: true,
                breed: true
              }
            }
          },
          orderBy: { created_at: 'desc' }
        });

        console.log(`Found ${appointments.length} real appointments in database`);
        
      } catch (dbError) {
        console.warn('Database error fetching appointments, trying demo storage:', dbError);
        
        // Fallback to demo storage for real partners
        try {
          const { getAppointmentsForPartner } = await import('@/lib/demo-storage');
          appointments = await getAppointmentsForPartner(partnerId);
          console.log(`Found ${appointments.length} appointments in demo storage for partner ${partnerId}`);
          
          // Filter by status if specified
          if (status && status !== 'all') {
            appointments = appointments.filter((apt: any) => apt.status === status);
          }
          
          // Transform demo storage format to match expected format
          appointments = appointments.map((apt: any) => ({
            ...apt,
            dog_name: apt.dog_name || 'Unknown',
            owner_name: apt.owner_name || 'Unknown',
            appointment_date: apt.appointment_date,
            scheduled_at: apt.appointment_date, // For compatibility
          }));
          
        } catch (storageError) {
          console.warn('Demo storage error fetching appointments:', storageError);
          // Fall through to empty array
        }
      }
    }

    // If no appointments found for real partners, provide minimal fallback
    if (appointments.length === 0 && !isDemoPartner) {
      console.log('No appointments found for partner, providing new partner welcome message');
      appointments = []; // Empty for new partners
    }

    return NextResponse.json({
      success: true,
      data: {
        appointments,
        total_count: appointments.length
      },
      // Also provide appointments directly for compatibility
      appointments,
      total_count: appointments.length
    });

  } catch (error) {
    console.error('Partner appointments error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve appointments'
    }, { status: 500 });
  }
}