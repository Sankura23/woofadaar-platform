// Week 26 Phase 1: Advanced Health Report Generation System
// Generate comprehensive, exportable health reports for premium users

import prisma from './db';
import { HealthAnalyticsService } from './health-analytics-service';

export interface HealthReportConfig {
  reportType: 'monthly' | 'quarterly' | 'annual' | 'custom' | 'breed_specific';
  periodStart: Date;
  periodEnd: Date;
  includeCharts: boolean;
  includePredictions: boolean;
  includeBreedInsights: boolean;
  format: 'pdf' | 'html' | 'json';
  language: 'en' | 'hi';
}

export interface HealthReportData {
  metadata: {
    reportId: string;
    generatedAt: Date;
    dogInfo: {
      name: string;
      breed: string;
      age: string;
      weight: number;
      ownerId: string;
      ownerName: string;
    };
    reportPeriod: {
      start: Date;
      end: Date;
      duration: string;
    };
  };
  executiveSummary: {
    overallHealthScore: number;
    keyFindings: string[];
    majorConcerns: string[];
    improvementAreas: string[];
    positiveIndicators: string[];
  };
  healthMetrics: {
    weight: {
      current: number;
      trend: string;
      changePercent: number;
      targetRange: { min: number; max: number };
    };
    activity: {
      averageDailyMinutes: number;
      trend: string;
      weeklyGoal: number;
      completionRate: number;
    };
    behavior: {
      averageMoodScore: number;
      behaviorNotes: string[];
      concerningPatterns: string[];
    };
    nutrition: {
      feedingConsistency: number;
      eatingBehaviorScore: number;
      nutritionRecommendations: string[];
    };
  };
  trends: {
    chartData: Array<{
      metric: string;
      data: Array<{ date: string; value: number }>;
      trend: 'improving' | 'declining' | 'stable';
    }>;
    insights: string[];
  };
  predictions: Array<{
    type: string;
    prediction: string;
    confidence: number;
    timeframe: string;
    recommendations: string[];
  }>;
  breedSpecificInsights: {
    commonConcerns: string[];
    preventiveCare: string[];
    nutritionAdvice: string[];
    exerciseRequirements: string[];
    seasonalConsiderations: string[];
  };
  veterinaryRecords: {
    recentVisits: Array<{
      date: Date;
      purpose: string;
      findings: string;
      recommendations: string;
    }>;
    vaccinations: Array<{
      vaccine: string;
      date: Date;
      nextDue: Date;
    }>;
    medications: Array<{
      name: string;
      dosage: string;
      startDate: Date;
      endDate?: Date;
      purpose: string;
    }>;
  };
  alerts: Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    message: string;
    actionRequired: string;
    dueDate?: Date;
  }>;
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    lifestyle: string[];
  };
  actionPlan: {
    nextSteps: string[];
    scheduledTasks: Array<{
      task: string;
      dueDate: Date;
      priority: 'high' | 'medium' | 'low';
    }>;
    followUpDate: Date;
  };
}

export class HealthReportGenerator {
  
  /**
   * Generate comprehensive health report for a dog
   */
  static async generateReport(
    dogId: string,
    userId: string,
    config: HealthReportConfig
  ): Promise<HealthReportData> {
    try {
      // Verify premium access
      const premiumAccess = await this.checkPremiumAccess(userId);
      if (!premiumAccess) {
        throw new Error('Premium subscription required for health reports');
      }

      // Fetch comprehensive dog data
      const dogData = await this.fetchDogData(dogId, config.periodStart, config.periodEnd);
      
      if (!dogData) {
        throw new Error('Dog not found or no access permission');
      }

      // Generate analytics if not cached
      const analytics = await HealthAnalyticsService.generateHealthAnalytics(
        dogId, 
        userId, 
        Math.floor((config.periodEnd.getTime() - config.periodStart.getTime()) / (24 * 60 * 60 * 1000))
      );

      // Build comprehensive report
      const report: HealthReportData = {
        metadata: await this.generateMetadata(dogData, config),
        executiveSummary: this.generateExecutiveSummary(dogData, analytics),
        healthMetrics: this.generateHealthMetrics(dogData, config.periodStart, config.periodEnd),
        trends: this.generateTrendsSection(dogData, analytics.trends),
        predictions: analytics.predictions.map(p => ({
          type: p.type,
          prediction: p.description,
          confidence: Math.round(p.confidence_score * 100),
          timeframe: this.formatTimeframe(p.prediction_date),
          recommendations: p.recommendations
        })),
        breedSpecificInsights: this.formatBreedInsights(analytics.breed_insights),
        veterinaryRecords: await this.getVeterinaryRecords(dogId, config.periodStart, config.periodEnd),
        alerts: analytics.alerts.map(a => ({
          priority: a.type === 'urgent' ? 'high' : a.type === 'warning' ? 'medium' : 'low',
          category: a.title,
          message: a.description,
          actionRequired: a.action_required,
          dueDate: a.due_date
        })),
        recommendations: this.categorizeRecommendations(analytics.recommendations),
        actionPlan: this.generateActionPlan(analytics)
      };

      // Save report to database
      await prisma.healthAnalyticsReport.create({
        data: {
          dog_id: dogId,
          user_id: userId,
          report_type: config.reportType,
          report_period_start: config.periodStart,
          report_period_end: config.periodEnd,
          overall_health_score: analytics.overall_health_score,
          trends_analysis: analytics.trends,
          predictions: analytics.predictions,
          recommendations: analytics.recommendations,
          insights: report,
          metadata: {
            config,
            generated_version: 'v1.0'
          }
        }
      });

      return report;

    } catch (error) {
      console.error('Health report generation error:', error);
      throw error;
    }
  }

  /**
   * Generate executive summary
   */
  private static generateExecutiveSummary(dogData: any, analytics: any): HealthReportData['executiveSummary'] {
    const keyFindings = [];
    const majorConcerns = [];
    const improvementAreas = [];
    const positiveIndicators = [];

    // Analyze health score
    if (analytics.overall_health_score >= 85) {
      positiveIndicators.push(`Excellent overall health score of ${analytics.overall_health_score}%`);
    } else if (analytics.overall_health_score >= 70) {
      keyFindings.push(`Good health status with score of ${analytics.overall_health_score}%`);
    } else {
      majorConcerns.push(`Health score of ${analytics.overall_health_score}% indicates areas needing attention`);
    }

    // Analyze trends
    for (const trend of analytics.trends) {
      if (trend.strength === 'strong') {
        if (trend.type === 'weight' && Math.abs(trend.change_percentage) > 15) {
          majorConcerns.push(`Significant ${trend.direction} weight trend: ${trend.change_percentage}% change`);
        } else if (trend.type === 'activity' && trend.direction === 'increasing') {
          positiveIndicators.push(`Increasing activity levels showing ${trend.change_percentage}% improvement`);
        } else if (trend.type === 'behavior' && trend.direction === 'decreasing') {
          majorConcerns.push(`Declining behavior/mood scores need attention`);
        }
      }
    }

    // High priority predictions
    const urgentPredictions = analytics.predictions.filter((p: any) => p.severity === 'high' || p.severity === 'urgent');
    for (const prediction of urgentPredictions) {
      majorConcerns.push(`Upcoming ${prediction.type}: ${prediction.description}`);
    }

    // Improvement areas from recommendations
    const highPriorityRecs = analytics.recommendations.filter((r: any) => r.priority === 'high');
    improvementAreas.push(...highPriorityRecs.map((r: any) => r.action));

    return {
      overallHealthScore: analytics.overall_health_score,
      keyFindings,
      majorConcerns,
      improvementAreas,
      positiveIndicators
    };
  }

  /**
   * Generate health metrics section
   */
  private static generateHealthMetrics(dogData: any, periodStart: Date, periodEnd: Date): HealthReportData['healthMetrics'] {
    const healthLogs = dogData.health_logs || [];
    
    // Weight analysis
    const weightLogs = healthLogs.filter((log: any) => log.weight && log.weight > 0);
    const currentWeight = weightLogs[weightLogs.length - 1]?.weight || dogData.weight || 0;
    const firstWeight = weightLogs[0]?.weight || currentWeight;
    const weightChangePercent = firstWeight ? ((currentWeight - firstWeight) / firstWeight) * 100 : 0;

    // Activity analysis
    const activityLogs = healthLogs.filter((log: any) => log.exercise_minutes && log.exercise_minutes > 0);
    const avgActivity = activityLogs.length > 0 
      ? activityLogs.reduce((sum: number, log: any) => sum + log.exercise_minutes, 0) / activityLogs.length 
      : 0;

    // Behavior analysis
    const behaviorLogs = healthLogs.filter((log: any) => log.mood_score);
    const avgMoodScore = behaviorLogs.length > 0
      ? behaviorLogs.reduce((sum: number, log: any) => sum + log.mood_score, 0) / behaviorLogs.length
      : 0;

    // Nutrition analysis
    const feedingLogs = healthLogs.filter((log: any) => log.eating_behavior);
    const feedingConsistency = feedingLogs.length / Math.max(1, Math.floor((periodEnd.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000)));

    return {
      weight: {
        current: currentWeight,
        trend: weightChangePercent > 5 ? 'increasing' : weightChangePercent < -5 ? 'decreasing' : 'stable',
        changePercent: Math.round(weightChangePercent * 100) / 100,
        targetRange: this.calculateIdealWeightRange(dogData.breed, dogData.age_months)
      },
      activity: {
        averageDailyMinutes: Math.round(avgActivity),
        trend: 'stable', // Simplified for now
        weeklyGoal: this.getBreedActivityGoal(dogData.breed) * 7,
        completionRate: Math.min(100, (avgActivity / this.getBreedActivityGoal(dogData.breed)) * 100)
      },
      behavior: {
        averageMoodScore: Math.round(avgMoodScore * 10) / 10,
        behaviorNotes: behaviorLogs.map((log: any) => log.behavior_notes).filter(Boolean).slice(0, 5),
        concerningPatterns: behaviorLogs.filter((log: any) => log.mood_score < 3).length > behaviorLogs.length * 0.3 
          ? ['Frequent low mood scores detected'] : []
      },
      nutrition: {
        feedingConsistency: Math.round(feedingConsistency * 100) / 100,
        eatingBehaviorScore: this.calculateEatingBehaviorScore(feedingLogs),
        nutritionRecommendations: this.getNutritionRecommendations(dogData.breed, dogData.age_months)
      }
    };
  }

  /**
   * Generate trends visualization data
   */
  private static generateTrendsSection(dogData: any, trends: any[]): HealthReportData['trends'] {
    const chartData = [];
    const insights = [];

    for (const trend of trends) {
      chartData.push({
        metric: trend.type,
        data: trend.data_points.map((point: any) => ({
          date: point.date,
          value: point.value
        })),
        trend: trend.direction === 'increasing' ? 'improving' : 
               trend.direction === 'decreasing' ? 'declining' : 'stable'
      });

      insights.push(
        `${trend.type.charAt(0).toUpperCase() + trend.type.slice(1)} shows ${trend.direction} trend with ${trend.strength} correlation over ${trend.period_days} data points`
      );
    }

    return { chartData, insights };
  }

  /**
   * Format breed insights for report
   */
  private static formatBreedInsights(breedInsights: any): HealthReportData['breedSpecificInsights'] {
    return {
      commonConcerns: breedInsights.common_conditions || [],
      preventiveCare: [
        `Vaccination schedule: ${breedInsights.preventive_care?.checkup_frequency || 'Annual'}`,
        `Screening tests: ${breedInsights.preventive_care?.screening_tests?.join(', ') || 'Basic checkup'}`
      ],
      nutritionAdvice: [
        `Recommended food: ${breedInsights.nutrition?.recommended_food_type || 'Age-appropriate'}`,
        `Daily calories: ~${breedInsights.nutrition?.daily_calories || 'Varies'} kcal`,
        `Feeding frequency: ${breedInsights.nutrition?.feeding_frequency || '2 times daily'}`
      ],
      exerciseRequirements: [
        `Daily exercise: ${breedInsights.exercise?.daily_minutes || 45} minutes`,
        `Exercise types: ${breedInsights.exercise?.exercise_types?.join(', ') || 'Walking, playing'}`,
        `Intensity: ${breedInsights.exercise?.intensity_level || 'Moderate'}`
      ],
      seasonalConsiderations: Object.keys(breedInsights.seasonal_care || {}).map(season => 
        `${season}: ${breedInsights.seasonal_care[season]?.concerns?.join(', ') || 'General care'}`
      )
    };
  }

  /**
   * Get veterinary records for the period
   */
  private static async getVeterinaryRecords(
    dogId: string, 
    periodStart: Date, 
    periodEnd: Date
  ): Promise<HealthReportData['veterinaryRecords']> {
    // This would fetch from actual vet appointment records
    // For now, returning mock structure
    return {
      recentVisits: [],
      vaccinations: [],
      medications: []
    };
  }

  /**
   * Categorize recommendations by timeline
   */
  private static categorizeRecommendations(recommendations: any[]): HealthReportData['recommendations'] {
    const immediate = [];
    const shortTerm = [];
    const longTerm = [];
    const lifestyle = [];

    for (const rec of recommendations) {
      if (rec.priority === 'high') {
        immediate.push(rec.action);
      } else if (rec.timeline?.includes('week')) {
        shortTerm.push(rec.action);
      } else if (rec.category === 'Breed Care' || rec.category === 'General Health') {
        lifestyle.push(rec.action);
      } else {
        longTerm.push(rec.action);
      }
    }

    return { immediate, shortTerm, longTerm, lifestyle };
  }

  /**
   * Generate actionable plan with timeline
   */
  private static generateActionPlan(analytics: any): HealthReportData['actionPlan'] {
    const nextSteps = [];
    const scheduledTasks = [];

    // Immediate actions from high-priority alerts
    const urgentAlerts = analytics.alerts.filter((a: any) => a.type === 'urgent');
    for (const alert of urgentAlerts) {
      nextSteps.push(alert.action_required);
      if (alert.due_date) {
        scheduledTasks.push({
          task: alert.action_required,
          dueDate: new Date(alert.due_date),
          priority: 'high' as const
        });
      }
    }

    // High-priority predictions
    const highPriorityPredictions = analytics.predictions.filter(
      (p: any) => p.severity === 'high' || p.severity === 'urgent'
    );
    for (const prediction of highPriorityPredictions) {
      scheduledTasks.push({
        task: prediction.recommendations[0] || `Address ${prediction.type}`,
        dueDate: new Date(prediction.prediction_date),
        priority: prediction.severity === 'urgent' ? 'high' : 'medium' as const
      });
    }

    // Default follow-up
    const followUpDate = new Date();
    followUpDate.setMonth(followUpDate.getMonth() + 1); // 1 month from now

    return {
      nextSteps,
      scheduledTasks,
      followUpDate
    };
  }

  // Helper methods
  private static async fetchDogData(dogId: string, periodStart: Date, periodEnd: Date) {
    return await prisma.dog.findUnique({
      where: { id: dogId },
      include: {
        health_logs: {
          where: {
            created_at: {
              gte: periodStart,
              lte: periodEnd
            }
          },
          orderBy: { created_at: 'asc' }
        },
        medications: true,
        vaccinations: true,
        user: true
      }
    });
  }

  private static async generateMetadata(dogData: any, config: HealthReportConfig) {
    const periodDuration = Math.floor(
      (config.periodEnd.getTime() - config.periodStart.getTime()) / (24 * 60 * 60 * 1000)
    );

    return {
      reportId: `HR_${dogData.id}_${Date.now()}`,
      generatedAt: new Date(),
      dogInfo: {
        name: dogData.name,
        breed: dogData.breed,
        age: `${Math.floor(dogData.age_months / 12)} years ${dogData.age_months % 12} months`,
        weight: dogData.weight || 0,
        ownerId: dogData.user_id,
        ownerName: dogData.user?.name || 'Dog Parent'
      },
      reportPeriod: {
        start: config.periodStart,
        end: config.periodEnd,
        duration: `${periodDuration} days`
      }
    };
  }

  private static async checkPremiumAccess(userId: string): Promise<boolean> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: 'active'
      }
    });
    return subscription !== null;
  }

  private static calculateIdealWeightRange(breed: string, ageMonths: number): { min: number; max: number } {
    // Simplified weight ranges - would be more comprehensive in production
    const breedWeights: { [key: string]: { min: number; max: number } } = {
      'golden retriever': { min: 25, max: 32 },
      'labrador': { min: 25, max: 35 },
      'german shepherd': { min: 30, max: 40 },
      'beagle': { min: 9, max: 16 },
    };

    return breedWeights[breed.toLowerCase()] || { min: 10, max: 30 };
  }

  private static getBreedActivityGoal(breed: string): number {
    const breedActivity: { [key: string]: number } = {
      'golden retriever': 60,
      'labrador': 90,
      'german shepherd': 120,
      'beagle': 45,
    };

    return breedActivity[breed.toLowerCase()] || 60;
  }

  private static calculateEatingBehaviorScore(feedingLogs: any[]): number {
    if (feedingLogs.length === 0) return 0;
    
    const scores = feedingLogs.map(log => {
      const behavior = log.eating_behavior?.toLowerCase();
      const scoreMap: { [key: string]: number } = {
        'excellent': 5, 'good': 4, 'normal': 3, 'reduced': 2, 'poor': 1, 'not_eating': 0
      };
      return scoreMap[behavior] || 3;
    });
    
    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
  }

  private static getNutritionRecommendations(breed: string, ageMonths: number): string[] {
    const ageGroup = ageMonths < 12 ? 'puppy' : ageMonths > 84 ? 'senior' : 'adult';
    
    const baseRecs = [
      `Feed high-quality ${ageGroup} formula`,
      'Maintain consistent feeding schedule',
      'Monitor portion sizes based on activity level'
    ];

    if (ageGroup === 'senior') {
      baseRecs.push('Consider joint support supplements');
    } else if (ageGroup === 'puppy') {
      baseRecs.push('Ensure adequate protein for growth');
    }

    return baseRecs;
  }

  private static formatTimeframe(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 7) return `In ${days} days`;
    if (days < 30) return `In ${Math.floor(days / 7)} weeks`;
    return `In ${Math.floor(days / 30)} months`;
  }
}