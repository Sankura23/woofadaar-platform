import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { AchievementManager, ACHIEVEMENTS } from '@/lib/achievements-system';

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
    const { achievementId } = body;

    if (!achievementId) {
      return NextResponse.json(
        { success: false, error: 'Achievement ID required' },
        { status: 400 }
      );
    }

    // Get achievement details
    const achievement = AchievementManager.getAchievementById(achievementId);
    if (!achievement) {
      return NextResponse.json(
        { success: false, error: 'Invalid achievement ID' },
        { status: 400 }
      );
    }

    // Get user's current achievements
    const userPoints = await prisma.userPoints.findUnique({
      where: { user_id: userId }
    });

    if (!userPoints) {
      return NextResponse.json(
        { success: false, error: 'User points record not found' },
        { status: 404 }
      );
    }

    const currentAchievements = Array.isArray(userPoints.achievements) 
      ? userPoints.achievements 
      : [];

    // Check if already unlocked
    if (currentAchievements.includes(achievementId)) {
      return NextResponse.json(
        { success: false, error: 'Achievement already unlocked' },
        { status: 409 }
      );
    }

    // Add achievement to user's collection
    const updatedAchievements = [...currentAchievements, achievementId];
    
    // Also add to badges collection with timestamp
    const currentBadges = Array.isArray(userPoints.badges) ? userPoints.badges : [];
    const newBadge = {
      id: achievement.id,
      name: achievement.name,
      icon: achievement.icon,
      description: achievement.description,
      earnedAt: new Date().toISOString(),
      category: achievement.category,
      rarity: achievement.rarity
    };
    const updatedBadges = [...currentBadges, newBadge];

    // Update user points and award achievement points
    await prisma.userPoints.update({
      where: { user_id: userId },
      data: {
        achievements: updatedAchievements,
        badges: updatedBadges,
        points_earned: userPoints.points_earned + achievement.pointsRequired,
        current_balance: userPoints.current_balance + achievement.pointsRequired,
        total_lifetime_points: userPoints.total_lifetime_points + achievement.pointsRequired
      }
    });

    // Create transaction record for achievement points
    await prisma.pointTransaction.create({
      data: {
        user_id: userId,
        points_amount: achievement.pointsRequired,
        transaction_type: 'earned',
        source: 'achievement',
        source_id: achievementId,
        description: `Achievement unlocked: ${achievement.name}`
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        achievement: {
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          pointsAwarded: achievement.pointsRequired,
          rarity: achievement.rarity
        },
        badge: newBadge,
        totalAchievements: updatedAchievements.length
      }
    });

  } catch (error) {
    console.error('Error unlocking achievement:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unlock achievement' },
      { status: 500 }
    );
  }
}

// Get user's achievements and progress
export async function GET(request: NextRequest) {
  try {
    const userId = await verifyToken(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userPoints = await prisma.userPoints.findUnique({
      where: { user_id: userId }
    });

    if (!userPoints) {
      return NextResponse.json({
        success: true,
        data: {
          unlockedAchievements: [],
          badges: [],
          totalAchievements: 0,
          allAchievements: ACHIEVEMENTS
        }
      });
    }

    const unlockedAchievements = Array.isArray(userPoints.achievements) 
      ? userPoints.achievements 
      : [];

    const badges = Array.isArray(userPoints.badges) 
      ? userPoints.badges 
      : [];

    // Calculate progress for locked achievements
    const achievementsWithProgress = ACHIEVEMENTS.map(achievement => ({
      ...achievement,
      isUnlocked: unlockedAchievements.includes(achievement.id),
      // Progress calculation would need user stats - simplified for now
      progress: unlockedAchievements.includes(achievement.id) ? 100 : 0
    }));

    return NextResponse.json({
      success: true,
      data: {
        unlockedAchievements: achievementsWithProgress.filter(a => a.isUnlocked),
        lockedAchievements: achievementsWithProgress.filter(a => !a.isUnlocked),
        badges,
        totalAchievements: unlockedAchievements.length,
        totalPossibleAchievements: ACHIEVEMENTS.length,
        completionPercentage: Math.round((unlockedAchievements.length / ACHIEVEMENTS.length) * 100)
      }
    });

  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}