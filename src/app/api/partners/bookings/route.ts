import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getPartnerFromRequest } from '@/lib/auth';
import { mockDb } from '@/lib/mock-db';
import { getAppointmentsForPartner, updateAppointmentInStorage } from '@/lib/demo-storage';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    console.log('Partner bookings API called');
    
    // Verify partner authentication using JWT
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - No token provided'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-for-development');
    } catch (error) {
      console.error('JWT verification error:', error);
      return NextResponse.json({
        success: false,
        message: 'Invalid token'
      }, { status: 401 });
    }

    if (decoded.userType !== 'partner' || !decoded.partnerId) {
      return NextResponse.json({
        success: false,
        message: 'Invalid partner token'
      }, { status: 401 });
    }

    const partnerId = decoded.partnerId;
    console.log('Partner ID from token:', partnerId);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('Query parameters:', { status, limit, offset });

    try {
      let appointments: any[] = [];
      let total = 0;

      // Try database first
      try {
        const whereClause: any = { partner_id: partnerId };
        if (status && ['pending', 'confirmed', 'completed', 'cancelled', 'scheduled'].includes(status)) {
          whereClause.status = status;
        }

        appointments = await prisma.appointment.findMany({
          where: whereClause,
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
          orderBy: { appointment_date: 'desc' },
          take: limit,
          skip: offset
        });

        const dbTotal = await prisma.appointment.count({ where: whereClause });
        console.log('Appointments found in database:', appointments.length);

        // ALSO check demo storage for additional appointments (hybrid approach)
        try {
          // Force reload demo storage to get latest appointments
          const { getAppointmentsForPartner: getFreshAppointments } = await import('@/lib/demo-storage');
          const demoAppointments = await getFreshAppointments(partnerId);
          console.log('Additional appointments found in demo storage:', demoAppointments.length);
          
          // Merge demo appointments with database appointments (avoid duplicates)
          const existingIds = new Set(appointments.map(apt => apt.id));
          const newDemoAppointments = demoAppointments.filter(apt => !existingIds.has(apt.id));
          appointments = [...appointments, ...newDemoAppointments];
          total = dbTotal + newDemoAppointments.length;
          console.log('Total appointments after merging demo storage:', appointments.length);
          
        } catch (demoError) {
          console.warn('Demo storage access failed:', demoError);
          total = dbTotal;
        }

      } catch (dbError) {
        console.warn('Database query failed, trying demo storage:', dbError);
        
        // Fallback to demo storage
        appointments = await getAppointmentsForPartner(partnerId);
        console.log('Appointments found in demo storage:', appointments.length);
        console.log('Demo appointments details:', appointments.map(apt => ({
          id: apt.id,
          partner_id: apt.partner_id,
          date: apt.appointment_date,
          status: apt.status
        })));

        // Filter by status if provided
        if (status && ['pending', 'confirmed', 'completed', 'cancelled', 'scheduled'].includes(status)) {
          appointments = appointments.filter(apt => apt.status === status);
          console.log(`Filtered appointments by status ${status}:`, appointments.length);
        }

        // Apply pagination
        total = appointments.length;
        appointments = appointments.slice(offset, offset + limit);
      }

      console.log('Final appointments count:', appointments.length);
      console.log('Appointment statuses:', appointments.map(apt => ({ id: apt.id, status: apt.status, date: apt.appointment_date })));

      // Normalize appointment data to match expected format
      const normalizedAppointments = appointments.map(apt => ({
        id: apt.id,
        user_id: apt.user_id,
        appointment_date: apt.appointment_date,
        appointment_datetime: apt.appointment_date, // For compatibility
        service_type: apt.service_type,
        duration_minutes: apt.duration_minutes,
        consultation_fee: apt.consultation_fee,
        price: apt.consultation_fee, // For compatibility
        status: apt.status,
        notes: apt.notes,
        created_at: apt.created_at,
        updated_at: apt.updated_at,
        meeting_type: apt.meeting_type,
        booking_type: apt.meeting_type === 'in_person' ? 'in_person' : 
                     apt.meeting_type === 'video_call' ? 'online' : 'phone',
        user: apt.user || {
          id: apt.user_id,
          name: `User ${apt.user_id.slice(-4)}`,
          email: `user${apt.user_id.slice(-4)}@example.com`
        }
      }));

      // Calculate statistics
      const statusCounts = appointments.reduce((acc: Record<string, number>, apt) => {
        acc[apt.status] = (acc[apt.status] || 0) + 1;
        return acc;
      }, {});

      const finalBookingStats = {
        total: total,
        pending: (statusCounts['pending'] || 0) + (statusCounts['scheduled'] || 0),
        confirmed: statusCounts['confirmed'] || 0,
        completed: statusCounts['completed'] || 0,
        cancelled: statusCounts['cancelled'] || 0
      };

      console.log('Final booking stats:', finalBookingStats);

      return NextResponse.json({
        success: true,
        bookings: normalizedAppointments,
        stats: finalBookingStats,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });

    } catch (dbError) {
      console.error('Database error in partner bookings:', dbError);
      console.log('Falling back to mock data');
      
      // Use mock data when database fails
      const mockBookings = mockDb.findPartnerBookings({ partner_id: partner.partnerId }).map(booking => ({
        id: booking.id,
        user_id: booking.user_id,
        appointment_date: booking.appointment_datetime,
        appointment_datetime: booking.appointment_datetime,
        service_type: booking.service_type,
        duration_minutes: booking.duration_minutes,
        consultation_fee: booking.price,
        price: booking.price,
        status: booking.status,
        notes: booking.notes,
        created_at: booking.created_at,
        updated_at: booking.created_at,
        meeting_type: booking.booking_type === 'in_person' ? 'in_person' : 
                     booking.booking_type === 'online' ? 'video_call' : 'phone_call',
        booking_type: booking.booking_type,
        user: {
          id: booking.user_id,
          name: 'Mock User',
          email: 'mock@user.com'
        }
      }));

      const mockStats = {
        total: mockBookings.length,
        pending: mockBookings.filter(b => b.status === 'pending').length,
        confirmed: mockBookings.filter(b => b.status === 'confirmed').length,
        completed: mockBookings.filter(b => b.status === 'completed').length,
        cancelled: mockBookings.filter(b => b.status === 'cancelled').length
      };

      return NextResponse.json({
        success: true,
        bookings: mockBookings,
        stats: mockStats,
        pagination: {
          total: mockBookings.length,
          limit,
          offset,
          hasMore: false
        }
      });
    }

  } catch (error) {
    console.error('Partner bookings error:', error);
    return NextResponse.json({
      success: false,
      message: 'Invalid request format'
    }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify partner authentication using JWT
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - No token provided'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-for-development');
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: 'Invalid token'
      }, { status: 401 });
    }

    if (decoded.userType !== 'partner' || !decoded.partnerId) {
      return NextResponse.json({
        success: false,
        message: 'Invalid partner token'
      }, { status: 401 });
    }

    const partnerId = decoded.partnerId;

    const body = await request.json();
    const { booking_id, status, notes } = body;

    if (!booking_id) {
      return NextResponse.json({
        success: false,
        message: 'Booking ID is required'
      }, { status: 400 });
    }

    if (status && !['pending', 'confirmed', 'completed', 'cancelled', 'scheduled'].includes(status)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid status. Must be: pending, confirmed, completed, cancelled, or scheduled'
      }, { status: 400 });
    }

    try {
      // Update appointment in demo storage
      const updateData: any = {};
      
      if (status) {
        updateData.status = status;
      }
      
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const updatedBooking = await updateAppointmentInStorage(booking_id, updateData);

      if (!updatedBooking) {
        return NextResponse.json({
          success: false,
          message: 'Booking not found or access denied'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Booking updated successfully',
        booking: updatedBooking
      });

    } catch (error) {
      console.error('Error updating booking:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to update booking'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Booking update error:', error);
    return NextResponse.json({
      success: false,
      message: 'Invalid request format'
    }, { status: 400 });
  }
}