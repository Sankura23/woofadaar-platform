import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

interface DecodedToken {
  userId?: string;
  partnerId?: string;
  email: string;
  userType?: string;
}

async function verifyToken(request: NextRequest): Promise<{ userId?: string; partnerId?: string; email?: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    return {
      userId: decoded.userId,
      partnerId: decoded.partnerId,
      email: decoded.email
    };
  } catch (error) {
    return null;
  }
}

// Helper function to validate review data
function validateReviewData(rating: number, reviewText?: string): { isValid: boolean; error?: string } {
  if (!rating || rating < 1 || rating > 5) {
    return { isValid: false, error: 'Rating must be between 1 and 5 stars' };
  }

  if (reviewText && reviewText.length > 1000) {
    return { isValid: false, error: 'Review text cannot exceed 1000 characters' };
  }

  if (reviewText && reviewText.length < 10) {
    return { isValid: false, error: 'Review text must be at least 10 characters long' };
  }

  // Basic content moderation
  const inappropriateWords = ['spam', 'fake', 'scam']; // Simplified - use proper content moderation service
  if (reviewText && inappropriateWords.some(word => reviewText.toLowerCase().includes(word))) {
    return { isValid: false, error: 'Review contains inappropriate content' };
  }

  return { isValid: true };
}

// Helper function to update partner rating average
async function updatePartnerRatingAverage(partnerId: string) {
  const ratings = await prisma.partnerReview.aggregate({
    where: { 
      partner_id: partnerId,
      is_verified: true // Only count verified reviews
    },
    _avg: { rating: true },
    _count: { id: true }
  });

  await prisma.partner.update({
    where: { id: partnerId },
    data: {
      rating_average: ratings._avg.rating || 0,
      rating_count: ratings._count.id
    }
  });

  return {
    new_average: Math.round((ratings._avg.rating || 0) * 10) / 10,
    total_reviews: ratings._count.id
  };
}

// POST /api/reviews/partner-reviews - Create a new partner review
export async function POST(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth || !auth.userId) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized - User authentication required' 
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      partner_id, 
      appointment_id, 
      dog_id,
      rating, 
      review_text, 
      service_type,
      would_recommend 
    } = body;

    // Validation
    if (!partner_id) {
      return NextResponse.json({
        success: false,
        message: 'Partner ID is required'
      }, { status: 400 });
    }

    if (!rating) {
      return NextResponse.json({
        success: false,
        message: 'Rating is required'
      }, { status: 400 });
    }

    // Validate review data
    const validation = validateReviewData(rating, review_text);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        message: validation.error
      }, { status: 400 });
    }

    // Check if partner exists and is approved
    const partner = await prisma.partner.findUnique({
      where: { id: partner_id },
      select: {
        id: true,
        name: true,
        business_name: true,
        status: true,
        verified: true
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
        message: 'Cannot review unverified partner'
      }, { status: 400 });
    }

    // Check if appointment exists and belongs to user (if provided)
    let appointment = null;
    if (appointment_id) {
      appointment = await prisma.appointment.findUnique({
        where: { id: appointment_id },
        select: {
          id: true,
          user_id: true,
          partner_id: true,
          status: true,
          appointment_date: true,
          service_type: true
        }
      });

      if (!appointment) {
        return NextResponse.json({
          success: false,
          message: 'Appointment not found'
        }, { status: 404 });
      }

      if (appointment.user_id !== auth.userId) {
        return NextResponse.json({
          success: false,
          message: 'Appointment does not belong to authenticated user'
        }, { status: 403 });
      }

      if (appointment.partner_id !== partner_id) {
        return NextResponse.json({
          success: false,
          message: 'Appointment does not match partner'
        }, { status: 400 });
      }

      if (appointment.status !== 'completed') {
        return NextResponse.json({
          success: false,
          message: 'Can only review completed appointments'
        }, { status: 400 });
      }
    }

    // Check if dog belongs to user (if provided)
    if (dog_id) {
      const dog = await prisma.dog.findUnique({
        where: { id: dog_id },
        select: { id: true, user_id: true, name: true }
      });

      if (!dog) {
        return NextResponse.json({
          success: false,
          message: 'Dog not found'
        }, { status: 404 });
      }

      if (dog.user_id !== auth.userId) {
        return NextResponse.json({
          success: false,
          message: 'Dog does not belong to authenticated user'
        }, { status: 403 });
      }
    }

    // Check for duplicate review (same user, partner, appointment)
    const existingReview = await prisma.partnerReview.findUnique({
      where: {
        user_id_partner_id_appointment_id: {
          user_id: auth.userId,
          partner_id: partner_id,
          appointment_id: appointment_id || 'no_appointment'
        }
      }
    });

    if (existingReview) {
      return NextResponse.json({
        success: false,
        message: 'You have already reviewed this partner for this appointment'
      }, { status: 409 });
    }

    // Create the review
    const review = await prisma.partnerReview.create({
      data: {
        partner_id,
        user_id: auth.userId,
        dog_id: dog_id || null,
        appointment_id: appointment_id || null,
        rating,
        review_text: review_text || null,
        service_type: service_type || appointment?.service_type || null,
        is_verified: appointment ? true : false // Reviews with appointments are auto-verified
      },
      include: {
        user: {
          select: { id: true, name: true }
        },
        dog: {
          select: { id: true, name: true, breed: true }
        },
        appointment: {
          select: { 
            id: true, 
            appointment_date: true, 
            service_type: true 
          }
        }
      }
    });

    // Update partner's rating average
    const updatedRatings = await updatePartnerRatingAverage(partner_id);

    // Send notification to partner (mock - implement with your notification service)
    const partnerNotification = {
      type: 'email',
      to: partner.id, // Would get partner email
      subject: 'New Review Received - Woofadaar',
      template: 'partner_new_review',
      data: {
        partner_name: partner.name,
        reviewer_name: review.user.name,
        rating: rating,
        review_text: review_text,
        service_type: service_type
      }
    };

    console.log('Partner notification queued:', partnerNotification);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user_id: auth.userId,
        action: 'create_partner_review',
        details: {
          partner_id,
          appointment_id,
          rating,
          review_id: review.id,
          timestamp: new Date().toISOString()
        }
      }
    }).catch(err => {
      console.log('Audit log creation failed:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully',
      data: {
        review: {
          id: review.id,
          rating: review.rating,
          review_text: review.review_text,
          service_type: review.service_type,
          is_verified: review.is_verified,
          created_at: review.created_at,
          reviewer: review.user.name,
          pet: review.dog ? `${review.dog.name} (${review.dog.breed})` : null,
          appointment_date: review.appointment?.appointment_date
        },
        partner_rating_update: {
          new_average: updatedRatings.new_average,
          total_reviews: updatedRatings.total_reviews
        }
      },
      thank_you_message: `Thank you for reviewing ${partner.business_name || partner.name}! Your feedback helps other pet parents make informed decisions.`
    });

  } catch (error) {
    console.error('Partner review creation error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while creating review'
    }, { status: 500 });
  }
}

// GET /api/reviews/partner-reviews - Get partner reviews with filtering and pagination
export async function GET(request: NextRequest) {
  const auth = await verifyToken(request);
  
  // Reviews are public, but authentication provides additional context
  
  try {
    const { searchParams } = new URL(request.url);
    const partner_id = searchParams.get('partner_id');
    const user_id = searchParams.get('user_id');
    const rating_filter = searchParams.get('rating_filter'); // e.g., "4,5" for 4-5 star reviews
    const service_type = searchParams.get('service_type');
    const verified_only = searchParams.get('verified_only') === 'true';
    const sort_by = searchParams.get('sort_by') || 'recent'; // recent, oldest, highest_rating, lowest_rating
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    let whereClause: any = {};

    // Filter by partner
    if (partner_id) {
      whereClause.partner_id = partner_id;
    }

    // Filter by user (for user's own reviews)
    if (user_id && auth && auth.userId === user_id) {
      whereClause.user_id = user_id;
    }

    // Filter by rating
    if (rating_filter) {
      const ratings = rating_filter.split(',').map(r => parseInt(r)).filter(r => r >= 1 && r <= 5);
      if (ratings.length > 0) {
        whereClause.rating = { in: ratings };
      }
    }

    // Filter by service type
    if (service_type) {
      whereClause.service_type = service_type;
    }

    // Filter verified reviews only
    if (verified_only) {
      whereClause.is_verified = true;
    }

    // Determine sort order
    let orderBy: any = { created_at: 'desc' }; // Default: most recent first
    switch (sort_by) {
      case 'oldest':
        orderBy = { created_at: 'asc' };
        break;
      case 'highest_rating':
        orderBy = { rating: 'desc' };
        break;
      case 'lowest_rating':
        orderBy = { rating: 'asc' };
        break;
      case 'most_helpful':
        // Would implement helpfulness voting in production
        orderBy = { created_at: 'desc' };
        break;
    }

    // Get reviews with related data
    const [reviews, totalCount] = await Promise.all([
      prisma.partnerReview.findMany({
        where: whereClause,
        include: {
          user: {
            select: { 
              id: true, 
              name: true,
              // Only show user details if authenticated user is viewing their own reviews
              ...(auth && auth.userId === user_id ? { email: true } : {})
            }
          },
          partner: {
            select: {
              id: true,
              name: true,
              business_name: true,
              partner_type: true,
              partnership_tier: true
            }
          },
          dog: {
            select: { 
              id: true, 
              name: true, 
              breed: true,
              age_months: true
            }
          },
          appointment: {
            select: {
              id: true,
              appointment_date: true,
              service_type: true,
              consultation_fee: true
            }
          }
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.partnerReview.count({ where: whereClause })
    ]);

    // Calculate review statistics if partner_id is provided
    let reviewStats = null;
    if (partner_id) {
      const stats = await prisma.partnerReview.groupBy({
        by: ['rating'],
        where: { 
          partner_id: partner_id,
          is_verified: true 
        },
        _count: { id: true }
      });

      const totalVerifiedReviews = stats.reduce((sum, stat) => sum + stat._count.id, 0);
      const averageRating = stats.reduce((sum, stat) => sum + (stat.rating * stat._count.id), 0) / totalVerifiedReviews;

      reviewStats = {
        total_reviews: totalVerifiedReviews,
        average_rating: Math.round(averageRating * 10) / 10,
        rating_distribution: [5, 4, 3, 2, 1].map(rating => {
          const count = stats.find(s => s.rating === rating)?._count.id || 0;
          return {
            stars: rating,
            count: count,
            percentage: totalVerifiedReviews > 0 ? Math.round((count / totalVerifiedReviews) * 100) : 0
          };
        }),
        recent_trend: await getRecentReviewTrend(partner_id)
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        reviews: reviews.map(review => ({
          id: review.id,
          rating: review.rating,
          review_text: review.review_text,
          service_type: review.service_type,
          is_verified: review.is_verified,
          created_at: review.created_at,
          reviewer: {
            name: review.user.name,
            // Only show if authenticated user is viewing their own reviews
            ...(auth && auth.userId === review.user_id ? { email: review.user.email } : {})
          },
          partner: review.partner,
          pet: review.dog ? {
            name: review.dog.name,
            breed: review.dog.breed,
            age_display: `${Math.floor(review.dog.age_months / 12)} years old`
          } : null,
          appointment_context: review.appointment ? {
            date: review.appointment.appointment_date,
            service_type: review.appointment.service_type,
            fee: review.appointment.consultation_fee
          } : null,
          // Hide user-specific details for privacy
          can_edit: auth && auth.userId === review.user_id,
          time_since_service: review.appointment ? 
            Math.ceil((new Date().getTime() - new Date(review.appointment.appointment_date).getTime()) / (1000 * 60 * 60 * 24)) + ' days ago' : null
        })),
        statistics: reviewStats,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        },
        filters_applied: {
          partner_id,
          rating_filter,
          service_type,
          verified_only,
          sort_by
        }
      }
    });

  } catch (error) {
    console.error('Partner reviews fetch error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while fetching reviews'
    }, { status: 500 });
  }
}

// PUT /api/reviews/partner-reviews - Update an existing review
export async function PUT(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth || !auth.userId) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized - User authentication required' 
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { review_id, rating, review_text } = body;

    if (!review_id) {
      return NextResponse.json({
        success: false,
        message: 'Review ID is required'
      }, { status: 400 });
    }

    // Get existing review
    const existingReview = await prisma.partnerReview.findUnique({
      where: { id: review_id },
      include: {
        partner: {
          select: { id: true, name: true }
        }
      }
    });

    if (!existingReview) {
      return NextResponse.json({
        success: false,
        message: 'Review not found'
      }, { status: 404 });
    }

    // Check ownership
    if (existingReview.user_id !== auth.userId) {
      return NextResponse.json({
        success: false,
        message: 'You can only edit your own reviews'
      }, { status: 403 });
    }

    // Check if review is recent enough to edit (allow edits within 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (existingReview.created_at < thirtyDaysAgo) {
      return NextResponse.json({
        success: false,
        message: 'Reviews can only be edited within 30 days of creation'
      }, { status: 400 });
    }

    // Validate new data
    if (rating !== undefined) {
      const validation = validateReviewData(rating, review_text);
      if (!validation.isValid) {
        return NextResponse.json({
          success: false,
          message: validation.error
        }, { status: 400 });
      }
    }

    // Update review
    const updatedData: any = {};
    if (rating !== undefined) updatedData.rating = rating;
    if (review_text !== undefined) updatedData.review_text = review_text;

    const updatedReview = await prisma.partnerReview.update({
      where: { id: review_id },
      data: updatedData,
      include: {
        user: {
          select: { id: true, name: true }
        },
        partner: {
          select: { id: true, name: true, business_name: true }
        }
      }
    });

    // Update partner's rating average if rating changed
    let updatedRatings = null;
    if (rating !== undefined && rating !== existingReview.rating) {
      updatedRatings = await updatePartnerRatingAverage(existingReview.partner_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Review updated successfully',
      data: {
        review: {
          id: updatedReview.id,
          rating: updatedReview.rating,
          review_text: updatedReview.review_text,
          updated_at: new Date(),
          partner: updatedReview.partner
        },
        partner_rating_update: updatedRatings
      }
    });

  } catch (error) {
    console.error('Review update error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while updating review'
    }, { status: 500 });
  }
}

// Helper function to get recent review trend
async function getRecentReviewTrend(partnerId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentReviews = await prisma.partnerReview.findMany({
    where: {
      partner_id: partnerId,
      created_at: { gte: thirtyDaysAgo },
      is_verified: true
    },
    select: { rating: true, created_at: true }
  });

  if (recentReviews.length === 0) {
    return { trend: 'no_recent_reviews', recent_average: 0, review_count: 0 };
  }

  const recentAverage = recentReviews.reduce((sum, rev) => sum + rev.rating, 0) / recentReviews.length;
  
  return {
    trend: recentAverage >= 4.0 ? 'positive' : recentAverage >= 3.0 ? 'neutral' : 'concerning',
    recent_average: Math.round(recentAverage * 10) / 10,
    review_count: recentReviews.length
  };
}