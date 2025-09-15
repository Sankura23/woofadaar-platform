import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ReferralManager, REFERRAL_PROGRAM } from '@/lib/referral-system';

// Get user's referral information
export async function GET(request: NextRequest) {
  try {
    const userId = await verifyToken(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get or create user referral code
    let referralCode = await prisma.$queryRaw`
      SELECT * FROM user_referral_codes WHERE user_id = ${userId}
    ` as any[];

    if (referralCode.length === 0) {
      // Get user name for code generation
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true }
      });

      const newCode = ReferralManager.generateReferralCode(userId, user?.name || 'User');
      
      await prisma.$executeRaw`
        INSERT INTO user_referral_codes (id, user_id, referral_code)
        VALUES (${generateId()}, ${userId}, ${newCode})
      `;
      
      referralCode = await prisma.$queryRaw`
        SELECT * FROM user_referral_codes WHERE user_id = ${userId}
      ` as any[];
    }

    const userReferralCode = referralCode[0];

    // Get referral history
    const referralHistory = await prisma.$queryRaw`
      SELECT rr.*, 
             ru.name as referred_user_name,
             ru.profile_image_url as referred_user_image
      FROM referral_rewards rr
      LEFT JOIN "User" ru ON ru.id = rr.referred_id
      WHERE rr.referrer_id = ${userId}
      ORDER BY rr.created_at DESC
    ` as any[];

    // Get referral stats
    const stats = ReferralManager.generateReferralStats(referralHistory.map(r => ({
      id: r.id,
      referrerId: r.referrer_id,
      referredId: r.referred_id,
      referralCode: r.referral_code,
      status: r.status,
      pointsAwarded: r.points_awarded,
      milestoneReached: r.milestone_reached,
      referralTier: r.referral_tier,
      bonusMultiplier: r.bonus_multiplier,
      createdAt: new Date(r.created_at),
      rewardedAt: r.rewarded_at ? new Date(r.rewarded_at) : undefined
    })));

    stats.referralCode = userReferralCode.referral_code;

    // Get insights and recommendations
    const insights = ReferralManager.getReferralInsights(stats);

    // Get current special bonuses
    const now = new Date();
    const isWeekend = [0, 6].includes(now.getDay());
    const isFestival = await checkFestivalPeriod();
    
    const activeSpecialBonuses = ReferralManager.getActiveSpecialBonuses({
      isFestival,
      isWeekend,
      consecutiveReferrals: getConsecutiveReferrals(referralHistory),
      monthlyReferrals: stats.monthlyReferrals
    });

    // Get leaderboard position
    const leaderboard = await getReferralLeaderboard(userId);

    // Generate referral messages
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    const referralMessages = ReferralManager.generateReferralMessage(
      user?.name || 'A friend',
      userReferralCode.referral_code
    );

    return NextResponse.json({
      success: true,
      data: {
        referralCode: userReferralCode.referral_code,
        stats,
        insights,
        referralHistory: referralHistory.map(r => ({
          id: r.id,
          referredUser: {
            name: r.referred_user_name,
            profileImage: r.referred_user_image
          },
          status: r.status,
          pointsAwarded: r.points_awarded,
          milestoneReached: r.milestone_reached,
          createdAt: r.created_at,
          rewardedAt: r.rewarded_at
        })),
        program: {
          baseReward: REFERRAL_PROGRAM.baseReward,
          milestones: REFERRAL_PROGRAM.milestones,
          tierBonuses: REFERRAL_PROGRAM.tierBonuses
        },
        activeSpecialBonuses: activeSpecialBonuses.map(bonusId => 
          REFERRAL_PROGRAM.specialBonuses.find(b => b.id === bonusId)
        ).filter(Boolean),
        leaderboard,
        referralMessages
      }
    });

  } catch (error) {
    console.error('Error fetching referral information:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch referral information' },
      { status: 500 }
    );
  }
}

// Use referral code during signup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { referralCode, newUserId } = body;

    if (!referralCode || !newUserId) {
      return NextResponse.json(
        { success: false, error: 'Missing referral code or user ID' },
        { status: 400 }
      );
    }

    // Find referrer by code
    const referrerCode = await prisma.$queryRaw`
      SELECT * FROM user_referral_codes 
      WHERE referral_code = ${referralCode} AND is_active = true
    ` as any[];

    if (referrerCode.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired referral code' },
        { status: 404 }
      );
    }

    const referrerData = referrerCode[0];

    // Check if referral already exists
    const existingReferral = await prisma.$queryRaw`
      SELECT id FROM referral_rewards 
      WHERE referrer_id = ${referrerData.user_id} AND referred_id = ${newUserId}
    ` as any[];

    if (existingReferral.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Referral already exists' },
        { status: 409 }
      );
    }

    // Get referrer tier for bonus calculation
    const referrerPoints = await prisma.userPoints.findUnique({
      where: { user_id: referrerData.user_id }
    });

    const referrerTier = ReferralManager.getReferrerTier(referrerPoints?.current_balance || 0);

    // Create referral record
    const referralId = generateId();
    await prisma.$executeRaw`
      INSERT INTO referral_rewards (
        id, referrer_id, referred_id, referral_code, status, 
        referral_tier, bonus_multiplier
      ) VALUES (
        ${referralId}, ${referrerData.user_id}, ${newUserId}, ${referralCode}, 
        'pending', ${referrerTier}, 1.0
      )
    `;

    // Update referral code usage count
    await prisma.$executeRaw`
      UPDATE user_referral_codes 
      SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${referrerData.id}
    `;

    // Award initial signup bonus
    const signupReward = ReferralManager.calculateReferralReward('account_created', referrerTier);

    await prisma.$executeRaw`
      UPDATE referral_rewards 
      SET points_awarded = ${signupReward.totalReward},
          bonus_multiplier = ${signupReward.bonusMultiplier},
          milestone_reached = 'account_created',
          status = 'rewarded',
          rewarded_at = CURRENT_TIMESTAMP
      WHERE id = ${referralId}
    `;

    // Award points to referrer
    await fetch('/api/points/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'referral_signup',
        sourceType: 'referral',
        sourceId: referralId,
        pointsAmount: signupReward.totalReward,
        metadata: {
          referralCode,
          milestone: 'account_created',
          bonusMultiplier: signupReward.bonusMultiplier
        }
      })
    });

    return NextResponse.json({
      success: true,
      data: {
        referralId,
        pointsAwarded: signupReward.totalReward,
        milestone: 'account_created',
        bonusMultiplier: signupReward.bonusMultiplier
      }
    });

  } catch (error) {
    console.error('Error processing referral:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process referral' },
      { status: 500 }
    );
  }
}

// Update referral milestone (called by system triggers)
export async function PUT(request: NextRequest) {
  try {
    const userId = await verifyToken(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { milestone, referredUserId } = body;

    // Find pending referral for this user
    const referral = await prisma.$queryRaw`
      SELECT * FROM referral_rewards 
      WHERE referred_id = ${referredUserId} AND status != 'expired'
      ORDER BY created_at DESC 
      LIMIT 1
    ` as any[];

    if (referral.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active referral found for user'
      });
    }

    const referralData = referral[0];

    // Check if milestone already rewarded
    if (referralData.milestone_reached && 
        REFERRAL_PROGRAM.milestones.findIndex(m => m.requirement === referralData.milestone_reached) >= 
        REFERRAL_PROGRAM.milestones.findIndex(m => m.requirement === milestone)) {
      return NextResponse.json({
        success: false,
        error: 'Milestone already achieved or higher milestone reached'
      });
    }

    // Calculate reward for milestone
    const reward = ReferralManager.calculateReferralReward(milestone, referralData.referral_tier);

    // Update referral record
    await prisma.$executeRaw`
      UPDATE referral_rewards 
      SET milestone_reached = ${milestone},
          points_awarded = points_awarded + ${reward.totalReward},
          bonus_multiplier = ${reward.bonusMultiplier},
          status = 'rewarded',
          rewarded_at = CURRENT_TIMESTAMP
      WHERE id = ${referralData.id}
    `;

    // Award points to referrer
    await fetch('/api/points/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'referral_milestone',
        sourceType: 'referral',
        sourceId: referralData.id,
        pointsAmount: reward.totalReward,
        metadata: {
          milestone,
          bonusMultiplier: reward.bonusMultiplier
        }
      })
    });

    return NextResponse.json({
      success: true,
      data: {
        milestone,
        pointsAwarded: reward.totalReward,
        bonusMultiplier: reward.bonusMultiplier
      }
    });

  } catch (error) {
    console.error('Error updating referral milestone:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update referral milestone' },
      { status: 500 }
    );
  }
}

// Helper functions
async function checkFestivalPeriod(): Promise<boolean> {
  // Simplified festival check - would use proper festival calendar
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  
  // Major Indian festivals (approximate dates)
  const festivalPeriods = [
    { month: 10, start: 10, end: 20 }, // Diwali period
    { month: 3, start: 10, end: 15 },  // Holi period
    { month: 8, start: 20, end: 31 },  // Ganesh Chaturthi
  ];
  
  return festivalPeriods.some(period => 
    month === period.month && day >= period.start && day <= period.end
  );
}

function getConsecutiveReferrals(referralHistory: any[]): number {
  // Count consecutive successful referrals from most recent
  let consecutive = 0;
  for (const referral of referralHistory) {
    if (referral.status === 'completed' || referral.status === 'rewarded') {
      consecutive++;
    } else {
      break;
    }
  }
  return consecutive;
}

async function getReferralLeaderboard(userId: string): Promise<any> {
  const leaderboard = await prisma.$queryRaw`
    SELECT u.id, u.name, u.profile_image_url,
           COUNT(rr.id)::int as referral_count,
           SUM(rr.points_awarded)::int as total_points,
           ROW_NUMBER() OVER (ORDER BY COUNT(rr.id) DESC, SUM(rr.points_awarded) DESC) as rank
    FROM "User" u
    LEFT JOIN referral_rewards rr ON rr.referrer_id = u.id AND rr.status = 'rewarded'
    GROUP BY u.id, u.name, u.profile_image_url
    HAVING COUNT(rr.id) > 0
    ORDER BY referral_count DESC, total_points DESC
    LIMIT 10
  ` as any[];

  const userRank = await prisma.$queryRaw`
    WITH ranked_users AS (
      SELECT u.id,
             COUNT(rr.id)::int as referral_count,
             ROW_NUMBER() OVER (ORDER BY COUNT(rr.id) DESC, SUM(rr.points_awarded) DESC) as rank
      FROM "User" u
      LEFT JOIN referral_rewards rr ON rr.referrer_id = u.id AND rr.status = 'rewarded'
      GROUP BY u.id
    )
    SELECT rank FROM ranked_users WHERE id = ${userId}
  ` as any[];

  return {
    topReferrers: leaderboard,
    userRank: userRank[0]?.rank || null
  };
}

function generateId(): string {
  return 'referral_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}