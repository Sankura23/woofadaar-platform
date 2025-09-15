import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { PointsManager, POINTS_CONFIG } from '@/lib/points-system';

// Enhanced endpoint specifically for automated point awarding
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
    const { 
      action,
      sourceType,
      sourceId,
      userContext = {},
      indianContext = {},
      metadata = {}
    } = body;

    // Validate action exists
    if (!POINTS_CONFIG.basePoints[action as keyof typeof POINTS_CONFIG.basePoints]) {
      return NextResponse.json(
        { success: false, error: 'Invalid action specified' },
        { status: 400 }
      );
    }

    // Check for duplicate awards (prevent gaming)
    if (sourceType && sourceId) {
      const existingTransaction = await prisma.pointTransaction.findFirst({
        where: {
          user_id: userId,
          source: sourceType,
          source_id: sourceId
        }
      });

      if (existingTransaction) {
        return NextResponse.json(
          { success: false, error: 'Points already awarded for this action' },
          { status: 409 }
        );
      }
    }

    // Get user details for context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        created_at: true,
        location: true,
        UserPoints: {
          select: {
            level: true,
            streak_count: true,
            total_lifetime_points: true
          }
        }
      }
    });

    // Enhanced user context
    const enhancedContext = {
      ...userContext,
      isNewUser: user?.created_at && new Date().getTime() - user.created_at.getTime() < 30 * 24 * 60 * 60 * 1000,
      isWeekend: [0, 6].includes(new Date().getDay()),
      isBirthdayMonth: metadata.isBirthdayMonth || false
    };

    // Enhanced Indian context
    const enhancedIndianContext = {
      ...indianContext,
      city: user?.location || indianContext.city,
      festival: metadata.currentFestival || indianContext.festival
    };

    // Calculate points with all multipliers
    const pointsCalc = PointsManager.calculatePoints(
      action as keyof typeof POINTS_CONFIG.basePoints,
      enhancedContext
    );

    const indianBonus = PointsManager.getIndianContextBonus(enhancedIndianContext);
    const finalPoints = Math.round(pointsCalc.points * indianBonus);
    const totalMultiplier = pointsCalc.multiplier * indianBonus;

    // Create description with context
    const actionDescriptions = {
      questionPost: 'Posted a question in community',
      answerPost: 'Provided an answer',
      bestAnswer: 'Answer marked as best by community',
      commentPost: 'Added a helpful comment',
      helpfulVote: 'Received a helpful vote',
      expertVerification: 'Verified by community expert',
      profileComplete: 'Completed profile setup',
      dogProfileAdd: 'Added dog profile',
      photoUpload: 'Uploaded photo',
      storyShare: 'Shared a story',
      reviewWrite: 'Wrote a review',
      healthLogEntry: 'Logged health data',
      medicationReminder: 'Set medication reminder',
      vetVisitLog: 'Logged vet visit',
      vaccinationUpdate: 'Updated vaccination record',
      healthMilestone: 'Achieved health milestone',
      forumParticipation: 'Participated in forum discussion',
      eventAttendance: 'Attended community event',
      workshopCompletion: 'Completed workshop',
      mentorshipSession: 'Participated in mentorship',
      friendConnect: 'Connected with another member',
      playDateOrganize: 'Organized a play date',
      communityHelp: 'Helped community member',
      referralSuccess: 'Successfully referred new member',
      dailyLogin: 'Daily login bonus',
      weeklyStreak: 'Weekly streak bonus',
      monthlyActive: 'Monthly activity bonus',
      expertAnswer: 'Provided expert-level answer',
      moderatorAction: 'Performed moderation action',
      contentCreation: 'Created valuable content',
      communityGuide: 'Created community guide',
      bugReport: 'Reported a bug'
    };

    let description = actionDescriptions[action as keyof typeof actionDescriptions] || `Points for ${action}`;
    
    if (totalMultiplier > 1) {
      description += ` (${totalMultiplier}x multiplier applied)`;
    }

    // Get current user points
    const currentUserPoints = await prisma.userPoints.findUnique({
      where: { user_id: userId }
    });

    const newTotalPoints = (currentUserPoints?.total_lifetime_points || 0) + finalPoints;
    const levelInfo = PointsManager.calculateLevel(newTotalPoints);

    // Update or create user points
    if (!currentUserPoints) {
      await prisma.userPoints.create({
        data: {
          user_id: userId,
          points_earned: finalPoints,
          points_spent: 0,
          current_balance: finalPoints,
          total_lifetime_points: finalPoints,
          level: levelInfo.level,
          experience_points: newTotalPoints
        }
      });
    } else {
      await prisma.userPoints.update({
        where: { user_id: userId },
        data: {
          points_earned: currentUserPoints.points_earned + finalPoints,
          current_balance: currentUserPoints.current_balance + finalPoints,
          total_lifetime_points: newTotalPoints,
          level: levelInfo.level,
          experience_points: newTotalPoints,
          updated_at: new Date()
        }
      });
    }

    // Create transaction record
    const transaction = await prisma.pointTransaction.create({
      data: {
        user_id: userId,
        points_amount: finalPoints,
        transaction_type: 'earned',
        source: sourceType || action,
        source_id: sourceId,
        description
      }
    });

    // Check for level up achievement
    const previousLevel = currentUserPoints?.level || 1;
    const leveledUp = levelInfo.level > previousLevel;

    return NextResponse.json({
      success: true,
      data: {
        transaction,
        pointsAwarded: finalPoints,
        basePoints: pointsCalc.points / pointsCalc.multiplier,
        multiplierApplied: totalMultiplier,
        newLevel: levelInfo.level,
        leveledUp,
        pointsToNextLevel: levelInfo.pointsToNext,
        totalLifetimePoints: newTotalPoints
      }
    });

  } catch (error) {
    console.error('Error awarding points:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to award points' },
      { status: 500 }
    );
  }
}