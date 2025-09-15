import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface UserInsight {
  id: string;
  type: 'engagement' | 'conversion' | 'retention' | 'churn' | 'feature_usage' | 'behavior_pattern';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  actionable: boolean;
  recommendations: string[];
  data: Record<string, any>;
  userId?: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface BusinessInsight {
  id: string;
  type: 'revenue' | 'growth' | 'market' | 'competition' | 'opportunity' | 'risk';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  priority: number; // 1-10
  actionable: boolean;
  recommendations: string[];
  data: Record<string, any>;
  createdAt: Date;
  expiresAt?: Date;
}

export interface PredictiveInsight {
  id: string;
  type: 'churn_prediction' | 'revenue_forecast' | 'user_growth' | 'feature_adoption' | 'market_expansion';
  title: string;
  description: string;
  probability: number; // 0-1
  confidence: number; // 0-1
  timeframe: string; // "7 days", "30 days", "90 days"
  recommendations: string[];
  data: Record<string, any>;
  createdAt: Date;
  validUntil: Date;
}

class AIInsightsEngine {
  private static instance: AIInsightsEngine;

  private constructor() {}

  static getInstance(): AIInsightsEngine {
    if (!AIInsightsEngine.instance) {
      AIInsightsEngine.instance = new AIInsightsEngine();
    }
    return AIInsightsEngine.instance;
  }

  // Generate user-specific insights
  async generateUserInsights(userId: string): Promise<UserInsight[]> {
    const insights: UserInsight[] = [];

    try {
      // Get user data for analysis
      const [userEvents, userAnalytics, user] = await Promise.all([
        prisma.userBehaviorEvents.findMany({
          where: { user_id: userId },
          orderBy: { created_at: 'desc' },
          take: 100
        }),
        prisma.userAnalytics.findMany({
          where: { user_id: userId },
          orderBy: { created_at: 'desc' },
          take: 30
        }),
        prisma.user.findUnique({
          where: { id: userId }
        })
      ]);

      if (!user) return insights;

      // Analyze engagement patterns
      const engagementInsight = this.analyzeEngagementPatterns(userEvents, userAnalytics);
      if (engagementInsight) insights.push(engagementInsight);

      // Analyze feature usage
      const featureInsight = this.analyzeFeatureUsage(userEvents, user);
      if (featureInsight) insights.push(featureInsight);

      // Analyze conversion potential
      const conversionInsight = this.analyzeConversionPotential(userEvents, user);
      if (conversionInsight) insights.push(conversionInsight);

      // Analyze churn risk
      const churnInsight = this.analyzeChurnRisk(userEvents, userAnalytics, user);
      if (churnInsight) insights.push(churnInsight);

      // Analyze behavior patterns
      const behaviorInsight = this.analyzeBehaviorPatterns(userEvents);
      if (behaviorInsight) insights.push(behaviorInsight);

    } catch (error) {
      console.error('Error generating user insights:', error);
    }

    return insights;
  }

  // Generate business-wide insights
  async generateBusinessInsights(): Promise<BusinessInsight[]> {
    const insights: BusinessInsight[] = [];

    try {
      // Get business metrics
      const [businessMetrics, platformMetrics, recentEvents] = await Promise.all([
        prisma.businessMetrics.findFirst({
          orderBy: { created_at: 'desc' }
        }),
        prisma.userBehaviorEvents.groupBy({
          by: ['event_type'],
          _count: { event_type: true },
          where: {
            created_at: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        prisma.userBehaviorEvents.findMany({
          where: {
            created_at: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          },
          take: 1000
        })
      ]);

      // Revenue analysis
      if (businessMetrics) {
        const revenueInsight = this.analyzeRevenueTrends(businessMetrics);
        if (revenueInsight) insights.push(revenueInsight);

        // Growth analysis
        const growthInsight = this.analyzeGrowthTrends(businessMetrics);
        if (growthInsight) insights.push(growthInsight);

        // Market opportunity analysis
        const marketInsight = this.analyzeMarketOpportunities(businessMetrics, platformMetrics);
        if (marketInsight) insights.push(marketInsight);
      }

      // Platform usage insights
      const platformInsight = this.analyzePlatformUsage(platformMetrics, recentEvents);
      if (platformInsight) insights.push(platformInsight);

      // Risk analysis
      const riskInsight = this.analyzeBusinessRisks(businessMetrics, recentEvents);
      if (riskInsight) insights.push(riskInsight);

    } catch (error) {
      console.error('Error generating business insights:', error);
    }

    return insights;
  }

  // Generate predictive insights
  async generatePredictiveInsights(): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];

    try {
      // Churn prediction
      const churnPrediction = await this.predictChurnRisk();
      if (churnPrediction) insights.push(churnPrediction);

      // Revenue forecasting
      const revenueForecast = await this.forecastRevenue();
      if (revenueForecast) insights.push(revenueForecast);

      // User growth prediction
      const growthPrediction = await this.predictUserGrowth();
      if (growthPrediction) insights.push(growthPrediction);

      // Feature adoption prediction
      const adoptionPrediction = await this.predictFeatureAdoption();
      if (adoptionPrediction) insights.push(adoptionPrediction);

    } catch (error) {
      console.error('Error generating predictive insights:', error);
    }

    return insights;
  }

  // Private analysis methods
  private analyzeEngagementPatterns(events: any[], analytics: any[]): UserInsight | null {
    if (events.length === 0) return null;

    const pageViews = events.filter(e => e.event_type === 'page_view').length;
    const featureUse = events.filter(e => e.event_type === 'feature_use').length;
    const avgSessionTime = analytics.reduce((sum, a) => sum + (a.time_on_platform || 0), 0) / Math.max(analytics.length, 1);

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let recommendations: string[] = [];

    if (pageViews < 5) {
      severity = 'high';
      recommendations.push('Encourage more platform exploration with guided tours');
      recommendations.push('Send personalized content recommendations');
    }

    if (featureUse < 2) {
      severity = 'medium';
      recommendations.push('Introduce key features through interactive tutorials');
    }

    if (avgSessionTime < 60) {
      severity = 'medium';
      recommendations.push('Improve page load times and content relevance');
    }

    return {
      id: `engagement_${Date.now()}`,
      type: 'engagement',
      title: 'User Engagement Analysis',
      description: `User has ${pageViews} page views, ${featureUse} feature interactions, and ${Math.floor(avgSessionTime)}s avg session time`,
      severity,
      confidence: 0.85,
      actionable: true,
      recommendations,
      data: { pageViews, featureUse, avgSessionTime },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
  }

  private analyzeFeatureUsage(events: any[], user: any): UserInsight | null {
    const featureEvents = events.filter(e => e.event_type === 'feature_use');
    const featuresUsed = new Set(featureEvents.map(e => e.event_name));
    
    const premiumFeatures = ['ai_health_insights', 'expert_consultation', 'priority_booking'];
    const premiumUsage = featureEvents.filter(e => premiumFeatures.includes(e.event_name)).length;

    let recommendations: string[] = [];
    
    if (!user.is_premium && premiumUsage > 0) {
      recommendations.push('User is engaging with premium features - prime candidate for upgrade');
      recommendations.push('Offer limited-time premium trial');
    }

    if (featuresUsed.size < 3) {
      recommendations.push('Introduce user to more platform features');
      recommendations.push('Create personalized feature discovery flow');
    }

    return {
      id: `feature_${Date.now()}`,
      type: 'feature_usage',
      title: 'Feature Usage Analysis',
      description: `User has used ${featuresUsed.size} unique features with ${premiumUsage} premium interactions`,
      severity: featuresUsed.size < 2 ? 'medium' : 'low',
      confidence: 0.9,
      actionable: true,
      recommendations,
      data: { featuresUsed: Array.from(featuresUsed), premiumUsage },
      createdAt: new Date()
    };
  }

  private analyzeConversionPotential(events: any[], user: any): UserInsight | null {
    if (user.is_premium) return null;

    const conversionEvents = events.filter(e => e.event_category === 'conversion');
    const engagementScore = events.length;
    const premiumInteractions = events.filter(e => 
      e.event_data && (
        JSON.stringify(e.event_data).includes('premium') ||
        JSON.stringify(e.event_data).includes('upgrade')
      )
    ).length;

    let probability = 0;
    let recommendations: string[] = [];

    if (premiumInteractions > 3) {
      probability = 0.8;
      recommendations.push('High conversion probability - send targeted premium offer');
      recommendations.push('Highlight premium value proposition');
    } else if (engagementScore > 20) {
      probability = 0.6;
      recommendations.push('Engaged user - introduce premium features gradually');
    } else {
      probability = 0.3;
      recommendations.push('Build engagement before promoting premium features');
    }

    return {
      id: `conversion_${Date.now()}`,
      type: 'conversion',
      title: 'Premium Conversion Potential',
      description: `Conversion probability: ${Math.floor(probability * 100)}%`,
      severity: probability > 0.7 ? 'high' : 'medium',
      confidence: 0.75,
      actionable: true,
      recommendations,
      data: { probability, premiumInteractions, engagementScore },
      createdAt: new Date()
    };
  }

  private analyzeChurnRisk(events: any[], analytics: any[], user: any): UserInsight | null {
    const lastActivity = events.length > 0 ? new Date(events[0].created_at) : null;
    const daysSinceLastActivity = lastActivity 
      ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      : 99;

    let risk = 'low';
    let recommendations: string[] = [];

    if (daysSinceLastActivity > 14) {
      risk = 'critical';
      recommendations.push('Immediate re-engagement campaign needed');
      recommendations.push('Send personalized "we miss you" message');
    } else if (daysSinceLastActivity > 7) {
      risk = 'high';
      recommendations.push('Send engagement reminder');
      recommendations.push('Offer exclusive content or features');
    } else if (daysSinceLastActivity > 3) {
      risk = 'medium';
      recommendations.push('Gentle nudge with relevant content');
    }

    return {
      id: `churn_${Date.now()}`,
      type: 'churn',
      title: 'Churn Risk Analysis',
      description: `${daysSinceLastActivity} days since last activity`,
      severity: risk as any,
      confidence: 0.82,
      actionable: true,
      recommendations,
      data: { daysSinceLastActivity, lastActivity },
      createdAt: new Date()
    };
  }

  private analyzeBehaviorPatterns(events: any[]): UserInsight | null {
    if (events.length < 10) return null;

    const eventTypes = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantBehavior = Object.entries(eventTypes)
      .sort(([,a], [,b]) => b - a)[0];

    const recommendations = [
      'Tailor content and features to user\'s primary behavior pattern',
      'Create personalized user journey based on behavior preferences'
    ];

    return {
      id: `behavior_${Date.now()}`,
      type: 'behavior_pattern',
      title: 'Behavior Pattern Analysis',
      description: `Primary behavior: ${dominantBehavior[0]} (${dominantBehavior[1]} occurrences)`,
      severity: 'low',
      confidence: 0.7,
      actionable: true,
      recommendations,
      data: { eventTypes, dominantBehavior: dominantBehavior[0] },
      createdAt: new Date()
    };
  }

  private analyzeRevenueTrends(metrics: any): BusinessInsight | null {
    const revenue = metrics.total_revenue;
    const conversionRate = metrics.conversion_rate;

    let impact: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let recommendations: string[] = [];

    if (revenue < 50000) {
      impact = 'high';
      recommendations.push('Focus on premium subscription acquisition');
      recommendations.push('Implement targeted conversion campaigns');
    }

    if (conversionRate < 0.03) {
      impact = 'high';
      recommendations.push('Optimize conversion funnel');
      recommendations.push('A/B test premium pricing strategies');
    }

    return {
      id: `revenue_${Date.now()}`,
      type: 'revenue',
      title: 'Revenue Performance Analysis',
      description: `Current revenue: ₹${revenue.toLocaleString()}, Conversion rate: ${(conversionRate * 100).toFixed(2)}%`,
      impact,
      confidence: 0.88,
      priority: 9,
      actionable: true,
      recommendations,
      data: { revenue, conversionRate },
      createdAt: new Date()
    };
  }

  private analyzeGrowthTrends(metrics: any): BusinessInsight | null {
    const newUsers = metrics.new_registrations;
    const mau = metrics.active_users_monthly;
    const dau = metrics.active_users_daily;
    
    const userGrowthRate = newUsers / Math.max(metrics.total_users - newUsers, 1);

    let recommendations: string[] = [];
    
    if (userGrowthRate < 0.1) {
      recommendations.push('Increase marketing spend and user acquisition efforts');
      recommendations.push('Implement referral program to boost organic growth');
    }

    if (dau / mau < 0.3) {
      recommendations.push('Improve daily engagement through push notifications');
      recommendations.push('Add daily use cases and habit-forming features');
    }

    return {
      id: `growth_${Date.now()}`,
      type: 'growth',
      title: 'Growth Metrics Analysis',
      description: `Growth rate: ${(userGrowthRate * 100).toFixed(1)}%, DAU/MAU: ${(dau/mau * 100).toFixed(1)}%`,
      impact: userGrowthRate < 0.05 ? 'high' : 'medium',
      confidence: 0.85,
      priority: 8,
      actionable: true,
      recommendations,
      data: { userGrowthRate, dauMauRatio: dau/mau, newUsers },
      createdAt: new Date()
    };
  }

  private analyzeMarketOpportunities(businessMetrics: any, platformMetrics: any[]): BusinessInsight | null {
    const totalUsers = businessMetrics.total_users;
    const marketPotential = 5000000; // 5M potential users in India
    const marketPenetration = totalUsers / marketPotential;

    const recommendations = [
      'Significant market opportunity remains - scale marketing efforts',
      'Consider geographic expansion to untapped cities',
      'Develop partnerships with veterinary clinics for user acquisition'
    ];

    return {
      id: `market_${Date.now()}`,
      type: 'market',
      title: 'Market Opportunity Analysis',
      description: `Market penetration: ${(marketPenetration * 100).toFixed(3)}% of addressable market`,
      impact: 'critical',
      confidence: 0.9,
      priority: 10,
      actionable: true,
      recommendations,
      data: { marketPenetration, totalUsers, marketPotential },
      createdAt: new Date()
    };
  }

  private analyzePlatformUsage(platformMetrics: any[], recentEvents: any[]): BusinessInsight | null {
    const topEvent = platformMetrics.sort((a, b) => b._count.event_type - a._count.event_type)[0];
    
    if (!topEvent) return null;

    return {
      id: `platform_${Date.now()}`,
      type: 'opportunity',
      title: 'Platform Usage Insights',
      description: `Most popular action: ${topEvent.event_type} (${topEvent._count.event_type} times)`,
      impact: 'medium',
      confidence: 0.8,
      priority: 6,
      actionable: true,
      recommendations: [
        'Optimize the most popular user flows for better conversion',
        'Create more features around popular user behaviors'
      ],
      data: { topEvent, totalEvents: recentEvents.length },
      createdAt: new Date()
    };
  }

  private analyzeBusinessRisks(businessMetrics: any, recentEvents: any[]): BusinessInsight | null {
    if (!businessMetrics) return null;

    const churnRate = businessMetrics.churn_rate;
    const risks: string[] = [];
    const recommendations: string[] = [];

    if (churnRate > 0.1) {
      risks.push('High churn rate detected');
      recommendations.push('Implement customer success program');
      recommendations.push('Analyze churn reasons and address root causes');
    }

    if (risks.length === 0) return null;

    return {
      id: `risk_${Date.now()}`,
      type: 'risk',
      title: 'Business Risk Assessment',
      description: `Identified ${risks.length} potential risks`,
      impact: 'high',
      confidence: 0.75,
      priority: 9,
      actionable: true,
      recommendations,
      data: { risks, churnRate },
      createdAt: new Date()
    };
  }

  // Predictive analysis methods
  private async predictChurnRisk(): Promise<PredictiveInsight | null> {
    // Simple churn prediction based on user activity patterns
    const inactiveUsers = await prisma.user.count({
      where: {
        updated_at: {
          lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
        }
      }
    });

    const totalUsers = await prisma.user.count();
    const churnProbability = inactiveUsers / totalUsers;

    return {
      id: `churn_pred_${Date.now()}`,
      type: 'churn_prediction',
      title: 'Churn Risk Prediction',
      description: `${Math.floor(churnProbability * 100)}% of users at risk of churning`,
      probability: churnProbability,
      confidence: 0.7,
      timeframe: '30 days',
      recommendations: [
        'Target at-risk users with re-engagement campaigns',
        'Implement proactive customer success outreach',
        'Create win-back offers for inactive users'
      ],
      data: { inactiveUsers, totalUsers, churnProbability },
      createdAt: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
  }

  private async forecastRevenue(): Promise<PredictiveInsight | null> {
    const currentMetrics = await prisma.businessMetrics.findFirst({
      orderBy: { created_at: 'desc' }
    });

    if (!currentMetrics) return null;

    const currentRevenue = currentMetrics.total_revenue;
    const growthRate = 0.15; // Assume 15% monthly growth
    const projectedRevenue = currentRevenue * (1 + growthRate);

    return {
      id: `revenue_forecast_${Date.now()}`,
      type: 'revenue_forecast',
      title: 'Revenue Forecast',
      description: `Projected revenue: ₹${Math.floor(projectedRevenue).toLocaleString()}`,
      probability: 0.75,
      confidence: 0.68,
      timeframe: '30 days',
      recommendations: [
        'Focus on premium conversion to achieve targets',
        'Expand partner network for commission revenue',
        'Launch targeted marketing campaigns'
      ],
      data: { currentRevenue, projectedRevenue, growthRate },
      createdAt: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };
  }

  private async predictUserGrowth(): Promise<PredictiveInsight | null> {
    const currentMetrics = await prisma.businessMetrics.findFirst({
      orderBy: { created_at: 'desc' }
    });

    if (!currentMetrics) return null;

    const currentUsers = currentMetrics.total_users;
    const newUsers = currentMetrics.new_registrations;
    const growthRate = newUsers / Math.max(currentUsers - newUsers, 1);
    const projectedUsers = Math.floor(currentUsers * (1 + growthRate * 4)); // 4 weeks

    return {
      id: `growth_pred_${Date.now()}`,
      type: 'user_growth',
      title: 'User Growth Prediction',
      description: `Projected user base: ${projectedUsers.toLocaleString()} users`,
      probability: 0.72,
      confidence: 0.65,
      timeframe: '30 days',
      recommendations: [
        'Maintain current acquisition channels',
        'Invest in high-performing marketing campaigns',
        'Optimize onboarding to improve retention'
      ],
      data: { currentUsers, projectedUsers, growthRate },
      createdAt: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };
  }

  private async predictFeatureAdoption(): Promise<PredictiveInsight | null> {
    const featureEvents = await prisma.userBehaviorEvents.groupBy({
      by: ['event_name'],
      _count: { event_name: true },
      where: {
        event_type: 'feature_use',
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: {
        _count: {
          event_name: 'desc'
        }
      },
      take: 5
    });

    if (featureEvents.length === 0) return null;

    const topFeature = featureEvents[0];
    const adoptionRate = 0.25; // Assume 25% adoption increase

    return {
      id: `adoption_pred_${Date.now()}`,
      type: 'feature_adoption',
      title: 'Feature Adoption Prediction',
      description: `Top feature "${topFeature.event_name}" expected to grow by ${Math.floor(adoptionRate * 100)}%`,
      probability: 0.68,
      confidence: 0.6,
      timeframe: '30 days',
      recommendations: [
        'Promote trending features to increase adoption',
        'Create tutorials for popular features',
        'Use popular features to drive premium conversion'
      ],
      data: { topFeature, adoptionRate, featureEvents },
      createdAt: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };
  }
}

export const aiInsightsEngine = AIInsightsEngine.getInstance();
export default aiInsightsEngine;