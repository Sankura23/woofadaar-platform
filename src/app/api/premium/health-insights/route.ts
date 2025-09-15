import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { HealthAnalyticsService } from '@/lib/health-analytics-service';
import { HealthReportGenerator, HealthReportConfig } from '@/lib/health-report-generator';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.id;

    const { searchParams } = new URL(request.url);
    const dogId = searchParams.get('dog_id');
    const analysisType = searchParams.get('type') || 'health_overview';
    const period = searchParams.get('period') || '30'; // days

    // Verify user has premium access
    const subscription = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: 'active'
      }
    });

    if (!subscription) {
      return NextResponse.json({
        error: 'Premium subscription required',
        upgrade_message: 'Unlock advanced health analytics with premium subscription for ₹99/month',
        trial_available: true
      }, { status: 403 });
    }

    if (!dogId) {
      return NextResponse.json({
        error: 'Dog ID is required for advanced health analytics'
      }, { status: 400 });
    }

    // Verify dog ownership
    const dog = await prisma.dog.findFirst({
      where: {
        id: dogId,
        user_id: userId
      }
    });

    if (!dog) {
      return NextResponse.json({
        error: 'Dog not found or access denied'
      }, { status: 404 });
    }

    // Generate advanced analytics based on type
    let analytics;
    const periodDays = parseInt(period);

    try {
      switch (analysisType) {
        case 'health_overview':
        case 'comprehensive':
          analytics = await HealthAnalyticsService.generateHealthAnalytics(
            dogId, 
            userId, 
            periodDays
          );
          break;
        
        case 'health_report':
          const reportConfig: HealthReportConfig = {
            reportType: 'custom',
            periodStart: new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000),
            periodEnd: new Date(),
            includeCharts: true,
            includePredictions: true,
            includeBreedInsights: true,
            format: 'json',
            language: 'en'
          };
          analytics = await HealthReportGenerator.generateReport(dogId, userId, reportConfig);
          break;
        
        case 'predictive_insights':
          const predictiveAnalytics = await HealthAnalyticsService.generateHealthAnalytics(
            dogId, 
            userId, 
            periodDays
          );
          analytics = {
            predictions: predictiveAnalytics.predictions,
            breed_insights: predictiveAnalytics.breed_insights,
            confidence_score: 0.85,
            ai_powered: true
          };
          break;
        
        case 'health_trends':
          const trendAnalytics = await HealthAnalyticsService.generateHealthAnalytics(
            dogId, 
            userId, 
            periodDays
          );
          analytics = {
            trends: trendAnalytics.trends,
            overall_health_score: trendAnalytics.overall_health_score,
            period_analyzed: `${periodDays} days`,
            confidence_score: 0.82,
            ai_powered: true
          };
          break;
        
        default:
          analytics = await HealthAnalyticsService.generateHealthAnalytics(
            dogId, 
            userId, 
            periodDays
          );
      }

      // Track premium feature usage
      await trackPremiumFeatureUsage(userId, 'advanced_health_analytics');

      return NextResponse.json({
        success: true,
        analytics_type: analysisType,
        period_days: periodDays,
        generated_at: new Date().toISOString(),
        dog_id: dogId,
        subscription_active: true,
        feature_usage_tracked: true,
        ...analytics
      });

    } catch (analyticsError) {
      console.error('Analytics generation error:', analyticsError);
      return NextResponse.json({
        error: 'Failed to generate health analytics',
        message: analyticsError instanceof Error ? analyticsError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error generating premium health insights:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Track premium feature usage
async function trackPremiumFeatureUsage(userId: string, featureName: string) {
  try {
    await prisma.featureUsageLog.create({
      data: {
        user_id: userId,
        feature_id: featureName,
        usage_count: 1,
        metadata: {
          endpoint: '/api/premium/health-insights',
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error tracking premium feature usage:', error);
    // Don't throw - this shouldn't block the main functionality
  }
}