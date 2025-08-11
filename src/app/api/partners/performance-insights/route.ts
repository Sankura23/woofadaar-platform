import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

interface DecodedToken {
  userId?: string;
  partnerId?: string;
  email: string;
  userType?: string;
}

async function verifyToken(request: NextRequest): Promise<{ userId?: string; partnerId?: string; email?: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    return {
      userId: decoded.userId,
      partnerId: decoded.partnerId,
      email: decoded.email
    };
  } catch (error) {
    return null;
  }
}

// Helper function to calculate business health score
function calculateBusinessHealthScore(metrics: any): { score: number; breakdown: any } {
  const weights = {
    appointment_completion: 0.25,
    client_satisfaction: 0.25,
    revenue_growth: 0.20,
    client_retention: 0.15,
    service_diversity: 0.10,
    responsiveness: 0.05
  };

  const scores = {
    appointment_completion: Math.min(100, (metrics.completionRate || 0)),
    client_satisfaction: Math.min(100, (metrics.averageRating || 0) * 20), // Convert 5-star to 100 scale
    revenue_growth: Math.min(100, Math.max(0, 50 + (metrics.revenueGrowth || 0))), // Center around 50
    client_retention: Math.min(100, (metrics.retentionRate || 0)),
    service_diversity: Math.min(100, (metrics.serviceTypes || 1) * 25), // Up to 4 service types
    responsiveness: Math.min(100, 100 - (metrics.avgResponseHours || 24) * 2) // Lower hours = higher score
  };

  const totalScore = Object.keys(weights).reduce((sum, key) => {
    return sum + (scores[key as keyof typeof scores] * weights[key as keyof typeof weights]);
  }, 0);

  return {
    score: Math.round(totalScore),
    breakdown: Object.keys(weights).map(key => ({
      category: key.replace('_', ' ').toUpperCase(),
      score: Math.round(scores[key as keyof typeof scores]),
      weight: weights[key as keyof typeof weights],
      contribution: Math.round(scores[key as keyof typeof scores] * weights[key as keyof typeof weights])
    }))
  };
}

// Helper function to identify performance trends
function identifyTrends(timeSeriesData: any[], metric: string) {
  if (timeSeriesData.length < 3) return null;

  const recent = timeSeriesData.slice(-7); // Last 7 data points
  const previous = timeSeriesData.slice(-14, -7); // Previous 7 data points

  if (recent.length === 0 || previous.length === 0) return null;

  const recentAvg = recent.reduce((sum, item) => sum + item.value, 0) / recent.length;
  const previousAvg = previous.reduce((sum, item) => sum + item.value, 0) / previous.length;

  const change = previousAvg === 0 ? 0 : ((recentAvg - previousAvg) / previousAvg) * 100;

  return {
    metric,
    trend: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable',
    change_percentage: Math.round(change),
    recent_average: Math.round(recentAvg),
    previous_average: Math.round(previousAvg)
  };
}

// GET /api/partners/performance-insights - Get AI-powered performance insights and recommendations
export async function GET(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth || !auth.partnerId) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized - Partner authentication required' 
    }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const insightType = searchParams.get('insight_type') || 'comprehensive';
    const timeFrame = searchParams.get('time_frame') || '30'; // days

    const daysBack = parseInt(timeFrame);
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Get partner information
    const partner = await prisma.partner.findUnique({
      where: { id: auth.partnerId },
      select: {
        id: true,
        name: true,
        partner_type: true,
        partnership_tier: true,
        rating_average: true,
        rating_count: true,
        total_appointments: true,
        monthly_revenue: true,
        created_at: true,
        status: true,
        verified: true
      }
    });

    if (!partner || partner.status !== 'approved') {
      return NextResponse.json({
        success: false,
        message: 'Partner not found or not approved'
      }, { status: 403 });
    }

    // Get comprehensive data for analysis
    const [appointments, reviews, commissions, healthVerifications] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          partner_id: auth.partnerId,
          appointment_date: { gte: startDate, lte: endDate }
        },
        include: {
          user: { select: { id: true, created_at: true } }
        },
        orderBy: { appointment_date: 'asc' }
      }),
      prisma.partnerReview.findMany({
        where: {
          partner_id: auth.partnerId,
          created_at: { gte: startDate, lte: endDate }
        },
        orderBy: { created_at: 'asc' }
      }),
      prisma.commissionEarning.findMany({
        where: {
          partner_id: auth.partnerId,
          created_at: { gte: startDate, lte: endDate }
        }
      }),
      prisma.healthIdVerification.findMany({
        where: {
          partner_id: auth.partnerId,
          verification_date: { gte: startDate, lte: endDate }
        }
      })
    ]);

    // Calculate key metrics
    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
    const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled').length;
    const totalRevenue = appointments.reduce((sum, apt) => sum + (apt.consultation_fee || 0), 0);
    const averageRating = reviews.length > 0 ? reviews.reduce((sum, rev) => sum + rev.rating, 0) / reviews.length : 0;
    const uniqueClients = new Set(appointments.map(apt => apt.user_id)).size;
    const repeatClients = Array.from(
      appointments.reduce((acc, apt) => {
        acc.set(apt.user_id, (acc.get(apt.user_id) || 0) + 1);
        return acc;
      }, new Map())
    ).filter(([_, count]) => count > 1).length;

    const metrics = {
      completionRate: totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0,
      cancellationRate: totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0,
      averageRating: averageRating,
      revenueGrowth: 10, // Mock - would calculate from historical data
      retentionRate: uniqueClients > 0 ? (repeatClients / uniqueClients) * 100 : 0,
      serviceTypes: new Set(appointments.map(apt => apt.service_type)).size,
      avgResponseHours: 12, // Mock - would calculate from booking response times
      reviewRate: totalAppointments > 0 ? (reviews.length / totalAppointments) * 100 : 0
    };

    // Calculate business health score
    const healthScore = calculateBusinessHealthScore(metrics);

    // Generate time series for trend analysis
    const dailyAppointments = generateDailyTimeSeries(appointments, 'appointment_date', startDate, endDate);
    const dailyRevenue = generateDailyTimeSeries(appointments, 'appointment_date', startDate, endDate, 'consultation_fee');

    // Identify trends
    const trends = [
      identifyTrends(dailyAppointments, 'appointments'),
      identifyTrends(dailyRevenue, 'revenue')
    ].filter(Boolean);

    let insightsData: any = {
      partner_info: {
        id: partner.id,
        name: partner.name,
        partner_type: partner.partner_type,
        partnership_tier: partner.partnership_tier,
        experience_days: Math.floor((endDate.getTime() - partner.created_at.getTime()) / (1000 * 60 * 60 * 24))
      },
      analysis_period: {
        days: daysBack,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      },
      business_health: healthScore,
      key_metrics: {
        appointments: {
          total: totalAppointments,
          completed: completedAppointments,
          cancelled: cancelledAppointments,
          completion_rate: Math.round(metrics.completionRate),
          cancellation_rate: Math.round(metrics.cancellationRate)
        },
        revenue: {
          total: totalRevenue,
          average_per_appointment: totalAppointments > 0 ? Math.round(totalRevenue / totalAppointments) : 0,
          growth_trend: trends.find(t => t?.metric === 'revenue')
        },
        client_satisfaction: {
          average_rating: Math.round(averageRating * 10) / 10,
          total_reviews: reviews.length,
          review_rate: Math.round(metrics.reviewRate)
        },
        client_base: {
          unique_clients: uniqueClients,
          repeat_clients: repeatClients,
          retention_rate: Math.round(metrics.retentionRate)
        }
      },
      performance_trends: trends
    };

    // Add specific insights based on insight_type
    switch (insightType) {
      case 'comprehensive':
        insightsData.actionable_insights = generateActionableInsights(metrics, partner, healthScore.score);
        insightsData.opportunity_analysis = analyzeGrowthOpportunities(metrics, appointments, partner);
        insightsData.competitive_positioning = analyzeCompetitivePosition(metrics, partner);
        insightsData.forecasting = generateForecasts(dailyAppointments, dailyRevenue);
        break;

      case 'growth':
        insightsData.growth_analysis = {
          potential_areas: identifyGrowthAreas(metrics, appointments),
          market_expansion: suggestMarketExpansion(appointments, partner),
          service_optimization: optimizeServiceOfferings(appointments),
          pricing_recommendations: analyzePricingStrategy(appointments, partner)
        };
        break;

      case 'efficiency':
        insightsData.efficiency_analysis = {
          time_management: analyzeTimeManagement(appointments),
          resource_utilization: analyzeResourceUtilization(appointments, healthVerifications),
          workflow_optimization: suggestWorkflowImprovements(appointments, metrics),
          cost_optimization: analyzeCostOptimization(appointments, commissions)
        };
        break;

      case 'client_experience':
        insightsData.client_experience = {
          satisfaction_analysis: analyzeClientSatisfaction(reviews, appointments),
          service_quality_insights: analyzeServiceQuality(reviews, appointments),
          client_journey_optimization: optimizeClientJourney(appointments),
          feedback_analysis: analyzeClientFeedback(reviews)
        };
        break;
    }

    // Add AI-generated recommendations
    insightsData.ai_recommendations = generateAIRecommendations(insightsData, partner);
    
    // Add success predictions
    insightsData.success_predictions = generateSuccessPredictions(metrics, trends, partner);

    return NextResponse.json({
      success: true,
      data: insightsData,
      insight_type: insightType,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Performance insights error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while generating insights'
    }, { status: 500 });
  }
}

// Helper functions
function generateDailyTimeSeries(data: any[], dateField: string, startDate: Date, endDate: Date, valueField?: string) {
  const series = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayData = data.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate.toDateString() === current.toDateString();
    });
    
    const value = valueField ? 
      dayData.reduce((sum, item) => sum + (item[valueField] || 0), 0) : 
      dayData.length;
    
    series.push({
      date: current.toISOString().split('T')[0],
      value: value
    });
    
    current.setDate(current.getDate() + 1);
  }
  
  return series;
}

function generateActionableInsights(metrics: any, partner: any, healthScore: number): string[] {
  const insights = [];
  
  if (healthScore < 60) {
    insights.push('🚨 CRITICAL: Business health score is below 60. Immediate action required to improve service quality and client satisfaction.');
  } else if (healthScore < 75) {
    insights.push('⚠️ MODERATE: Business health score indicates room for improvement. Focus on key performance areas.');
  } else {
    insights.push('✅ EXCELLENT: Strong business health score. Maintain current performance while exploring growth opportunities.');
  }
  
  if (metrics.completionRate < 80) {
    insights.push('📅 Improve appointment completion rate by implementing better scheduling and reminder systems.');
  }
  
  if (metrics.averageRating < 4.0) {
    insights.push('⭐ Focus on service quality improvements to increase client satisfaction ratings.');
  }
  
  if (metrics.retentionRate < 40) {
    insights.push('🔄 Implement client retention strategies such as follow-up care and loyalty programs.');
  }
  
  if (partner.partnership_tier === 'basic' && metrics.completionRate > 85) {
    insights.push('💎 Consider upgrading to Premium tier to maximize revenue potential with your excellent performance.');
  }
  
  return insights.slice(0, 5); // Limit to top 5 insights
}

function analyzeGrowthOpportunities(metrics: any, appointments: any[], partner: any) {
  const serviceTypes = appointments.reduce((acc, apt) => {
    acc[apt.service_type] = (acc[apt.service_type] || 0) + 1;
    return acc;
  }, {});
  
  return {
    underserved_services: ['emergency', 'training', 'treatment'].filter(service => 
      !serviceTypes[service] || serviceTypes[service] < appointments.length * 0.1
    ),
    peak_demand_analysis: {
      busiest_hours: getBusiestHours(appointments),
      popular_services: Object.entries(serviceTypes).sort(([,a], [,b]) => (b as number) - (a as number)).slice(0, 3)
    },
    expansion_potential: partner.partnership_tier === 'basic' ? 'high' : 
                        partner.partnership_tier === 'premium' ? 'medium' : 'low'
  };
}

function analyzeCompetitivePosition(metrics: any, partner: any) {
  // Mock competitive analysis - in production, this would use actual market data
  return {
    rating_vs_market: metrics.averageRating >= 4.5 ? 'above_average' : 
                     metrics.averageRating >= 4.0 ? 'average' : 'below_average',
    pricing_position: 'competitive', // Would analyze actual pricing data
    service_differentiation: partner.kci_verified ? 'high' : 'medium',
    market_share_estimate: partner.partnership_tier === 'enterprise' ? 'high' : 
                          partner.partnership_tier === 'premium' ? 'medium' : 'growing'
  };
}

function generateForecasts(appointmentData: any[], revenueData: any[]) {
  // Simple linear trend forecasting
  const appointmentTrend = calculateLinearTrend(appointmentData.slice(-14));
  const revenueTrend = calculateLinearTrend(revenueData.slice(-14));
  
  return {
    next_30_days: {
      projected_appointments: Math.max(0, Math.round(appointmentTrend.slope * 30)),
      projected_revenue: Math.max(0, Math.round(revenueTrend.slope * 30)),
      confidence: appointmentData.length > 14 ? 'medium' : 'low'
    },
    growth_trajectory: appointmentTrend.slope > 0 ? 'growing' : 
                      appointmentTrend.slope < 0 ? 'declining' : 'stable'
  };
}

function calculateLinearTrend(data: any[]) {
  if (data.length < 2) return { slope: 0, intercept: 0 };
  
  const n = data.length;
  const sumX = data.reduce((sum, _, i) => sum + i, 0);
  const sumY = data.reduce((sum, item) => sum + item.value, 0);
  const sumXY = data.reduce((sum, item, i) => sum + i * item.value, 0);
  const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
}

function identifyGrowthAreas(metrics: any, appointments: any[]) {
  const areas = [];
  
  if (metrics.serviceTypes < 3) {
    areas.push('Service Diversification: Expand your service offerings to attract more clients');
  }
  
  if (metrics.retentionRate < 50) {
    areas.push('Client Retention: Implement follow-up programs to improve repeat business');
  }
  
  if (metrics.reviewRate < 30) {
    areas.push('Review Generation: Encourage satisfied clients to leave reviews');
  }
  
  return areas;
}

function getBusiestHours(appointments: any[]) {
  const hourCount = appointments.reduce((acc, apt) => {
    const hour = new Date(apt.appointment_date).getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as any);
  
  return Object.entries(hourCount)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([hour, count]) => ({ hour: parseInt(hour), appointments: count }));
}

function generateAIRecommendations(data: any, partner: any): string[] {
  const recommendations = [];
  
  if (data.business_health.score < 70) {
    recommendations.push('Priority Focus: Improve service quality and client communication to boost overall business health');
  }
  
  if (data.key_metrics.client_satisfaction.review_rate < 25) {
    recommendations.push('Implement post-appointment review requests to increase feedback and visibility');
  }
  
  if (partner.partnership_tier === 'basic' && data.key_metrics.revenue.total > 20000) {
    recommendations.push('Upgrade to Premium tier to access better commission rates and enhanced features');
  }
  
  return recommendations.slice(0, 6);
}

// Additional helper functions for different analysis types would go here...
function suggestMarketExpansion(appointments: any[], partner: any) {
  return {
    geographic_expansion: 'Consider expanding to nearby areas based on client demand',
    demographic_targeting: 'Focus on young pet owners who show higher engagement',
    service_timing: 'Offer weekend and evening slots for working professionals'
  };
}

function optimizeServiceOfferings(appointments: any[]) {
  const servicePerformance = appointments.reduce((acc, apt) => {
    if (!acc[apt.service_type]) {
      acc[apt.service_type] = { count: 0, revenue: 0, rating: [] };
    }
    acc[apt.service_type].count += 1;
    acc[apt.service_type].revenue += apt.consultation_fee || 0;
    return acc;
  }, {} as any);

  return {
    top_performing: Object.entries(servicePerformance)
      .sort(([,a], [,b]) => (b as any).revenue - (a as any).revenue)
      .slice(0, 2),
    recommendations: 'Focus on high-revenue services while maintaining quality across all offerings'
  };
}

function analyzePricingStrategy(appointments: any[], partner: any) {
  const avgFee = appointments.length > 0 ? 
    appointments.reduce((sum, apt) => sum + (apt.consultation_fee || 0), 0) / appointments.length : 0;

  return {
    current_average: Math.round(avgFee),
    market_position: avgFee > 800 ? 'premium' : avgFee > 500 ? 'competitive' : 'budget',
    optimization_potential: 'Consider value-based pricing for specialized services'
  };
}

function analyzeTimeManagement(appointments: any[]) {
  return {
    peak_hours: getBusiestHours(appointments),
    scheduling_efficiency: 'Good distribution across available hours',
    improvement_areas: ['Block scheduling for similar services', 'Buffer time between appointments']
  };
}

function analyzeResourceUtilization(appointments: any[], healthVerifications: any[]) {
  return {
    appointment_utilization: `${appointments.length} appointments in period`,
    health_id_utilization: `${healthVerifications.length} verifications`,
    efficiency_score: appointments.length > 0 ? Math.min(100, (appointments.length / 30) * 10) : 0
  };
}

function suggestWorkflowImprovements(appointments: any[], metrics: any) {
  const suggestions = [];
  
  if (metrics.cancellationRate > 15) {
    suggestions.push('Implement confirmation reminders 24-48 hours before appointments');
  }
  
  if (metrics.reviewRate < 30) {
    suggestions.push('Set up automated review request emails after completed appointments');
  }
  
  suggestions.push('Use appointment scheduling software to reduce manual coordination');
  
  return suggestions;
}

function analyzeCostOptimization(appointments: any[], commissions: any[]) {
  return {
    commission_efficiency: commissions.length > 0 ? 'Active earning through referrals' : 'Opportunity to increase referral income',
    cost_per_acquisition: 'Monitor marketing spend vs new client acquisition',
    recommendations: ['Focus on high-margin services', 'Optimize referral programs']
  };
}

function analyzeClientSatisfaction(reviews: any[], appointments: any[]) {
  const ratingDistribution = reviews.reduce((acc, rev) => {
    acc[rev.rating] = (acc[rev.rating] || 0) + 1;
    return acc;
  }, {} as any);

  return {
    overall_satisfaction: reviews.length > 0 ? 
      reviews.reduce((sum, rev) => sum + rev.rating, 0) / reviews.length : 0,
    rating_distribution: ratingDistribution,
    satisfaction_trend: 'Stable', // Would calculate from time series
    areas_for_improvement: reviews.filter(rev => rev.rating < 4).map(rev => rev.review_text).slice(0, 3)
  };
}

function analyzeServiceQuality(reviews: any[], appointments: any[]) {
  return {
    quality_indicators: {
      completion_rate: appointments.filter(apt => apt.status === 'completed').length / appointments.length * 100,
      repeat_client_rate: 'Calculate from client history',
      referral_rate: 'Track new clients from existing client referrals'
    },
    improvement_areas: ['Service consistency', 'Communication clarity', 'Follow-up care']
  };
}

function optimizeClientJourney(appointments: any[]) {
  return {
    booking_to_appointment: 'Average lead time analysis',
    appointment_experience: 'Focus on punctuality and service delivery',
    post_appointment: 'Implement follow-up care recommendations',
    journey_optimization: ['Streamline booking process', 'Improve communication', 'Add value-added services']
  };
}

function analyzeClientFeedback(reviews: any[]) {
  const positiveKeywords = reviews.filter(rev => rev.rating >= 4)
    .map(rev => rev.review_text)
    .join(' ')
    .toLowerCase();
    
  const negativeKeywords = reviews.filter(rev => rev.rating < 4)
    .map(rev => rev.review_text)
    .join(' ')
    .toLowerCase();

  return {
    positive_themes: ['professional', 'caring', 'knowledgeable'], // Would extract from actual text
    improvement_themes: ['waiting time', 'communication', 'pricing'], // Would extract from actual text
    sentiment_analysis: 'Overall positive with specific areas for improvement'
  };
}

function generateSuccessPredictions(metrics: any, trends: any[], partner: any) {
  let successScore = 50; // Base score
  
  if (metrics.completionRate > 85) successScore += 15;
  if (metrics.averageRating > 4.5) successScore += 15;
  if (metrics.retentionRate > 60) successScore += 10;
  if (partner.partnership_tier === 'premium') successScore += 5;
  if (partner.partnership_tier === 'enterprise') successScore += 10;
  
  trends.forEach(trend => {
    if (trend?.trend === 'improving') successScore += 5;
    if (trend?.trend === 'declining') successScore -= 5;
  });

  return {
    success_probability: Math.min(95, Math.max(5, successScore)),
    key_success_factors: [
      'Maintain high service quality',
      'Focus on client retention',
      'Expand service offerings strategically'
    ],
    risk_factors: metrics.cancellationRate > 20 ? ['High cancellation rate'] : [],
    timeline_prediction: '3-6 months to see significant improvement with focused efforts'
  };
}