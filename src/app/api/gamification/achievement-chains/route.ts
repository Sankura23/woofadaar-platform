import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { AdvancedAchievementManager, PROGRESSIVE_CHAINS } from '@/lib/advanced-achievements';

// Get all achievement chains for a user
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
    const includeProgress = searchParams.get('progress') === 'true';

    // Get all available chains
    const chains = PROGRESSIVE_CHAINS.map(chain => ({
      id: chain.id,
      name: chain.name,
      description: chain.description,
      category: chain.category,
      totalLevels: chain.totalLevels,
      isActive: chain.isActive,
      achievements: chain.achievements.map(achievement => ({
        id: achievement.id,
        level: achievement.level,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        pointsReward: achievement.pointsReward,
        rarity: achievement.rarity,
        requirements: achievement.requirements
      }))
    }));

    if (!includeProgress) {
      return NextResponse.json({
        success: true,
        data: { chains }
      });
    }

    // Get user's progress for each chain
    const progressData = await Promise.all(
      chains.map(async (chain) => {
        // Get chain progress from database
        const progress = await prisma.$queryRaw`
          SELECT * FROM chain_progress 
          WHERE user_id = ${userId} AND chain_id = ${chain.id}
        ` as any[];

        const currentProgress = progress[0] || {
          current_level: 0,
          progress_data: {}
        };

        // Get individual achievement progress
        const achievementProgress = await prisma.$queryRaw`
          SELECT uap.*, ea.name, ea.icon, ea.level
          FROM user_achievement_progress uap
          JOIN enhanced_achievements ea ON ea.id = uap.achievement_id
          WHERE uap.user_id = ${userId} 
          AND ea.chain_id = ${chain.id}
          ORDER BY ea.level
        ` as any[];

        return {
          ...chain,
          userProgress: {
            currentLevel: currentProgress.current_level,
            completedAt: currentProgress.completed_at,
            progressData: currentProgress.progress_data || {},
            achievements: achievementProgress.map((ap: any) => ({
              achievementId: ap.achievement_id,
              name: ap.name,
              icon: ap.icon,
              level: ap.level,
              progressPercentage: ap.progress_percentage,
              isUnlocked: !!ap.unlocked_at,
              unlockedAt: ap.unlocked_at
            }))
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        chains: progressData,
        totalChains: chains.length,
        userStats: {
          completedChains: progressData.filter(chain => chain.userProgress.completedAt).length,
          totalProgress: Math.round(
            progressData.reduce((sum, chain) => sum + (chain.userProgress.currentLevel / chain.totalLevels), 0) / chains.length * 100
          )
        }
      }
    });

  } catch (error) {
    console.error('Error fetching achievement chains:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch achievement chains' },
      { status: 500 }
    );
  }
}

// Update chain progress (usually called by system, not directly by users)
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
    const { userStats, triggerAction } = body;

    // Check for chain progress updates
    const progressResults = await AdvancedAchievementManager.updateChainProgress(userId, userStats);

    // Process any level ups
    for (const levelUp of progressResults.levelUps) {
      // Update chain progress in database
      await prisma.$executeRaw`
        INSERT INTO chain_progress (id, user_id, chain_id, current_level, progress_data)
        VALUES (${generateId()}, ${userId}, ${levelUp.chainId}, ${levelUp.newLevel}, ${JSON.stringify(levelUp.progressData || {})})
        ON CONFLICT (user_id, chain_id) 
        DO UPDATE SET 
          current_level = ${levelUp.newLevel},
          progress_data = ${JSON.stringify(levelUp.progressData || {})},
          updated_at = CURRENT_TIMESTAMP
      `;

      // Award points for the achievement
      await fetch('/api/points/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'achievement_unlock',
          sourceType: 'chain_progress',
          sourceId: levelUp.achievement.id,
          pointsAmount: levelUp.achievement.pointsReward,
          metadata: {
            chainName: levelUp.chainName,
            level: levelUp.newLevel,
            achievementName: levelUp.achievement.name
          }
        })
      });

      // Update user points achievements array
      const userPoints = await prisma.userPoints.findUnique({
        where: { user_id: userId }
      });

      if (userPoints) {
        const currentAchievements = Array.isArray(userPoints.achievements) ? userPoints.achievements : [];
        const updatedAchievements = [...currentAchievements, levelUp.achievement.id];

        await prisma.userPoints.update({
          where: { user_id: userId },
          data: {
            achievements: updatedAchievements
          }
        });
      }
    }

    // Process new achievements
    for (const achievementId of progressResults.newAchievements) {
      await prisma.$executeRaw`
        INSERT INTO user_achievement_progress (id, user_id, achievement_id, progress_percentage, unlocked_at)
        VALUES (${generateId()}, ${userId}, ${achievementId}, 100, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, achievement_id)
        DO UPDATE SET 
          progress_percentage = 100,
          unlocked_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `;
    }

    return NextResponse.json({
      success: true,
      data: {
        levelUps: progressResults.levelUps,
        newAchievements: progressResults.newAchievements.length,
        discoveredHidden: progressResults.discoveredHidden.length,
        message: `${progressResults.levelUps.length} level-ups, ${progressResults.newAchievements.length} new achievements unlocked!`
      }
    });

  } catch (error) {
    console.error('Error updating chain progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update chain progress' },
      { status: 500 }
    );
  }
}

function generateId(): string {
  return 'chain_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}