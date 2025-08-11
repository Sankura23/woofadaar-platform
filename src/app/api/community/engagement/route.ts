import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || ('userId' in user ? user.userId : user.partnerId);

    // Get user engagement stats
    const engagementStats = await prisma.userEngagement.groupBy({
      by: ['action_type'],
      where: { user_id: userId },
      _sum: {
        points_earned: true
      },
      _count: {
        action_type: true
      }
    });

    // Get user badges
    const badges = await prisma.userBadge.findMany({
      where: { user_id: userId },
      orderBy: { earned_at: 'desc' }
    });

    // Get total points
    const totalPoints = await prisma.userEngagement.aggregate({
      where: { user_id: userId },
      _sum: { points_earned: true }
    });

    // Get recent activity
    const recentActivity = await prisma.userEngagement.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 10
    });

    // Calculate user rank
    const totalPointsValue = totalPoints._sum.points_earned || 0;
    let rank = 'Newcomer';
    let rankColor = '#6B7280';

    if (totalPointsValue >= 1000) {
      rank = 'Community Hero';
      rankColor = '#F59E0B';
    } else if (totalPointsValue >= 500) {
      rank = 'Expert Contributor';
      rankColor = '#8B5CF6';
    } else if (totalPointsValue >= 200) {
      rank = 'Active Member';
      rankColor = '#10B981';
    } else if (totalPointsValue >= 50) {
      rank = 'Regular Member';
      rankColor = '#3B82F6';
    }

    return NextResponse.json({
      success: true,
      data: {
        totalPoints: totalPointsValue,
        rank,
        rankColor,
        badges,
        engagementStats,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Error fetching user engagement:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch engagement data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { actionType, points, description, relatedId, relatedType } = body;

    if (!actionType || !points || !description) {
      return NextResponse.json(
        { success: false, error: 'Action type, points, and description are required' },
        { status: 400 }
      );
    }

    // Create engagement record
    const engagement = await prisma.userEngagement.create({
      data: {
        user_id: 'userId' in user ? user.userId : user.partnerId,
        action_type: actionType,
        points_earned: points,
        description,
        related_id: relatedId || null,
        related_type: relatedType || null
      }
    });

    // Check for milestone badges
    const totalPoints = await prisma.userEngagement.aggregate({
      where: { user_id: 'userId' in user ? user.userId : user.partnerId },
      _sum: { points_earned: true }
    });

    const totalPointsValue = totalPoints._sum.points_earned || 0;

    // Check for various milestone badges
    const existingBadges = await prisma.userBadge.findMany({
      where: { user_id: 'userId' in user ? user.userId : user.partnerId },
      select: { badge_type: true }
    });

    const existingBadgeTypes = existingBadges.map(b => b.badge_type);

    // 100 upvotes badge
    if (actionType === 'upvoted' && !existingBadgeTypes.includes('100_upvotes')) {
      const upvoteCount = await prisma.userEngagement.count({
        where: { 
          user_id: 'userId' in user ? user.userId : user.partnerId, 
          action_type: 'upvoted' 
        }
      });

      if (upvoteCount >= 100) {
        await prisma.userBadge.create({
          data: {
            user_id: 'userId' in user ? user.userId : user.partnerId,
            badge_type: '100_upvotes',
            badge_name: 'Popular Contributor',
            badge_description: 'Received 100+ upvotes from the community',
            badge_icon: '⭐',
            badge_color: '#F59E0B'
          }
        });
      }
    }

    // 500 points badge
    if (totalPointsValue >= 500 && !existingBadgeTypes.includes('500_points')) {
      await prisma.userBadge.create({
        data: {
          user_id: 'userId' in user ? user.userId : user.partnerId,
          badge_type: '500_points',
          badge_name: 'Point Collector',
          badge_description: 'Earned 500+ community points',
          badge_icon: '🏆',
          badge_color: '#8B5CF6'
        }
      });
    }

    // Best answer badge
    if (actionType === 'best_answer' && !existingBadgeTypes.includes('best_answer')) {
      await prisma.userBadge.create({
        data: {
          user_id: 'userId' in user ? user.userId : user.partnerId,
          badge_type: 'best_answer',
          badge_name: 'Best Answer',
          badge_description: 'Your answer was marked as the best solution',
          badge_icon: '👑',
          badge_color: '#F59E0B'
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: { engagement }
    });
  } catch (error) {
    console.error('Error creating user engagement:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create engagement record' },
      { status: 500 }
    );
  }
} 