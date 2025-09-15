import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// Track social share
export async function POST(request: NextRequest) {
  try {
    const userId = await verifyToken(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { shareType, platform, shareContent, shareMetadata } = body;

    if (!shareType || !platform || !shareContent) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate engagement score based on platform and content type
    let engagementScore = 0;
    const baseScores = {
      'facebook': 15,
      'twitter': 10,
      'whatsapp': 8,
      'instagram': 12,
      'email': 5
    };

    engagementScore = baseScores[platform as keyof typeof baseScores] || 5;

    // Bonus points for special content types
    const contentBonuses = {
      'achievement': 5,
      'milestone': 8,
      'challenge': 6,
      'dog_profile': 3,
      'community_post': 4,
      'referral': 10
    };

    engagementScore += contentBonuses[shareType as keyof typeof contentBonuses] || 0;

    // Create social share record
    const shareId = generateId();
    await prisma.$executeRaw`
      INSERT INTO social_shares (
        id, user_id, share_type, share_content, platform, 
        engagement_score, points_earned, share_metadata
      ) VALUES (
        ${shareId}, ${userId}, ${shareType}, ${JSON.stringify(shareContent)}, 
        ${platform}, ${engagementScore}, ${engagementScore}, ${JSON.stringify(shareMetadata || {})}
      )
    `;

    // Award points for the share
    try {
      await fetch(new URL('/api/points/award', request.url), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || ''
        },
        body: JSON.stringify({
          action: 'social_share',
          sourceType: 'social_share',
          sourceId: shareId,
          pointsAmount: engagementScore,
          metadata: {
            shareType,
            platform,
            contentTitle: shareContent.title
          }
        })
      });
    } catch (pointsError) {
      console.warn('Failed to award points for social share:', pointsError);
    }

    // Check for sharing milestones
    const userShares = await prisma.$queryRaw`
      SELECT COUNT(*)::int as share_count 
      FROM social_shares 
      WHERE user_id = ${userId}
    ` as any[];

    const totalShares = userShares[0]?.share_count || 0;
    const milestones = [5, 10, 25, 50, 100];
    const reachedMilestone = milestones.find(milestone => totalShares === milestone);

    if (reachedMilestone) {
      // Award milestone bonus
      const milestoneBonus = reachedMilestone * 5; // 5 points per milestone level
      try {
        await fetch(new URL('/api/points/award', request.url), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': request.headers.get('Authorization') || ''
          },
          body: JSON.stringify({
            action: 'sharing_milestone',
            sourceType: 'milestone',
            sourceId: `share_milestone_${reachedMilestone}`,
            pointsAmount: milestoneBonus,
            metadata: {
              milestone: `${reachedMilestone}_shares`,
              totalShares
            }
          })
        });
      } catch (bonusError) {
        console.warn('Failed to award milestone bonus:', bonusError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        shareId,
        pointsEarned: engagementScore,
        milestoneReached: reachedMilestone,
        milestoneBonus: reachedMilestone ? reachedMilestone * 5 : 0,
        totalShares
      }
    });

  } catch (error) {
    console.error('Error tracking social share:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to track social share' },
      { status: 500 }
    );
  }
}

// Get user's sharing statistics
export async function GET(request: NextRequest) {
  try {
    const userId = await verifyToken(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'all'; // all, month, week

    let dateFilter = '';
    const now = new Date();
    
    if (timeframe === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = `AND shared_at >= '${monthAgo.toISOString()}'`;
    } else if (timeframe === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = `AND shared_at >= '${weekAgo.toISOString()}'`;
    }

    // Get sharing statistics
    const shareStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*)::int as total_shares,
        SUM(points_earned)::int as total_points,
        SUM(engagement_score)::int as total_engagement,
        COUNT(DISTINCT platform)::int as platforms_used,
        platform,
        COUNT(*) as platform_count
      FROM social_shares 
      WHERE user_id = ${userId} ${dateFilter ? prisma.Prisma.raw(dateFilter) : prisma.Prisma.empty}
      GROUP BY platform
    ` as any[];

    // Get sharing by content type
    const contentStats = await prisma.$queryRaw`
      SELECT 
        share_type,
        COUNT(*)::int as count,
        SUM(points_earned)::int as points,
        AVG(engagement_score)::numeric as avg_engagement
      FROM social_shares 
      WHERE user_id = ${userId} ${dateFilter ? prisma.Prisma.raw(dateFilter) : prisma.Prisma.empty}
      GROUP BY share_type
      ORDER BY count DESC
    ` as any[];

    // Get recent shares
    const recentShares = await prisma.$queryRaw`
      SELECT 
        id, share_type, platform, share_content, 
        points_earned, engagement_score, shared_at
      FROM social_shares 
      WHERE user_id = ${userId}
      ORDER BY shared_at DESC
      LIMIT 10
    ` as any[];

    // Calculate overall statistics
    const totalShares = shareStats.reduce((sum, stat) => sum + parseInt(stat.platform_count), 0);
    const totalPoints = shareStats.reduce((sum, stat) => sum + (stat.total_points || 0), 0);
    const totalEngagement = shareStats.reduce((sum, stat) => sum + (stat.total_engagement || 0), 0);
    const avgEngagement = totalShares > 0 ? Math.round(totalEngagement / totalShares) : 0;

    // Get sharing streaks
    const sharingStreak = await calculateSharingStreak(userId);

    // Get leaderboard position
    const leaderboardPosition = await getUserSharingRank(userId);

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalShares,
          totalPoints,
          totalEngagement,
          avgEngagement,
          platformsUsed: shareStats.length,
          sharingStreak,
          leaderboardPosition
        },
        platformStats: shareStats.map(stat => ({
          platform: stat.platform,
          shares: parseInt(stat.platform_count),
          points: stat.total_points || 0,
          engagement: stat.total_engagement || 0
        })),
        contentStats: contentStats.map(stat => ({
          contentType: stat.share_type,
          shares: stat.count,
          points: stat.points,
          avgEngagement: Math.round(parseFloat(stat.avg_engagement || '0'))
        })),
        recentShares: recentShares.map(share => ({
          id: share.id,
          type: share.share_type,
          platform: share.platform,
          content: share.share_content,
          pointsEarned: share.points_earned,
          engagementScore: share.engagement_score,
          sharedAt: share.shared_at
        })),
        insights: generateSharingInsights({
          totalShares,
          totalPoints,
          avgEngagement,
          platformStats: shareStats,
          contentStats,
          sharingStreak
        })
      }
    });

  } catch (error) {
    console.error('Error fetching sharing statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sharing statistics' },
      { status: 500 }
    );
  }
}

// Helper functions
async function calculateSharingStreak(userId: string): Promise<number> {
  try {
    const recentShares = await prisma.$queryRaw`
      SELECT DATE(shared_at) as share_date
      FROM social_shares 
      WHERE user_id = ${userId}
      AND shared_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(shared_at)
      ORDER BY share_date DESC
    ` as any[];

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const share of recentShares) {
      const shareDate = new Date(share.share_date);
      shareDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((currentDate.getTime() - shareDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === streak) {
        streak++;
      } else if (daysDiff > streak) {
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error('Error calculating sharing streak:', error);
    return 0;
  }
}

async function getUserSharingRank(userId: string): Promise<number> {
  try {
    const userRank = await prisma.$queryRaw`
      WITH user_sharing_stats AS (
        SELECT 
          user_id,
          COUNT(*) as total_shares,
          SUM(points_earned) as total_points
        FROM social_shares 
        WHERE shared_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY user_id
      ),
      ranked_users AS (
        SELECT 
          user_id,
          total_shares,
          total_points,
          ROW_NUMBER() OVER (ORDER BY total_shares DESC, total_points DESC) as rank
        FROM user_sharing_stats
      )
      SELECT rank FROM ranked_users WHERE user_id = ${userId}
    ` as any[];

    return userRank[0]?.rank || null;
  } catch (error) {
    console.error('Error calculating user sharing rank:', error);
    return 0;
  }
}

function generateSharingInsights(data: any): any {
  const insights = [];
  const recommendations = [];

  // Engagement insights
  if (data.avgEngagement > 12) {
    insights.push("Excellent engagement! Your shares are performing above average.");
  } else if (data.avgEngagement < 8) {
    insights.push("Your shares could use more engagement. Try sharing during peak hours.");
    recommendations.push("Share achievements and milestones for better engagement");
  }

  // Platform diversity
  if (data.platformStats.length === 1) {
    recommendations.push("Try sharing on multiple platforms to reach a wider audience");
  } else if (data.platformStats.length >= 3) {
    insights.push("Great platform diversity! You're reaching audiences across multiple channels.");
  }

  // Sharing frequency
  if (data.totalShares >= 50) {
    insights.push("You're a sharing champion! Keep spreading the Woofadaar love.");
  } else if (data.totalShares < 10) {
    recommendations.push("Share more of your achievements and milestones to earn bonus points");
  }

  // Streak insights
  if (data.sharingStreak >= 7) {
    insights.push(`Amazing ${data.sharingStreak}-day sharing streak! Consistency pays off.`);
  } else if (data.sharingStreak === 0) {
    recommendations.push("Start a sharing streak by sharing something daily");
  }

  return {
    insights,
    recommendations,
    nextGoal: getNextSharingGoal(data.totalShares),
    streakBonus: data.sharingStreak >= 3 ? "🔥 Streak bonus active!" : null
  };
}

function getNextSharingGoal(totalShares: number): string {
  const milestones = [5, 10, 25, 50, 100, 250, 500];
  const nextMilestone = milestones.find(milestone => milestone > totalShares);
  
  if (nextMilestone) {
    const remaining = nextMilestone - totalShares;
    return `Share ${remaining} more times to reach ${nextMilestone} shares milestone!`;
  }
  
  return "You've reached all sharing milestones! Keep sharing to help grow our community.";
}

function generateId(): string {
  return 'share_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}