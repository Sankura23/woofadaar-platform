// Week 21: Achievement & Badge System

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  pointsRequired: number;
  condition: AchievementCondition;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  indianContext?: boolean;
}

export interface AchievementCondition {
  type: 'count' | 'streak' | 'milestone' | 'special';
  target: number;
  metric: string;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all-time';
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedAt: Date;
  category: string;
  rarity: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Community Engagement Achievements
  {
    id: 'first_paw_print',
    name: 'First Paw Print',
    description: 'Posted your first question or answer',
    icon: '🐾',
    category: 'community',
    pointsRequired: 50,
    condition: { type: 'count', target: 1, metric: 'posts' },
    rarity: 'common'
  },
  {
    id: 'helpful_member',
    name: 'Helpful Member',
    description: 'Received 25 helpful votes from community',
    icon: '🤝',
    category: 'community',
    pointsRequired: 200,
    condition: { type: 'count', target: 25, metric: 'helpful_votes' },
    rarity: 'rare'
  },
  {
    id: 'expert_recognition',
    name: 'Expert Recognition',
    description: 'Had 10 answers marked as best answers',
    icon: '⭐',
    category: 'expertise',
    pointsRequired: 500,
    condition: { type: 'count', target: 10, metric: 'best_answers' },
    rarity: 'epic'
  },
  {
    id: 'community_champion',
    name: 'Community Champion',
    description: 'Made 100 contributions to the community',
    icon: '🏆',
    category: 'community',
    pointsRequired: 1000,
    condition: { type: 'count', target: 100, metric: 'total_contributions' },
    rarity: 'legendary'
  },

  // Dog Care Achievements
  {
    id: 'dog_parent_dedication',
    name: 'Dog Parent Dedication',
    description: 'Added complete profiles for 3 dogs',
    icon: '🐕',
    category: 'dog_care',
    pointsRequired: 300,
    condition: { type: 'count', target: 3, metric: 'dog_profiles' },
    rarity: 'common'
  },
  {
    id: 'health_advocate',
    name: 'Health Advocate',
    description: 'Logged health data for 30 days straight',
    icon: '🏥',
    category: 'health',
    pointsRequired: 600,
    condition: { type: 'streak', target: 30, metric: 'health_logs' },
    rarity: 'rare'
  },
  {
    id: 'vaccination_guardian',
    name: 'Vaccination Guardian',
    description: 'Kept vaccination records updated for all dogs',
    icon: '💉',
    category: 'health',
    pointsRequired: 400,
    condition: { type: 'special', target: 1, metric: 'vaccination_complete' },
    rarity: 'rare'
  },

  // Social Achievements
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Connected with 20 fellow dog parents',
    icon: '🦋',
    category: 'social',
    pointsRequired: 400,
    condition: { type: 'count', target: 20, metric: 'friend_connections' },
    rarity: 'rare'
  },
  {
    id: 'play_date_organizer',
    name: 'Play Date Organizer',
    description: 'Organized 5 successful play dates',
    icon: '🎾',
    category: 'social',
    pointsRequired: 250,
    condition: { type: 'count', target: 5, metric: 'play_dates_organized' },
    rarity: 'common'
  },

  // Streak Achievements
  {
    id: 'consistent_contributor',
    name: 'Consistent Contributor',
    description: 'Maintained a 30-day activity streak',
    icon: '🔥',
    category: 'engagement',
    pointsRequired: 800,
    condition: { type: 'streak', target: 30, metric: 'daily_activity' },
    rarity: 'epic'
  },
  {
    id: 'loyalty_legend',
    name: 'Loyalty Legend',
    description: 'Logged in for 100 consecutive days',
    icon: '👑',
    category: 'engagement',
    pointsRequired: 1500,
    condition: { type: 'streak', target: 100, metric: 'daily_login' },
    rarity: 'legendary'
  },

  // Indian Context Achievements
  {
    id: 'desi_dog_expert',
    name: 'Desi Dog Expert',
    description: 'Shared expertise about Indian dog breeds',
    icon: '🇮🇳',
    category: 'expertise',
    pointsRequired: 750,
    condition: { type: 'count', target: 10, metric: 'indian_breed_posts' },
    rarity: 'epic',
    indianContext: true
  },
  {
    id: 'festival_celebrant',
    name: 'Festival Celebrant',
    description: 'Participated during 3 major Indian festivals',
    icon: '🎉',
    category: 'cultural',
    pointsRequired: 500,
    condition: { type: 'count', target: 3, metric: 'festival_participation' },
    rarity: 'rare',
    indianContext: true
  },
  {
    id: 'city_ambassador',
    name: 'City Ambassador',
    description: 'Became top contributor in your city',
    icon: '🏙️',
    category: 'regional',
    pointsRequired: 1200,
    condition: { type: 'special', target: 1, metric: 'city_top_contributor' },
    rarity: 'legendary',
    indianContext: true
  },

  // Special Milestones
  {
    id: 'woofadaar_veteran',
    name: 'Woofadaar Veteran',
    description: 'Been part of community for 1 year',
    icon: '🎖️',
    category: 'milestone',
    pointsRequired: 2000,
    condition: { type: 'milestone', target: 365, metric: 'days_member' },
    rarity: 'legendary'
  },
  {
    id: 'content_creator',
    name: 'Content Creator',
    description: 'Created valuable guides and stories',
    icon: '📝',
    category: 'contribution',
    pointsRequired: 600,
    condition: { type: 'count', target: 15, metric: 'content_created' },
    rarity: 'rare'
  },
  {
    id: 'mentor_guide',
    name: 'Mentor Guide',
    description: 'Helped 10 new members get started',
    icon: '🧭',
    category: 'mentorship',
    pointsRequired: 800,
    condition: { type: 'count', target: 10, metric: 'mentorship_sessions' },
    rarity: 'epic'
  }
];

export class AchievementManager {
  static async checkUserAchievements(userId: string, userStats: any): Promise<string[]> {
    const newAchievements: string[] = [];

    // Get user's current achievements
    const currentUserPoints = await fetch(`/api/points?userId=${userId}`);
    const userPointsData = await currentUserPoints.json();
    const currentAchievements = userPointsData.data?.userPoints?.achievements || [];

    for (const achievement of ACHIEVEMENTS) {
      // Skip if user already has this achievement
      if (currentAchievements.includes(achievement.id)) continue;

      const isUnlocked = this.checkAchievementCondition(achievement.condition, userStats);
      
      if (isUnlocked) {
        newAchievements.push(achievement.id);
      }
    }

    return newAchievements;
  }

  private static checkAchievementCondition(condition: AchievementCondition, userStats: any): boolean {
    const { type, target, metric } = condition;
    const value = userStats[metric] || 0;

    switch (type) {
      case 'count':
        return value >= target;
      
      case 'streak':
        return value >= target;
      
      case 'milestone':
        return value >= target;
      
      case 'special':
        return value >= target;
      
      default:
        return false;
    }
  }

  static getAchievementById(id: string): Achievement | undefined {
    return ACHIEVEMENTS.find(achievement => achievement.id === id);
  }

  static getAchievementsByCategory(category: string): Achievement[] {
    return ACHIEVEMENTS.filter(achievement => achievement.category === category);
  }

  static getIndianAchievements(): Achievement[] {
    return ACHIEVEMENTS.filter(achievement => achievement.indianContext);
  }

  static calculateAchievementProgress(achievementId: string, userStats: any): number {
    const achievement = this.getAchievementById(achievementId);
    if (!achievement) return 0;

    const { target, metric } = achievement.condition;
    const currentValue = userStats[metric] || 0;
    
    return Math.min(100, (currentValue / target) * 100);
  }

  static async unlockAchievement(userId: string, achievementId: string): Promise<any> {
    try {
      const response = await fetch('/api/achievements/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        body: JSON.stringify({
          userId,
          achievementId
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Error unlocking achievement:', error);
      return { success: false, error: 'Failed to unlock achievement' };
    }
  }
}

// Badge rarity colors
export const BADGE_COLORS = {
  common: '#6B7280',    // Gray
  rare: '#3B82F6',      // Blue  
  epic: '#8B5CF6',      // Purple
  legendary: '#F59E0B'  // Gold
};

// Achievement notification helper
export function showAchievementNotification(achievementId: string) {
  const achievement = AchievementManager.getAchievementById(achievementId);
  if (!achievement) return;

  // This could be enhanced with a proper toast notification system
  if (typeof window !== 'undefined') {
    const message = `🎉 Achievement Unlocked!\n${achievement.icon} ${achievement.name}\n${achievement.description}`;
    
    // Simple alert for now - should be replaced with proper notification UI
    setTimeout(() => {
      alert(message);
    }, 500);
  }
}