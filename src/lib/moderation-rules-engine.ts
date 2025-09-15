// Week 23 Phase 3: Custom Moderation Rules Engine
// Dynamic rule-based content moderation with visual rule builder

import prisma from './db';
import { contentAnalyzer } from './advanced-content-analyzer';
import { userReputationEngine } from './user-reputation-engine';

export interface ModerationRule {
  id: string;
  name: string;
  description: string;
  priority: number; // 1-10, higher = more important
  isActive: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  trigger: RuleTrigger;
  createdBy: string;
  createdAt: Date;
  lastModified: Date;
  stats: {
    timesTriggered: number;
    successRate: number;
    falsePositiveRate: number;
  };
}

export interface RuleCondition {
  type: 'content_analysis' | 'user_reputation' | 'user_history' | 'time_based' | 'content_metadata';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'in' | 'not_in';
  field: string;
  value: any;
  weight: number; // 0.1 to 2.0 - how important this condition is
}

export interface RuleAction {
  type: 'block' | 'flag' | 'review' | 'warn' | 'restrict' | 'notify' | 'assign' | 'escalate';
  target: 'content' | 'user' | 'moderator';
  parameters: {
    duration?: number; // in hours
    reason?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    assignTo?: string;
    notificationTemplate?: string;
    escalationLevel?: number;
  };
}

export interface RuleTrigger {
  event: 'content_posted' | 'content_reported' | 'user_action' | 'scheduled' | 'threshold_reached';
  frequency: 'immediate' | 'batch_hourly' | 'batch_daily';
  conditions: {
    contentTypes?: string[];
    userTypes?: string[];
    timeWindow?: number; // in minutes
    minimumScore?: number;
  };
}

export interface RuleExecutionResult {
  ruleId: string;
  triggered: boolean;
  confidence: number;
  matchedConditions: string[];
  actionsExecuted: string[];
  processingTime: number;
  reason: string;
}

export class ModerationRulesEngine {
  private ruleCache: Map<string, ModerationRule> = new Map();
  private lastCacheUpdate = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  public async executeRules(
    contentId: string,
    contentType: string,
    content: string,
    userId: string,
    trigger: string = 'content_posted'
  ): Promise<RuleExecutionResult[]> {
    const startTime = Date.now();
    
    try {
      // Get active rules for this trigger
      const rules = await this.getActiveRules(trigger);
      const results: RuleExecutionResult[] = [];

      // Get context data needed for rule evaluation
      const [contentAnalysis, userReputation, userHistory] = await Promise.all([
        contentAnalyzer.analyzeContent(content),
        userReputationEngine.calculateUserReputation(userId),
        this.getUserModerationHistory(userId)
      ]);

      const context = {
        contentId,
        contentType,
        content,
        userId,
        analysis: contentAnalysis,
        userReputation,
        userHistory,
        timestamp: new Date(),
        metadata: {
          contentLength: content.length,
          wordCount: content.split(/\s+/).length,
          hasLinks: /https?:\/\//.test(content),
          hasEmojis: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(content),
          languageDetected: this.detectLanguage(content)
        }
      };

      // Execute rules in priority order
      const sortedRules = rules.sort((a, b) => b.priority - a.priority);
      
      for (const rule of sortedRules) {
        const result = await this.executeRule(rule, context);
        results.push(result);

        // If a high-priority rule blocks content, stop processing lower priority rules
        if (result.triggered && rule.actions.some(a => a.type === 'block') && rule.priority >= 8) {
          break;
        }
      }

      // Update rule statistics
      await this.updateRuleStats(results);

      return results;

    } catch (error) {
      console.error('Error executing moderation rules:', error);
      return [{
        ruleId: 'system_error',
        triggered: false,
        confidence: 0,
        matchedConditions: [],
        actionsExecuted: [],
        processingTime: Date.now() - startTime,
        reason: 'System error during rule execution'
      }];
    }
  }

  private async executeRule(rule: ModerationRule, context: any): Promise<RuleExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Evaluate all conditions
      const conditionResults = await Promise.all(
        rule.conditions.map(condition => this.evaluateCondition(condition, context))
      );

      // Calculate overall match score
      const totalWeight = rule.conditions.reduce((sum, c) => sum + c.weight, 0);
      const matchedWeight = rule.conditions
        .filter((c, i) => conditionResults[i])
        .reduce((sum, c) => sum + c.weight, 0);
      
      const confidence = totalWeight > 0 ? matchedWeight / totalWeight : 0;
      const triggered = confidence >= 0.5; // Rule triggers if 50%+ of weighted conditions match

      const matchedConditions = rule.conditions
        .filter((c, i) => conditionResults[i])
        .map(c => `${c.field} ${c.operator} ${c.value}`);

      let actionsExecuted: string[] = [];

      if (triggered) {
        // Execute rule actions
        for (const action of rule.actions) {
          try {
            await this.executeAction(action, context, rule);
            actionsExecuted.push(`${action.type}:${action.target}`);
          } catch (actionError) {
            console.error(`Error executing action ${action.type}:`, actionError);
          }
        }

        // Log rule trigger
        await this.logRuleTrigger(rule.id, context, confidence, matchedConditions);
      }

      return {
        ruleId: rule.id,
        triggered,
        confidence,
        matchedConditions,
        actionsExecuted,
        processingTime: Date.now() - startTime,
        reason: triggered ? 
          `Rule "${rule.name}" triggered with ${Math.round(confidence * 100)}% confidence` :
          `Rule "${rule.name}" conditions not met`
      };

    } catch (error) {
      console.error(`Error executing rule ${rule.id}:`, error);
      return {
        ruleId: rule.id,
        triggered: false,
        confidence: 0,
        matchedConditions: [],
        actionsExecuted: [],
        processingTime: Date.now() - startTime,
        reason: `Error executing rule: ${error.message}`
      };
    }
  }

  private async evaluateCondition(condition: RuleCondition, context: any): Promise<boolean> {
    try {
      let fieldValue: any;

      // Extract field value based on condition type
      switch (condition.type) {
        case 'content_analysis':
          fieldValue = this.extractAnalysisField(condition.field, context.analysis);
          break;
        case 'user_reputation':
          fieldValue = this.extractReputationField(condition.field, context.userReputation);
          break;
        case 'user_history':
          fieldValue = this.extractHistoryField(condition.field, context.userHistory);
          break;
        case 'time_based':
          fieldValue = this.extractTimeField(condition.field, context.timestamp);
          break;
        case 'content_metadata':
          fieldValue = this.extractMetadataField(condition.field, context);
          break;
        default:
          return false;
      }

      // Evaluate condition based on operator
      return this.evaluateOperator(fieldValue, condition.operator, condition.value);

    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  }

  private extractAnalysisField(field: string, analysis: any): any {
    const fieldMap: Record<string, any> = {
      'spam_score': analysis.spam?.spamScore || 0,
      'toxicity_score': analysis.toxicity?.toxicityScore || 0,
      'quality_score': analysis.quality?.qualityScore || 50,
      'readability_score': analysis.quality?.readabilityScore || 50,
      'engagement_potential': analysis.quality?.engagementPotential || 50,
      'has_spam_keywords': (analysis.spam?.flags || []).length > 0,
      'has_toxic_language': (analysis.toxicity?.flags || []).length > 0,
      'language_detected': analysis.language || 'unknown',
      'sentiment': analysis.sentiment || 'neutral',
      'word_count': analysis.wordCount || 0,
      'sentence_count': analysis.sentenceCount || 0
    };

    return fieldMap[field];
  }

  private extractReputationField(field: string, reputation: any): any {
    const fieldMap: Record<string, any> = {
      'overall_reputation': reputation.overallReputation || 100,
      'trust_level': reputation.trustLevel?.level || 'new',
      'content_quality_avg': reputation.factors?.contentQuality || 50,
      'community_helpfulness': reputation.factors?.communityHelpfulness || 50,
      'moderation_history': reputation.factors?.moderationHistory || 100,
      'account_age_days': reputation.factors?.accountMaturity || 0,
      'recent_trend': reputation.recentTrends?.direction || 'stable',
      'expert_status': reputation.trustLevel?.level === 'expert' || reputation.trustLevel?.level === 'moderator'
    };

    return fieldMap[field];
  }

  private extractHistoryField(field: string, history: any): any {
    const fieldMap: Record<string, any> = {
      'violations_30d': history.violations30Days || 0,
      'warnings_7d': history.warnings7Days || 0,
      'successful_reports': history.successfulReports || 0,
      'false_reports': history.falseReports || 0,
      'content_removed_count': history.contentRemovedCount || 0,
      'days_since_last_violation': history.daysSinceLastViolation || 999
    };

    return fieldMap[field];
  }

  private extractTimeField(field: string, timestamp: Date): any {
    const fieldMap: Record<string, any> = {
      'hour_of_day': timestamp.getHours(),
      'day_of_week': timestamp.getDay(),
      'is_weekend': timestamp.getDay() === 0 || timestamp.getDay() === 6,
      'is_business_hours': timestamp.getHours() >= 9 && timestamp.getHours() <= 17
    };

    return fieldMap[field];
  }

  private extractMetadataField(field: string, context: any): any {
    const fieldMap: Record<string, any> = {
      'content_length': context.metadata.contentLength,
      'word_count': context.metadata.wordCount,
      'has_links': context.metadata.hasLinks,
      'has_emojis': context.metadata.hasEmojis,
      'language': context.metadata.languageDetected,
      'content_type': context.contentType,
      'is_first_post': context.userHistory?.totalPosts === 0
    };

    return fieldMap[field];
  }

  private evaluateOperator(fieldValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue;
      case 'not_equals':
        return fieldValue !== expectedValue;
      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue);
      case 'less_than':
        return Number(fieldValue) < Number(expectedValue);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase());
      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase());
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
      case 'not_in':
        return Array.isArray(expectedValue) && !expectedValue.includes(fieldValue);
      default:
        return false;
    }
  }

  private async executeAction(action: RuleAction, context: any, rule: ModerationRule): Promise<void> {
    const { type, target, parameters } = action;

    switch (type) {
      case 'block':
        await this.blockContent(context.contentId, parameters.reason || `Blocked by rule: ${rule.name}`);
        break;

      case 'flag':
        await this.flagContent(context.contentId, context.contentType, parameters.severity || 'medium', parameters.reason || rule.name);
        break;

      case 'review':
        await this.queueForReview(context.contentId, context.contentType, rule.priority, `Rule: ${rule.name}`);
        break;

      case 'warn':
        if (target === 'user') {
          await this.warnUser(context.userId, parameters.reason || `Warning from rule: ${rule.name}`);
        }
        break;

      case 'restrict':
        if (target === 'user') {
          await this.restrictUser(context.userId, parameters.duration || 24, parameters.reason || rule.name);
        }
        break;

      case 'notify':
        await this.notifyModerators(context, rule, parameters.severity || 'medium');
        break;

      case 'assign':
        if (parameters.assignTo) {
          await this.assignToModerator(context.contentId, parameters.assignTo, rule.name);
        }
        break;

      case 'escalate':
        await this.escalateToAdmin(context, rule, parameters.escalationLevel || 1);
        break;
    }
  }

  // Action implementation methods
  private async blockContent(contentId: string, reason: string): Promise<void> {
    await prisma.contentModerationAction.create({
      data: {
        content_id: contentId,
        action_type: 'block',
        reason,
        moderator_id: 'system_rules_engine'
      }
    });
  }

  private async flagContent(contentId: string, contentType: string, severity: string, reason: string): Promise<void> {
    await prisma.advancedModerationQueue.create({
      data: {
        content_id: contentId,
        content_type: contentType,
        queue_type: 'flag',
        priority: severity === 'critical' ? 9 : severity === 'high' ? 7 : 5,
        added_reason: reason,
        added_by: 'rules_engine',
        status: 'pending'
      }
    });
  }

  private async queueForReview(contentId: string, contentType: string, priority: number, reason: string): Promise<void> {
    await prisma.advancedModerationQueue.create({
      data: {
        content_id: contentId,
        content_type: contentType,
        queue_type: 'review',
        priority,
        added_reason: reason,
        added_by: 'rules_engine',
        status: 'pending'
      }
    });
  }

  private async warnUser(userId: string, reason: string): Promise<void> {
    await prisma.userEngagement.create({
      data: {
        user_id: userId,
        action_type: 'warning_issued',
        points_earned: -5,
        description: reason,
        related_type: 'moderation'
      }
    });
  }

  private async restrictUser(userId: string, durationHours: number, reason: string): Promise<void> {
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);
    
    await prisma.userReputationScore.upsert({
      where: { user_id: userId },
      update: {
        restriction_level: 'posting_restricted',
        restriction_reason: reason,
        restriction_expires_at: expiresAt
      },
      create: {
        user_id: userId,
        overall_reputation: 75, // Reduced starting reputation for restricted users
        restriction_level: 'posting_restricted',
        restriction_reason: reason,
        restriction_expires_at: expiresAt
      }
    });
  }

  private async notifyModerators(context: any, rule: ModerationRule, severity: string): Promise<void> {
    // In a real implementation, this would send notifications via email, Slack, etc.
    console.log(`MODERATOR ALERT [${severity.toUpperCase()}]: Rule "${rule.name}" triggered for content ${context.contentId}`);
  }

  private async assignToModerator(contentId: string, moderatorId: string, reason: string): Promise<void> {
    await prisma.advancedModerationQueue.updateMany({
      where: { content_id: contentId, status: 'pending' },
      data: {
        assigned_to: moderatorId,
        assigned_at: new Date(),
        added_reason: reason
      }
    });
  }

  private async escalateToAdmin(context: any, rule: ModerationRule, level: number): Promise<void> {
    await prisma.advancedModerationQueue.create({
      data: {
        content_id: context.contentId,
        content_type: context.contentType,
        queue_type: 'escalation',
        priority: 9 + level,
        added_reason: `Escalated by rule: ${rule.name}`,
        added_by: 'rules_engine',
        status: 'pending'
      }
    });
  }

  // Rule management methods
  private async getActiveRules(trigger: string): Promise<ModerationRule[]> {
    const now = Date.now();
    
    // Check cache first
    if (now - this.lastCacheUpdate < this.CACHE_TTL && this.ruleCache.size > 0) {
      return Array.from(this.ruleCache.values()).filter(rule => 
        rule.isActive && rule.trigger.event === trigger
      );
    }

    // Fetch from database
    const dbRules = await prisma.moderationRule.findMany({
      where: {
        is_active: true,
        trigger_event: trigger
      },
      include: {
        conditions: true,
        actions: true
      },
      orderBy: { priority: 'desc' }
    });

    // Convert to our format and cache
    const rules: ModerationRule[] = dbRules.map(this.dbRuleToModerationRule);
    
    this.ruleCache.clear();
    rules.forEach(rule => this.ruleCache.set(rule.id, rule));
    this.lastCacheUpdate = now;

    return rules;
  }

  private dbRuleToModerationRule(dbRule: any): ModerationRule {
    return {
      id: dbRule.id,
      name: dbRule.name,
      description: dbRule.description,
      priority: dbRule.priority,
      isActive: dbRule.is_active,
      conditions: dbRule.conditions.map((c: any) => ({
        type: c.condition_type,
        operator: c.operator,
        field: c.field,
        value: c.value,
        weight: c.weight
      })),
      actions: dbRule.actions.map((a: any) => ({
        type: a.action_type,
        target: a.target,
        parameters: a.parameters
      })),
      trigger: {
        event: dbRule.trigger_event,
        frequency: dbRule.trigger_frequency,
        conditions: dbRule.trigger_conditions || {}
      },
      createdBy: dbRule.created_by,
      createdAt: dbRule.created_at,
      lastModified: dbRule.last_modified,
      stats: {
        timesTriggered: dbRule.times_triggered || 0,
        successRate: dbRule.success_rate || 0,
        falsePositiveRate: dbRule.false_positive_rate || 0
      }
    };
  }

  // Utility methods
  private detectLanguage(content: string): string {
    // Simple language detection based on character patterns
    const hindiPattern = /[\u0900-\u097F]/;
    const englishPattern = /[a-zA-Z]/;
    
    if (hindiPattern.test(content)) {
      return englishPattern.test(content) ? 'hinglish' : 'hindi';
    }
    return 'english';
  }

  private async getUserModerationHistory(userId: string): Promise<any> {
    try {
      const [violations, warnings, reports] = await Promise.all([
        prisma.contentModerationAction.count({
          where: {
            content_id: userId,
            created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        }),
        prisma.userEngagement.count({
          where: {
            user_id: userId,
            action_type: 'warning_issued',
            created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        }),
        prisma.contentReport.findMany({
          where: { reported_by: userId },
          include: { actions: true }
        })
      ]);

      const successfulReports = reports.filter(r => 
        r.actions.some(a => a.action_type !== 'dismiss')
      ).length;

      return {
        violations30Days: violations,
        warnings7Days: warnings,
        successfulReports,
        falseReports: reports.length - successfulReports,
        totalPosts: 0, // Would be calculated from actual content tables
        daysSinceLastViolation: violations > 0 ? 0 : 999
      };
    } catch (error) {
      console.error('Error getting user moderation history:', error);
      return {
        violations30Days: 0,
        warnings7Days: 0,
        successfulReports: 0,
        falseReports: 0,
        totalPosts: 0,
        daysSinceLastViolation: 999
      };
    }
  }

  private async updateRuleStats(results: RuleExecutionResult[]): Promise<void> {
    try {
      for (const result of results) {
        if (result.triggered && result.ruleId !== 'system_error') {
          await prisma.moderationRule.update({
            where: { id: result.ruleId },
            data: {
              times_triggered: { increment: 1 },
              last_triggered: new Date()
            }
          });
        }
      }
    } catch (error) {
      console.error('Error updating rule stats:', error);
    }
  }

  private async logRuleTrigger(ruleId: string, context: any, confidence: number, conditions: string[]): Promise<void> {
    try {
      await prisma.ruleTrigger.create({
        data: {
          rule_id: ruleId,
          content_id: context.contentId,
          content_type: context.contentType,
          trigger_confidence: confidence,
          matched_conditions: conditions,
          context_data: {
            userId: context.userId,
            timestamp: context.timestamp.toISOString(),
            analysis: context.analysis,
            reputation: context.userReputation.overallReputation
          }
        }
      });
    } catch (error) {
      console.error('Error logging rule trigger:', error);
    }
  }
}

// Export singleton instance
export const moderationRulesEngine = new ModerationRulesEngine();

// Helper function to integrate with content processing
export async function applyModerationRules(
  contentId: string,
  contentType: string,
  content: string,
  userId: string
): Promise<{ 
  shouldBlock: boolean; 
  shouldFlag: boolean; 
  shouldReview: boolean;
  actions: string[];
  reasons: string[];
}> {
  const results = await moderationRulesEngine.executeRules(
    contentId, contentType, content, userId
  );

  const triggeredResults = results.filter(r => r.triggered);
  
  return {
    shouldBlock: triggeredResults.some(r => r.actionsExecuted.some(a => a.startsWith('block'))),
    shouldFlag: triggeredResults.some(r => r.actionsExecuted.some(a => a.startsWith('flag'))),
    shouldReview: triggeredResults.some(r => r.actionsExecuted.some(a => a.startsWith('review'))),
    actions: triggeredResults.flatMap(r => r.actionsExecuted),
    reasons: triggeredResults.map(r => r.reason)
  };
}