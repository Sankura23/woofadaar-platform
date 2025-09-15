import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { TierManager, TIER_SYSTEM } from '@/lib/tier-system';

// Get user's tier information
export async function GET(request: NextRequest) {
  try {
    const userId = await verifyToken(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get or create user tier record
    let userTier = await prisma.$queryRaw`
      SELECT * FROM user_tiers WHERE user_id = ${userId}
    ` as any[];

    if (userTier.length === 0) {
      // Create initial tier record
      await prisma.$executeRaw`
        INSERT INTO user_tiers (id, user_id, current_tier, tier_points, monthly_tier_points)
        VALUES (${generateId()}, ${userId}, 'bronze', 0, 0)
      `;
      
      userTier = await prisma.$queryRaw`
        SELECT * FROM user_tiers WHERE user_id = ${userId}
      ` as any[];
    }

    const tierData = userTier[0];

    // Get user points for tier calculation
    const userPoints = await prisma.userPoints.findUnique({
      where: { user_id: userId }
    });

    // Calculate current tier based on activity
    const userActivity = await calculateUserActivity(userId);
    const calculatedTierPoints = TierManager.calculateTierPoints(userActivity);
    const currentTierName = TierManager.calculateTier(calculatedTierPoints, tierData.monthly_tier_points);

    // Check if tier needs updating
    if (currentTierName !== tierData.current_tier) {
      const upgradeCheck = TierManager.checkTierUpgrade(
        tierData.current_tier,
        calculatedTierPoints,
        tierData.monthly_tier_points
      );

      if (upgradeCheck.shouldUpgrade) {
        // Update tier in database
        await prisma.$executeRaw`
          UPDATE user_tiers 
          SET current_tier = ${upgradeCheck.newTier},
              tier_points = ${calculatedTierPoints},
              tier_history = jsonb_set(
                COALESCE(tier_history, '[]'::jsonb),
                '{-1}',
                jsonb_build_object(
                  'tier', ${upgradeCheck.newTier},
                  'achievedAt', ${new Date().toISOString()},
                  'pointsAtAchievement', ${calculatedTierPoints}
                )
              ),
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ${userId}
        `;
        
        tierData.current_tier = upgradeCheck.newTier;
        tierData.tier_points = calculatedTierPoints;
      }
    }

    // Get tier progression
    const progression = TierManager.getTierProgression(calculatedTierPoints, tierData.monthly_tier_points);

    // Get tier benefits
    const currentTier = TIER_SYSTEM[tierData.current_tier];
    const availablePerks = TierManager.getAvailablePerks(tierData.current_tier);
    const cumulativeBenefits = TierManager.getCumulativeBenefits(tierData.current_tier);

    // Get tier value
    const tierValue = TierManager.calculateTierValue(tierData.current_tier);

    return NextResponse.json({
      success: true,
      data: {
        userTier: {
          id: tierData.id,
          currentTier: tierData.current_tier,
          tierPoints: calculatedTierPoints,
          monthlyTierPoints: tierData.monthly_tier_points,
          tierStart: tierData.tier_start,
          tierHistory: tierData.tier_history || []
        },
        tierDetails: currentTier,
        progression,
        benefits: {
          current: currentTier.benefits,
          cumulative: cumulativeBenefits,
          availablePerks,
          estimatedValue: tierValue
        },
        activity: userActivity,
        stats: {
          totalUsers: await getTotalUsersInTier(),
          tierDistribution: await getTierDistribution(),
          userRank: await getUserTierRank(userId, calculatedTierPoints)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching tier information:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tier information' },
      { status: 500 }
    );
  }
}

// Update tier points (called by system cron job)
export async function POST(request: NextRequest) {
  try {
    const userId = await verifyToken(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { is_admin: true }
    });

    if (!user?.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { targetUserId, recalculateAll } = body;

    if (recalculateAll) {
      // Recalculate tiers for all users
      const users = await prisma.user.findMany({
        select: { id: true }
      });

      let updatedCount = 0;
      for (const user of users) {
        await recalculateUserTier(user.id);
        updatedCount++;
      }

      return NextResponse.json({
        success: true,
        data: {
          message: `Recalculated tiers for ${updatedCount} users`
        }
      });
    }

    if (targetUserId) {
      // Recalculate tier for specific user
      const result = await recalculateUserTier(targetUserId);
      return NextResponse.json({
        success: true,
        data: result
      });
    }

    return NextResponse.json(
      { success: false, error: 'No action specified' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error updating tier information:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update tier information' },
      { status: 500 }
    );
  }
}

// Helper functions
async function calculateUserActivity(userId: string): Promise<any> {
  const userPoints = await prisma.userPoints.findUnique({
    where: { user_id: userId }
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      CommunityQuestions: { select: { id: true } },
      CommunityAnswers: { select: { id: true } },
      CommunityVotes: { select: { id: true } }
    }
  });

  // Get referrals count
  const referrals = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count FROM referral_rewards 
    WHERE referrer_id = ${userId} AND status = 'completed'
  ` as any[];

  // Get challenges completed
  const challenges = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count FROM challenge_participation 
    WHERE user_id = ${userId} AND status = 'completed'
  ` as any[];

  // Get social shares
  const shares = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count FROM social_shares 
    WHERE user_id = ${userId}
  ` as any[];

  return {
    pointsEarned: userPoints?.points_earned || 0,
    questionsPosted: user?.CommunityQuestions?.length || 0,
    answersGiven: user?.CommunityAnswers?.length || 0,
    communityVotes: user?.CommunityVotes?.length || 0,
    streakDays: userPoints?.streak_count || 0,
    referralsCompleted: referrals[0]?.count || 0,
    challengesCompleted: challenges[0]?.count || 0,
    socialShares: shares[0]?.count || 0
  };
}

async function recalculateUserTier(userId: string): Promise<any> {
  const userActivity = await calculateUserActivity(userId);
  const newTierPoints = TierManager.calculateTierPoints(userActivity);
  
  // Get current monthly points (simplified - would be calculated from recent activity)
  const monthlyPoints = Math.floor(newTierPoints * 0.1); // 10% of total as monthly estimate

  const newTier = TierManager.calculateTier(newTierPoints, monthlyPoints);

  // Update or create user tier
  await prisma.$executeRaw`
    INSERT INTO user_tiers (id, user_id, current_tier, tier_points, monthly_tier_points)
    VALUES (${generateId()}, ${userId}, ${newTier}, ${newTierPoints}, ${monthlyPoints})
    ON CONFLICT (user_id) DO UPDATE SET
      current_tier = ${newTier},
      tier_points = ${newTierPoints},
      monthly_tier_points = ${monthlyPoints},
      updated_at = CURRENT_TIMESTAMP
  `;

  return {
    userId,
    newTier,
    tierPoints: newTierPoints,
    monthlyPoints
  };
}

async function getTotalUsersInTier(): Promise<{ [tier: string]: number }> {
  const tierCounts = await prisma.$queryRaw`
    SELECT current_tier, COUNT(*)::int as count 
    FROM user_tiers 
    GROUP BY current_tier
  ` as any[];

  const distribution: { [tier: string]: number } = {};
  tierCounts.forEach(({ current_tier, count }: any) => {
    distribution[current_tier] = count;
  });

  return distribution;
}

async function getTierDistribution(): Promise<{ tier: string; count: number; percentage: number }[]> {
  const tierCounts = await getTotalUsersInTier();
  const totalUsers = Object.values(tierCounts).reduce((sum, count) => sum + count, 0);

  return Object.entries(tierCounts).map(([tier, count]) => ({
    tier,
    count,
    percentage: totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0
  }));
}

async function getUserTierRank(userId: string, userTierPoints: number): Promise<number> {
  const higherRanked = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count 
    FROM user_tiers 
    WHERE tier_points > ${userTierPoints}
  ` as any[];

  return (higherRanked[0]?.count || 0) + 1;
}

function generateId(): string {
  return 'tier_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}