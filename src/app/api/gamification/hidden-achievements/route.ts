import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { AdvancedAchievementManager, HIDDEN_ACHIEVEMENTS } from '@/lib/advanced-achievements';

// Get user's hidden achievements (discovered ones only)
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
    const includeHints = searchParams.get('hints') === 'true';

    // Get discovered hidden achievements
    const discoveries = await prisma.$queryRaw`
      SELECT had.*, ea.name, ea.description, ea.icon, ea.category, ea.points_reward, ea.rarity
      FROM hidden_achievement_discoveries had
      JOIN enhanced_achievements ea ON ea.id = had.achievement_id
      WHERE had.user_id = ${userId}
      ORDER BY had.discovered_at DESC
    ` as any[];

    const discoveredAchievements = discoveries.map(discovery => ({
      id: discovery.achievement_id,
      name: discovery.name,
      description: discovery.description,
      icon: discovery.icon,
      category: discovery.category,
      pointsReward: discovery.points_reward,
      rarity: discovery.rarity,
      discoveredAt: discovery.discovered_at,
      discoveredThrough: discovery.discovered_through,
      discoveryContext: discovery.discovery_context
    }));

    let hints: string[] = [];
    let nearDiscovery: any[] = [];

    if (includeHints) {
      // Get user stats for hint calculation
      const userStats = await getUserStats(userId);
      
      // Get discovery hints
      hints = AdvancedAchievementManager.getDiscoveryHintsForUser(userId, userStats);
      
      // Get achievements that are close to discovery (but don't reveal what they are)
      const discoveredIds = discoveries.map(d => d.achievement_id);
      const undiscoveredAchievements = HIDDEN_ACHIEVEMENTS.filter(
        achievement => !discoveredIds.includes(achievement.id)
      );

      nearDiscovery = undiscoveredAchievements
        .map(achievement => {
          const progress = calculateHiddenProgress(achievement, userStats);
          return {
            category: achievement.category,
            progress: Math.round(progress * 100),
            hint: progress >= 0.3 ? achievement.discoveryHint : undefined,
            canShowHint: progress >= 0.5
          };
        })
        .filter(item => item.progress > 20) // Only show if some progress made
        .sort((a, b) => b.progress - a.progress);
    }

    // Get achievement stats
    const totalHidden = HIDDEN_ACHIEVEMENTS.length;
    const discoveredCount = discoveries.length;
    const discoveryRate = Math.round((discoveredCount / totalHidden) * 100);

    return NextResponse.json({
      success: true,
      data: {
        discoveredAchievements,
        hints,
        nearDiscovery: nearDiscovery.slice(0, 3), // Show top 3 closest discoveries
        stats: {
          totalHiddenAchievements: totalHidden,
          discoveredCount,
          discoveryRate,
          recentDiscoveries: discoveredAchievements.slice(0, 5)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching hidden achievements:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hidden achievements' },
      { status: 500 }
    );
  }
}

// Check for hidden achievement discoveries (called by system triggers)
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
    const { userStats, triggerAction, context } = body;

    // Check for new hidden achievement discoveries
    const discoveredIds = await AdvancedAchievementManager.updateChainProgress(userId, userStats);
    const newDiscoveries = discoveredIds.discoveredHidden;

    const discoveryResults = [];

    for (const achievementId of newDiscoveries) {
      const achievement = AdvancedAchievementManager.getHiddenAchievementById(achievementId);
      
      if (!achievement) continue;

      // Record the discovery
      await prisma.$executeRaw`
        INSERT INTO hidden_achievement_discoveries (id, user_id, achievement_id, discovered_through, discovery_context)
        VALUES (${generateId()}, ${userId}, ${achievementId}, ${triggerAction || 'system'}, ${JSON.stringify(context || {})})
        ON CONFLICT (user_id, achievement_id) DO NOTHING
      `;

      // Mark as discovered in progress table
      await prisma.$executeRaw`
        INSERT INTO user_achievement_progress (id, user_id, achievement_id, progress_percentage, is_discovered, discovered_at, unlocked_at)
        VALUES (${generateId()}, ${userId}, ${achievementId}, 100, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, achievement_id)
        DO UPDATE SET 
          progress_percentage = 100,
          is_discovered = true,
          discovered_at = CURRENT_TIMESTAMP,
          unlocked_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `;

      // Award points
      await fetch('/api/points/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'hidden_achievement_unlock',
          sourceType: 'hidden_achievement',
          sourceId: achievementId,
          pointsAmount: achievement.pointsReward,
          metadata: {
            achievementName: achievement.name,
            category: achievement.category,
            rarity: achievement.rarity,
            discoveredThrough: triggerAction
          }
        })
      });

      // Update user achievements list
      const userPoints = await prisma.userPoints.findUnique({
        where: { user_id: userId }
      });

      if (userPoints) {
        const currentAchievements = Array.isArray(userPoints.achievements) ? userPoints.achievements : [];
        const updatedAchievements = [...currentAchievements, achievementId];

        await prisma.userPoints.update({
          where: { user_id: userId },
          data: {
            achievements: updatedAchievements
          }
        });
      }

      discoveryResults.push({
        id: achievementId,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        pointsReward: achievement.pointsReward,
        rarity: achievement.rarity,
        discoveredThrough: triggerAction
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        newDiscoveries: discoveryResults,
        totalDiscovered: discoveryResults.length,
        message: discoveryResults.length > 0 
          ? `🎉 You discovered ${discoveryResults.length} hidden achievement${discoveryResults.length > 1 ? 's' : ''}!`
          : 'No new hidden achievements discovered'
      }
    });

  } catch (error) {
    console.error('Error checking hidden achievements:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check hidden achievements' },
      { status: 500 }
    );
  }
}

// Helper functions
async function getUserStats(userId: string): Promise<any> {
  // Gather user stats from various sources
  const userPoints = await prisma.userPoints.findUnique({
    where: { user_id: userId },
    include: {
      PointTransactions: {
        orderBy: { created_at: 'desc' },
        take: 100
      }
    }
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      CommunityQuestions: true,
      CommunityAnswers: true,
      CommunityComments: true,
      Dog: true
    }
  });

  if (!user || !userPoints) {
    return {};
  }

  // Calculate various stats for achievement checking
  const recentTransactions = userPoints.PointTransactions || [];
  const nightActivity = recentTransactions.filter(t => {
    const hour = new Date(t.created_at).getHours();
    return hour >= 23 || hour <= 5;
  });

  const weekendActivity = recentTransactions.filter(t => {
    const day = new Date(t.created_at).getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  });

  const festivalParticipation = recentTransactions
    .filter(t => t.description?.toLowerCase().includes('festival'))
    .map(t => extractFestivalFromDescription(t.description))
    .filter(Boolean);

  return {
    // Basic stats
    total_posts: (user.CommunityQuestions?.length || 0) + (user.CommunityAnswers?.length || 0),
    total_comments: user.CommunityComments?.length || 0,
    total_dogs: user.Dog?.length || 0,
    points_earned: userPoints.points_earned,
    current_level: userPoints.level,
    streak_days: userPoints.streak_count,
    
    // Hidden achievement specific stats
    night_activity_days: calculateUniqueActivityDays(nightActivity),
    weekend_activity_streaks: calculateWeekendStreaks(weekendActivity),
    festival_participation: Array.from(new Set(festivalParticipation)),
    early_comments: calculateEarlyComments(user.CommunityComments || []),
    
    // Behavior predictions (mock data for now)
    accurate_behavior_predictions: 0,
    prediction_accuracy: 0,
    
    // Mentorship stats (mock for now)
    mentored_users_to_milestone: 0
  };
}

function calculateHiddenProgress(achievement: any, userStats: any): number {
  const reqs = achievement.requirements;
  
  switch (achievement.id) {
    case 'night_owl':
      return Math.min((userStats.night_activity_days || 0) / (reqs.night_activity_days || 10), 1.0);
    
    case 'festive_spirit':
      const requiredCount = (reqs.festival_participation || []).length;
      const userCount = (userStats.festival_participation || []).length;
      return Math.min(userCount / requiredCount, 1.0);
    
    case 'mentor_soul':
      return Math.min((userStats.mentored_users_to_milestone || 0) / (reqs.mentored_users_to_milestone || 5), 1.0);
    
    case 'early_bird':
      return Math.min((userStats.early_comments || 0) / (reqs.early_comments || 20), 1.0);
    
    case 'weekend_warrior':
      return Math.min((userStats.weekend_activity_streaks || 0) / (reqs.consecutive_weekend_streaks || 4), 1.0);
    
    case 'dog_whisperer':
      const predictionsProgress = (userStats.accurate_behavior_predictions || 0) / (reqs.accurate_behavior_predictions || 10);
      const accuracyProgress = (userStats.prediction_accuracy || 0) / (reqs.prediction_accuracy || 80);
      return Math.min(Math.min(predictionsProgress, accuracyProgress), 1.0);
    
    default:
      return 0;
  }
}

function calculateUniqueActivityDays(transactions: any[]): number {
  const uniqueDays = new Set();
  transactions.forEach(t => {
    const date = new Date(t.created_at).toDateString();
    uniqueDays.add(date);
  });
  return uniqueDays.size;
}

function calculateWeekendStreaks(weekendTransactions: any[]): number {
  // Mock calculation - would need more sophisticated logic
  return Math.floor(weekendTransactions.length / 10);
}

function calculateEarlyComments(comments: any[]): number {
  // Mock calculation - would need to check timing relative to original posts
  return Math.floor(comments.length * 0.1);
}

function extractFestivalFromDescription(description: string): string | null {
  const festivals = ['diwali', 'holi', 'dussehra', 'independence_day', 'republic_day'];
  const desc = description.toLowerCase();
  return festivals.find(festival => desc.includes(festival)) || null;
}

function generateId(): string {
  return 'hidden_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}