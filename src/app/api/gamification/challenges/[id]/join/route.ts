import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { SeasonalChallengeManager } from '@/lib/seasonal-challenges';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await verifyToken(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const challengeId = params.id;

    // Get challenge details
    const challenge = await prisma.$queryRaw`
      SELECT * FROM seasonal_challenges WHERE id = ${challengeId} AND is_active = true
    ` as any[];

    if (challenge.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Challenge not found or inactive' },
        { status: 404 }
      );
    }

    const challengeData = challenge[0];

    // Check if challenge is still open
    const now = new Date();
    if (new Date(challengeData.end_date) < now) {
      return NextResponse.json(
        { success: false, error: 'Challenge has ended' },
        { status: 400 }
      );
    }

    if (new Date(challengeData.start_date) > now) {
      return NextResponse.json(
        { success: false, error: 'Challenge has not started yet' },
        { status: 400 }
      );
    }

    // Check if user is already participating
    const existingParticipation = await prisma.$queryRaw`
      SELECT id FROM challenge_participation 
      WHERE challenge_id = ${challengeId} AND user_id = ${userId}
    ` as any[];

    if (existingParticipation.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Already participating in this challenge' },
        { status: 409 }
      );
    }

    // Check participant limit
    if (challengeData.max_participants) {
      const participantCount = await prisma.$queryRaw`
        SELECT COUNT(*)::int as count FROM challenge_participation WHERE challenge_id = ${challengeId}
      ` as any[];

      if (participantCount[0].count >= challengeData.max_participants) {
        return NextResponse.json(
          { success: false, error: 'Challenge is full' },
          { status: 400 }
        );
      }
    }

    // Get user stats for eligibility check
    const userStats = await getUserStats(userId);

    // Check eligibility based on challenge rules
    const rules = challengeData.rules || {};
    if (rules.eligibility) {
      const isEligible = SeasonalChallengeManager.checkEligibility(
        { rules } as any,
        userStats
      );

      if (!isEligible) {
        return NextResponse.json(
          { success: false, error: 'You do not meet the eligibility requirements for this challenge' },
          { status: 400 }
        );
      }
    }

    // Create participation record
    const participationId = generateId();
    await prisma.$executeRaw`
      INSERT INTO challenge_participation (
        id, challenge_id, user_id, status, progress_data
      ) VALUES (
        ${participationId}, ${challengeId}, ${userId}, 'active', '{}'
      )
    `;

    // Get the created participation
    const participation = await prisma.$queryRaw`
      SELECT cp.*, sc.name as challenge_name, sc.category, sc.point_reward
      FROM challenge_participation cp
      JOIN seasonal_challenges sc ON sc.id = cp.challenge_id
      WHERE cp.id = ${participationId}
    ` as any[];

    const participationData = participation[0];

    // Award joining points (small bonus for participation)
    await fetch('/api/points/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'challenge_join',
        sourceType: 'challenge_participation',
        sourceId: participationId,
        pointsAmount: 25, // Small joining bonus
        metadata: {
          challengeName: participationData.challenge_name,
          category: participationData.category
        }
      })
    });

    return NextResponse.json({
      success: true,
      data: {
        participation: {
          id: participationData.id,
          challengeId: participationData.challenge_id,
          status: participationData.status,
          joinedAt: participationData.joined_at,
          progressData: participationData.progress_data,
          challengeName: participationData.challenge_name,
          potentialReward: participationData.point_reward
        },
        message: `Successfully joined "${participationData.challenge_name}"! Earned 25 points for participating.`
      }
    });

  } catch (error) {
    console.error('Error joining challenge:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to join challenge' },
      { status: 500 }
    );
  }
}

// Leave a challenge
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await verifyToken(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const challengeId = params.id;

    // Check if user is participating
    const participation = await prisma.$queryRaw`
      SELECT cp.*, sc.name as challenge_name
      FROM challenge_participation cp
      JOIN seasonal_challenges sc ON sc.id = cp.challenge_id
      WHERE cp.challenge_id = ${challengeId} AND cp.user_id = ${userId}
    ` as any[];

    if (participation.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Not participating in this challenge' },
        { status: 404 }
      );
    }

    const participationData = participation[0];

    // Don't allow leaving if challenge is completed or if there are submissions
    if (participationData.status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Cannot leave a completed challenge' },
        { status: 400 }
      );
    }

    // Check if user has submissions
    const submissions = await prisma.$queryRaw`
      SELECT id FROM challenge_submissions 
      WHERE participation_id = ${participationData.id}
    ` as any[];

    if (submissions.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot leave challenge after making submissions' },
        { status: 400 }
      );
    }

    // Delete participation
    await prisma.$executeRaw`
      DELETE FROM challenge_participation WHERE id = ${participationData.id}
    `;

    return NextResponse.json({
      success: true,
      data: {
        message: `Left "${participationData.challenge_name}" successfully`
      }
    });

  } catch (error) {
    console.error('Error leaving challenge:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to leave challenge' },
      { status: 500 }
    );
  }
}

async function getUserStats(userId: string): Promise<any> {
  // Get user stats from various sources
  const userPoints = await prisma.userPoints.findUnique({
    where: { user_id: userId }
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      location: true,
      created_at: true
    }
  });

  return {
    level: userPoints?.level || 1,
    points: userPoints?.current_balance || 0,
    achievements: userPoints?.achievements || [],
    location: user?.location || '',
    accountAge: user?.created_at ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0
  };
}

function generateId(): string {
  return 'participation_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}