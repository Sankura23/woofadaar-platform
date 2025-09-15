// Week 23 Phase 3: Community Feedback Integration System
// Crowdsourced moderation validation and AI improvement

import prisma from './db';
import { automatedModerationEngine } from './automated-moderation';
import { userReputationEngine } from './user-reputation-engine';

export interface CommunityFeedback {
  id: string;
  contentId: string;
  contentType: string;
  originalAction: 'allow' | 'flag' | 'review' | 'block';
  suggestedAction: 'allow' | 'flag' | 'review' | 'block';
  moderationConfidence: number;
  feedback: {
    wasAccurate: boolean;
    severity: 'too_lenient' | 'accurate' | 'too_strict';
    categories: string[];
    explanation?: string;
    alternativeAction?: string;
  };
  voterId: string;
  voterTrustLevel: string;
  voterReputation: number;
  submittedAt: Date;
  weight: number; // Calculated based on voter reputation and expertise
}

export interface ModerationConsensus {
  contentId: string;
  contentType: string;
  originalDecision: {
    action: string;
    confidence: number;
    reasons: string[];
    timestamp: Date;
  };
  communityFeedback: {
    totalVotes: number;
    agreementRate: number;
    consensusAction: string;
    confidenceScore: number;
    expertVotes: number;
    trustedVotes: number;
    categories: Record<string, number>;
  };
  recommendation: {
    shouldOverride: boolean;
    newAction?: string;
    reason: string;
    confidence: number;
  };
  learningData: {
    patternInsights: string[];
    thresholdAdjustments: Record<string, number>;
    ruleImprovements: string[];
  };
}

export interface FeedbackCampaign {
  id: string;
  name: string;
  description: string;
  contentFilter: {
    contentTypes: string[];
    dateRange: { start: Date; end: Date };
    moderationActions: string[];
    confidenceRange: { min: number; max: number };
  };
  incentives: {
    pointsPerVote: number;
    bonusThreshold: number;
    expertMultiplier: number;
  };
  requirements: {
    minTrustLevel: string;
    minReputation: number;
    maxVotesPerUser: number;
  };
  isActive: boolean;
  createdAt: Date;
  stats: {
    participantCount: number;
    totalVotes: number;
    consensusRate: number;
    averageQuality: number;
  };
}

export class CommunityFeedbackSystem {
  private readonly MINIMUM_VOTES_FOR_CONSENSUS = 5;
  private readonly EXPERT_VOTE_MULTIPLIER = 3;
  private readonly TRUSTED_VOTE_MULTIPLIER = 2;
  private readonly REPUTATION_THRESHOLD = 150;

  public async submitFeedback(
    contentId: string,
    contentType: string,
    voterId: string,
    feedbackData: {
      wasAccurate: boolean;
      severity: 'too_lenient' | 'accurate' | 'too_strict';
      categories: string[];
      explanation?: string;
      alternativeAction?: string;
    }
  ): Promise<{ success: boolean; message: string; pointsEarned?: number }> {
    try {
      // Get voter information
      const voter = await this.getVoterInfo(voterId);
      if (!voter) {
        return { success: false, message: 'Voter information not found' };
      }

      // Check if user meets minimum requirements
      if (voter.reputation < 50) {
        return { success: false, message: 'Minimum reputation of 50 required to vote' };
      }

      // Check if user has already voted on this content
      const existingVote = await prisma.communityFeedbackVote.findFirst({
        where: {
          content_id: contentId,
          voter_id: voterId
        }
      });

      if (existingVote) {
        return { success: false, message: 'You have already provided feedback for this content' };
      }

      // Get original moderation decision
      const originalDecision = await this.getOriginalModerationDecision(contentId, contentType);
      if (!originalDecision) {
        return { success: false, message: 'Original moderation decision not found' };
      }

      // Calculate vote weight based on voter reputation and expertise
      const voteWeight = this.calculateVoteWeight(voter);

      // Create feedback record
      const feedback = await prisma.communityFeedbackVote.create({
        data: {
          content_id: contentId,
          content_type: contentType,
          voter_id: voterId,
          original_action: originalDecision.action,
          was_accurate: feedbackData.wasAccurate,
          severity_rating: feedbackData.severity,
          feedback_categories: feedbackData.categories,
          explanation: feedbackData.explanation,
          alternative_action: feedbackData.alternativeAction,
          vote_weight: voteWeight,
          voter_reputation: voter.reputation,
          voter_trust_level: voter.trustLevel,
          submitted_at: new Date()
        }
      });

      // Award points to voter
      const pointsEarned = await this.awardFeedbackPoints(voterId, voteWeight, feedbackData.wasAccurate);

      // Check if we have enough votes to analyze consensus
      await this.analyzeConsensusIfReady(contentId, contentType);

      return {
        success: true,
        message: 'Thank you for your feedback!',
        pointsEarned
      };

    } catch (error) {
      console.error('Error submitting community feedback:', error);
      return { success: false, message: 'Failed to submit feedback' };
    }
  }

  public async getCommunityConsensus(
    contentId: string,
    contentType: string
  ): Promise<ModerationConsensus | null> {
    try {
      // Get all feedback for this content
      const feedback = await prisma.communityFeedbackVote.findMany({
        where: {
          content_id: contentId,
          content_type: contentType
        },
        orderBy: { submitted_at: 'desc' }
      });

      if (feedback.length === 0) return null;

      // Get original decision
      const originalDecision = await this.getOriginalModerationDecision(contentId, contentType);
      if (!originalDecision) return null;

      // Calculate consensus metrics
      const totalVotes = feedback.length;
      const weightedVotes = feedback.reduce((sum, vote) => sum + vote.vote_weight, 0);
      const accurateVotes = feedback.filter(vote => vote.was_accurate).length;
      const agreementRate = accurateVotes / totalVotes;

      // Calculate expert participation
      const expertVotes = feedback.filter(vote => 
        vote.voter_trust_level === 'expert' || vote.voter_trust_level === 'moderator'
      ).length;
      
      const trustedVotes = feedback.filter(vote => 
        vote.voter_trust_level === 'trusted' || vote.voter_trust_level === 'expert' || vote.voter_trust_level === 'moderator'
      ).length;

      // Analyze category feedback
      const categoryAnalysis: Record<string, number> = {};
      feedback.forEach(vote => {
        vote.feedback_categories.forEach(category => {
          categoryAnalysis[category] = (categoryAnalysis[category] || 0) + vote.vote_weight;
        });
      });

      // Determine consensus action
      const consensusAction = this.calculateConsensusAction(feedback, weightedVotes);
      const confidenceScore = this.calculateConsensusConfidence(feedback, agreementRate, expertVotes);

      // Generate recommendation
      const recommendation = this.generateOverrideRecommendation(
        originalDecision,
        consensusAction,
        agreementRate,
        confidenceScore,
        expertVotes
      );

      // Generate learning insights
      const learningData = await this.generateLearningInsights(
        contentId,
        contentType,
        originalDecision,
        feedback,
        consensusAction
      );

      return {
        contentId,
        contentType,
        originalDecision: {
          action: originalDecision.action,
          confidence: originalDecision.confidence,
          reasons: originalDecision.reasons || [],
          timestamp: originalDecision.timestamp
        },
        communityFeedback: {
          totalVotes,
          agreementRate,
          consensusAction,
          confidenceScore,
          expertVotes,
          trustedVotes,
          categories: categoryAnalysis
        },
        recommendation,
        learningData
      };

    } catch (error) {
      console.error('Error calculating community consensus:', error);
      return null;
    }
  }

  public async createFeedbackCampaign(
    name: string,
    description: string,
    options: {
      contentTypes?: string[];
      dateRange?: { start: Date; end: Date };
      moderationActions?: string[];
      confidenceRange?: { min: number; max: number };
      pointsPerVote?: number;
      bonusThreshold?: number;
      minTrustLevel?: string;
      minReputation?: number;
    }
  ): Promise<string> {
    try {
      const campaign = await prisma.feedbackCampaign.create({
        data: {
          name,
          description,
          content_types: options.contentTypes || ['question', 'answer', 'comment'],
          date_range_start: options.dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          date_range_end: options.dateRange?.end || new Date(),
          moderation_actions: options.moderationActions || ['flag', 'review', 'block'],
          confidence_min: options.confidenceRange?.min || 0.3,
          confidence_max: options.confidenceRange?.max || 0.8,
          points_per_vote: options.pointsPerVote || 5,
          bonus_threshold: options.bonusThreshold || 10,
          min_trust_level: options.minTrustLevel || 'new',
          min_reputation: options.minReputation || 50,
          is_active: true,
          created_at: new Date()
        }
      });

      return campaign.id;
    } catch (error) {
      console.error('Error creating feedback campaign:', error);
      throw new Error('Failed to create feedback campaign');
    }
  }

  public async getFeedbackOpportunities(
    userId: string,
    limit: number = 10
  ): Promise<Array<{
    contentId: string;
    contentType: string;
    contentPreview: string;
    originalAction: string;
    confidence: number;
    moderatedAt: Date;
    pointsAvailable: number;
    priority: 'low' | 'medium' | 'high';
  }>> {
    try {
      const user = await this.getVoterInfo(userId);
      if (!user || user.reputation < 50) return [];

      // Get content that needs community feedback
      const opportunities = await prisma.$queryRaw`
        SELECT 
          aml.content_id,
          aml.content_type,
          aml.result as original_action,
          aml.confidence,
          aml.created_at as moderated_at,
          CASE 
            WHEN aml.confidence < 0.6 THEN 'high'
            WHEN aml.confidence < 0.8 THEN 'medium'
            ELSE 'low'
          END as priority
        FROM auto_moderation_log aml
        LEFT JOIN community_feedback_vote cfv 
          ON aml.content_id = cfv.content_id 
          AND cfv.voter_id = ${userId}
        WHERE aml.result IN ('flag', 'review', 'block')
          AND aml.created_at > NOW() - INTERVAL 7 DAY
          AND cfv.id IS NULL
          AND (
            SELECT COUNT(*) 
            FROM community_feedback_vote cfv2 
            WHERE cfv2.content_id = aml.content_id
          ) < 10
        ORDER BY 
          aml.confidence ASC,
          aml.created_at DESC
        LIMIT ${limit}
      `;

      const results = opportunities as any[];
      
      return await Promise.all(
        results.map(async (item) => {
          const pointsAvailable = this.calculateFeedbackPoints(user, item.priority);
          const contentPreview = await this.getContentPreview(item.content_id, item.content_type);
          
          return {
            contentId: item.content_id,
            contentType: item.content_type,
            contentPreview: contentPreview || 'Content not available',
            originalAction: item.original_action,
            confidence: parseFloat(item.confidence),
            moderatedAt: new Date(item.moderated_at),
            pointsAvailable,
            priority: item.priority
          };
        })
      );

    } catch (error) {
      console.error('Error getting feedback opportunities:', error);
      return [];
    }
  }

  // Private helper methods
  private async getVoterInfo(voterId: string): Promise<{
    id: string;
    reputation: number;
    trustLevel: string;
    expertiseAreas: string[];
  } | null> {
    try {
      const reputation = await userReputationEngine.calculateUserReputation(voterId);
      
      return {
        id: voterId,
        reputation: reputation.overallReputation,
        trustLevel: reputation.trustLevel.level,
        expertiseAreas: [] // Would be derived from user activity/specializations
      };
    } catch (error) {
      console.error('Error getting voter info:', error);
      return null;
    }
  }

  private calculateVoteWeight(voter: { reputation: number; trustLevel: string }): number {
    let weight = 1.0;

    // Base weight from reputation
    if (voter.reputation >= 500) weight = 2.0;
    else if (voter.reputation >= 300) weight = 1.5;
    else if (voter.reputation >= 150) weight = 1.2;
    else if (voter.reputation < 50) weight = 0.5;

    // Trust level multiplier
    switch (voter.trustLevel) {
      case 'admin':
      case 'moderator':
        weight *= 3.0;
        break;
      case 'expert':
        weight *= 2.5;
        break;
      case 'trusted':
        weight *= 1.5;
        break;
      case 'new':
        weight *= 0.8;
        break;
      case 'restricted':
        weight *= 0.3;
        break;
    }

    return Math.min(3.0, Math.max(0.1, weight));
  }

  private async getOriginalModerationDecision(
    contentId: string,
    contentType: string
  ): Promise<{
    action: string;
    confidence: number;
    reasons?: string[];
    timestamp: Date;
  } | null> {
    try {
      const log = await prisma.autoModerationLog.findFirst({
        where: {
          content_id: contentId,
          content_type: contentType
        },
        orderBy: { created_at: 'desc' }
      });

      if (!log) return null;

      return {
        action: log.result,
        confidence: log.confidence,
        reasons: log.flags_detected,
        timestamp: log.created_at
      };
    } catch (error) {
      console.error('Error getting original decision:', error);
      return null;
    }
  }

  private async awardFeedbackPoints(
    userId: string,
    voteWeight: number,
    wasAccurate: boolean
  ): Promise<number> {
    try {
      const basePoints = 5;
      const weightMultiplier = Math.min(voteWeight, 2.0);
      const accuracyBonus = wasAccurate ? 1.2 : 0.8;
      
      const pointsEarned = Math.round(basePoints * weightMultiplier * accuracyBonus);

      await prisma.userEngagement.create({
        data: {
          user_id: userId,
          action_type: 'community_feedback_vote',
          points_earned: pointsEarned,
          description: `Community feedback vote (weight: ${voteWeight.toFixed(1)}, accuracy: ${wasAccurate ? 'correct' : 'disputed'})`,
          related_type: 'moderation'
        }
      });

      return pointsEarned;
    } catch (error) {
      console.error('Error awarding feedback points:', error);
      return 0;
    }
  }

  private calculateConsensusAction(
    feedback: any[],
    totalWeight: number
  ): string {
    const actionWeights: Record<string, number> = {
      'allow': 0,
      'flag': 0,
      'review': 0,
      'block': 0
    };

    feedback.forEach(vote => {
      if (vote.alternative_action) {
        actionWeights[vote.alternative_action] += vote.vote_weight;
      } else if (vote.was_accurate) {
        actionWeights[vote.original_action] += vote.vote_weight;
      }
    });

    return Object.entries(actionWeights).reduce((a, b) => 
      actionWeights[a[0]] > actionWeights[b[0]] ? a : b
    )[0];
  }

  private calculateConsensusConfidence(
    feedback: any[],
    agreementRate: number,
    expertVotes: number
  ): number {
    let confidence = agreementRate;

    // Boost confidence with expert participation
    if (expertVotes > 0) {
      confidence += Math.min(expertVotes * 0.1, 0.3);
    }

    // Boost confidence with volume
    if (feedback.length >= this.MINIMUM_VOTES_FOR_CONSENSUS) {
      confidence += Math.min((feedback.length - this.MINIMUM_VOTES_FOR_CONSENSUS) * 0.05, 0.2);
    }

    return Math.min(1.0, confidence);
  }

  private generateOverrideRecommendation(
    originalDecision: any,
    consensusAction: string,
    agreementRate: number,
    confidenceScore: number,
    expertVotes: number
  ): {
    shouldOverride: boolean;
    newAction?: string;
    reason: string;
    confidence: number;
  } {
    // Strong disagreement with high confidence
    if (agreementRate < 0.3 && confidenceScore > 0.7) {
      return {
        shouldOverride: true,
        newAction: consensusAction,
        reason: 'Strong community disagreement with high confidence',
        confidence: confidenceScore
      };
    }

    // Expert consensus differs from original
    if (expertVotes >= 2 && consensusAction !== originalDecision.action && confidenceScore > 0.6) {
      return {
        shouldOverride: true,
        newAction: consensusAction,
        reason: 'Expert community consensus differs from automated decision',
        confidence: confidenceScore
      };
    }

    // Low original confidence with strong community input
    if (originalDecision.confidence < 0.6 && confidenceScore > 0.8) {
      return {
        shouldOverride: true,
        newAction: consensusAction,
        reason: 'Low original confidence overridden by strong community consensus',
        confidence: confidenceScore
      };
    }

    return {
      shouldOverride: false,
      reason: 'Community feedback supports original decision',
      confidence: confidenceScore
    };
  }

  private async generateLearningInsights(
    contentId: string,
    contentType: string,
    originalDecision: any,
    feedback: any[],
    consensusAction: string
  ): Promise<{
    patternInsights: string[];
    thresholdAdjustments: Record<string, number>;
    ruleImprovements: string[];
  }> {
    const insights: string[] = [];
    const thresholdAdjustments: Record<string, number> = {};
    const ruleImprovements: string[] = [];

    // Analyze disagreement patterns
    const disagreementRate = feedback.filter(f => !f.was_accurate).length / feedback.length;
    
    if (disagreementRate > 0.5) {
      insights.push('High disagreement suggests automated decision may be too aggressive');
      
      if (originalDecision.action === 'block') {
        thresholdAdjustments['toxicity_block_threshold'] = 2;
        thresholdAdjustments['spam_block_threshold'] = 2;
      }
    }

    // Analyze category patterns
    const categoryFrequency: Record<string, number> = {};
    feedback.forEach(vote => {
      vote.feedback_categories.forEach((cat: string) => {
        categoryFrequency[cat] = (categoryFrequency[cat] || 0) + 1;
      });
    });

    const topCategory = Object.entries(categoryFrequency).sort((a, b) => b[1] - a[1])[0];
    if (topCategory && topCategory[1] >= feedback.length * 0.6) {
      insights.push(`Community consistently identifies this as: ${topCategory[0]}`);
      
      if (topCategory[0] === 'false_positive') {
        ruleImprovements.push(`Review rules for ${contentType} content to reduce false positives`);
      }
    }

    return {
      patternInsights: insights,
      thresholdAdjustments,
      ruleImprovements
    };
  }

  private calculateFeedbackPoints(voter: any, priority: string): number {
    let basePoints = 5;
    
    if (priority === 'high') basePoints = 10;
    else if (priority === 'medium') basePoints = 7;

    // Reputation multiplier
    const reputationMultiplier = Math.min(voter.reputation / 200, 2.0);
    
    return Math.round(basePoints * reputationMultiplier);
  }

  private async getContentPreview(contentId: string, contentType: string): Promise<string | null> {
    try {
      let content = null;

      switch (contentType) {
        case 'question':
          const question = await prisma.communityQuestion.findUnique({
            where: { id: contentId },
            select: { title: true, content: true }
          });
          content = question ? `${question.title}\n${question.content}` : null;
          break;
          
        case 'answer':
          const answer = await (prisma as any).communityAnswer?.findUnique({
            where: { id: contentId },
            select: { content: true }
          });
          content = answer?.content || null;
          break;

        case 'comment':
          const comment = await (prisma as any).communityComment?.findUnique({
            where: { id: contentId },
            select: { content: true }
          });
          content = comment?.content || null;
          break;
      }

      if (content) {
        // Return first 200 characters
        return content.length > 200 ? content.substring(0, 200) + '...' : content;
      }

      return null;
    } catch (error) {
      console.error('Error getting content preview:', error);
      return null;
    }
  }

  private async analyzeConsensusIfReady(contentId: string, contentType: string): Promise<void> {
    try {
      const voteCount = await prisma.communityFeedbackVote.count({
        where: { content_id: contentId, content_type: contentType }
      });

      if (voteCount >= this.MINIMUM_VOTES_FOR_CONSENSUS) {
        const consensus = await this.getCommunityConsensus(contentId, contentType);
        
        if (consensus?.recommendation.shouldOverride) {
          // Log override recommendation for admin review
          await prisma.moderationOverrideRecommendation.create({
            data: {
              content_id: contentId,
              content_type: contentType,
              original_action: consensus.originalDecision.action,
              recommended_action: consensus.recommendation.newAction || consensus.originalDecision.action,
              confidence: consensus.recommendation.confidence,
              reason: consensus.recommendation.reason,
              community_votes: consensus.communityFeedback.totalVotes,
              expert_votes: consensus.communityFeedback.expertVotes,
              agreement_rate: consensus.communityFeedback.agreementRate,
              status: 'pending_review'
            }
          });
        }

        // Update automated moderation with learning data
        if (consensus?.learningData.thresholdAdjustments) {
          await automatedModerationEngine.updateLearningThresholds({
            contentType,
            contentId,
            wasAccurate: consensus.communityFeedback.agreementRate > 0.7,
            actualAction: consensus.communityFeedback.consensusAction,
            moderatorNotes: consensus.learningData.patternInsights.join('; ')
          });
        }
      }
    } catch (error) {
      console.error('Error analyzing consensus:', error);
    }
  }
}

// Export singleton instance
export const communityFeedbackSystem = new CommunityFeedbackSystem();