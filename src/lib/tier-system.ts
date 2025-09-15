// Week 22 Phase 3: Tier System & Enhanced Rewards

export interface TierBenefits {
  name: string;
  minPoints: number;
  benefits: string[];
  perks: TierPerk[];
  icon: string;
  color: string;
  bgColor: string;
  monthlyPointsRequired: number;
  specialFeatures: string[];
}

export interface TierPerk {
  id: string;
  name: string;
  description: string;
  type: 'discount' | 'access' | 'bonus' | 'service' | 'feature';
  value?: number;
  isRedeemable: boolean;
  pointsCost?: number;
}

export interface UserTier {
  id: string;
  userId: string;
  currentTier: string;
  tierPoints: number;
  tierStart: Date;
  nextTierPoints?: number;
  tierBenefits: any;
  monthlyTierPoints: number;
  tierHistory: TierHistoryEntry[];
}

export interface TierHistoryEntry {
  tier: string;
  achievedAt: Date;
  pointsAtAchievement: number;
  duration?: number; // days
}

export interface TierProgression {
  currentTier: TierBenefits;
  nextTier?: TierBenefits;
  progressPercentage: number;
  pointsToNext: number;
  monthlyProgress: number;
  estimatedDaysToNext: number;
}

// 5-Tier System: Bronze → Silver → Gold → Platinum → Diamond
export const TIER_SYSTEM: { [key: string]: TierBenefits } = {
  bronze: {
    name: 'Bronze Paw',
    minPoints: 0,
    monthlyPointsRequired: 0,
    benefits: [
      'Basic community access',
      'Standard customer support',
      'Weekly newsletter',
      'Basic health reminders'
    ],
    perks: [
      {
        id: 'community_access',
        name: 'Community Access',
        description: 'Access to community forums and Q&A',
        type: 'access',
        isRedeemable: false
      },
      {
        id: 'standard_support',
        name: 'Standard Support',
        description: 'Email support with 48-hour response',
        type: 'service',
        isRedeemable: false
      }
    ],
    icon: '🥉',
    color: '#CD7F32',
    bgColor: '#FDF2E9',
    specialFeatures: ['Community participation', 'Basic dog profiles']
  },

  silver: {
    name: 'Silver Paw',
    minPoints: 1000,
    monthlyPointsRequired: 200,
    benefits: [
      'Priority question visibility',
      'Monthly expert Q&A session',
      'Advanced health analytics',
      'Exclusive content access',
      '10% partner service discount'
    ],
    perks: [
      {
        id: 'priority_visibility',
        name: 'Priority Question Visibility',
        description: 'Your questions appear higher in community feeds',
        type: 'feature',
        isRedeemable: false
      },
      {
        id: 'expert_consultation',
        name: 'Monthly Expert Consultation',
        description: '30-minute consultation with veterinary experts',
        type: 'service',
        isRedeemable: true,
        pointsCost: 100
      },
      {
        id: 'partner_discount_10',
        name: '10% Partner Discount',
        description: '10% discount on all partner services',
        type: 'discount',
        value: 10,
        isRedeemable: false
      },
      {
        id: 'advanced_analytics',
        name: 'Advanced Health Analytics',
        description: 'Detailed health trends and insights',
        type: 'feature',
        isRedeemable: false
      }
    ],
    icon: '🥈',
    color: '#C0C0C0',
    bgColor: '#F8F9FA',
    specialFeatures: ['Expert access', 'Analytics dashboard', 'Partner discounts']
  },

  gold: {
    name: 'Gold Paw',
    minPoints: 5000,
    monthlyPointsRequired: 500,
    benefits: [
      'VIP customer support',
      'Exclusive event access',
      'Advanced partner discounts (20%)',
      'Custom profile themes',
      'Early feature access',
      'Monthly health report'
    ],
    perks: [
      {
        id: 'vip_support',
        name: 'VIP Support',
        description: '24-hour priority email and chat support',
        type: 'service',
        isRedeemable: false
      },
      {
        id: 'exclusive_events',
        name: 'Exclusive Events',
        description: 'Access to VIP community events and webinars',
        type: 'access',
        isRedeemable: false
      },
      {
        id: 'partner_discount_20',
        name: '20% Partner Discount',
        description: '20% discount on all partner services',
        type: 'discount',
        value: 20,
        isRedeemable: false
      },
      {
        id: 'custom_themes',
        name: 'Custom Profile Themes',
        description: 'Personalize your profile with exclusive themes',
        type: 'feature',
        isRedeemable: false
      },
      {
        id: 'early_access',
        name: 'Early Feature Access',
        description: 'Beta access to new features before public release',
        type: 'access',
        isRedeemable: false
      },
      {
        id: 'health_report',
        name: 'Monthly Health Report',
        description: 'Comprehensive monthly health analysis',
        type: 'service',
        isRedeemable: true,
        pointsCost: 50
      }
    ],
    icon: '🥇',
    color: '#FFD700',
    bgColor: '#FFFBF0',
    specialFeatures: ['VIP status', 'Custom themes', 'Exclusive events', 'Advanced discounts']
  },

  platinum: {
    name: 'Platinum Paw',
    minPoints: 15000,
    monthlyPointsRequired: 1000,
    benefits: [
      'Premium features access',
      'Quarterly vet consultation credits',
      'Priority appointment booking',
      'Exclusive webinar access',
      'Advanced AI recommendations',
      '30% partner discounts'
    ],
    perks: [
      {
        id: 'premium_features',
        name: 'All Premium Features',
        description: 'Access to all premium platform features',
        type: 'access',
        isRedeemable: false
      },
      {
        id: 'vet_credits',
        name: 'Vet Consultation Credits',
        description: 'Quarterly credits for professional consultations',
        type: 'service',
        isRedeemable: true,
        pointsCost: 200
      },
      {
        id: 'priority_booking',
        name: 'Priority Booking',
        description: 'Skip the queue for appointment bookings',
        type: 'service',
        isRedeemable: false
      },
      {
        id: 'exclusive_webinars',
        name: 'Exclusive Webinars',
        description: 'Access to expert-led educational webinars',
        type: 'access',
        isRedeemable: false
      },
      {
        id: 'ai_recommendations',
        name: 'Advanced AI Recommendations',
        description: 'Personalized AI-powered care recommendations',
        type: 'feature',
        isRedeemable: false
      },
      {
        id: 'partner_discount_30',
        name: '30% Partner Discount',
        description: '30% discount on all partner services',
        type: 'discount',
        value: 30,
        isRedeemable: false
      }
    ],
    icon: '💎',
    color: '#E5E4E2',
    bgColor: '#FAFAFA',
    specialFeatures: ['Premium access', 'Vet credits', 'AI recommendations', 'Priority services']
  },

  diamond: {
    name: 'Diamond Paw',
    minPoints: 50000,
    monthlyPointsRequired: 2000,
    benefits: [
      'Lifetime premium access',
      'Personal pet care advisor',
      'Annual comprehensive health package',
      'Community ambassador status',
      'Custom feature requests',
      'White-glove concierge service'
    ],
    perks: [
      {
        id: 'lifetime_premium',
        name: 'Lifetime Premium',
        description: 'Permanent access to all premium features',
        type: 'access',
        isRedeemable: false
      },
      {
        id: 'personal_advisor',
        name: 'Personal Pet Advisor',
        description: 'Dedicated advisor for personalized pet care guidance',
        type: 'service',
        isRedeemable: false
      },
      {
        id: 'health_package',
        name: 'Annual Health Package',
        description: 'Comprehensive annual health checkup package',
        type: 'service',
        isRedeemable: true,
        pointsCost: 500
      },
      {
        id: 'ambassador_status',
        name: 'Community Ambassador',
        description: 'Special recognition and community leadership role',
        type: 'access',
        isRedeemable: false
      },
      {
        id: 'custom_requests',
        name: 'Custom Feature Requests',
        description: 'Direct line to product team for feature requests',
        type: 'access',
        isRedeemable: false
      },
      {
        id: 'concierge_service',
        name: 'Concierge Service',
        description: 'White-glove service for all your pet care needs',
        type: 'service',
        isRedeemable: false
      }
    ],
    icon: '💠',
    color: '#B9F2FF',
    bgColor: '#F0FCFF',
    specialFeatures: ['Lifetime benefits', 'Personal advisor', 'Ambassador status', 'Concierge service']
  }
};

export class TierManager {
  
  // Calculate user's tier based on points
  static calculateTier(totalPoints: number, monthlyPoints: number = 0): string {
    const tiers = Object.entries(TIER_SYSTEM).reverse(); // Start from highest tier
    
    for (const [tierName, tierData] of tiers) {
      if (totalPoints >= tierData.minPoints) {
        // For higher tiers, also check monthly requirement
        if (tierName !== 'bronze' && tierName !== 'silver') {
          if (monthlyPoints >= tierData.monthlyPointsRequired) {
            return tierName;
          }
        } else {
          return tierName;
        }
      }
    }
    
    return 'bronze';
  }

  // Get tier progression information
  static getTierProgression(currentPoints: number, monthlyPoints: number = 0): TierProgression {
    const currentTierName = this.calculateTier(currentPoints, monthlyPoints);
    const currentTier = TIER_SYSTEM[currentTierName];
    
    // Find next tier
    const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const currentIndex = tierOrder.indexOf(currentTierName);
    const nextTierName = currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : null;
    const nextTier = nextTierName ? TIER_SYSTEM[nextTierName] : null;
    
    let progressPercentage = 100;
    let pointsToNext = 0;
    let monthlyProgress = 100;
    let estimatedDaysToNext = 0;
    
    if (nextTier) {
      const pointsForNext = nextTier.minPoints - currentTier.minPoints;
      const currentProgress = currentPoints - currentTier.minPoints;
      progressPercentage = Math.min((currentProgress / pointsForNext) * 100, 100);
      pointsToNext = nextTier.minPoints - currentPoints;
      
      // Monthly progress calculation
      if (nextTier.monthlyPointsRequired > 0) {
        monthlyProgress = Math.min((monthlyPoints / nextTier.monthlyPointsRequired) * 100, 100);
        
        // Estimate days to reach next tier (based on average daily points)
        const avgDailyPoints = monthlyPoints / 30; // Assuming 30-day month
        if (avgDailyPoints > 0) {
          estimatedDaysToNext = Math.ceil(pointsToNext / avgDailyPoints);
        }
      }
    }
    
    return {
      currentTier,
      nextTier,
      progressPercentage: Math.round(progressPercentage),
      pointsToNext,
      monthlyProgress: Math.round(monthlyProgress),
      estimatedDaysToNext
    };
  }

  // Get available perks for a tier
  static getAvailablePerks(tierName: string): TierPerk[] {
    const tier = TIER_SYSTEM[tierName];
    if (!tier) return [];
    
    return tier.perks.filter(perk => perk.isRedeemable);
  }

  // Get all benefits up to a tier (cumulative)
  static getCumulativeBenefits(tierName: string): string[] {
    const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const currentIndex = tierOrder.indexOf(tierName);
    
    if (currentIndex === -1) return [];
    
    const benefits: string[] = [];
    for (let i = 0; i <= currentIndex; i++) {
      const tier = TIER_SYSTEM[tierOrder[i]];
      if (tier) {
        benefits.push(...tier.benefits);
      }
    }
    
    return Array.from(new Set(benefits)); // Remove duplicates
  }

  // Calculate tier points from user activity
  static calculateTierPoints(userActivity: {
    pointsEarned: number;
    questionsPosted: number;
    answersGiven: number;
    communityVotes: number;
    streakDays: number;
    referralsCompleted: number;
    challengesCompleted: number;
    socialShares: number;
  }): number {
    const basePoints = userActivity.pointsEarned * 0.1; // 10% of earned points contribute to tier
    
    // Activity bonuses
    const activityBonus = 
      (userActivity.questionsPosted * 5) +
      (userActivity.answersGiven * 8) +
      (userActivity.communityVotes * 2) +
      (userActivity.streakDays * 3) +
      (userActivity.referralsCompleted * 25) +
      (userActivity.challengesCompleted * 15) +
      (userActivity.socialShares * 5);
    
    return Math.round(basePoints + activityBonus);
  }

  // Check if user qualifies for tier upgrade
  static checkTierUpgrade(
    currentTier: string,
    totalPoints: number,
    monthlyPoints: number
  ): { shouldUpgrade: boolean; newTier?: string; reason?: string } {
    const newTier = this.calculateTier(totalPoints, monthlyPoints);
    
    if (newTier !== currentTier) {
      const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
      const currentIndex = tierOrder.indexOf(currentTier);
      const newIndex = tierOrder.indexOf(newTier);
      
      if (newIndex > currentIndex) {
        return {
          shouldUpgrade: true,
          newTier,
          reason: `Reached ${TIER_SYSTEM[newTier].minPoints} total points and ${TIER_SYSTEM[newTier].monthlyPointsRequired} monthly points`
        };
      }
    }
    
    return { shouldUpgrade: false };
  }

  // Get tier retention requirements
  static getTierRetentionRequirements(tierName: string): {
    monthlyPointsRequired: number;
    gracePeriodDays: number;
    downgradeWarningDays: number;
  } {
    const tier = TIER_SYSTEM[tierName];
    
    return {
      monthlyPointsRequired: tier?.monthlyPointsRequired || 0,
      gracePeriodDays: 7, // 7 days grace period before downgrade
      downgradeWarningDays: 3 // Warn 3 days before downgrade
    };
  }

  // Calculate tier value (monetary equivalent)
  static calculateTierValue(tierName: string): number {
    const tier = TIER_SYSTEM[tierName];
    if (!tier) return 0;
    
    // Calculate value based on discounts and services
    let value = 0;
    
    tier.perks.forEach(perk => {
      switch (perk.type) {
        case 'discount':
          value += (perk.value || 0) * 10; // ₹10 per % discount
          break;
        case 'service':
          value += perk.pointsCost ? perk.pointsCost * 0.5 : 100; // Service value
          break;
        case 'access':
          value += 200; // Premium access value
          break;
        case 'feature':
          value += 150; // Feature value
          break;
      }
    });
    
    return Math.round(value);
  }
}