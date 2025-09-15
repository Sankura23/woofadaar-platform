// Week 23 Phase 3: Advanced User Reputation System
// Dynamic behavioral scoring with community feedback integration

import prisma from './db';

export interface ReputationFactors {
  contentQuality: number;        // 0-100: Average quality of user's content
  communityHelpfulness: number;  // 0-100: How helpful other users find their content
  consistentActivity: number;    // 0-100: Regular positive participation
  moderationHistory: number;    // 0-100: Clean record vs violations
  expertiseLevel: number;       // 0-100: Domain knowledge demonstration
  communityTrust: number;       // 0-100: Peer validation and endorsements
  accountMaturity: number;      // 0-100: Time-based trust building
  behaviorPattern: number;      // 0-100: Positive behavioral trends
}

export interface TrustLevel {
  level: 'restricted' | 'new' | 'trusted' | 'expert' | 'moderator' | 'admin';
  minReputation: number;
  privileges: string[];
  restrictions: string[];
  description: string;
}

export interface ReputationEvent {
  type: 'content_quality' | 'community_feedback' | 'moderation_action' | 'expertise_demo' | 'violation' | 'achievement';
  impact: number; // -100 to +100
  reason: string;
  evidence?: any;
  weight: number; // 0.1 to 2.0 - how much this event should count
  decayRate?: number; // How quickly this event loses relevance (0-1)
}

export const TRUST_LEVELS: TrustLevel[] = [
  {
    level: 'restricted',
    minReputation: 0,
    privileges: ['read', 'basic_comments'],
    restrictions: ['no_posting', 'moderated_comments', 'rate_limited'],
    description: 'Limited access due to policy violations'
  },
  {
    level: 'new',
    minReputation: 50,
    privileges: ['read', 'comment', 'post_questions', 'basic_voting'],
    restrictions: ['moderated_posts', 'daily_limits', 'no_direct_messages'],
    description: 'New community member building reputation'
  },
  {
    level: 'trusted',
    minReputation: 150,
    privileges: ['read', 'comment', 'post', 'vote', 'direct_message', 'report_content'],
    restrictions: ['weekly_post_limits'],
    description: 'Established community member with good standing'
  },
  {
    level: 'expert',
    minReputation: 300,
    privileges: ['read', 'comment', 'post', 'vote', 'direct_message', 'report_content', 'answer_verification', 'mentor_access'],
    restrictions: [],
    description: 'Recognized expert with specialized knowledge'
  },
  {
    level: 'moderator',
    minReputation: 500,
    privileges: ['all_expert_privileges', 'moderate_content', 'ban_users', 'edit_posts', 'access_reports'],
    restrictions: [],
    description: 'Community moderator with enforcement powers'
  },
  {
    level: 'admin',
    minReputation: 1000,
    privileges: ['all_privileges'],
    restrictions: [],
    description: 'Platform administrator with full access'
  }
];

export class UserReputationEngine {
  private readonly decayFactors = {
    content_quality: 0.95,    // Very slow decay for good content
    community_feedback: 0.92, // Moderate decay for peer validation
    moderation_action: 0.85,  // Faster decay for violations (second chances)
    expertise_demo: 0.98,     // Very slow decay for proven expertise
    violation: 0.88,          // Moderate decay for violations
    achievement: 0.90         // Slow decay for achievements
  };

  private readonly eventWeights = {
    high_quality_post: { impact: 15, weight: 1.2 },
    helpful_answer: { impact: 20, weight: 1.5 },
    best_answer_selected: { impact: 30, weight: 1.8 },
    community_upvote: { impact: 3, weight: 1.0 },
    expert_verification: { impact: 50, weight: 2.0 },
    mentorship_given: { impact: 25, weight: 1.4 },
    consistent_activity: { impact: 10, weight: 1.1 },
    violation_minor: { impact: -20, weight: 1.3 },
    violation_major: { impact: -50, weight: 1.8 },
    spam_detected: { impact: -40, weight: 1.6 },
    harassment_reported: { impact: -80, weight: 2.0 },
    false_reporting: { impact: -15, weight: 1.2 },
    achievement_earned: { impact: 35, weight: 1.3 }
  };

  public async calculateUserReputation(userId: string): Promise<{
    overallReputation: number;
    trustLevel: TrustLevel;
    factors: ReputationFactors;
    recentTrends: {
      direction: 'improving' | 'stable' | 'declining';
      rate: number;
      confidence: number;
    };
    recommendations: string[];
  }> {
    try {
      // Get comprehensive user data
      const [
        userProfile,
        contentStats,
        moderationHistory,
        communityFeedback,
        expertiseIndicators,
        recentActivity
      ] = await Promise.all([
        this.getUserProfile(userId),
        this.getContentQualityStats(userId),
        this.getModerationHistory(userId),
        this.getCommunityFeedback(userId),
        this.getExpertiseIndicators(userId),
        this.getRecentActivity(userId)
      ]);

      // Calculate individual reputation factors
      const factors = await this.calculateReputationFactors(
        userProfile,
        contentStats,
        moderationHistory,
        communityFeedback,
        expertiseIndicators,
        recentActivity
      );

      // Calculate overall reputation score
      const overallReputation = this.calculateOverallScore(factors);

      // Determine trust level
      const trustLevel = this.determineTrustLevel(overallReputation);

      // Analyze trends
      const recentTrends = await this.analyzeReputationTrends(userId);

      // Generate recommendations
      const recommendations = this.generateRecommendations(factors, recentTrends);

      // Update database
      await this.updateUserReputationScore(userId, overallReputation, factors, trustLevel);

      return {
        overallReputation: Math.round(overallReputation),
        trustLevel,
        factors,
        recentTrends,
        recommendations
      };

    } catch (error) {
      console.error('Error calculating user reputation:', error);
      
      // Return safe defaults
      return {
        overallReputation: 100,
        trustLevel: TRUST_LEVELS.find(t => t.level === 'new')!,
        factors: this.getDefaultFactors(),
        recentTrends: { direction: 'stable', rate: 0, confidence: 0 },
        recommendations: ['Complete your profile to start building reputation']
      };
    }
  }

  private async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        reputation_score: true,
        dogs: { select: { id: true } },
        UserEngagement: {
          where: { created_at: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
          orderBy: { created_at: 'desc' }
        }
      }
    });

    return {
      id: userId,
      createdAt: user?.created_at || new Date(),
      isPremium: user?.is_premium || false,
      dogsCount: user?.dogs?.length || 0,
      engagementHistory: user?.UserEngagement || [],
      currentReputation: user?.reputation_score?.overall_reputation || 100,
      currentTrustLevel: user?.reputation_score?.trust_level || 'new'
    };
  }

  private async getContentQualityStats(userId: string) {
    // Get quality scores for user's content
    const [questions, answers, comments] = await Promise.all([
      prisma.communityQuestion.count({ where: { user_id: userId } }),
      prisma.communityAnswer?.count({ where: { user_id: userId } }) || 0,
      prisma.communityComment?.count({ where: { user_id: userId } }) || 0
    ]);

    // Get average quality scores from content analysis
    const qualityScores = await prisma.contentQualityScore.findMany({
      where: {
        OR: [
          { content_type: 'question', content_id: { in: await this.getUserContentIds(userId, 'question') } },
          { content_type: 'answer', content_id: { in: await this.getUserContentIds(userId, 'answer') } },
          { content_type: 'comment', content_id: { in: await this.getUserContentIds(userId, 'comment') } }
        ]
      }
    });

    const avgQuality = qualityScores.length > 0 
      ? qualityScores.reduce((acc, score) => acc + score.quality_score, 0) / qualityScores.length
      : 50;

    return {
      totalContent: questions + answers + comments,
      questionsCount: questions,
      answersCount: answers,
      commentsCount: comments,
      averageQuality: avgQuality,
      qualityScores
    };
  }

  private async getUserContentIds(userId: string, type: string): Promise<string[]> {
    try {
      let results: any[] = [];
      
      if (type === 'question') {
        results = await prisma.communityQuestion.findMany({
          where: { user_id: userId },
          select: { id: true },
          take: 50
        });
      }
      // Add other content types as needed
      
      return results.map(r => r.id);
    } catch (error) {
      console.error(`Error getting ${type} IDs:`, error);
      return [];
    }
  }

  private async getModerationHistory(userId: string) {
    const [reportsAgainst, actionsAgainst, reportsBy] = await Promise.all([
      // Reports filed against this user
      prisma.contentReport.count({
        where: { 
          reported_by: { not: userId },
          // This would need to be refined based on actual content ownership
        }
      }),
      
      // Moderation actions taken against this user
      prisma.contentModerationAction.count({
        where: { 
          // This would need content ownership lookup
        }
      }),
      
      // Reports filed by this user
      prisma.contentReport.findMany({
        where: { reported_by: userId },
        include: { actions: true }
      })
    ]);

    const validReports = reportsBy.filter(report => 
      report.actions.some(action => action.action_type !== 'dismiss')
    ).length;

    const falseReports = reportsBy.length - validReports;

    return {
      reportsReceived: reportsAgainst,
      moderationActions: actionsAgainst,
      reportsGiven: reportsBy.length,
      validReportsGiven: validReports,
      falseReportsGiven: falseReports,
      cleanRecord: reportsAgainst === 0 && actionsAgainst === 0
    };
  }

  private async getCommunityFeedback(userId: string) {
    // This would integrate with voting/rating systems
    return {
      upvotesReceived: 0,
      downvotesReceived: 0,
      helpfulMarks: 0,
      bestAnswers: 0,
      mentions: 0,
      followersCount: 0
    };
  }

  private async getExpertiseIndicators(userId: string) {
    const userEngagement = await prisma.userEngagement.findMany({
      where: { 
        user_id: userId,
        action_type: { in: ['best_answer', 'expert_verification', 'mentorship_session'] }
      }
    });

    return {
      bestAnswersCount: userEngagement.filter(e => e.action_type === 'best_answer').length,
      expertVerifications: userEngagement.filter(e => e.action_type === 'expert_verification').length,
      mentoringSessions: userEngagement.filter(e => e.action_type === 'mentorship_session').length,
      specializations: [] // This would come from user profile or activity analysis
    };
  }

  private async getRecentActivity(userId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const recentEngagement = await prisma.userEngagement.findMany({
      where: { 
        user_id: userId,
        created_at: { gte: thirtyDaysAgo }
      },
      orderBy: { created_at: 'desc' }
    });

    return {
      totalActions: recentEngagement.length,
      pointsEarned: recentEngagement.reduce((sum, e) => sum + e.points_earned, 0),
      dailyActivity: this.calculateDailyActivityPattern(recentEngagement),
      engagementTypes: this.categorizeEngagementTypes(recentEngagement)
    };
  }

  private calculateDailyActivityPattern(engagement: any[]) {
    const dailyCounts = new Map<string, number>();
    
    engagement.forEach(event => {
      const day = event.created_at.toISOString().split('T')[0];
      dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
    });

    const activeDays = dailyCounts.size;
    const avgDailyActivity = engagement.length / Math.max(activeDays, 1);
    
    return {
      activeDays,
      avgDailyActivity,
      consistency: activeDays / 30 // Consistency score based on how many days user was active
    };
  }

  private categorizeEngagementTypes(engagement: any[]) {
    const categories = {
      content_creation: ['question_posted', 'answer_posted', 'story_shared'],
      community_help: ['best_answer', 'helpful_vote', 'mentorship_session'],
      platform_engagement: ['daily_login', 'profile_updated', 'achievement_earned'],
      quality_contributions: ['expert_verification', 'content_featured']
    };

    const counts: Record<string, number> = {};
    
    Object.keys(categories).forEach(category => {
      counts[category] = engagement.filter(e => 
        categories[category as keyof typeof categories].includes(e.action_type)
      ).length;
    });

    return counts;
  }

  private async calculateReputationFactors(
    userProfile: any,
    contentStats: any,
    moderationHistory: any,
    communityFeedback: any,
    expertiseIndicators: any,
    recentActivity: any
  ): Promise<ReputationFactors> {
    
    // Content Quality (0-100)
    const contentQuality = Math.min(100, 
      (contentStats.averageQuality * 0.7) + 
      (Math.min(contentStats.totalContent / 10, 10) * 3) // Bonus for volume, capped at 30 points
    );

    // Community Helpfulness (0-100)
    const communityHelpfulness = Math.min(100,
      (communityFeedback.helpfulMarks * 5) +
      (communityFeedback.bestAnswers * 10) +
      (communityFeedback.upvotesReceived * 2) -
      (communityFeedback.downvotesReceived * 1)
    );

    // Consistent Activity (0-100)
    const consistentActivity = Math.min(100,
      (recentActivity.dailyActivity.consistency * 50) + // Consistency is worth up to 50 points
      (Math.min(recentActivity.dailyActivity.avgDailyActivity / 3, 10) * 5) // Average activity worth up to 50 points
    );

    // Moderation History (0-100)
    const moderationScore = moderationHistory.cleanRecord ? 100 :
      Math.max(0, 100 - 
        (moderationHistory.reportsReceived * 10) -
        (moderationHistory.moderationActions * 15) -
        (moderationHistory.falseReportsGiven * 5)
      );

    // Expertise Level (0-100)
    const expertiseLevel = Math.min(100,
      (expertiseIndicators.bestAnswersCount * 8) +
      (expertiseIndicators.expertVerifications * 15) +
      (expertiseIndicators.mentoringSessions * 12)
    );

    // Community Trust (0-100) - based on peer validation
    const communityTrust = Math.min(100,
      (communityFeedback.followersCount * 2) +
      (communityFeedback.mentions * 3) +
      (moderationHistory.validReportsGiven * 5) -
      (moderationHistory.falseReportsGiven * 8)
    );

    // Account Maturity (0-100) - time-based trust
    const accountAgeMonths = (Date.now() - userProfile.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000);
    const accountMaturity = Math.min(100, accountAgeMonths * 5 + (userProfile.dogsCount * 10));

    // Behavior Pattern (0-100) - trending behavior analysis
    const behaviorPattern = this.analyzeBehaviorPattern(userProfile.engagementHistory);

    return {
      contentQuality: Math.round(contentQuality),
      communityHelpfulness: Math.round(communityHelpfulness),
      consistentActivity: Math.round(consistentActivity),
      moderationHistory: Math.round(moderationScore),
      expertiseLevel: Math.round(expertiseLevel),
      communityTrust: Math.round(communityTrust),
      accountMaturity: Math.round(accountMaturity),
      behaviorPattern: Math.round(behaviorPattern)
    };
  }

  private analyzeBehaviorPattern(engagementHistory: any[]): number {
    if (engagementHistory.length === 0) return 50;

    // Analyze trend in recent engagement
    const recentPositive = engagementHistory.filter(e => e.points_earned > 0).length;
    const recentNegative = engagementHistory.filter(e => e.points_earned < 0).length;
    
    const positiveRatio = recentPositive / Math.max(engagementHistory.length, 1);
    const diversityScore = new Set(engagementHistory.map(e => e.action_type)).size * 5;
    
    return Math.min(100, (positiveRatio * 70) + Math.min(diversityScore, 30));
  }

  private calculateOverallScore(factors: ReputationFactors): number {
    // Weighted average of all factors
    const weights = {
      contentQuality: 0.20,
      communityHelpfulness: 0.18,
      consistentActivity: 0.15,
      moderationHistory: 0.15,
      expertiseLevel: 0.12,
      communityTrust: 0.10,
      accountMaturity: 0.05,
      behaviorPattern: 0.05
    };

    return (
      factors.contentQuality * weights.contentQuality +
      factors.communityHelpfulness * weights.communityHelpfulness +
      factors.consistentActivity * weights.consistentActivity +
      factors.moderationHistory * weights.moderationHistory +
      factors.expertiseLevel * weights.expertiseLevel +
      factors.communityTrust * weights.communityTrust +
      factors.accountMaturity * weights.accountMaturity +
      factors.behaviorPattern * weights.behaviorPattern
    );
  }

  private determineTrustLevel(reputation: number): TrustLevel {
    // Find the highest trust level the user qualifies for
    const sortedLevels = [...TRUST_LEVELS].sort((a, b) => b.minReputation - a.minReputation);
    
    return sortedLevels.find(level => reputation >= level.minReputation) || TRUST_LEVELS[0];
  }

  private async analyzeReputationTrends(userId: string): Promise<{
    direction: 'improving' | 'stable' | 'declining';
    rate: number;
    confidence: number;
  }> {
    try {
      // Get reputation history from engagement records
      const recentEngagement = await prisma.userEngagement.findMany({
        where: { 
          user_id: userId,
          created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        },
        orderBy: { created_at: 'asc' }
      });

      if (recentEngagement.length < 5) {
        return { direction: 'stable', rate: 0, confidence: 0.3 };
      }

      // Calculate trend slope
      const points = recentEngagement.map((e, index) => ({
        x: index,
        y: e.points_earned
      }));

      const slope = this.calculateTrendSlope(points);
      const confidence = Math.min(1, recentEngagement.length / 20);

      let direction: 'improving' | 'stable' | 'declining' = 'stable';
      if (slope > 0.1) direction = 'improving';
      else if (slope < -0.1) direction = 'declining';

      return {
        direction,
        rate: Math.abs(slope),
        confidence
      };
    } catch (error) {
      console.error('Error analyzing reputation trends:', error);
      return { direction: 'stable', rate: 0, confidence: 0 };
    }
  }

  private calculateTrendSlope(points: Array<{ x: number; y: number }>): number {
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private generateRecommendations(factors: ReputationFactors, trends: any): string[] {
    const recommendations: string[] = [];

    if (factors.contentQuality < 60) {
      recommendations.push('Focus on creating higher quality, more detailed content');
    }
    
    if (factors.communityHelpfulness < 40) {
      recommendations.push('Help other community members by answering questions and providing useful feedback');
    }
    
    if (factors.consistentActivity < 30) {
      recommendations.push('Engage more regularly with the community to build consistent activity');
    }
    
    if (factors.expertiseLevel < 50 && factors.contentQuality > 70) {
      recommendations.push('Consider applying for expert verification in your areas of expertise');
    }
    
    if (trends.direction === 'declining') {
      recommendations.push('Your recent activity trend is declining - focus on positive contributions');
    }
    
    if (factors.communityTrust < 30) {
      recommendations.push('Build trust by making accurate reports and helping moderate the community');
    }

    if (recommendations.length === 0) {
      recommendations.push('Keep up the great work! You\'re a valued community member');
    }

    return recommendations;
  }

  private async updateUserReputationScore(
    userId: string, 
    reputation: number, 
    factors: ReputationFactors, 
    trustLevel: TrustLevel
  ): Promise<void> {
    try {
      await prisma.userReputationScore.upsert({
        where: { user_id: userId },
        update: {
          overall_reputation: Math.round(reputation),
          content_quality_avg: factors.contentQuality / 100,
          community_helpfulness: factors.communityHelpfulness,
          trust_level: trustLevel.level,
          last_calculated: new Date()
        },
        create: {
          user_id: userId,
          overall_reputation: Math.round(reputation),
          content_quality_avg: factors.contentQuality / 100,
          community_helpfulness: factors.communityHelpfulness,
          trust_level: trustLevel.level,
          last_calculated: new Date()
        }
      });
    } catch (error) {
      console.error('Error updating user reputation score:', error);
    }
  }

  private getDefaultFactors(): ReputationFactors {
    return {
      contentQuality: 50,
      communityHelpfulness: 50,
      consistentActivity: 50,
      moderationHistory: 100,
      expertiseLevel: 0,
      communityTrust: 50,
      accountMaturity: 20,
      behaviorPattern: 50
    };
  }

  // Public method to record reputation events
  public async recordReputationEvent(
    userId: string, 
    event: ReputationEvent
  ): Promise<void> {
    try {
      // Record the event
      await prisma.userEngagement.create({
        data: {
          user_id: userId,
          action_type: `reputation_${event.type}`,
          points_earned: Math.round(event.impact * event.weight),
          description: event.reason,
          related_type: 'reputation_system'
        }
      });

      // Trigger reputation recalculation if significant event
      if (Math.abs(event.impact) >= 25) {
        await this.calculateUserReputation(userId);
      }
    } catch (error) {
      console.error('Error recording reputation event:', error);
    }
  }
}

// Export singleton instance
export const userReputationEngine = new UserReputationEngine();