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

// GET /api/reviews - Get reviews for a partner or user's reviews
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partnerId');
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    if (!partnerId && !userId) {
      return NextResponse.json(
        { success: false, error: 'Either partnerId or userId is required' },
        { status: 400 }
      );
    }

    const where: any = {};
    if (partnerId) {
      where.partner_id = partnerId;
    }
    if (userId) {
      where.user_id = userId;
    }

    const skip = (page - 1) * limit;
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [reviews, totalCount] = await Promise.all([
      prisma.partnerReview.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profile_image_url: true,
            }
          },
          partner: {
            select: {
              id: true,
              name: true,
              business_name: true,
              partner_type: true,
              profile_image_url: true,
            }
          },
          booking: {
            select: {
              id: true,
              service_type: true,
              appointment_datetime: true,
            }
          }
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.partnerReview.count({ where }),
    ]);

    // Get rating statistics if getting reviews for a specific partner
    let ratingStats = null;
    if (partnerId) {
      const stats = await prisma.partnerReview.groupBy({
        by: ['rating'],
        where: { partner_id: partnerId },
        _count: { rating: true }
      });

      const totalReviews = stats.reduce((sum, stat) => sum + stat._count.rating, 0);
      const averageRating = totalReviews > 0 
        ? stats.reduce((sum, stat) => sum + (stat.rating * stat._count.rating), 0) / totalReviews 
        : 0;

      ratingStats = {
        average_rating: Math.round(averageRating * 10) / 10,
        total_reviews: totalReviews,
        rating_distribution: {
          5: stats.find(s => s.rating === 5)?._count.rating || 0,
          4: stats.find(s => s.rating === 4)?._count.rating || 0,
          3: stats.find(s => s.rating === 3)?._count.rating || 0,
          2: stats.find(s => s.rating === 2)?._count.rating || 0,
          1: stats.find(s => s.rating === 1)?._count.rating || 0,
        }
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        ...(ratingStats && { rating_stats: ratingStats }),
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
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/reviews - Create a new review
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
    const { partner_id, booking_id, rating, review_text, service_quality, communication, timeliness, would_recommend } = body;

    // Validate required fields
    if (!partner_id || !rating) {
      return NextResponse.json(
        { success: false, error: 'Partner ID and rating are required' },
        { status: 400 }
      );
    }

    // Validate rating range
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { success: false, error: 'Rating must be an integer between 1 and 5' },
        { status: 400 }
      );
    }

    // Verify partner exists
    const partner = await prisma.partner.findUnique({
      where: { id: partner_id },
      select: { id: true, status: true }
    });

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }

    // Verify booking belongs to user and partner (if booking_id provided)
    if (booking_id) {
      const booking = await prisma.partnerBooking.findUnique({
        where: { id: booking_id },
        select: { user_id: true, partner_id: true, status: true }
      });

      if (!booking || booking.user_id !== user.userId || booking.partner_id !== partner_id) {
        return NextResponse.json(
          { success: false, error: 'Invalid booking' },
          { status: 400 }
        );
      }

      if (booking.status !== 'completed') {
        return NextResponse.json(
          { success: false, error: 'Can only review completed bookings' },
          { status: 400 }
        );
      }

      // Check if user already reviewed this booking
      const existingReview = await prisma.partnerReview.findFirst({
        where: {
          user_id: user.userId,
          booking_id: booking_id
        }
      });

      if (existingReview) {
        return NextResponse.json(
          { success: false, error: 'You have already reviewed this booking' },
          { status: 409 }
        );
      }
    }

    // Create the review
    const newReview = await prisma.partnerReview.create({
      data: {
        user_id: user.userId,
        partner_id,
        booking_id,
        rating,
        review_text,
        service_quality: service_quality || null,
        communication: communication || null,
        timeliness: timeliness || null,
        would_recommend: would_recommend !== undefined ? would_recommend : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true,
          }
        },
        partner: {
          select: {
            id: true,
            name: true,
            business_name: true,
          }
        }
      }
    });

    // Update partner's rating statistics
    const reviewStats = await prisma.partnerReview.aggregate({
      where: { partner_id },
      _avg: { rating: true },
      _count: { rating: true }
    });

    await prisma.partner.update({
      where: { id: partner_id },
      data: {
        rating_average: reviewStats._avg.rating || 0,
        rating_count: reviewStats._count.rating || 0,
        total_reviews: reviewStats._count.rating || 0,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully',
      data: { review: newReview }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create review' },
      { status: 500 }
    );
  }
}

// PUT /api/reviews - Update a review
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
    const { review_id, rating, review_text, service_quality, communication, timeliness, would_recommend } = body;

    if (!review_id) {
      return NextResponse.json(
        { success: false, error: 'Review ID is required' },
        { status: 400 }
      );
    }

    // Verify review belongs to user
    const existingReview = await prisma.partnerReview.findFirst({
      where: {
        id: review_id,
        user_id: user.userId,
      }
    });

    if (!existingReview) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    // Check if review is within edit window (e.g., 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (existingReview.created_at < thirtyDaysAgo) {
      return NextResponse.json(
        { success: false, error: 'Reviews can only be edited within 30 days of creation' },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: any = { updated_at: new Date() };
    
    if (rating !== undefined) {
      if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return NextResponse.json(
          { success: false, error: 'Rating must be an integer between 1 and 5' },
          { status: 400 }
        );
      }
      updateData.rating = rating;
    }
    
    if (review_text !== undefined) updateData.review_text = review_text;
    if (service_quality !== undefined) updateData.service_quality = service_quality;
    if (communication !== undefined) updateData.communication = communication;
    if (timeliness !== undefined) updateData.timeliness = timeliness;
    if (would_recommend !== undefined) updateData.would_recommend = would_recommend;

    // Update the review
    const updatedReview = await prisma.partnerReview.update({
      where: { id: review_id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true,
          }
        },
        partner: {
          select: {
            id: true,
            name: true,
            business_name: true,
          }
        }
      }
    });

    // Recalculate partner's rating statistics if rating was changed
    if (rating !== undefined) {
      const reviewStats = await prisma.partnerReview.aggregate({
        where: { partner_id: existingReview.partner_id },
        _avg: { rating: true },
        _count: { rating: true }
      });

      await prisma.partner.update({
        where: { id: existingReview.partner_id },
        data: {
          rating_average: reviewStats._avg.rating || 0,
          rating_count: reviewStats._count.rating || 0,
          total_reviews: reviewStats._count.rating || 0,
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Review updated successfully',
      data: { review: updatedReview }
    });

  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update review' },
      { status: 500 }
    );
  }
}