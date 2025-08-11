import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import jwt from 'jsonwebtoken';

// Helper function to get partner from JWT token
function getPartnerFromToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    
    // Verify this is a partner token
    if (decoded.userType !== 'partner') {
      return null;
    }
    
    return decoded;
  } catch (error) {
    return null;
  }
}

// GET /api/partners/[id]/bookings - Get partner's bookings
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partnerId = params.id;
    const partner = getPartnerFromToken(request);
    
    // Verify partner authentication and authorization
    if (!partner || partner.partnerId !== partnerId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Access denied' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const serviceType = searchParams.get('serviceType');
    const bookingType = searchParams.get('bookingType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build where clause for filtering
    const where: any = { partner_id: partnerId };

    if (status && ['pending', 'confirmed', 'completed', 'cancelled', 'in_progress'].includes(status)) {
      where.status = status;
    }

    if (serviceType) {
      where.service_type = serviceType;
    }

    if (bookingType) {
      where.booking_type = bookingType;
    }

    // Date range filter
    if (startDate || endDate) {
      where.appointment_datetime = {};
      if (startDate) {
        where.appointment_datetime.gte = new Date(startDate);
      }
      if (endDate) {
        where.appointment_datetime.lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    // Get partner's bookings with user and dog info
    const [bookings, totalCount] = await Promise.all([
      prisma.partnerBooking.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            }
          },
          dog: {
            select: {
              id: true,
              name: true,
              breed: true,
              age: true,
              photo_url: true,
            }
          }
        },
        orderBy: { appointment_datetime: 'asc' },
        skip,
        take: limit,
      }),
      prisma.partnerBooking.count({ where }),
    ]);

    // Get booking statistics for the partner
    const stats = await prisma.partnerBooking.groupBy({
      by: ['status'],
      where: { partner_id: partnerId },
      _count: { status: true }
    });

    const bookingStats = {
      total: totalCount,
      pending: stats.find(s => s.status === 'pending')?._count.status || 0,
      confirmed: stats.find(s => s.status === 'confirmed')?._count.status || 0,
      in_progress: stats.find(s => s.status === 'in_progress')?._count.status || 0,
      completed: stats.find(s => s.status === 'completed')?._count.status || 0,
      cancelled: stats.find(s => s.status === 'cancelled')?._count.status || 0,
    };

    // Get revenue statistics
    const revenueStats = await prisma.partnerBooking.aggregate({
      where: { 
        partner_id: partnerId, 
        status: 'completed',
        price: { not: null }
      },
      _sum: { 
        price: true,
        commission_amount: true 
      },
      _count: { price: true }
    });

    return NextResponse.json({
      success: true,
      data: {
        bookings,
        stats: bookingStats,
        revenue: {
          total_revenue: revenueStats._sum.price || 0,
          total_commission: revenueStats._sum.commission_amount || 0,
          net_earnings: (revenueStats._sum.price || 0) - (revenueStats._sum.commission_amount || 0),
          completed_paid_bookings: revenueStats._count.price || 0
        },
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        }
      }
    });

  } catch (error) {
    console.error('Error fetching partner bookings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// PUT /api/partners/[id]/bookings - Update booking status (for partners)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partnerId = params.id;
    const partner = getPartnerFromToken(request);
    
    // Verify partner authentication and authorization
    if (!partner || partner.partnerId !== partnerId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Access denied' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { booking_id, status, partner_notes, diagnosis, treatment_plan, follow_up_required } = body;

    if (!booking_id) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Validate status transitions
    const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    // Verify booking belongs to this partner
    const existingBooking = await prisma.partnerBooking.findFirst({
      where: {
        id: booking_id,
        partner_id: partnerId,
      }
    });

    if (!existingBooking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found or access denied' },
        { status: 404 }
      );
    }

    // Prevent updates to completed or cancelled bookings for certain fields
    if ((existingBooking.status === 'completed' || existingBooking.status === 'cancelled') && status) {
      return NextResponse.json(
        { success: false, error: 'Cannot change status of completed or cancelled bookings' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = { updated_at: new Date() };
    
    if (status) {
      updateData.status = status;
      
      // Auto-set timestamps for status changes
      if (status === 'confirmed') {
        updateData.confirmed_at = new Date();
      } else if (status === 'in_progress') {
        updateData.started_at = new Date();
      } else if (status === 'completed') {
        updateData.completed_at = new Date();
      } else if (status === 'cancelled') {
        updateData.cancelled_at = new Date();
      }
    }
    
    if (partner_notes !== undefined) {
      updateData.partner_notes = partner_notes;
    }
    
    if (diagnosis !== undefined) {
      updateData.diagnosis = diagnosis;
    }
    
    if (treatment_plan !== undefined) {
      updateData.treatment_plan = treatment_plan;
    }
    
    if (follow_up_required !== undefined) {
      updateData.follow_up_required = follow_up_required;
    }

    // Update the booking
    const updatedBooking = await prisma.partnerBooking.update({
      where: { id: booking_id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        },
        dog: {
          select: {
            id: true,
            name: true,
            breed: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      data: { booking: updatedBooking }
    });

  } catch (error) {
    console.error('Error updating partner booking:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}