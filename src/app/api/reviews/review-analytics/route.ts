import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

interface DecodedToken {
  userId?: string;
  partnerId?: string;
  email: string;
  userType?: string;
}

async function verifyToken(request: NextRequest): Promise<{ userId?: string; partnerId?: string; email?: string; isAdmin?: boolean } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    
    const isAdmin = decoded.email === 'admin@woofadaar.com' || decoded.userType === 'admin';
    
    return {
      userId: decoded.userId,
      partnerId: decoded.partnerId,
      email: decoded.email,
      isAdmin
    };
  } catch (error) {
    return null;
  }
}

// Helper function to calculate sentiment analysis (mock - use proper NLP service in production)
function analyzeSentiment(reviewText: string): { sentiment: string; confidence: number; keywords: string[] } {
  if (!reviewText) return { sentiment: 'neutral', confidence: 0, keywords: [] };

  const positiveWords = ['excellent', 'amazing', 'great', 'wonderful', 'fantastic', 'professional', 'caring', 'helpful', 'recommend', 'love', 'perfect', 'outstanding'];
  const negativeWords = ['terrible', 'awful', 'bad', 'horrible', 'disappointing', 'unprofessional', 'rude', 'expensive', 'waste', 'never', 'worst'];
  
  const text = reviewText.toLowerCase();
  const words = text.split(/\s+/);
  
  let positiveScore = 0;
  let negativeScore = 0;
  const foundKeywords: string[] = [];
  
  words.forEach(word => {
    if (positiveWords.includes(word)) {
      positiveScore++;
      foundKeywords.push(word);
    }
    if (negativeWords.includes(word)) {
      negativeScore++;
      foundKeywords.push(word);
    }
  });
  
  const totalScore = positiveScore - negativeScore;
  const confidence = Math.min(1, (Math.abs(totalScore) / words.length) * 10);
  
  let sentiment = 'neutral';
  if (totalScore > 0) sentiment = 'positive';
  if (totalScore < 0) sentiment = 'negative';
  
  return {
    sentiment,
    confidence: Math.round(confidence * 100) / 100,
    keywords: foundKeywords.slice(0, 5) // Top 5 keywords
  };
}

// Helper function to generate review insights
async function generateReviewInsights(partnerId?: string, serviceType?: string) {
  let whereClause: any = { is_verified: true };
  if (partnerId) whereClause.partner_id = partnerId;
  if (serviceType) whereClause.service_type = serviceType;

  const reviews = await prisma.partnerReview.findMany({
    where: whereClause,
    include: {
      partner: {
        select: {
          id: true,
          name: true,
          business_name: true,
          partner_type: true,
          partnership_tier: true
        }
      }
    },
    orderBy: { created_at: 'desc' },
    take: 1000 // Analyze recent 1000 reviews
  });

  if (reviews.length === 0) {
    return {
      total_reviews: 0,
      insights: ['No reviews available for analysis']
    };
  }

  // Sentiment analysis
  const sentimentResults = reviews
    .filter(review => review.review_text)
    .map(review => analyzeSentiment(review.review_text!));

  const sentimentDistribution = {
    positive: sentimentResults.filter(s => s.sentiment === 'positive').length,
    neutral: sentimentResults.filter(s => s.sentiment === 'neutral').length,
    negative: sentimentResults.filter(s => s.sentiment === 'negative').length
  };

  // Rating trends over time
  const ratingTrends = reviews.reduce((acc, review) => {
    const month = review.created_at.toISOString().substr(0, 7); // YYYY-MM
    if (!acc[month]) {
      acc[month] = { total: 0, count: 0, ratings: [] };
    }
    acc[month].total += review.rating;
    acc[month].count += 1;
    acc[month].ratings.push(review.rating);
    return acc;
  }, {} as any);

  // Common keywords and themes
  const allKeywords = sentimentResults.flatMap(s => s.keywords);
  const keywordFrequency = allKeywords.reduce((acc, keyword) => {
    acc[keyword] = (acc[keyword] || 0) + 1;
    return acc;
  }, {} as any);

  const topKeywords = Object.entries(keywordFrequency)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));

  // Service type performance
  const servicePerformance = reviews.reduce((acc, review) => {
    const service = review.service_type || 'general';
    if (!acc[service]) {
      acc[service] = { ratings: [], count: 0, total: 0 };
    }
    acc[service].ratings.push(review.rating);
    acc[service].count += 1;
    acc[service].total += review.rating;
    return acc;
  }, {} as any);

  // Partner tier performance comparison
  const tierPerformance = reviews.reduce((acc, review) => {
    const tier = review.partner.partnership_tier;
    if (!acc[tier]) {
      acc[tier] = { ratings: [], count: 0, total: 0 };
    }
    acc[tier].ratings.push(review.rating);
    acc[tier].count += 1;
    acc[tier].total += review.rating;
    return acc;
  }, {} as any);

  // Generate insights
  const insights = [];
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  
  if (avgRating >= 4.5) {
    insights.push('Excellent overall rating performance - maintain current service quality');
  } else if (avgRating < 3.5) {
    insights.push('Below average ratings indicate need for service improvement');
  }

  if (sentimentDistribution.positive > sentimentDistribution.negative * 2) {
    insights.push('Strong positive sentiment in review text indicates satisfied customers');
  } else if (sentimentDistribution.negative > sentimentDistribution.positive) {
    insights.push('Negative sentiment detected - review common complaints and address issues');
  }

  const recentMonth = Object.keys(ratingTrends).sort().slice(-1)[0];
  const previousMonth = Object.keys(ratingTrends).sort().slice(-2, -1)[0];
  
  if (recentMonth && previousMonth) {
    const recentAvg = ratingTrends[recentMonth].total / ratingTrends[recentMonth].count;
    const previousAvg = ratingTrends[previousMonth].total / ratingTrends[previousMonth].count;
    
    if (recentAvg > previousAvg + 0.2) {
      insights.push('Rating trend is improving - recent performance is better than previous month');
    } else if (recentAvg < previousAvg - 0.2) {
      insights.push('Rating trend is declining - focus on recent service quality issues');
    }
  }

  return {
    total_reviews: reviews.length,
    average_rating: Math.round(avgRating * 10) / 10,
    sentiment_analysis: {
      distribution: sentimentDistribution,
      overall_sentiment: sentimentDistribution.positive > sentimentDistribution.negative ? 'positive' : 
                        sentimentDistribution.negative > sentimentDistribution.positive ? 'negative' : 'neutral'
    },
    rating_trends: Object.keys(ratingTrends).sort().map(month => ({
      month,
      average_rating: Math.round((ratingTrends[month].total / ratingTrends[month].count) * 10) / 10,
      review_count: ratingTrends[month].count
    })),
    top_keywords: topKeywords,
    service_performance: Object.keys(servicePerformance).map(service => ({
      service_type: service,
      average_rating: Math.round((servicePerformance[service].total / servicePerformance[service].count) * 10) / 10,
      review_count: servicePerformance[service].count
    })).sort((a, b) => b.average_rating - a.average_rating),
    tier_performance: Object.keys(tierPerformance).map(tier => ({
      partnership_tier: tier,
      average_rating: Math.round((tierPerformance[tier].total / tierPerformance[tier].count) * 10) / 10,
      review_count: tierPerformance[tier].count
    })).sort((a, b) => b.average_rating - a.average_rating),
    insights: insights
  };
}

// GET /api/reviews/review-analytics - Get comprehensive review analytics
export async function GET(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized' 
    }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const partner_id = searchParams.get('partner_id');
    const service_type = searchParams.get('service_type');
    const analysis_type = searchParams.get('analysis_type') || 'comprehensive'; // comprehensive, sentiment, trends, comparison
    const time_period = searchParams.get('time_period') || '6_months';

    // Access control - partners can only see their own analytics unless admin
    let targetPartnerId = partner_id;
    if (!auth.isAdmin && auth.partnerId) {
      targetPartnerId = auth.partnerId;
    } else if (!auth.isAdmin && !auth.partnerId && partner_id) {
      return NextResponse.json({
        success: false,
        message: 'Access denied - partners can only view their own analytics'
      }, { status: 403 });
    }

    // Calculate date range for time period
    const now = new Date();
    let startDate: Date;
    
    switch (time_period) {
      case '1_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case '3_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case '6_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case '1_year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    }

    // Generate insights based on analysis type
    let analyticsData: any = {};

    if (analysis_type === 'comprehensive' || analysis_type === 'sentiment') {
      const insights = await generateReviewInsights(targetPartnerId, service_type);
      analyticsData.review_insights = insights;
    }

    if (analysis_type === 'comprehensive' || analysis_type === 'trends') {
      // Get detailed rating trends
      let whereClause: any = {
        created_at: { gte: startDate },
        is_verified: true
      };
      if (targetPartnerId) whereClause.partner_id = targetPartnerId;
      if (service_type) whereClause.service_type = service_type;

      const trendReviews = await prisma.partnerReview.findMany({
        where: whereClause,
        select: {
          rating: true,
          created_at: true,
          service_type: true
        },
        orderBy: { created_at: 'asc' }
      });

      // Weekly rating trends
      const weeklyTrends = trendReviews.reduce((acc, review) => {
        const week = getWeekKey(review.created_at);
        if (!acc[week]) {
          acc[week] = { ratings: [], count: 0, total: 0 };
        }
        acc[week].ratings.push(review.rating);
        acc[week].count += 1;
        acc[week].total += review.rating;
        return acc;
      }, {} as any);

      analyticsData.rating_trends = {
        weekly_averages: Object.keys(weeklyTrends).sort().map(week => ({
          week,
          average_rating: Math.round((weeklyTrends[week].total / weeklyTrends[week].count) * 10) / 10,
          review_count: weeklyTrends[week].count
        })),
        total_period_reviews: trendReviews.length,
        period_average: trendReviews.length > 0 ? 
          Math.round((trendReviews.reduce((sum, r) => sum + r.rating, 0) / trendReviews.length) * 10) / 10 : 0
      };
    }

    if (analysis_type === 'comprehensive' || analysis_type === 'comparison') {
      // Comparative analytics (admin only or partner comparing to anonymized averages)
      if (auth.isAdmin) {
        const allPartnerStats = await prisma.partner.findMany({
          where: { 
            status: 'approved',
            rating_count: { gt: 0 }
          },
          select: {
            id: true,
            name: true,
            business_name: true,
            partner_type: true,
            partnership_tier: true,
            rating_average: true,
            rating_count: true
          },
          orderBy: { rating_average: 'desc' },
          take: 50
        });

        analyticsData.partner_comparison = {
          top_rated_partners: allPartnerStats.slice(0, 10),
          partner_type_averages: await getPartnerTypeAverages(),
          tier_performance_comparison: await getTierPerformanceComparison()
        };
      } else if (targetPartnerId) {
        // Provide anonymized benchmark data for individual partners
        const benchmarks = await getAnonymizedBenchmarks(targetPartnerId);
        analyticsData.performance_benchmarks = benchmarks;
      }
    }

    // Add review quality metrics
    if (targetPartnerId) {
      const qualityMetrics = await getReviewQualityMetrics(targetPartnerId);
      analyticsData.quality_metrics = qualityMetrics;
    }

    // Add actionable recommendations
    analyticsData.recommendations = generateActionableRecommendations(analyticsData, targetPartnerId);

    return NextResponse.json({
      success: true,
      data: analyticsData,
      analysis_parameters: {
        partner_id: targetPartnerId,
        service_type,
        analysis_type,
        time_period,
        date_range: {
          start: startDate.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0]
        }
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Review analytics error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while generating review analytics'
    }, { status: 500 });
  }
}

// Helper functions
function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const week = Math.ceil((date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

async function getPartnerTypeAverages() {
  const typeAverages = await prisma.partner.groupBy({
    by: ['partner_type'],
    where: { 
      status: 'approved',
      rating_count: { gt: 0 }
    },
    _avg: { rating_average: true },
    _count: { id: true }
  });

  return typeAverages.map(avg => ({
    partner_type: avg.partner_type,
    average_rating: Math.round((avg._avg.rating_average || 0) * 10) / 10,
    partner_count: avg._count.id
  }));
}

async function getTierPerformanceComparison() {
  const tierAverages = await prisma.partner.groupBy({
    by: ['partnership_tier'],
    where: { 
      status: 'approved',
      rating_count: { gt: 0 }
    },
    _avg: { rating_average: true },
    _count: { id: true }
  });

  return tierAverages.map(avg => ({
    partnership_tier: avg.partnership_tier,
    average_rating: Math.round((avg._avg.rating_average || 0) * 10) / 10,
    partner_count: avg._count.id
  }));
}

async function getAnonymizedBenchmarks(partnerId: string) {
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: { partner_type: true, partnership_tier: true, rating_average: true }
  });

  if (!partner) return null;

  // Get averages for similar partners (same type and tier)
  const similarPartners = await prisma.partner.aggregate({
    where: {
      partner_type: partner.partner_type,
      partnership_tier: partner.partnership_tier,
      status: 'approved',
      rating_count: { gt: 0 },
      id: { not: partnerId } // Exclude current partner
    },
    _avg: { rating_average: true },
    _count: { id: true }
  });

  return {
    your_rating: partner.rating_average,
    similar_partners_average: Math.round((similarPartners._avg.rating_average || 0) * 10) / 10,
    comparison_pool_size: similarPartners._count.id,
    performance_vs_peers: partner.rating_average > (similarPartners._avg.rating_average || 0) ? 'above_average' : 
                         partner.rating_average < (similarPartners._avg.rating_average || 0) ? 'below_average' : 'average'
  };
}

async function getReviewQualityMetrics(partnerId: string) {
  const reviews = await prisma.partnerReview.findMany({
    where: { 
      partner_id: partnerId,
      is_verified: true
    },
    select: {
      rating: true,
      review_text: true,
      created_at: true,
      appointment_id: true
    }
  });

  const withText = reviews.filter(r => r.review_text && r.review_text.length > 10);
  const fromAppointments = reviews.filter(r => r.appointment_id);
  const recent = reviews.filter(r => 
    new Date(r.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );

  return {
    total_reviews: reviews.length,
    reviews_with_text: withText.length,
    text_rate: reviews.length > 0 ? Math.round((withText.length / reviews.length) * 100) : 0,
    verified_appointments: fromAppointments.length,
    verification_rate: reviews.length > 0 ? Math.round((fromAppointments.length / reviews.length) * 100) : 0,
    recent_reviews_30_days: recent.length,
    average_text_length: withText.length > 0 ? 
      Math.round(withText.reduce((sum, r) => sum + (r.review_text?.length || 0), 0) / withText.length) : 0
  };
}

function generateActionableRecommendations(analyticsData: any, partnerId?: string): string[] {
  const recommendations = [];

  if (analyticsData.review_insights) {
    const insights = analyticsData.review_insights;
    
    if (insights.average_rating < 4.0) {
      recommendations.push('Focus on improving service quality - current rating is below 4.0 stars');
    }
    
    if (insights.sentiment_analysis?.overall_sentiment === 'negative') {
      recommendations.push('Address common complaints mentioned in negative reviews');
    }
    
    if (insights.total_reviews < 10) {
      recommendations.push('Encourage more clients to leave reviews to build credibility');
    }
  }

  if (analyticsData.quality_metrics) {
    const quality = analyticsData.quality_metrics;
    
    if (quality.text_rate < 50) {
      recommendations.push('Encourage clients to write detailed reviews, not just ratings');
    }
    
    if (quality.recent_reviews_30_days === 0) {
      recommendations.push('Focus on getting recent reviews to show active engagement');
    }
  }

  if (analyticsData.performance_benchmarks) {
    const benchmarks = analyticsData.performance_benchmarks;
    
    if (benchmarks.performance_vs_peers === 'below_average') {
      recommendations.push('Performance is below similar partners - review service delivery');
    } else if (benchmarks.performance_vs_peers === 'above_average') {
      recommendations.push('Excellent performance vs peers - maintain current service standards');
    }
  }

  return recommendations.length > 0 ? recommendations : 
    ['Continue providing excellent service and encourage satisfied clients to leave reviews'];
}