// Week 22 Phase 3: Referral Reward System

export interface ReferralReward {
  id: string;
  referrerId: string;
  referredId: string;
  referralCode: string;
  status: 'pending' | 'completed' | 'rewarded' | 'expired';
  pointsAwarded: number;
  milestoneReached?: string;
  referralTier: number;
  bonusMultiplier: number;
  createdAt: Date;
  rewardedAt?: Date;
}

export interface ReferralProgram {
  baseReward: number;
  milestones: ReferralMilestone[];
  tierBonuses: { [tier: number]: number };
  specialBonuses: ReferralSpecialBonus[];
  expirationDays: number;
}

export interface ReferralMilestone {
  name: string;
  description: string;
  requirement: string;
  reward: number;
  icon: string;
  checkFunction: (referredUser: any) => boolean;
}

export interface ReferralSpecialBonus {
  id: string;
  name: string;
  description: string;
  condition: string;
  multiplier: number;
  maxRewards: number;
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface UserReferralStats {
  totalReferred: number;
  successfulReferred: number;
  totalPointsEarned: number;
  currentTier: number;
  nextTierTarget: number;
  referralCode: string;
  conversionRate: number;
  averageRewardPerReferral: number;
  monthlyReferrals: number;
}

// Comprehensive Referral Program Configuration
export const REFERRAL_PROGRAM: ReferralProgram = {
  baseReward: 200, // Base points for successful referral
  expirationDays: 30,
  
  milestones: [
    {
      name: 'Sign Up',
      description: 'Friend successfully signs up',
      requirement: 'account_created',
      reward: 50,
      icon: '👋',
      checkFunction: (user) => !!user.id
    },
    {
      name: 'First Profile',
      description: 'Friend completes their profile',
      requirement: 'profile_completed',
      reward: 75,
      icon: '📝',
      checkFunction: (user) => !!user.profile_image_url && !!user.bio
    },
    {
      name: 'Dog Added',
      description: 'Friend adds their first dog profile',
      requirement: 'first_dog_added',
      reward: 100,
      icon: '🐕',
      checkFunction: (user) => (user.dogCount || 0) >= 1
    },
    {
      name: 'First Post',
      description: 'Friend makes their first community post',
      requirement: 'first_community_post',
      reward: 125,
      icon: '💬',
      checkFunction: (user) => (user.postsCount || 0) >= 1
    },
    {
      name: 'Active Member',
      description: 'Friend reaches 100 points',
      requirement: 'points_milestone_100',
      reward: 150,
      icon: '⭐',
      checkFunction: (user) => (user.totalPoints || 0) >= 100
    },
    {
      name: 'Premium Signup',
      description: 'Friend subscribes to premium',
      requirement: 'premium_subscription',
      reward: 500,
      icon: '👑',
      checkFunction: (user) => user.isPremium === true
    }
  ],
  
  tierBonuses: {
    1: 1.0,  // Bronze: No bonus
    2: 1.2,  // Silver: 20% bonus
    3: 1.5,  // Gold: 50% bonus
    4: 1.8,  // Platinum: 80% bonus
    5: 2.0   // Diamond: 100% bonus
  },
  
  specialBonuses: [
    {
      id: 'festival_bonus',
      name: 'Festival Special',
      description: 'Double rewards during Indian festivals',
      condition: 'festival_period',
      multiplier: 2.0,
      maxRewards: 10,
      isActive: true
    },
    {
      id: 'weekend_warrior',
      name: 'Weekend Warrior',
      description: '50% bonus for weekend referrals',
      condition: 'weekend_referral',
      multiplier: 1.5,
      maxRewards: 5,
      isActive: true
    },
    {
      id: 'streak_master',
      name: 'Streak Master',
      description: 'Bonus for consecutive referrals',
      condition: 'consecutive_referrals',
      multiplier: 1.3,
      maxRewards: 20,
      isActive: true
    },
    {
      id: 'community_builder',
      name: 'Community Builder',
      description: 'Extra bonus for referring 5+ users in a month',
      condition: 'monthly_referral_count',
      multiplier: 2.5,
      maxRewards: 1,
      isActive: true
    }
  ]
};

export class ReferralManager {
  
  // Generate unique referral code for user
  static generateReferralCode(userId: string, userName: string): string {
    const namePrefix = userName.replace(/\s+/g, '').toUpperCase().slice(0, 3);
    const userSuffix = userId.slice(-4).toUpperCase();
    const randomSuffix = Math.random().toString(36).substr(2, 3).toUpperCase();
    
    return `${namePrefix}${userSuffix}${randomSuffix}`;
  }

  // Validate referral code
  static validateReferralCode(code: string): boolean {
    return /^[A-Z0-9]{10}$/.test(code);
  }

  // Calculate referral reward
  static calculateReferralReward(
    milestone: string,
    referrerTier: number = 1,
    specialBonuses: string[] = []
  ): { baseReward: number; bonusMultiplier: number; totalReward: number } {
    const milestoneData = REFERRAL_PROGRAM.milestones.find(m => m.requirement === milestone);
    const baseReward = milestoneData?.reward || REFERRAL_PROGRAM.baseReward;
    
    // Apply tier bonus
    const tierMultiplier = REFERRAL_PROGRAM.tierBonuses[referrerTier] || 1.0;
    
    // Apply special bonuses
    let specialMultiplier = 1.0;
    specialBonuses.forEach(bonusId => {
      const bonus = REFERRAL_PROGRAM.specialBonuses.find(b => b.id === bonusId && b.isActive);
      if (bonus) {
        specialMultiplier *= bonus.multiplier;
      }
    });
    
    const totalMultiplier = tierMultiplier * specialMultiplier;
    const totalReward = Math.round(baseReward * totalMultiplier);
    
    return {
      baseReward,
      bonusMultiplier: totalMultiplier,
      totalReward
    };
  }

  // Check user milestones for referral rewards
  static checkReferralMilestones(referredUser: any): string[] {
    const achievedMilestones: string[] = [];
    
    REFERRAL_PROGRAM.milestones.forEach(milestone => {
      if (milestone.checkFunction(referredUser)) {
        achievedMilestones.push(milestone.requirement);
      }
    });
    
    return achievedMilestones;
  }

  // Get active special bonuses
  static getActiveSpecialBonuses(context: {
    isFestival?: boolean;
    isWeekend?: boolean;
    consecutiveReferrals?: number;
    monthlyReferrals?: number;
  }): string[] {
    const activeBonuses: string[] = [];
    
    REFERRAL_PROGRAM.specialBonuses.forEach(bonus => {
      if (!bonus.isActive) return;
      
      switch (bonus.condition) {
        case 'festival_period':
          if (context.isFestival) activeBonuses.push(bonus.id);
          break;
        case 'weekend_referral':
          if (context.isWeekend) activeBonuses.push(bonus.id);
          break;
        case 'consecutive_referrals':
          if ((context.consecutiveReferrals || 0) >= 3) activeBonuses.push(bonus.id);
          break;
        case 'monthly_referral_count':
          if ((context.monthlyReferrals || 0) >= 5) activeBonuses.push(bonus.id);
          break;
      }
    });
    
    return activeBonuses;
  }

  // Calculate referrer tier from user points
  static getReferrerTier(userPoints: number): number {
    if (userPoints >= 50000) return 5; // Diamond
    if (userPoints >= 15000) return 4; // Platinum
    if (userPoints >= 5000) return 3;  // Gold
    if (userPoints >= 1000) return 2;  // Silver
    return 1; // Bronze
  }

  // Generate referral stats
  static generateReferralStats(referralHistory: ReferralReward[]): UserReferralStats {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const totalReferred = referralHistory.length;
    const successfulReferred = referralHistory.filter(r => r.status === 'completed' || r.status === 'rewarded').length;
    const totalPointsEarned = referralHistory.reduce((sum, r) => sum + r.pointsAwarded, 0);
    const monthlyReferrals = referralHistory.filter(r => new Date(r.createdAt) >= monthAgo).length;
    
    const conversionRate = totalReferred > 0 ? (successfulReferred / totalReferred) * 100 : 0;
    const averageRewardPerReferral = successfulReferred > 0 ? totalPointsEarned / successfulReferred : 0;
    
    // Determine current tier based on successful referrals
    let currentTier = 1;
    if (successfulReferred >= 50) currentTier = 5;
    else if (successfulReferred >= 25) currentTier = 4;
    else if (successfulReferred >= 10) currentTier = 3;
    else if (successfulReferred >= 5) currentTier = 2;
    
    const tierThresholds = [0, 5, 10, 25, 50];
    const nextTierTarget = currentTier < 5 ? tierThresholds[currentTier] : 50;
    
    return {
      totalReferred,
      successfulReferred,
      totalPointsEarned,
      currentTier,
      nextTierTarget,
      referralCode: '', // Will be filled from database
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageRewardPerReferral: Math.round(averageRewardPerReferral),
      monthlyReferrals
    };
  }

  // Get referral leaderboard data
  static async getReferralLeaderboard(timeframe: 'weekly' | 'monthly' | 'all-time' = 'monthly'): Promise<any[]> {
    // This would be implemented with actual database queries
    // Returning mock structure for now
    return [
      {
        userId: 'user1',
        userName: 'Top Referrer',
        referralCount: 25,
        pointsEarned: 5000,
        tier: 4,
        rank: 1
      }
    ];
  }

  // Generate personalized referral message
  static generateReferralMessage(
    referrerName: string,
    referralCode: string,
    customMessage?: string
  ): {
    whatsapp: string;
    sms: string;
    email: string;
    social: string;
  } {
    const baseMessage = `Hey! I've been loving Woofadaar - India's best dog parent community! 🐕 Join me using code ${referralCode} and we both get rewards! 🎁`;
    
    return {
      whatsapp: `${baseMessage}\n\n${customMessage || ''}\n\nDownload: woofadaar.com/join`,
      sms: `${baseMessage} Download: woofadaar.com/join`,
      email: `Subject: Join me on Woofadaar! 🐕\n\n${baseMessage}\n\n${customMessage || 'It\'s been amazing connecting with other dog parents and getting expert advice!'}\n\nDownload the app: woofadaar.com/join\n\nLooking forward to seeing you there!\n${referrerName}`,
      social: `Just joined India's best dog parent community! 🐕 Amazing tips, expert advice, and great community. Join me with code ${referralCode}! #Woofadaar #DogParents #India`
    };
  }

  // Check referral eligibility
  static checkReferralEligibility(
    referrerId: string,
    referredEmail: string,
    referralCode: string
  ): {
    isEligible: boolean;
    reason?: string;
  } {
    // Basic validation rules
    if (!this.validateReferralCode(referralCode)) {
      return { isEligible: false, reason: 'Invalid referral code format' };
    }
    
    // Check if user is trying to refer themselves
    // This would need actual user data validation
    
    // Check if email is already registered
    // This would need database check
    
    // Check rate limiting (max 10 referrals per day)
    // This would need database check
    
    return { isEligible: true };
  }

  // Get referral insights for user
  static getReferralInsights(stats: UserReferralStats): {
    insights: string[];
    recommendations: string[];
    nextGoal: string;
  } {
    const insights: string[] = [];
    const recommendations: string[] = [];
    
    // Conversion rate insights
    if (stats.conversionRate < 20) {
      insights.push(`Your conversion rate is ${stats.conversionRate}%. The community average is 35%.`);
      recommendations.push('Try personalizing your referral messages and explaining specific benefits');
    } else if (stats.conversionRate > 60) {
      insights.push(`Excellent conversion rate of ${stats.conversionRate}%! You're in the top 10% of referrers.`);
    }
    
    // Activity insights
    if (stats.monthlyReferrals === 0) {
      recommendations.push('Start by referring 1-2 close friends who are dog parents');
    } else if (stats.monthlyReferrals >= 5) {
      insights.push('Great activity! You\'re eligible for the Community Builder bonus.');
    }
    
    // Tier progression
    const referralsToNext = stats.nextTierTarget - stats.successfulReferred;
    let nextGoal = `Refer ${referralsToNext} more successful users to reach the next tier`;
    
    if (stats.currentTier === 5) {
      nextGoal = 'You\'ve reached the highest referral tier! Keep spreading the word!';
    }
    
    return {
      insights,
      recommendations,
      nextGoal
    };
  }
}