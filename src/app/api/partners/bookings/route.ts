import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getPartnerFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify partner authentication
    const partner = getPartnerFromRequest(request);
    if (!partner) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Please login as a partner'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
      // Build where clause for filtering
      const where: any = {
        partner_id: partner.partnerId
      };

      if (status && ['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
        where.status = status;
      }

      // Get partner's bookings
      const bookings = await prisma.appointment.findMany({
        where,
        select: {
          id: true,
          pet_parent_id: true,
          appointment_date: true,
          appointment_type: true,
          duration_minutes: true,
          consultation_fee: true,
          status: true,
          notes: true,
          created_at: true,
          updated_at: true
        },
        orderBy: {
          appointment_date: 'desc'
        },
        take: limit,
        skip: offset
      });

      const total = await prisma.appointment.count({ where });

      // Get booking statistics
      const stats = await prisma.appointment.groupBy({
        by: ['status'],
        where: { partner_id: partner.partnerId },
        _count: {
          status: true
        }
      });

      const bookingStats = {
        total: total,
        pending: stats.find(s => s.status === 'pending')?._count.status || 0,
        confirmed: stats.find(s => s.status === 'confirmed')?._count.status || 0,
        completed: stats.find(s => s.status === 'completed')?._count.status || 0,
        cancelled: stats.find(s => s.status === 'cancelled')?._count.status || 0
      };

      return NextResponse.json({
        success: true,
        bookings,
        stats: bookingStats,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });

    } catch (dbError) {
      console.error('Database error in partner bookings:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Database temporarily unavailable. Please try again later.'
      }, { status: 503 });
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
    // Verify partner authentication
    const partner = getPartnerFromRequest(request);
    if (!partner) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Please login as a partner'
      }, { status: 401 });
    }

    const body = await request.json();
    const { booking_id, status, notes } = body;

    if (!booking_id) {
      return NextResponse.json({
        success: false,
        message: 'Booking ID is required'
      }, { status: 400 });
    }

    if (status && !['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid status. Must be: pending, confirmed, completed, or cancelled'
      }, { status: 400 });
    }

    try {
      // Verify the booking belongs to this partner
      const existingBooking = await prisma.appointment.findFirst({
        where: {
          id: booking_id,
          partner_id: partner.partnerId
        }
      });

      if (!existingBooking) {
        return NextResponse.json({
          success: false,
          message: 'Booking not found or access denied'
        }, { status: 404 });
      }

      const updateData: any = {};
      
      if (status) {
        updateData.status = status;
        updateData.updated_at = new Date();
      }
      
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const updatedBooking = await prisma.appointment.update({
        where: { id: booking_id },
        data: updateData
      });

      return NextResponse.json({
        success: true,
        message: 'Booking updated successfully',
        booking: updatedBooking
      });

    } catch (dbError) {
      console.error('Database error in booking update:', dbError);
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