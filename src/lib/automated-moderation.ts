// Week 23 Phase 2: Automated Content Moderation System
// Real-time content filtering with learning capabilities

import prisma from './db';
import { contentAnalyzer } from './advanced-content-analyzer';

export interface AutoModerationResult {
  action: 'allow' | 'flag' | 'review' | 'block';
  confidence: number;
  reasons: string[];
  autoActions: AutoModerationAction[];
  queueItem?: string;
  processingTime: number;
}

export interface AutoModerationAction {
  type: 'hide' | 'warn' | 'queue' | 'notify' | 'restrict';
  target: 'content' | 'user';
  duration?: number; // hours
  reason: string;
}

export interface ContentContext {
  userId: string;
  userReputation?: number;
  userTrustLevel?: string;
  isNewUser?: boolean;
  recentViolations?: number;
  contentHistory?: {
    totalPosts: number;
    spamRate: number;
    toxicityRate: number;
    qualityAverage: number;
  };
}

export class AutomatedModerationEngine {
  private learningThresholds = {
    spam: {
      autoBlock: 85,    // Auto-block if spam score > 85%
      autoReview: 70,   // Queue for review if > 70%
      autoFlag: 50      // Flag if > 50%
    },
    toxicity: {
      autoBlock: 80,    // Auto-block if toxicity > 80%
      autoReview: 60,   // Queue for review if > 60%
      autoFlag: 40      // Flag if > 40%
    },
    quality: {
      autoReview: 25,   // Review if quality < 25%
      autoFlag: 40      // Flag if quality < 40%
    }
  };

  public async moderateContent(
    content: string,
    contentType: 'question' | 'answer' | 'comment' | 'forum_post' | 'story',
    contentId: string,
    context: ContentContext
  ): Promise<AutoModerationResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Run comprehensive analysis
      const analysis = await contentAnalyzer.analyzeContent(content);
      
      // Step 2: Get user context and reputation
      const userContext = await this.getUserModerationContext(context.userId);
      
      // Step 3: Apply learning-based decision making
      const decision = this.makeAutomatedDecision(analysis, userContext, context);
      
      // Step 4: Execute auto-actions if needed
      const autoActions = await this.executeAutoActions(decision, contentType, contentId, context);
      
      // Step 5: Log the decision for learning
      await this.logModerationDecision(analysis, decision, contentType, contentId, context.userId);
      
      const processingTime = Date.now() - startTime;
      
      return {
        action: decision.action,
        confidence: decision.confidence,
        reasons: decision.reasons,
        autoActions,
        queueItem: decision.queueItem,
        processingTime
      };
      
    } catch (error) {
      console.error('Automated moderation error:', error);
      
      // Fallback to safe default
      return {
        action: 'allow',
        confidence: 0,
        reasons: ['Moderation system error - defaulting to allow'],
        autoActions: [],
        processingTime: Date.now() - startTime
      };
    }
  }

  private async getUserModerationContext(userId: string): Promise<any> {
    try {
      // Get user reputation and moderation history
      const [reputation, recentActions, violations] = await Promise.all([
        // User reputation score
        prisma.userReputationScore.findUnique({
          where: { user_id: userId }
        }),
        
        // Recent moderation actions against this user
        prisma.contentModerationAction.count({
          where: {
            moderator_id: userId,
            created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        }),
        
        // Recent violations
        prisma.contentReport.count({
          where: {
            content_id: userId,
            status: 'resolved',
            resolution: { contains: 'violation' },
            created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        })
      ]);

      return {
        reputation: reputation?.overall_reputation || 100,
        trustLevel: reputation?.trust_level || 'new',
        restrictionLevel: reputation?.restriction_level || 'none',
        recentActions,
        recentViolations: violations,
        isNewUser: !reputation || (Date.now() - reputation.created_at.getTime()) < 7 * 24 * 60 * 60 * 1000,
        spamReportsCount: reputation?.spam_reports_count || 0,
        moderationStrikes: reputation?.moderation_strikes || 0
      };
    } catch (error) {
      console.error('Error getting user context:', error);
      return {
        reputation: 100,
        trustLevel: 'new',
        restrictionLevel: 'none',
        recentActions: 0,
        recentViolations: 0,
        isNewUser: true,
        spamReportsCount: 0,
        moderationStrikes: 0
      };
    }
  }

  private makeAutomatedDecision(analysis: any, userContext: any, context: ContentContext): {
    action: 'allow' | 'flag' | 'review' | 'block';
    confidence: number;
    reasons: string[];
    queueItem?: string;
  } {
    const reasons: string[] = [];
    let finalAction: 'allow' | 'flag' | 'review' | 'block' = 'allow';
    let confidence = 0;

    // Factor in user reputation and trust level
    const reputationMultiplier = this.calculateReputationMultiplier(userContext);
    const adjustedSpamScore = analysis.spam.spamScore * reputationMultiplier;
    const adjustedToxicityScore = analysis.toxicity.toxicityScore * reputationMultiplier;

    // Decision matrix based on scores and user context
    
    // Critical toxicity or spam - immediate action
    if (adjustedToxicityScore >= this.learningThresholds.toxicity.autoBlock || 
        adjustedSpamScore >= this.learningThresholds.spam.autoBlock) {
      finalAction = 'block';
      confidence = 0.95;
      reasons.push('High toxicity/spam score with user reputation factor');
      
      if (adjustedToxicityScore >= 90) {
        reasons.push('Critical toxicity detected - immediate intervention required');
      }
    }
    
    // High risk content requiring review
    else if (adjustedToxicityScore >= this.learningThresholds.toxicity.autoReview || 
             adjustedSpamScore >= this.learningThresholds.spam.autoReview ||
             analysis.quality.qualityScore <= this.learningThresholds.quality.autoReview) {
      finalAction = 'review';
      confidence = 0.8;
      reasons.push('Content requires human review');
      
      if (userContext.moderationStrikes > 2) {
        reasons.push('User has multiple previous violations');
        confidence = 0.85;
      }
    }
    
    // Medium risk content - flag for monitoring
    else if (adjustedToxicityScore >= this.learningThresholds.toxicity.autoFlag || 
             adjustedSpamScore >= this.learningThresholds.spam.autoFlag ||
             analysis.quality.qualityScore <= this.learningThresholds.quality.autoFlag) {
      finalAction = 'flag';
      confidence = 0.65;
      reasons.push('Medium risk content flagged for monitoring');
    }
    
    // Special cases based on user behavior patterns
    if (userContext.recentViolations > 1 && finalAction === 'allow') {
      finalAction = 'flag';
      confidence = Math.max(confidence, 0.7);
      reasons.push('Recent violation pattern detected');
    }
    
    if (userContext.restrictionLevel !== 'none' && finalAction === 'allow') {
      finalAction = 'flag';
      confidence = Math.max(confidence, 0.6);
      reasons.push('User currently under restrictions');
    }

    // Trusted user adjustments
    if (userContext.trustLevel === 'expert' || userContext.trustLevel === 'moderator') {
      if (finalAction === 'flag') {
        finalAction = 'allow';
        confidence *= 0.8;
        reasons.push('Trusted user - reduced sensitivity');
      }
    }

    // New user extra scrutiny
    if (userContext.isNewUser && analysis.spam.spamScore > 30) {
      if (finalAction === 'allow') {
        finalAction = 'flag';
        confidence = Math.max(confidence, 0.6);
        reasons.push('New user with potential spam indicators');
      }
    }

    return {
      action: finalAction,
      confidence,
      reasons
    };
  }

  private calculateReputationMultiplier(userContext: any): number {
    let multiplier = 1.0;

    // Reputation-based adjustments
    if (userContext.reputation < 50) {
      multiplier *= 1.3; // More sensitive for low reputation users
    } else if (userContext.reputation > 200) {
      multiplier *= 0.8; // Less sensitive for high reputation users
    }

    // Trust level adjustments
    if (userContext.trustLevel === 'expert') {
      multiplier *= 0.7;
    } else if (userContext.trustLevel === 'trusted') {
      multiplier *= 0.85;
    } else if (userContext.trustLevel === 'new') {
      multiplier *= 1.2;
    }

    // Recent violations increase sensitivity
    if (userContext.moderationStrikes > 0) {
      multiplier *= (1 + userContext.moderationStrikes * 0.2);
    }

    return Math.min(2.0, Math.max(0.5, multiplier));
  }

  private async executeAutoActions(
    decision: any,
    contentType: string,
    contentId: string,
    context: ContentContext
  ): Promise<AutoModerationAction[]> {
    const actions: AutoModerationAction[] = [];

    try {
      // Execute actions based on decision
      switch (decision.action) {
        case 'block':
          // Hide content immediately
          actions.push({
            type: 'hide',
            target: 'content',
            reason: 'Auto-blocked due to policy violation'
          });
          
          // Warn user
          actions.push({
            type: 'warn',
            target: 'user',
            reason: 'Content automatically blocked for policy violation'
          });
          
          // Add to urgent review queue
          await this.addToModerationQueue(contentType, contentId, 'urgent', 10, 'Auto-blocked content requiring review');
          actions.push({
            type: 'queue',
            target: 'content',
            reason: 'Added to urgent moderation queue'
          });
          
          break;

        case 'review':
          // Add to review queue with high priority
          await this.addToModerationQueue(contentType, contentId, 'review', 7, 'High-risk content requiring human review');
          actions.push({
            type: 'queue',
            target: 'content',
            reason: 'Queued for moderator review'
          });
          
          // Notify moderators if very high risk
          if (decision.confidence > 0.85) {
            actions.push({
              type: 'notify',
              target: 'content',
              reason: 'High-risk content - moderator notification sent'
            });
          }
          
          break;

        case 'flag':
          // Add to monitoring queue with normal priority
          await this.addToModerationQueue(contentType, contentId, 'review', 5, 'Flagged content for monitoring');
          actions.push({
            type: 'queue',
            target: 'content',
            reason: 'Flagged for monitoring'
          });
          
          break;

        case 'allow':
          // No immediate actions, but still log for learning
          break;
      }

      // User-level actions based on pattern detection
      if (context.userReputation && context.userReputation < 30 && decision.confidence > 0.8) {
        actions.push({
          type: 'restrict',
          target: 'user',
          duration: 24,
          reason: 'Temporary posting restriction due to repeated policy violations'
        });

        // Update user reputation
        await this.updateUserReputation(context.userId, -10, 'automated_restriction');
      }

    } catch (error) {
      console.error('Error executing auto actions:', error);
    }

    return actions;
  }

  private async addToModerationQueue(
    contentType: string,
    contentId: string,
    queueType: string,
    priority: number,
    reason: string
  ): Promise<string> {
    try {
      const queueItem = await prisma.advancedModerationQueue.create({
        data: {
          content_type: contentType,
          content_id: contentId,
          queue_type: queueType,
          priority,
          added_reason: reason,
          added_by: 'auto_moderation_system',
          status: 'pending'
        }
      });

      return queueItem.id;
    } catch (error) {
      console.error('Error adding to moderation queue:', error);
      return '';
    }
  }

  private async updateUserReputation(
    userId: string,
    points: number,
    reason: string
  ): Promise<void> {
    try {
      await prisma.userReputationScore.upsert({
        where: { user_id: userId },
        update: {
          overall_reputation: { increment: points },
          last_calculated: new Date()
        },
        create: {
          user_id: userId,
          overall_reputation: Math.max(0, 100 + points),
          last_calculated: new Date()
        }
      });

      // Log reputation change
      await prisma.userEngagement.create({
        data: {
          user_id: userId,
          action_type: 'reputation_change',
          points_earned: points,
          description: `Reputation ${points > 0 ? 'increased' : 'decreased'}: ${reason}`,
          related_type: 'moderation'
        }
      });
    } catch (error) {
      console.error('Error updating user reputation:', error);
    }
  }

  private async logModerationDecision(
    analysis: any,
    decision: any,
    contentType: string,
    contentId: string,
    userId: string
  ): Promise<void> {
    try {
      await prisma.autoModerationLog.create({
        data: {
          content_type: contentType,
          content_id: contentId,
          check_type: 'comprehensive_auto_moderation',
          result: decision.action === 'allow' ? 'passed' : 'flagged',
          confidence: decision.confidence,
          flags_detected: [
            ...(analysis.spam?.flags || []),
            ...(analysis.toxicity?.flags || []),
            ...(analysis.quality?.qualityScore < 50 ? ['low_quality'] : [])
          ],
          raw_scores: {
            analysis,
            decision,
            userId,
            timestamp: new Date().toISOString()
          },
          processing_time: analysis.processingTime || 0
        }
      });
    } catch (error) {
      console.error('Error logging moderation decision:', error);
    }
  }

  // Learning function to adjust thresholds based on feedback
  public async updateLearningThresholds(feedback: {
    contentType: string;
    contentId: string;
    wasAccurate: boolean;
    actualAction: string;
    moderatorNotes?: string;
  }): Promise<void> {
    try {
      // Find the original auto-moderation log
      const log = await prisma.autoModerationLog.findFirst({
        where: {
          content_type: feedback.contentType,
          content_id: feedback.contentId,
          check_type: 'comprehensive_auto_moderation'
        },
        orderBy: { created_at: 'desc' }
      });

      if (!log) return;

      // Update rule triggers for learning
      const rawScores = log.raw_scores as any;
      if (rawScores?.analysis && rawScores?.decision) {
        // This is where we would implement machine learning adjustments
        // For now, we'll log the feedback for future analysis
        console.log('Learning feedback received:', {
          originalDecision: rawScores.decision.action,
          actualAction: feedback.actualAction,
          wasAccurate: feedback.wasAccurate,
          spamScore: rawScores.analysis.spam?.spamScore,
          toxicityScore: rawScores.analysis.toxicity?.toxicityScore,
          qualityScore: rawScores.analysis.quality?.qualityScore
        });

        // Simple threshold adjustment based on feedback
        if (!feedback.wasAccurate) {
          // If we were too aggressive, slightly increase thresholds
          if (rawScores.decision.action === 'block' && feedback.actualAction === 'allow') {
            this.learningThresholds.spam.autoBlock += 2;
            this.learningThresholds.toxicity.autoBlock += 2;
          }
          // If we were too lenient, slightly decrease thresholds
          else if (rawScores.decision.action === 'allow' && feedback.actualAction === 'block') {
            this.learningThresholds.spam.autoBlock -= 1;
            this.learningThresholds.toxicity.autoBlock -= 1;
          }
        }
      }
    } catch (error) {
      console.error('Error updating learning thresholds:', error);
    }
  }
}

// Export singleton instance
export const automatedModerationEngine = new AutomatedModerationEngine();

// Helper function to integrate with existing content creation workflows
export async function processNewContent(
  content: string,
  contentType: 'question' | 'answer' | 'comment' | 'forum_post' | 'story',
  contentId: string,
  userId: string
): Promise<AutoModerationResult> {
  const context: ContentContext = {
    userId,
    isNewUser: false // This would be determined by actual user data
  };

  return await automatedModerationEngine.moderateContent(
    content,
    contentType,
    contentId,
    context
  );
}