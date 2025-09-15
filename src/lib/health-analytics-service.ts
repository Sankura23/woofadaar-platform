// Week 26 Phase 1: Advanced Health Analytics & AI-Powered Predictions Service
// Comprehensive health analytics with breed-specific insights and predictive analysis

import prisma from './db';

export interface HealthTrend {
  type: 'weight' | 'activity' | 'eating' | 'behavior' | 'medication';
  direction: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
  strength: 'weak' | 'moderate' | 'strong';
  change_percentage: number;
  period_days: number;
  data_points: Array<{ date: string; value: number; note?: string }>;
}

export interface HealthPredictionResult {
  type: 'vet_visit' | 'vaccination' | 'health_risk' | 'seasonal_concern';
  prediction_date: Date;
  confidence_score: number; // 0.0 to 1.0
  description: string;
  recommendations: string[];
  based_on_factors: string[];
  severity: 'low' | 'medium' | 'high' | 'urgent';
}

export interface BreedSpecificInsights {
  breed: string;
  age_group: 'puppy' | 'adult' | 'senior';
  common_conditions: string[];
  preventive_care: {
    vaccinations: string[];
    checkup_frequency: string;
    screening_tests: string[];
  };
  nutrition: {
    recommended_food_type: string;
    daily_calories: number;
    feeding_frequency: string;
    supplements: string[];
  };
  exercise: {
    daily_minutes: number;
    exercise_types: string[];
    intensity_level: string;
  };
  seasonal_care: {
    [season: string]: {
      concerns: string[];
      precautions: string[];
      care_tips: string[];
    };
  };
}

export interface HealthAnalyticsResult {
  overall_health_score: number; // 0-100
  trends: HealthTrend[];
  predictions: HealthPredictionResult[];
  breed_insights: BreedSpecificInsights;
  alerts: Array<{
    type: 'urgent' | 'warning' | 'info';
    title: string;
    description: string;
    action_required: string;
    due_date?: Date;
  }>;
  recommendations: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    action: string;
    timeline: string;
  }>;
}

export class HealthAnalyticsService {
  
  /**
   * Generate comprehensive health analytics for a dog
   */
  static async generateHealthAnalytics(
    dogId: string, 
    userId: string,
    periodDays: number = 90
  ): Promise<HealthAnalyticsResult> {
    try {
      // Fetch dog information
      const dog = await prisma.dog.findUnique({
        where: { id: dogId },
        include: {
          health_logs: {
            where: {
              created_at: {
                gte: new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)
              }
            },
            orderBy: { created_at: 'asc' }
          },
          medications: {
            where: {
              status: { in: ['active', 'completed'] }
            }
          },
          vaccinations: {
            orderBy: { date_administered: 'desc' }
          },
          user: true
        }
      });

      if (!dog) {
        throw new Error('Dog not found');
      }

      // Check premium access
      const premiumAccess = await this.checkPremiumAccess(userId);
      if (!premiumAccess) {
        throw new Error('Premium subscription required for advanced health analytics');
      }

      // Generate analytics components
      const trends = await this.analyzeTrends(dog, periodDays);
      const predictions = await this.generatePredictions(dog, trends);
      const breedInsights = await this.getBreedSpecificInsights(dog.breed, dog.age_months);
      const alerts = await this.generateHealthAlerts(dog, trends, predictions);
      const recommendations = await this.generateRecommendations(dog, trends, breedInsights);
      const healthScore = this.calculateOverallHealthScore(dog, trends, alerts);

      const analytics: HealthAnalyticsResult = {
        overall_health_score: healthScore,
        trends,
        predictions,
        breed_insights: breedInsights,
        alerts,
        recommendations
      };

      // Save analytics report to database
      await prisma.healthAnalyticsReport.create({
        data: {
          dog_id: dogId,
          user_id: userId,
          report_type: 'comprehensive',
          report_period_start: new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000),
          report_period_end: new Date(),
          overall_health_score: healthScore,
          trends_analysis: trends,
          predictions: predictions,
          recommendations: recommendations,
          insights: breedInsights,
          alerts: alerts,
          metadata: {
            period_days: periodDays,
            generated_by: 'ai_analytics_v1'
          }
        }
      });

      return analytics;

    } catch (error) {
      console.error('Health analytics generation error:', error);
      throw error;
    }
  }

  /**
   * Analyze health trends from historical data
   */
  private static async analyzeTrends(dog: any, periodDays: number): Promise<HealthTrend[]> {
    const trends: HealthTrend[] = [];
    
    // Weight trend analysis
    const weightData = dog.health_logs
      .filter((log: any) => log.weight && log.weight > 0)
      .map((log: any) => ({
        date: log.created_at.toISOString().split('T')[0],
        value: log.weight,
        note: log.notes
      }));
    
    if (weightData.length >= 3) {
      const weightTrend = this.calculateTrend(weightData, 'weight');
      trends.push(weightTrend);
    }

    // Activity trend analysis  
    const activityData = dog.health_logs
      .filter((log: any) => log.exercise_minutes && log.exercise_minutes > 0)
      .map((log: any) => ({
        date: log.created_at.toISOString().split('T')[0],
        value: log.exercise_minutes,
        note: log.exercise_type
      }));

    if (activityData.length >= 3) {
      const activityTrend = this.calculateTrend(activityData, 'activity');
      trends.push(activityTrend);
    }

    // Eating behavior trend
    const eatingData = dog.health_logs
      .filter((log: any) => log.eating_behavior)
      .map((log: any) => ({
        date: log.created_at.toISOString().split('T')[0],
        value: this.mapEatingBehaviorToScore(log.eating_behavior),
        note: log.eating_behavior
      }));

    if (eatingData.length >= 3) {
      const eatingTrend = this.calculateTrend(eatingData, 'eating');
      trends.push(eatingTrend);
    }

    // Mood/Behavior trend
    const behaviorData = dog.health_logs
      .filter((log: any) => log.mood_score)
      .map((log: any) => ({
        date: log.created_at.toISOString().split('T')[0],
        value: log.mood_score,
        note: log.behavior_notes
      }));

    if (behaviorData.length >= 3) {
      const behaviorTrend = this.calculateTrend(behaviorData, 'behavior');
      trends.push(behaviorTrend);
    }

    return trends;
  }

  /**
   * Calculate trend from data points
   */
  private static calculateTrend(
    dataPoints: Array<{ date: string; value: number; note?: string }>, 
    type: string
  ): HealthTrend {
    const values = dataPoints.map(d => d.value);
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const changePercentage = ((lastValue - firstValue) / firstValue) * 100;
    
    // Simple linear regression for trend strength
    const n = values.length;
    const sumX = values.reduce((a, b, i) => a + i, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((a, b, i) => a + i * b, 0);
    const sumXX = values.reduce((a, b, i) => a + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const correlation = Math.abs(slope) / (Math.max(...values) - Math.min(...values));
    
    let direction: 'increasing' | 'decreasing' | 'stable' | 'fluctuating' = 'stable';
    if (Math.abs(changePercentage) < 5) direction = 'stable';
    else if (changePercentage > 5) direction = 'increasing';
    else if (changePercentage < -5) direction = 'decreasing';
    
    // Check for fluctuation (high variance)
    const mean = sumY / n;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    if (variance > mean * 0.3) direction = 'fluctuating';
    
    let strength: 'weak' | 'moderate' | 'strong' = 'weak';
    if (correlation > 0.7) strength = 'strong';
    else if (correlation > 0.4) strength = 'moderate';
    
    return {
      type: type as any,
      direction,
      strength,
      change_percentage: Math.round(changePercentage * 100) / 100,
      period_days: dataPoints.length,
      data_points: dataPoints
    };
  }

  /**
   * Generate AI-powered health predictions
   */
  private static async generatePredictions(
    dog: any, 
    trends: HealthTrend[]
  ): Promise<HealthPredictionResult[]> {
    const predictions: HealthPredictionResult[] = [];
    
    // Vet visit prediction based on last visit and health trends
    const lastVetVisit = dog.vet_visits?.[0]?.date || dog.created_at;
    const daysSinceLastVisit = Math.floor(
      (Date.now() - new Date(lastVetVisit).getTime()) / (24 * 60 * 60 * 1000)
    );
    
    if (daysSinceLastVisit > 300) { // Over 10 months
      predictions.push({
        type: 'vet_visit',
        prediction_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
        confidence_score: 0.8,
        description: 'Annual health checkup is due based on last visit timing',
        recommendations: ['Schedule routine health examination', 'Update vaccination records'],
        based_on_factors: ['Last visit date', 'Dog age', 'Breed health requirements'],
        severity: 'medium'
      });
    }
    
    // Weight trend prediction
    const weightTrend = trends.find(t => t.type === 'weight');
    if (weightTrend && (weightTrend.direction === 'increasing' || weightTrend.direction === 'decreasing') 
        && weightTrend.strength !== 'weak') {
      const severity = Math.abs(weightTrend.change_percentage) > 15 ? 'high' : 'medium';
      predictions.push({
        type: 'health_risk',
        prediction_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        confidence_score: 0.7,
        description: `${weightTrend.direction === 'increasing' ? 'Weight gain' : 'Weight loss'} trend may require attention`,
        recommendations: [
          'Monitor daily food intake',
          'Track exercise activity',
          'Consult vet if trend continues'
        ],
        based_on_factors: ['Weight trend analysis', 'Rate of change'],
        severity: severity as any
      });
    }
    
    // Vaccination prediction based on dog age and breed
    const ageInMonths = dog.age_months || 0;
    const nextVaccination = this.predictNextVaccination(ageInMonths, dog.breed);
    if (nextVaccination) {
      predictions.push(nextVaccination);
    }
    
    // Seasonal health concerns
    const seasonalPrediction = this.generateSeasonalPrediction(dog.breed);
    if (seasonalPrediction) {
      predictions.push(seasonalPrediction);
    }
    
    return predictions;
  }

  /**
   * Get breed-specific health insights
   */
  private static async getBreedSpecificInsights(
    breed: string, 
    ageMonths: number
  ): Promise<BreedSpecificInsights> {
    // Check if we have cached breed insights
    const ageGroup = ageMonths < 12 ? 'puppy' : ageMonths < 84 ? 'adult' : 'senior';
    
    const cachedInsights = await prisma.breedHealthInsight.findUnique({
      where: {
        breed_age_group: {
          breed: breed.toLowerCase(),
          age_group: ageGroup
        }
      }
    });

    if (cachedInsights) {
      return {
        breed,
        age_group: ageGroup,
        common_conditions: cachedInsights.common_conditions,
        preventive_care: cachedInsights.preventive_care as any,
        nutrition: cachedInsights.nutrition_guidelines as any,
        exercise: cachedInsights.exercise_requirements as any,
        seasonal_care: cachedInsights.seasonal_concerns as any
      };
    }

    // Generate breed-specific insights for Indian context
    const insights = this.generateBreedInsights(breed, ageGroup);
    
    // Cache the insights
    await prisma.breedHealthInsight.create({
      data: {
        breed: breed.toLowerCase(),
        age_group: ageGroup,
        common_conditions: insights.common_conditions,
        preventive_care: insights.preventive_care,
        nutrition_guidelines: insights.nutrition,
        exercise_requirements: insights.exercise,
        seasonal_concerns: insights.seasonal_care,
        grooming_needs: {},
        lifespan_data: {},
        health_monitoring: {}
      }
    });

    return insights;
  }

  /**
   * Generate health alerts based on analysis
   */
  private static async generateHealthAlerts(
    dog: any,
    trends: HealthTrend[],
    predictions: HealthPredictionResult[]
  ): Promise<Array<{
    type: 'urgent' | 'warning' | 'info';
    title: string;
    description: string;
    action_required: string;
    due_date?: Date;
  }>> {
    const alerts = [];

    // Check for urgent predictions
    const urgentPredictions = predictions.filter(p => p.severity === 'urgent');
    for (const prediction of urgentPredictions) {
      alerts.push({
        type: 'urgent' as const,
        title: `Urgent: ${prediction.type.replace('_', ' ')} attention needed`,
        description: prediction.description,
        action_required: prediction.recommendations[0] || 'Take immediate action',
        due_date: prediction.prediction_date
      });
    }

    // Check for concerning trends
    const concerningTrends = trends.filter(t => 
      (t.type === 'weight' && Math.abs(t.change_percentage) > 20) ||
      (t.type === 'behavior' && t.direction === 'decreasing' && t.strength !== 'weak')
    );

    for (const trend of concerningTrends) {
      alerts.push({
        type: 'warning' as const,
        title: `${trend.type.charAt(0).toUpperCase() + trend.type.slice(1)} trend requires attention`,
        description: `${trend.direction} trend detected over ${trend.period_days} days`,
        action_required: `Monitor ${trend.type} closely and consult vet if continues`,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    }

    return alerts;
  }

  /**
   * Generate personalized recommendations
   */
  private static async generateRecommendations(
    dog: any,
    trends: HealthTrend[],
    breedInsights: BreedSpecificInsights
  ): Promise<Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    action: string;
    timeline: string;
  }>> {
    const recommendations = [];

    // Age-specific recommendations
    if (dog.age_months < 12) {
      recommendations.push({
        category: 'Puppy Care',
        priority: 'high' as const,
        action: 'Complete puppy vaccination schedule',
        timeline: 'Next 2-4 weeks'
      });
    } else if (dog.age_months > 84) {
      recommendations.push({
        category: 'Senior Care',
        priority: 'high' as const,
        action: 'Schedule senior health screening',
        timeline: 'Every 6 months'
      });
    }

    // Breed-specific recommendations
    recommendations.push({
      category: 'Breed Care',
      priority: 'medium' as const,
      action: `Follow ${dog.breed} specific exercise routine: ${breedInsights.exercise.daily_minutes} minutes daily`,
      timeline: 'Daily'
    });

    // Trend-based recommendations
    for (const trend of trends) {
      if (trend.strength !== 'weak') {
        let action = '';
        let priority: 'high' | 'medium' | 'low' = 'medium';
        
        if (trend.type === 'weight' && trend.direction === 'increasing') {
          action = 'Reduce calorie intake and increase exercise';
          priority = Math.abs(trend.change_percentage) > 15 ? 'high' : 'medium';
        } else if (trend.type === 'activity' && trend.direction === 'decreasing') {
          action = 'Gradually increase daily exercise and playtime';
          priority = 'medium';
        } else if (trend.type === 'behavior' && trend.direction === 'decreasing') {
          action = 'Monitor for signs of illness or stress, consider vet consultation';
          priority = 'high';
        }

        if (action) {
          recommendations.push({
            category: 'Trend Management',
            priority,
            action,
            timeline: 'This week'
          });
        }
      }
    }

    return recommendations;
  }

  // Helper methods
  private static async checkPremiumAccess(userId: string): Promise<boolean> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: 'active'
      }
    });
    return subscription !== null;
  }

  private static calculateOverallHealthScore(
    dog: any,
    trends: HealthTrend[],
    alerts: any[]
  ): number {
    let score = 85; // Base score
    
    // Deduct for concerning trends
    for (const trend of trends) {
      if (trend.strength === 'strong') {
        if (trend.type === 'weight' && Math.abs(trend.change_percentage) > 15) score -= 10;
        if (trend.type === 'behavior' && trend.direction === 'decreasing') score -= 15;
        if (trend.type === 'activity' && trend.direction === 'decreasing') score -= 8;
      }
    }
    
    // Deduct for alerts
    const urgentAlerts = alerts.filter(a => a.type === 'urgent').length;
    const warningAlerts = alerts.filter(a => a.type === 'warning').length;
    
    score -= urgentAlerts * 20;
    score -= warningAlerts * 10;
    
    // Age factor
    if (dog.age_months > 84) score -= 5; // Senior dogs
    if (dog.age_months < 6) score -= 5; // Very young puppies
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private static mapEatingBehaviorToScore(behavior: string): number {
    const mapping: { [key: string]: number } = {
      'excellent': 5,
      'good': 4,
      'normal': 3,
      'reduced': 2,
      'poor': 1,
      'not_eating': 0
    };
    return mapping[behavior.toLowerCase()] || 3;
  }

  private static predictNextVaccination(ageMonths: number, breed: string): HealthPredictionResult | null {
    if (ageMonths < 6) {
      return {
        type: 'vaccination',
        prediction_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        confidence_score: 0.9,
        description: 'Puppy vaccination series continuation',
        recommendations: ['Schedule next vaccination appointment', 'Bring vaccination record'],
        based_on_factors: ['Age', 'Vaccination schedule'],
        severity: 'high'
      };
    }
    return null;
  }

  private static generateSeasonalPrediction(breed: string): HealthPredictionResult | null {
    const currentMonth = new Date().getMonth();
    const isSummer = currentMonth >= 3 && currentMonth <= 5; // Apr-Jun in India
    const isMonsoon = currentMonth >= 6 && currentMonth <= 9; // Jul-Oct in India
    
    if (isSummer) {
      return {
        type: 'seasonal_concern',
        prediction_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        confidence_score: 0.8,
        description: 'Summer heat stress prevention needed',
        recommendations: [
          'Ensure adequate hydration',
          'Limit outdoor activities during peak heat',
          'Provide cool, shaded areas'
        ],
        based_on_factors: ['Season', 'Temperature', 'Breed characteristics'],
        severity: 'medium'
      };
    }
    
    if (isMonsoon) {
      return {
        type: 'seasonal_concern',
        prediction_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        confidence_score: 0.7,
        description: 'Monsoon-related health concerns',
        recommendations: [
          'Keep dry and clean',
          'Watch for skin infections',
          'Ensure proper ventilation'
        ],
        based_on_factors: ['Season', 'Humidity', 'Common monsoon issues'],
        severity: 'medium'
      };
    }
    
    return null;
  }

  private static generateBreedInsights(breed: string, ageGroup: string): BreedSpecificInsights {
    // Simplified breed insights for Indian context
    const commonBreedInsights: { [key: string]: any } = {
      'golden retriever': {
        common_conditions: ['Hip dysplasia', 'Eye problems', 'Skin allergies'],
        exercise: { daily_minutes: 60, exercise_types: ['Walking', 'Swimming', 'Fetch'], intensity_level: 'moderate' }
      },
      'labrador': {
        common_conditions: ['Obesity', 'Hip dysplasia', 'Eye problems'],
        exercise: { daily_minutes: 90, exercise_types: ['Walking', 'Swimming', 'Running'], intensity_level: 'high' }
      },
      'german shepherd': {
        common_conditions: ['Hip dysplasia', 'Bloat', 'Skin problems'],
        exercise: { daily_minutes: 120, exercise_types: ['Walking', 'Running', 'Training'], intensity_level: 'high' }
      },
      'beagle': {
        common_conditions: ['Obesity', 'Ear infections', 'Eye problems'],
        exercise: { daily_minutes: 45, exercise_types: ['Walking', 'Scent games'], intensity_level: 'moderate' }
      }
    };

    const breedData = commonBreedInsights[breed.toLowerCase()] || {
      common_conditions: ['General health monitoring'],
      exercise: { daily_minutes: 45, exercise_types: ['Walking', 'Playing'], intensity_level: 'moderate' }
    };

    return {
      breed,
      age_group: ageGroup as any,
      common_conditions: breedData.common_conditions,
      preventive_care: {
        vaccinations: ['Rabies', 'DHPP', 'Lyme disease'],
        checkup_frequency: ageGroup === 'senior' ? 'Every 6 months' : 'Annually',
        screening_tests: ageGroup === 'senior' ? ['Blood work', 'X-rays', 'Eye exam'] : ['Basic checkup']
      },
      nutrition: {
        recommended_food_type: `${ageGroup} formula`,
        daily_calories: breedData.exercise.daily_minutes * 8, // Rough estimate
        feeding_frequency: ageGroup === 'puppy' ? '3 times daily' : '2 times daily',
        supplements: ageGroup === 'senior' ? ['Joint support', 'Omega-3'] : []
      },
      exercise: breedData.exercise,
      seasonal_care: {
        summer: {
          concerns: ['Heat stroke', 'Dehydration', 'Paw burns'],
          precautions: ['Limit outdoor time', 'Provide shade', 'Check paw pads'],
          care_tips: ['Early morning walks', 'Cooling mats', 'Fresh water always']
        },
        monsoon: {
          concerns: ['Skin infections', 'Fungal issues', 'Tick/flea increase'],
          precautions: ['Keep dry', 'Regular grooming', 'Pest control'],
          care_tips: ['Dry thoroughly after walks', 'Clean ears regularly', 'Ventilated sleeping area']
        },
        winter: {
          concerns: ['Joint stiffness', 'Dry skin', 'Respiratory issues'],
          precautions: ['Warm bedding', 'Moisturize skin', 'Moderate exercise'],
          care_tips: ['Warm sleeping area', 'Indoor activities', 'Joint supplements if needed']
        }
      }
    };
  }
}