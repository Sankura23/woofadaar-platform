// Week 22 Phase 2: Seasonal Challenges & Contest System

export interface SeasonalChallenge {
  id: string;
  name: string;
  description: string;
  challengeType: 'monthly' | 'festival' | 'contest' | 'community' | 'weekly';
  category: 'photo' | 'story' | 'knowledge' | 'activity' | 'health' | 'social';
  startDate: Date;
  endDate: Date;
  pointReward: number;
  maxParticipants?: number;
  rules: ChallengeRules;
  prizes?: ChallengePrizes;
  isActive: boolean;
  isFeatured: boolean;
  createdBy: string;
}

export interface ChallengeRules {
  submissionType: 'photo' | 'story' | 'quiz' | 'activity_log' | 'video' | 'poll';
  requirements: {
    [key: string]: any;
    minimumWords?: number;
    photoRequired?: boolean;
    maxPhotos?: number;
    tags?: string[];
    categories?: string[];
  };
  eligibility: {
    minimumLevel?: number;
    minimumPoints?: number;
    requiredAchievements?: string[];
    locationRestriction?: string[];
  };
  judging: {
    method: 'community_vote' | 'expert_review' | 'automatic' | 'hybrid';
    criteria: string[];
    votingPeriodDays?: number;
  };
}

export interface ChallengePrizes {
  first: {
    points: number;
    badges: string[];
    perks: string[];
    physicalRewards?: string[];
  };
  second?: {
    points: number;
    badges: string[];
    perks: string[];
  };
  third?: {
    points: number;
    badges: string[];
    perks: string[];
  };
  participation: {
    points: number;
    badges?: string[];
  };
}

export interface ChallengeParticipation {
  id: string;
  challengeId: string;
  userId: string;
  joinedAt: Date;
  completedAt?: Date;
  status: 'active' | 'completed' | 'disqualified' | 'winner';
  completionScore?: number;
  progressData: { [key: string]: any };
}

export interface ChallengeSubmission {
  id: string;
  challengeId: string;
  participationId: string;
  userId: string;
  submissionType: string;
  title: string;
  content: string;
  mediaUrls: string[];
  submissionData: { [key: string]: any };
  votesCount: number;
  likesCount: number;
  status: 'pending' | 'approved' | 'rejected' | 'winner';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewerComments?: string;
}

export interface ChallengeTemplate {
  id: string;
  name: string;
  description: string;
  challengeType: string;
  category: string;
  durationDays: number;
  rules: ChallengeRules;
  requirements: { [key: string]: any };
  rewards: ChallengePrizes;
  recurrence?: 'weekly' | 'monthly' | 'seasonal' | 'yearly';
  isActive: boolean;
}

// Monthly Challenge Templates
export const MONTHLY_CHALLENGES: ChallengeTemplate[] = [
  {
    id: 'january_health_check',
    name: 'January Health Champion',
    description: 'Start the year right with comprehensive health tracking for your dog',
    challengeType: 'monthly',
    category: 'health',
    durationDays: 31,
    rules: {
      submissionType: 'activity_log',
      requirements: {
        health_logs_count: 20,
        vet_visits_logged: 1,
        weight_tracking_days: 15,
        vaccination_update: true
      },
      eligibility: {
        minimumLevel: 1
      },
      judging: {
        method: 'automatic',
        criteria: ['completeness', 'consistency', 'accuracy']
      }
    },
    requirements: {
      health_logs: 20,
      vet_visits_logged: 1,
      weight_tracking: 15
    },
    rewards: {
      first: {
        points: 1000,
        badges: ['health_champion_jan'],
        perks: ['vet_consultation_free', 'premium_health_analytics'],
        physicalRewards: ['premium_health_kit']
      },
      second: {
        points: 750,
        badges: ['health_runner_up'],
        perks: ['vet_discount_50']
      },
      third: {
        points: 500,
        badges: ['health_achiever'],
        perks: ['health_report_premium']
      },
      participation: {
        points: 200,
        badges: ['health_participant_jan']
      }
    },
    recurrence: 'yearly',
    isActive: true
  },
  
  {
    id: 'february_love_stories',
    name: 'February Love Stories',
    description: 'Share heartwarming stories about your bond with your furry valentine',
    challengeType: 'monthly',
    category: 'story',
    durationDays: 28,
    rules: {
      submissionType: 'story',
      requirements: {
        minimumWords: 200,
        photoRequired: true,
        maxPhotos: 3,
        tags: ['love', 'bond', 'valentine']
      },
      eligibility: {
        minimumLevel: 1
      },
      judging: {
        method: 'hybrid',
        criteria: ['creativity', 'emotional_impact', 'storytelling', 'photo_quality'],
        votingPeriodDays: 7
      }
    },
    requirements: {
      story_submissions: 1,
      minimum_words: 200,
      photos_required: 2
    },
    rewards: {
      first: {
        points: 800,
        badges: ['storyteller_champion'],
        perks: ['featured_story_homepage', 'writing_workshop_access'],
        physicalRewards: ['custom_photo_book']
      },
      second: {
        points: 600,
        badges: ['creative_writer'],
        perks: ['story_highlight']
      },
      third: {
        points: 400,
        badges: ['love_story_teller'],
        perks: ['community_spotlight']
      },
      participation: {
        points: 150,
        badges: ['february_storyteller']
      }
    },
    recurrence: 'yearly',
    isActive: true
  },

  {
    id: 'march_training_mastery',
    name: 'March Training Mastery',
    description: 'Showcase your dog\'s training progress and learn new skills together',
    challengeType: 'monthly',
    category: 'activity',
    durationDays: 31,
    rules: {
      submissionType: 'video',
      requirements: {
        training_videos: 3,
        different_commands: 5,
        progress_documentation: true,
        before_after_comparison: true
      },
      eligibility: {
        minimumLevel: 2
      },
      judging: {
        method: 'expert_review',
        criteria: ['training_effectiveness', 'technique', 'progress_shown', 'creativity']
      }
    },
    requirements: {
      training_sessions: 15,
      commands_learned: 3,
      progress_videos: 2
    },
    rewards: {
      first: {
        points: 1200,
        badges: ['training_master'],
        perks: ['professional_trainer_session', 'advanced_training_course'],
        physicalRewards: ['premium_training_kit']
      },
      second: {
        points: 900,
        badges: ['training_expert'],
        perks: ['training_guide_access']
      },
      third: {
        points: 600,
        badges: ['training_achiever'],
        perks: ['training_tips_premium']
      },
      participation: {
        points: 250,
        badges: ['march_trainer']
      }
    },
    recurrence: 'yearly',
    isActive: true
  }
];

// Festival Challenges
export const FESTIVAL_CHALLENGES: ChallengeTemplate[] = [
  {
    id: 'diwali_pet_safety',
    name: 'Diwali Pet Safety Challenge',
    description: 'Keep your pets safe and calm during Diwali celebrations while enjoying the festival',
    challengeType: 'festival',
    category: 'knowledge',
    durationDays: 7,
    rules: {
      submissionType: 'photo',
      requirements: {
        safety_quiz_completed: true,
        safety_tips_shared: 3,
        calming_setup_photo: true,
        safety_story: true
      },
      eligibility: {},
      judging: {
        method: 'community_vote',
        criteria: ['safety_awareness', 'creativity', 'helpfulness_to_community'],
        votingPeriodDays: 3
      }
    },
    requirements: {
      safety_quiz_completed: true,
      safety_tips_shared: 3,
      calming_technique_tried: 1
    },
    rewards: {
      first: {
        points: 800,
        badges: ['diwali_safety_champion'],
        perks: ['festival_safety_expert', 'community_safety_ambassador']
      },
      participation: {
        points: 200,
        badges: ['diwali_participant']
      }
    },
    isActive: true
  },

  {
    id: 'holi_color_safety',
    name: 'Holi Color Safety Challenge',
    description: 'Protect your pet from harmful colors while celebrating the festival of colors',
    challengeType: 'festival',
    category: 'activity',
    durationDays: 5,
    rules: {
      submissionType: 'photo',
      requirements: {
        safety_preparation_photo: true,
        before_after_photos: 2,
        safety_story_shared: true,
        natural_colors_info: true
      },
      eligibility: {},
      judging: {
        method: 'expert_review',
        criteria: ['safety_measures', 'preparation_thoroughness', 'educational_value']
      }
    },
    requirements: {
      safety_preparation: true,
      before_after_photos: 2,
      safety_story_shared: 1
    },
    rewards: {
      first: {
        points: 600,
        badges: ['holi_safety_expert'],
        perks: ['festival_safety_guide_author']
      },
      participation: {
        points: 150,
        badges: ['holi_celebrant']
      }
    },
    isActive: true
  },

  {
    id: 'ganesh_chaturthi_community',
    name: 'Ganesh Chaturthi Community Challenge',
    description: 'Celebrate Ganesh Chaturthi while keeping pets calm during processions',
    challengeType: 'festival',
    category: 'social',
    durationDays: 11,
    rules: {
      submissionType: 'story',
      requirements: {
        community_participation_story: true,
        pet_calm_techniques: 3,
        festival_safety_tips: 2,
        cultural_respect_story: true
      },
      eligibility: {},
      judging: {
        method: 'hybrid',
        criteria: ['cultural_sensitivity', 'pet_safety_awareness', 'community_spirit'],
        votingPeriodDays: 5
      }
    },
    requirements: {
      festival_participation: true,
      community_story: 1,
      safety_measures: 3
    },
    rewards: {
      first: {
        points: 700,
        badges: ['cultural_ambassador'],
        perks: ['community_leader_recognition']
      },
      participation: {
        points: 180,
        badges: ['ganesh_chaturthi_participant']
      }
    },
    isActive: true
  }
];

// Weekly Challenge Templates
export const WEEKLY_CHALLENGES: ChallengeTemplate[] = [
  {
    id: 'weekly_photo_contest',
    name: 'Weekly Photo Contest',
    description: 'Share your best dog photos and vote for community favorites',
    challengeType: 'weekly',
    category: 'photo',
    durationDays: 7,
    rules: {
      submissionType: 'photo',
      requirements: {
        original_photo: true,
        maxPhotos: 3,
        photo_description: true,
        high_quality: true
      },
      eligibility: {
        minimumLevel: 1
      },
      judging: {
        method: 'community_vote',
        criteria: ['photo_quality', 'creativity', 'story_behind_photo'],
        votingPeriodDays: 2
      }
    },
    requirements: {
      photo_submissions: 1,
      description_provided: true
    },
    rewards: {
      first: {
        points: 300,
        badges: ['weekly_photo_winner'],
        perks: ['featured_photo_homepage']
      },
      second: {
        points: 200,
        badges: ['photo_runner_up'],
        perks: ['photo_highlight']
      },
      third: {
        points: 150,
        badges: ['photo_finalist'],
        perks: ['community_gallery']
      },
      participation: {
        points: 50,
        badges: ['photo_participant']
      }
    },
    recurrence: 'weekly',
    isActive: true
  }
];

export class SeasonalChallengeManager {
  
  // Get active challenges
  static getActiveChallenges(date: Date = new Date()): ChallengeTemplate[] {
    const allChallenges = [...MONTHLY_CHALLENGES, ...FESTIVAL_CHALLENGES, ...WEEKLY_CHALLENGES];
    
    return allChallenges.filter(challenge => {
      if (!challenge.isActive) return false;
      
      // For templates, we check if they should be active based on current date
      if (challenge.challengeType === 'monthly') {
        return this.isMonthlyChallengePeriod(challenge, date);
      }
      
      if (challenge.challengeType === 'festival') {
        return this.isFestivalPeriod(challenge.id, date);
      }
      
      if (challenge.challengeType === 'weekly') {
        return true; // Weekly challenges are always available
      }
      
      return false;
    });
  }

  // Get challenges by category
  static getChallengesByCategory(category: string): ChallengeTemplate[] {
    const allChallenges = [...MONTHLY_CHALLENGES, ...FESTIVAL_CHALLENGES, ...WEEKLY_CHALLENGES];
    return allChallenges.filter(challenge => challenge.category === category);
  }

  // Get featured challenges
  static getFeaturedChallenges(): ChallengeTemplate[] {
    const activeChallenges = this.getActiveChallenges();
    return activeChallenges.filter(challenge => 
      challenge.challengeType === 'monthly' || challenge.challengeType === 'festival'
    );
  }

  // Check if it's the right period for monthly challenge
  private static isMonthlyChallengePeriod(challenge: ChallengeTemplate, date: Date): boolean {
    const month = date.getMonth() + 1;
    const challengeMonth = this.getMonthFromChallengeId(challenge.id);
    return month === challengeMonth;
  }

  // Extract month number from challenge ID
  private static getMonthFromChallengeId(challengeId: string): number {
    const monthMap: { [key: string]: number } = {
      'january': 1, 'february': 2, 'march': 3, 'april': 4,
      'may': 5, 'june': 6, 'july': 7, 'august': 8,
      'september': 9, 'october': 10, 'november': 11, 'december': 12
    };
    
    for (const [month, num] of Object.entries(monthMap)) {
      if (challengeId.toLowerCase().includes(month)) {
        return num;
      }
    }
    return 1; // Default to January
  }

  // Check if it's festival period
  private static isFestivalPeriod(challengeId: string, date: Date): boolean {
    const festivalPeriods: { [key: string]: { month: number; startDate: number; duration: number } } = {
      'diwali_pet_safety': { month: 10, startDate: 12, duration: 7 }, // October-November
      'holi_color_safety': { month: 3, startDate: 10, duration: 5 }, // March
      'ganesh_chaturthi_community': { month: 8, startDate: 22, duration: 11 } // August-September
    };
    
    const period = festivalPeriods[challengeId];
    if (!period) return false;
    
    const currentMonth = date.getMonth() + 1;
    const currentDate = date.getDate();
    
    // Simple date range check (would be enhanced with proper lunar calendar)
    if (currentMonth === period.month) {
      return currentDate >= period.startDate && currentDate <= (period.startDate + period.duration);
    }
    
    return false;
  }

  // Calculate challenge progress
  static calculateProgress(
    challenge: ChallengeTemplate,
    userStats: { [key: string]: any }
  ): number {
    const requirements = challenge.requirements;
    let totalProgress = 0;
    let totalRequirements = 0;

    for (const [key, requiredValue] of Object.entries(requirements)) {
      const userValue = userStats[key] || 0;
      totalRequirements++;
      
      if (typeof requiredValue === 'number') {
        totalProgress += Math.min(userValue / requiredValue, 1.0);
      } else if (typeof requiredValue === 'boolean') {
        totalProgress += userStats[key] ? 1.0 : 0.0;
      }
    }

    return totalRequirements > 0 ? (totalProgress / totalRequirements) * 100 : 0;
  }

  // Check if user meets eligibility requirements
  static checkEligibility(challenge: ChallengeTemplate, userStats: { [key: string]: any }): boolean {
    const eligibility = challenge.rules.eligibility;
    
    if (eligibility.minimumLevel && (userStats.level || 0) < eligibility.minimumLevel) {
      return false;
    }
    
    if (eligibility.minimumPoints && (userStats.points || 0) < eligibility.minimumPoints) {
      return false;
    }
    
    if (eligibility.requiredAchievements) {
      const userAchievements = userStats.achievements || [];
      const hasAllRequired = eligibility.requiredAchievements.every(
        (achievement: string) => userAchievements.includes(achievement)
      );
      if (!hasAllRequired) return false;
    }
    
    if (eligibility.locationRestriction) {
      const userLocation = userStats.location || '';
      const hasValidLocation = eligibility.locationRestriction.some(
        (location: string) => userLocation.toLowerCase().includes(location.toLowerCase())
      );
      if (!hasValidLocation) return false;
    }
    
    return true;
  }

  // Generate challenge instance from template
  static generateChallengeFromTemplate(
    template: ChallengeTemplate,
    startDate: Date,
    createdBy: string
  ): Partial<SeasonalChallenge> {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + template.durationDays);
    
    return {
      name: template.name,
      description: template.description,
      challengeType: template.challengeType as any,
      category: template.category as any,
      startDate,
      endDate,
      pointReward: template.rewards.participation.points,
      rules: template.rules,
      prizes: template.rewards,
      isActive: true,
      isFeatured: template.challengeType === 'monthly' || template.challengeType === 'festival',
      createdBy
    };
  }
}