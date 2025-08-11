import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import jwt from 'jsonwebtoken';

// Helper function to get user from JWT token
function getUserFromToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

// GET /api/bookings - Get user's bookings
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const partnerId = searchParams.get('partnerId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = { user_id: user.userId };
    
    if (status) {
      where.status = status;
    }
    
    if (partnerId) {
      where.partner_id = partnerId;
    }

    const skip = (page - 1) * limit;

    const [bookings, totalCount] = await Promise.all([
      prisma.partnerBooking.findMany({
        where,
        include: {
          partner: {
            select: {
              id: true,
              name: true,
              business_name: true,
              partner_type: true,
              location: true,
              profile_image_url: true,
              phone: true,
              rating_average: true,
              verified: true,
            }
          },
          dog: {
            select: {
              id: true,
              name: true,
              breed: true,
              photo_url: true,
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: { appointment_datetime: 'desc' },
        skip,
        take: limit,
      }),
      prisma.partnerBooking.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        bookings,
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
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// POST /api/bookings - Create a new booking
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['partner_id', 'service_type', 'booking_type', 'appointment_datetime'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate partner exists and is approved
    const partner = await prisma.partner.findUnique({
      where: { id: body.partner_id },
      select: { 
        id: true, 
        status: true, 
        verified: true, 
        name: true,
        commission_rate: true,
        pricing_info: true 
      }
    });

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }

    if (partner.status !== 'approved' || !partner.verified) {
      return NextResponse.json(
        { success: false, error: 'Partner is not available for bookings' },
        { status: 400 }
      );
    }

    // Validate appointment datetime is in the future
    const appointmentDate = new Date(body.appointment_datetime);
    if (appointmentDate <= new Date()) {
      return NextResponse.json(
        { success: false, error: 'Appointment datetime must be in the future' },
        { status: 400 }
      );
    }

    // Check for existing booking at the same time
    const existingBooking = await prisma.partnerBooking.findFirst({
      where: {
        partner_id: body.partner_id,
        appointment_datetime: appointmentDate,
        status: { in: ['pending', 'confirmed'] }
      }
    });

    if (existingBooking) {
      return NextResponse.json(
        { success: false, error: 'Partner is not available at this time' },
        { status: 400 }
      );
    }

    // Calculate commission if price is provided
    let commission_amount = null;
    if (body.price && partner.commission_rate) {
      commission_amount = body.price * (partner.commission_rate / 100);
    }

    // Create the booking
    const booking = await prisma.partnerBooking.create({
      data: {
        partner_id: body.partner_id,
        user_id: user.userId,
        dog_id: body.dog_id,
        service_type: body.service_type,
        booking_type: body.booking_type,
        appointment_datetime: appointmentDate,
        duration_minutes: body.duration_minutes || 60,
        price: body.price ? parseFloat(body.price) : null,
        commission_amount,
        notes: body.notes,
        user_notes: body.user_notes,
        emergency_level: body.emergency_level,
        symptoms: body.symptoms || [],
        preferred_language: body.preferred_language,
        special_requirements: body.special_requirements,
        payment_method: body.payment_method,
      },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            business_name: true,
            partner_type: true,
            location: true,
            phone: true,
            email: true,
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
      message: 'Booking created successfully',
      data: { booking }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}

// PUT /api/bookings - Update a booking (for users)
export async function PUT(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { booking_id, ...updateData } = body;

    if (!booking_id) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Verify booking belongs to user
    const existingBooking = await prisma.partnerBooking.findFirst({
      where: {
        id: booking_id,
        user_id: user.userId,
      }
    });

    if (!existingBooking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Prevent updates to completed or cancelled bookings
    if (existingBooking.status === 'completed' || existingBooking.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Cannot update completed or cancelled bookings' },
        { status: 400 }
      );
    }

    // Update the booking
    const updatedBooking = await prisma.partnerBooking.update({
      where: { id: booking_id },
      data: {
        ...updateData,
        updated_at: new Date(),
      },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            business_name: true,
            partner_type: true,
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
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}