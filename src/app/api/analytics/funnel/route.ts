import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface FunnelUpdate {
  user_id: string;
  stage?: 'signup' | 'profile' | 'dog_profile' | 'active' | 'premium';
  profile_completed_at?: Date;
  dog_profile_created_at?: Date;
  first_question_at?: Date;
  first_answer_at?: Date;
  first_health_log_at?: Date;
  first_booking_at?: Date;
  premium_signup_at?: Date;
  language?: string;
  acquisition_source?: string;
  city?: string;
}

// POST /api/analytics/funnel - Update user funnel progression
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, ...updates } = body;

    if (!user_id) {
      return NextResponse.json({
        success: false,
        message: 'User ID is required'
      }, { status: 400 });
    }

    // Get user to verify existence and get signup date
    const user = await prisma.user.findUnique({
      where: { id: user_id },
      select: {
        id: true,
        created_at: true,
        location: true,
        preferred_language: true
      }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      ...updates,
      updated_at: new Date()
    };

    // Convert string dates to Date objects
    if (updates.profile_completed_at) {
      updateData.profile_completed_at = new Date(updates.profile_completed_at);
    }
    if (updates.dog_profile_created_at) {
      updateData.dog_profile_created_at = new Date(updates.dog_profile_created_at);
    }
    if (updates.first_question_at) {
      updateData.first_question_at = new Date(updates.first_question_at);
    }
    if (updates.first_answer_at) {
      updateData.first_answer_at = new Date(updates.first_answer_at);
    }
    if (updates.first_health_log_at) {
      updateData.first_health_log_at = new Date(updates.first_health_log_at);
    }
    if (updates.first_booking_at) {
      updateData.first_booking_at = new Date(updates.first_booking_at);
    }
    if (updates.premium_signup_at) {
      updateData.premium_signup_at = new Date(updates.premium_signup_at);
    }

    // Set defaults from user profile if not provided
    if (!updateData.language && user.preferred_language) {
      updateData.language = user.preferred_language;
    }
    if (!updateData.city && user.location) {
      updateData.city = user.location;
    }

    // Upsert user funnel record
    const funnel = await prisma.userFunnel.upsert({
      where: { user_id },
      create: {
        user_id,
        signup_date: user.created_at,
        language: updateData.language || 'en',
        city: updateData.city,
        acquisition_source: updateData.acquisition_source,
        current_stage: updateData.stage || 'signup',
        ...updateData
      },
      update: updateData
    });

    return NextResponse.json({
      success: true,
      message: 'User funnel updated successfully',
      data: {
        user_id: funnel.user_id,
        current_stage: funnel.current_stage,
        signup_date: funnel.signup_date,
        profile_completed_at: funnel.profile_completed_at,
        dog_profile_created_at: funnel.dog_profile_created_at,
        first_question_at: funnel.first_question_at,
        first_answer_at: funnel.first_answer_at,
        first_health_log_at: funnel.first_health_log_at,
        first_booking_at: funnel.first_booking_at,
        premium_signup_at: funnel.premium_signup_at,
        language: funnel.language,
        city: funnel.city,
        updated_at: funnel.updated_at
      }
    });

  } catch (error) {
    console.error('User funnel update error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update user funnel'
    }, { status: 500 });
  }
}

// GET /api/analytics/funnel - Get user funnel data and analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const stage = searchParams.get('stage');
    const language = searchParams.get('language');
    const city = searchParams.get('city');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const cohort = searchParams.get('cohort'); // 'daily', 'weekly', 'monthly'

    // Single user funnel query
    if (user_id) {
      const funnel = await prisma.userFunnel.findUnique({
        where: { user_id },
        select: {
          user_id: true,
          signup_date: true,
          profile_completed_at: true,
          dog_profile_created_at: true,
          first_question_at: true,
          first_answer_at: true,
          first_health_log_at: true,
          first_booking_at: true,
          premium_signup_at: true,
          current_stage: true,
          language: true,
          acquisition_source: true,
          city: true,
          updated_at: true
        }
      });

      if (!funnel) {
        return NextResponse.json({
          success: false,
          message: 'User funnel not found'
        }, { status: 404 });
      }

      // Calculate progression metrics
      const signupTime = funnel.signup_date.getTime();
      const progressionMetrics = {
        days_to_profile_completion: funnel.profile_completed_at 
          ? Math.ceil((funnel.profile_completed_at.getTime() - signupTime) / (24 * 60 * 60 * 1000))
          : null,
        days_to_dog_profile: funnel.dog_profile_created_at
          ? Math.ceil((funnel.dog_profile_created_at.getTime() - signupTime) / (24 * 60 * 60 * 1000))
          : null,
        days_to_first_question: funnel.first_question_at
          ? Math.ceil((funnel.first_question_at.getTime() - signupTime) / (24 * 60 * 60 * 1000))
          : null,
        days_to_first_booking: funnel.first_booking_at
          ? Math.ceil((funnel.first_booking_at.getTime() - signupTime) / (24 * 60 * 60 * 1000))
          : null,
        days_to_premium: funnel.premium_signup_at
          ? Math.ceil((funnel.premium_signup_at.getTime() - signupTime) / (24 * 60 * 60 * 1000))
          : null
      };

      return NextResponse.json({
        success: true,
        data: {
          funnel,
          metrics: progressionMetrics
        }
      });
    }

    // Build where clause for aggregate queries
    const where: any = {};
    if (stage) where.current_stage = stage;
    if (language) where.language = language;
    if (city) where.city = city;
    
    if (start_date || end_date) {
      where.signup_date = {};
      if (start_date) where.signup_date.gte = new Date(start_date);
      if (end_date) where.signup_date.lte = new Date(end_date);
    }

    // Get funnel analytics
    const [
      totalUsers,
      stageDistribution,
      languageDistribution,
      cityDistribution,
      conversionMetrics
    ] = await Promise.all([
      prisma.userFunnel.count({ where }),
      
      prisma.userFunnel.groupBy({
        by: ['current_stage'],
        where,
        _count: true
      }),
      
      prisma.userFunnel.groupBy({
        by: ['language'],
        where,
        _count: true
      }),
      
      prisma.userFunnel.groupBy({
        by: ['city'],
        where: { ...where, city: { not: null } },
        _count: true,
        orderBy: { _count: { city: 'desc' } },
        take: 10
      }),

      // Calculate conversion rates between stages
      Promise.all([
        prisma.userFunnel.count({ where: { ...where, profile_completed_at: { not: null } } }),
        prisma.userFunnel.count({ where: { ...where, dog_profile_created_at: { not: null } } }),
        prisma.userFunnel.count({ where: { ...where, first_question_at: { not: null } } }),
        prisma.userFunnel.count({ where: { ...where, first_answer_at: { not: null } } }),
        prisma.userFunnel.count({ where: { ...where, first_health_log_at: { not: null } } }),
        prisma.userFunnel.count({ where: { ...where, first_booking_at: { not: null } } }),
        prisma.userFunnel.count({ where: { ...where, premium_signup_at: { not: null } } })
      ])
    ]);

    // Calculate conversion rates
    const conversions = {
      signup_to_profile: totalUsers > 0 ? (conversionMetrics[0] / totalUsers) * 100 : 0,
      profile_to_dog_profile: conversionMetrics[0] > 0 ? (conversionMetrics[1] / conversionMetrics[0]) * 100 : 0,
      dog_profile_to_first_action: conversionMetrics[1] > 0 ? (Math.max(conversionMetrics[2], conversionMetrics[4]) / conversionMetrics[1]) * 100 : 0,
      active_to_premium: Math.max(conversionMetrics[2], conversionMetrics[4]) > 0 ? (conversionMetrics[6] / Math.max(conversionMetrics[2], conversionMetrics[4])) * 100 : 0
    };

    // Cohort analysis if requested
    let cohortData = null;
    if (cohort) {
      const dateFormat = cohort === 'daily' ? 'YYYY-MM-DD' : 
                        cohort === 'weekly' ? 'YYYY-"W"WW' : 
                        'YYYY-MM';

      cohortData = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC(${cohort}, signup_date) as cohort_date,
          COUNT(*) as signups,
          COUNT(CASE WHEN profile_completed_at IS NOT NULL THEN 1 END) as completed_profiles,
          COUNT(CASE WHEN dog_profile_created_at IS NOT NULL THEN 1 END) as created_dog_profiles,
          COUNT(CASE WHEN first_question_at IS NOT NULL OR first_health_log_at IS NOT NULL THEN 1 END) as became_active,
          COUNT(CASE WHEN premium_signup_at IS NOT NULL THEN 1 END) as became_premium
        FROM "UserFunnel"
        WHERE signup_date >= COALESCE(${start_date ? new Date(start_date) : null}, NOW() - INTERVAL '30 days')
          AND signup_date <= COALESCE(${end_date ? new Date(end_date) : null}, NOW())
        GROUP BY DATE_TRUNC(${cohort}, signup_date)
        ORDER BY cohort_date DESC
        LIMIT 50
      `;
    }

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total_users: totalUsers,
          conversion_rates: conversions
        },
        distribution: {
          by_stage: stageDistribution.reduce((acc: any, item) => {
            acc[item.current_stage] = item._count;
            return acc;
          }, {}),
          by_language: languageDistribution.reduce((acc: any, item) => {
            acc[item.language] = item._count;
            return acc;
          }, {}),
          by_city: cityDistribution.reduce((acc: any, item) => {
            acc[item.city || 'unknown'] = item._count;
            return acc;
          }, {})
        },
        funnel_metrics: {
          signups: totalUsers,
          profile_completions: conversionMetrics[0],
          dog_profiles: conversionMetrics[1],
          first_questions: conversionMetrics[2],
          first_answers: conversionMetrics[3],
          first_health_logs: conversionMetrics[4],
          first_bookings: conversionMetrics[5],
          premium_signups: conversionMetrics[6]
        },
        cohort_analysis: cohortData
      }
    });

  } catch (error) {
    console.error('Funnel analytics error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to get funnel analytics'
    }, { status: 500 });
  }
}