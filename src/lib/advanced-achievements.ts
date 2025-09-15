// Week 22: Advanced Achievement System - Progressive Chains & Hidden Achievements

export interface AchievementChain {
  id: string;
  name: string;
  description: string;
  category: string;
  totalLevels: number;
  chainData?: any;
  isActive: boolean;
  achievements: EnhancedAchievement[];
}

export interface EnhancedAchievement {
  id: string;
  chainId?: string;
  level?: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  achievementType: 'standard' | 'progressive' | 'hidden' | 'collaborative';
  isHidden: boolean;
  discoveryHint?: string;
  requirements: AchievementRequirements;
  rewards: AchievementRewards;
  pointsReward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  isActive: boolean;
}

export interface AchievementRequirements {
  [key: string]: any;
  minimumLevel?: number;
  dependencies?: string[]; // Other achievement IDs that must be completed first
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'lifetime';
  collaborative?: {
    requiredUsers: number;
    communityGoal: number;
  };
}

export interface AchievementRewards {
  points: number;
  badges?: string[];
  perks?: string[];
  unlocks?: string[];
  specialItems?: string[];
}

export interface UserAchievementProgress {
  id: string;
  userId: string;
  achievementId: string;
  progressPercentage: number;
  currentValues: { [key: string]: any };
  unlockedAt?: Date;
  isDiscovered: boolean;
  discoveredAt?: Date;
}

export interface ChainProgress {
  id: string;
  userId: string;
  chainId: string;
  currentLevel: number;
  completedAt?: Date;
  progressData: { [key: string]: any };
}

// Progressive Achievement Chains
export const PROGRESSIVE_CHAINS: AchievementChain[] = [
  {
    id: 'community_expert_chain',
    name: 'Community Expert Journey',
    description: 'Progress from newcomer to community expert',
    category: 'community',
    totalLevels: 5,
    isActive: true,
    achievements: [
      {
        id: 'ce_first_steps',
        chainId: 'community_expert_chain',
        level: 1,
        name: 'First Paw Print',
        description: 'Post your first question or answer',
        icon: '👶',
        category: 'community',
        achievementType: 'progressive',
        isHidden: false,
        requirements: {
          first_post: true,
          minimumLevel: 1
        },
        rewards: {
          points: 25,
          badges: ['newcomer'],
          perks: ['community_welcome_guide']
        },
        pointsReward: 25,
        rarity: 'common',
        isActive: true
      },
      {
        id: 'ce_getting_involved',
        chainId: 'community_expert_chain',
        level: 2,
        name: 'Active Member',
        description: 'Actively participate for 7 days',
        icon: '🚶',
        category: 'community',
        achievementType: 'progressive',
        isHidden: false,
        requirements: {
          active_days: 7,
          posts: 5,
          dependencies: ['ce_first_steps']
        },
        rewards: {
          points: 75,
          badges: ['active_member'],
          perks: ['priority_support']
        },
        pointsReward: 75,
        rarity: 'common',
        isActive: true
      },
      {
        id: 'ce_community_helper',
        chainId: 'community_expert_chain',
        level: 3,
        name: 'Community Helper',
        description: 'Help others with 25 helpful answers',
        icon: '🤝',
        category: 'community',
        achievementType: 'progressive',
        isHidden: false,
        requirements: {
          helpful_answers: 25,
          avg_rating: 4.0,
          dependencies: ['ce_getting_involved']
        },
        rewards: {
          points: 150,
          badges: ['helper'],
          perks: ['expert_consultation_discount']
        },
        pointsReward: 150,
        rarity: 'rare',
        isActive: true
      },
      {
        id: 'ce_trusted_advisor',
        chainId: 'community_expert_chain',
        level: 4,
        name: 'Trusted Advisor',
        description: 'Become a go-to expert in your area',
        icon: '🎓',
        category: 'community',
        achievementType: 'progressive',
        isHidden: false,
        requirements: {
          expert_answers: 100,
          upvotes: 500,
          best_answers: 15,
          dependencies: ['ce_community_helper']
        },
        rewards: {
          points: 300,
          badges: ['trusted_advisor'],
          perks: ['verified_expert_status', 'featured_profile']
        },
        pointsReward: 300,
        rarity: 'epic',
        isActive: true
      },
      {
        id: 'ce_community_legend',
        chainId: 'community_expert_chain',
        level: 5,
        name: 'Community Legend',
        description: 'Achieve legendary status in the community',
        icon: '👑',
        category: 'community',
        achievementType: 'progressive',
        isHidden: false,
        requirements: {
          total_contributions: 1000,
          community_votes: 2000,
          mentored_users: 10,
          dependencies: ['ce_trusted_advisor']
        },
        rewards: {
          points: 1000,
          badges: ['legend'],
          perks: ['lifetime_premium', 'community_ambassador', 'exclusive_events']
        },
        pointsReward: 1000,
        rarity: 'legendary',
        isActive: true
      }
    ]
  },
  
  {
    id: 'dog_care_master_chain',
    name: 'Dog Care Mastery',
    description: 'Master the art of caring for your furry friend',
    category: 'dog_care',
    totalLevels: 4,
    isActive: true,
    achievements: [
      {
        id: 'dcm_new_parent',
        chainId: 'dog_care_master_chain',
        level: 1,
        name: 'New Dog Parent',
        description: 'Add your first dog profile',
        icon: '🐕',
        category: 'dog_care',
        achievementType: 'progressive',
        isHidden: false,
        requirements: {
          dog_profiles_added: 1
        },
        rewards: {
          points: 50,
          badges: ['new_parent'],
          perks: ['care_guide_access']
        },
        pointsReward: 50,
        rarity: 'common',
        isActive: true
      },
      {
        id: 'dcm_health_tracker',
        chainId: 'dog_care_master_chain',
        level: 2,
        name: 'Health Tracker',
        description: 'Log health data for 30 consecutive days',
        icon: '📊',
        category: 'dog_care',
        achievementType: 'progressive',
        isHidden: false,
        requirements: {
          health_logs_streak: 30,
          dependencies: ['dcm_new_parent']
        },
        rewards: {
          points: 200,
          badges: ['health_tracker'],
          perks: ['advanced_analytics', 'vet_consultation_credit']
        },
        pointsReward: 200,
        rarity: 'rare',
        isActive: true
      },
      {
        id: 'dcm_wellness_advocate',
        chainId: 'dog_care_master_chain',
        level: 3,
        name: 'Wellness Advocate',
        description: 'Maintain perfect vaccination and health records',
        icon: '🏥',
        category: 'dog_care',
        achievementType: 'progressive',
        isHidden: false,
        requirements: {
          vaccination_compliance: 100,
          health_milestones: 10,
          vet_visits_logged: 5,
          dependencies: ['dcm_health_tracker']
        },
        rewards: {
          points: 400,
          badges: ['wellness_advocate'],
          perks: ['health_insurance_discount', 'priority_vet_booking']
        },
        pointsReward: 400,
        rarity: 'epic',
        isActive: true
      },
      {
        id: 'dcm_care_expert',
        chainId: 'dog_care_master_chain',
        level: 4,
        name: 'Dog Care Expert',
        description: 'Share your expertise and help other parents',
        icon: '🎖️',
        category: 'dog_care',
        achievementType: 'progressive',
        isHidden: false,
        requirements: {
          care_guides_created: 5,
          health_questions_answered: 50,
          care_tips_shared: 25,
          dependencies: ['dcm_wellness_advocate']
        },
        rewards: {
          points: 750,
          badges: ['care_expert'],
          perks: ['expert_status', 'featured_content', 'speaking_opportunities']
        },
        pointsReward: 750,
        rarity: 'legendary',
        isActive: true
      }
    ]
  }
];

// Hidden Achievements
export const HIDDEN_ACHIEVEMENTS: EnhancedAchievement[] = [
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Active between 11 PM - 5 AM for 10 days',
    icon: '🦉',
    category: 'behavior',
    achievementType: 'hidden',
    isHidden: true,
    discoveryHint: 'Some of the best conversations happen when most are sleeping...',
    requirements: {
      night_activity_days: 10,
      activity_window: { start: '23:00', end: '05:00' }
    },
    rewards: {
      points: 200,
      badges: ['night_owl'],
      perks: ['night_mode_theme', 'quiet_hours_badge']
    },
    pointsReward: 200,
    rarity: 'rare',
    isActive: true
  },
  
  {
    id: 'festive_spirit',
    name: 'Festive Spirit',
    description: 'Participate during all major Indian festivals in a year',
    icon: '🎆',
    category: 'cultural',
    achievementType: 'hidden',
    isHidden: true,
    discoveryHint: 'Celebrations are better when shared with the community...',
    requirements: {
      festival_participation: ['diwali', 'holi', 'dussehra', 'independence_day', 'republic_day'],
      timeframe: 'yearly'
    },
    rewards: {
      points: 500,
      badges: ['festive_spirit'],
      perks: ['festival_exclusive_themes', 'cultural_ambassador']
    },
    pointsReward: 500,
    rarity: 'epic',
    isActive: true
  },
  
  {
    id: 'mentor_soul',
    name: 'Mentor Soul',
    description: 'Help 5 new users get their first 100 points',
    icon: '🧭',
    category: 'mentorship',
    achievementType: 'hidden',
    isHidden: true,
    discoveryHint: 'The best teachers create more teachers...',
    requirements: {
      mentored_users_to_milestone: 5,
      milestone_threshold: 100
    },
    rewards: {
      points: 400,
      badges: ['mentor'],
      perks: ['mentor_status', 'mentorship_tools', 'exclusive_mentor_events']
    },
    pointsReward: 400,
    rarity: 'epic',
    isActive: true
  },
  
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'First to comment on 20 posts within 5 minutes of posting',
    icon: '🐦',
    category: 'engagement',
    achievementType: 'hidden',
    isHidden: true,
    discoveryHint: 'The early bird catches the worm... and the conversation!',
    requirements: {
      early_comments: 20,
      time_window_minutes: 5
    },
    rewards: {
      points: 150,
      badges: ['early_bird'],
      perks: ['notification_priority', 'early_access_features']
    },
    pointsReward: 150,
    rarity: 'rare',
    isActive: true
  },
  
  {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Most active community member for 4 consecutive weekends',
    icon: '⚔️',
    category: 'engagement',
    achievementType: 'hidden',
    isHidden: true,
    discoveryHint: 'Who says weekends are for rest?',
    requirements: {
      consecutive_weekend_streaks: 4,
      weekend_activity_threshold: 50 // points earned
    },
    rewards: {
      points: 300,
      badges: ['weekend_warrior'],
      perks: ['weekend_exclusive_content', 'priority_weekend_support']
    },
    pointsReward: 300,
    rarity: 'epic',
    isActive: true
  },
  
  {
    id: 'dog_whisperer',
    name: 'Dog Whisperer',
    description: 'Successfully predict dog behavior patterns based on health data',
    icon: '🔮',
    category: 'expertise',
    achievementType: 'hidden',
    isHidden: true,
    discoveryHint: 'Understanding your dog goes beyond words...',
    requirements: {
      accurate_behavior_predictions: 10,
      prediction_accuracy: 80 // percentage
    },
    rewards: {
      points: 600,
      badges: ['dog_whisperer'],
      perks: ['behavior_analysis_tools', 'expert_consultation_access']
    },
    pointsReward: 600,
    rarity: 'legendary',
    isActive: true
  }
];

export class AdvancedAchievementManager {
  
  // Check and update chain progress
  static async updateChainProgress(userId: string, userStats: any): Promise<{
    levelUps: any[],
    newAchievements: string[],
    discoveredHidden: string[]
  }> {
    const results = {
      levelUps: [] as any[],
      newAchievements: [] as string[],
      discoveredHidden: [] as string[]
    };

    // Check each progressive chain
    for (const chain of PROGRESSIVE_CHAINS) {
      const chainResult = await this.processChainProgress(userId, chain, userStats);
      results.levelUps.push(...chainResult.levelUps);
      results.newAchievements.push(...chainResult.newAchievements);
    }

    // Check hidden achievements
    const hiddenResults = await this.checkHiddenAchievements(userId, userStats);
    results.discoveredHidden.push(...hiddenResults);

    return results;
  }

  private static async processChainProgress(
    userId: string, 
    chain: AchievementChain, 
    userStats: any
  ): Promise<{
    levelUps: any[],
    newAchievements: string[]
  }> {
    const results = {
      levelUps: [] as any[],
      newAchievements: [] as string[]
    };

    // Get current progress from database (mock for now)
    const currentProgress = await this.getCurrentChainProgress(userId, chain.id);
    
    // Check each level in the chain
    for (const achievement of chain.achievements.sort((a, b) => (a.level || 0) - (b.level || 0))) {
      if ((achievement.level || 0) <= currentProgress.currentLevel) {
        continue; // Already completed this level
      }

      const isEligible = await this.checkAchievementEligibility(achievement, userStats);
      
      if (isEligible) {
        results.newAchievements.push(achievement.id);
        
        if (achievement.level && achievement.level > currentProgress.currentLevel) {
          results.levelUps.push({
            chainId: chain.id,
            chainName: chain.name,
            previousLevel: currentProgress.currentLevel,
            newLevel: achievement.level,
            achievement: achievement
          });
        }
        break; // Only unlock one level at a time
      }
    }

    return results;
  }

  private static async checkHiddenAchievements(userId: string, userStats: any): Promise<string[]> {
    const discovered: string[] = [];

    // Get user's discovered hidden achievements
    const discoveredIds = await this.getDiscoveredHiddenAchievements(userId);

    for (const achievement of HIDDEN_ACHIEVEMENTS) {
      if (discoveredIds.includes(achievement.id)) {
        continue; // Already discovered
      }

      const isDiscovered = await this.checkHiddenAchievementDiscovery(achievement, userStats);
      
      if (isDiscovered) {
        discovered.push(achievement.id);
        // Record discovery in database
        await this.recordHiddenAchievementDiscovery(userId, achievement.id, userStats);
      }
    }

    return discovered;
  }

  private static async checkAchievementEligibility(
    achievement: EnhancedAchievement, 
    userStats: any
  ): Promise<boolean> {
    const reqs = achievement.requirements;

    // Check dependencies first
    if (reqs.dependencies && reqs.dependencies.length > 0) {
      // Mock check - in real implementation, check database
      const hasAllDependencies = reqs.dependencies.every(dep => 
        userStats.completedAchievements?.includes(dep)
      );
      if (!hasAllDependencies) return false;
    }

    // Check specific requirements
    for (const [key, value] of Object.entries(reqs)) {
      if (key === 'dependencies' || key === 'timeframe') continue;

      if (typeof value === 'number') {
        if ((userStats[key] || 0) < value) return false;
      } else if (typeof value === 'boolean') {
        if (!userStats[key]) return false;
      } else if (Array.isArray(value)) {
        const userValue = userStats[key] || [];
        if (!value.every(item => userValue.includes(item))) return false;
      }
    }

    return true;
  }

  private static async checkHiddenAchievementDiscovery(
    achievement: EnhancedAchievement,
    userStats: any
  ): Promise<boolean> {
    // Special logic for hidden achievements
    const reqs = achievement.requirements;

    switch (achievement.id) {
      case 'night_owl':
        return (userStats.night_activity_days || 0) >= (reqs.night_activity_days || 10);
      
      case 'festive_spirit':
        const requiredFestivals = reqs.festival_participation || [];
        const userFestivals = userStats.festival_participation || [];
        return requiredFestivals.every(festival => userFestivals.includes(festival));
      
      case 'mentor_soul':
        return (userStats.mentored_users_to_milestone || 0) >= (reqs.mentored_users_to_milestone || 5);
      
      case 'early_bird':
        return (userStats.early_comments || 0) >= (reqs.early_comments || 20);
      
      case 'weekend_warrior':
        return (userStats.consecutive_weekend_streaks || 0) >= (reqs.consecutive_weekend_streaks || 4);
      
      case 'dog_whisperer':
        return (userStats.accurate_behavior_predictions || 0) >= (reqs.accurate_behavior_predictions || 10) &&
               (userStats.prediction_accuracy || 0) >= (reqs.prediction_accuracy || 80);
      
      default:
        return false;
    }
  }

  // Mock database functions - to be replaced with actual Prisma calls
  private static async getCurrentChainProgress(userId: string, chainId: string): Promise<ChainProgress> {
    // Mock implementation
    return {
      id: 'mock',
      userId,
      chainId,
      currentLevel: 0,
      progressData: {}
    };
  }

  private static async getDiscoveredHiddenAchievements(userId: string): Promise<string[]> {
    // Mock implementation
    return [];
  }

  private static async recordHiddenAchievementDiscovery(
    userId: string, 
    achievementId: string, 
    context: any
  ): Promise<void> {
    // Mock implementation - would save to database
    console.log(`Hidden achievement discovered: ${achievementId} by user ${userId}`);
  }

  // Utility functions
  static getAchievementChainById(chainId: string): AchievementChain | undefined {
    return PROGRESSIVE_CHAINS.find(chain => chain.id === chainId);
  }

  static getHiddenAchievementById(achievementId: string): EnhancedAchievement | undefined {
    return HIDDEN_ACHIEVEMENTS.find(achievement => achievement.id === achievementId);
  }

  static getAllAchievements(): EnhancedAchievement[] {
    const progressive = PROGRESSIVE_CHAINS.flatMap(chain => chain.achievements);
    return [...progressive, ...HIDDEN_ACHIEVEMENTS];
  }

  static getAchievementsByCategory(category: string): EnhancedAchievement[] {
    return this.getAllAchievements().filter(achievement => achievement.category === category);
  }

  static getDiscoveryHintsForUser(userId: string, userStats: any): string[] {
    const hints: string[] = [];
    
    for (const achievement of HIDDEN_ACHIEVEMENTS) {
      const progress = this.calculateHiddenProgress(achievement, userStats);
      
      // Show hints when user is 50% towards discovering the achievement
      if (progress >= 0.5 && progress < 1.0) {
        if (achievement.discoveryHint) {
          hints.push(achievement.discoveryHint);
        }
      }
    }

    return hints;
  }

  private static calculateHiddenProgress(achievement: EnhancedAchievement, userStats: any): number {
    const reqs = achievement.requirements;
    
    switch (achievement.id) {
      case 'night_owl':
        return Math.min((userStats.night_activity_days || 0) / (reqs.night_activity_days || 10), 1.0);
      
      case 'festive_spirit':
        const requiredCount = (reqs.festival_participation || []).length;
        const userCount = (userStats.festival_participation || []).length;
        return Math.min(userCount / requiredCount, 1.0);
      
      default:
        return 0;
    }
  }
}