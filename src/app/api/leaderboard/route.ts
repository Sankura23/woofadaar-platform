import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'all'; // all, week, month
    const city = searchParams.get('city'); // Indian city filter
    const breed = searchParams.get('breed'); // Indian dog breed filter
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let dateFilter: any = {};
    let userFilter: any = {};
    
    if (timeframe === 'week') {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { created_at: { gte: oneWeekAgo } };
    } else if (timeframe === 'month') {
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = { created_at: { gte: oneMonthAgo } };
    }

    // Add Indian context filters
    if (city) {
      userFilter.location = { contains: city, mode: 'insensitive' };
    }
    
    if (breed) {
      // This would need to join with dog profiles - simplified for now
      userFilter.Dogs = {
        some: {
          breed: { contains: breed, mode: 'insensitive' }
        }
      };
    }

    const leaderboard = await prisma.userPoints.findMany({
      where: {
        ...dateFilter,
        user: userFilter
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true,
            location: true,
            experience_level: true
          }
        }
      },
      orderBy: [
        { current_balance: 'desc' },
        { level: 'desc' }
      ],
      skip: offset,
      take: limit
    });

    const topContributors = await prisma.user.findMany({
      include: {
        CommunityQuestions: {
          select: { id: true }
        },
        CommunityAnswers: {
          select: { id: true, is_best_answer: true }
        },
        UserPoints: {
          select: {
            current_balance: true,
            level: true,
            badges: true
          }
        }
      },
      orderBy: [
        { reputation: 'desc' }
      ],
      take: 10
    });

    const topExperts = await prisma.communityExpert.findMany({
      where: {
        verification_status: 'verified',
        is_featured: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true,
            location: true
          }
        }
      },
      orderBy: [
        { answer_count: 'desc' },
        { best_answer_count: 'desc' }
      ],
      take: 10
    });

    const stats = await prisma.userPoints.aggregate({
      _count: true,
      _sum: {
        current_balance: true,
        total_lifetime_points: true
      },
      _avg: {
        current_balance: true,
        level: true
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        leaderboard: leaderboard.map((user, index) => ({
          rank: offset + index + 1,
          user: user.user,
          points: user.current_balance,
          level: user.level,
          badges: user.badges,
          streak: user.streak_count,
          achievements: user.achievements
        })),
        topContributors: topContributors.map(user => ({
          user: {
            id: user.id,
            name: user.name,
            profile_image_url: user.profile_image_url,
            location: user.location
          },
          questionsCount: user.CommunityQuestions.length,
          answersCount: user.CommunityAnswers.length,
          bestAnswersCount: user.CommunityAnswers.filter(a => a.is_best_answer).length,
          reputation: user.reputation,
          points: user.UserPoints?.current_balance || 0,
          level: user.UserPoints?.level || 1
        })),
        topExperts: topExperts.map(expert => ({
          user: expert.user,
          expertise_areas: expert.expertise_areas,
          answer_count: expert.answer_count,
          best_answer_count: expert.best_answer_count,
          years_experience: expert.years_experience,
          is_featured: expert.is_featured
        })),
        stats: {
          totalUsers: stats._count,
          totalPointsDistributed: stats._sum.total_lifetime_points || 0,
          averagePoints: Math.round(stats._avg.current_balance || 0),
          averageLevel: Math.round((stats._avg.level || 1) * 10) / 10
        },
        timeframe,
        filters: {
          city,
          breed
        },
        pagination: {
          limit,
          offset,
          hasMore: leaderboard.length === limit
        }
      }
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leaderboard data' },
      { status: 500 }
    );
  }
}