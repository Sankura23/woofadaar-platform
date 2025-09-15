// Week 26 Phase 1: Advanced Health Report Generation API
// Generate comprehensive, exportable health reports for premium users

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { HealthReportGenerator, HealthReportConfig } from '@/lib/health-report-generator';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.id;

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
        upgrade_message: 'Health reports are a premium feature. Upgrade to ₹99/month to access detailed health analytics and reports.',
        trial_available: true
      }, { status: 403 });
    }

    const body = await request.json();
    const {
      dogId,
      reportType = 'monthly',
      periodStart,
      periodEnd,
      includeCharts = true,
      includePredictions = true,
      includeBreedInsights = true,
      format = 'json',
      language = 'en'
    } = body;

    if (!dogId) {
      return NextResponse.json({
        error: 'Dog ID is required for health report generation'
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

    // Set default period if not provided
    const endDate = periodEnd ? new Date(periodEnd) : new Date();
    const startDate = periodStart ? new Date(periodStart) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const reportConfig: HealthReportConfig = {
      reportType: reportType as any,
      periodStart: startDate,
      periodEnd: endDate,
      includeCharts,
      includePredictions,
      includeBreedInsights,
      format: format as any,
      language: language as any
    };

    // Generate comprehensive health report
    const healthReport = await HealthReportGenerator.generateReport(
      dogId,
      userId,
      reportConfig
    );

    // Track premium feature usage
    await trackPremiumFeatureUsage(userId, 'health_report_generation');

    return NextResponse.json({
      success: true,
      report_id: healthReport.metadata.reportId,
      generated_at: healthReport.metadata.generatedAt,
      dog_info: healthReport.metadata.dogInfo,
      report_period: healthReport.metadata.reportPeriod,
      health_report: healthReport,
      premium_feature: true,
      format: format,
      language: language
    });

  } catch (error) {
    console.error('Error generating health report:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate health report',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.id;

    // Verify user has premium access
    const subscription = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: 'active'
      }
    });

    if (!subscription) {
      return NextResponse.json({
        error: 'Premium subscription required'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dogId = searchParams.get('dog_id');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user's health reports
    const whereClause: any = {
      user_id: userId,
      is_premium: true
    };

    if (dogId) {
      whereClause.dog_id = dogId;
    }

    const reports = await prisma.healthAnalyticsReport.findMany({
      where: whereClause,
      orderBy: { generated_at: 'desc' },
      take: limit,
      skip: offset,
      include: {
        dog: {
          select: {
            id: true,
            name: true,
            breed: true,
            age_months: true
          }
        }
      }
    });

    const totalReports = await prisma.healthAnalyticsReport.count({
      where: whereClause
    });

    return NextResponse.json({
      success: true,
      reports: reports.map(report => ({
        id: report.id,
        dog_id: report.dog_id,
        dog_name: report.dog?.name,
        dog_breed: report.dog?.breed,
        report_type: report.report_type,
        overall_health_score: report.overall_health_score,
        generated_at: report.generated_at,
        period_start: report.report_period_start,
        period_end: report.report_period_end,
        summary: {
          trends_count: Array.isArray(report.trends_analysis) ? report.trends_analysis.length : 0,
          predictions_count: Array.isArray(report.predictions) ? report.predictions.length : 0,
          recommendations_count: Array.isArray(report.recommendations) ? report.recommendations.length : 0
        }
      })),
      pagination: {
        total: totalReports,
        limit,
        offset,
        has_more: offset + limit < totalReports
      }
    });

  } catch (error) {
    console.error('Error fetching health reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health reports' },
      { status: 500 }
    );
  }
}

async function trackPremiumFeatureUsage(userId: string, featureName: string) {
  try {
    await prisma.featureUsageLog.create({
      data: {
        user_id: userId,
        feature_id: featureName,
        usage_count: 1,
        metadata: {
          endpoint: '/api/premium/health-reports',
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error tracking premium feature usage:', error);
  }
}