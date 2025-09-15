import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { moderationAnalytics, AnalyticsTimeframe } from '@/lib/moderation-analytics';

// GET /api/moderation/analytics - Get analytics data
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin/moderator
    const isAuthorized = user.role === 'admin' || user.role === 'moderator';
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Admin/Moderator access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const period = searchParams.get('period') || 'week';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Determine timeframe
    let timeframe: AnalyticsTimeframe;
    
    if (startDate && endDate) {
      timeframe = {
        period: period as any,
        start: new Date(startDate),
        end: new Date(endDate)
      };
    } else {
      // Default timeframes
      const now = new Date();
      switch (period) {
        case 'hour':
          timeframe = {
            period: 'hour',
            start: new Date(now.getTime() - 60 * 60 * 1000),
            end: now
          };
          break;
        case 'day':
          timeframe = {
            period: 'day',
            start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            end: now
          };
          break;
        case 'month':
          timeframe = {
            period: 'month',
            start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            end: now
          };
          break;
        case 'week':
        default:
          timeframe = {
            period: 'week',
            start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            end: now
          };
          break;
      }
    }

    if (action === 'comprehensive') {
      // Get comprehensive analytics report (mock data for demo)
      const report = {
        overview: {
          totalActions: 2847,
          accuracyRate: 0.94,
          responseTime: 245,
          falsePositiveRate: 0.042,
          falseNegativeRate: 0.018,
          communityAgreementRate: 0.87,
          automationRate: 0.91,
          contentVolumeProcessed: 12456
        },
        trends: [
          {
            metric: 'False Positive Rate',
            currentValue: 0.15,
            predictedValue: 0.12,
            trend: 'decreasing' as const,
            confidence: 0.78,
            timeframe: 'next 7 days',
            factors: ['Community feedback integration', 'Rule threshold adjustments', 'Improved training data']
          },
          {
            metric: 'Content Volume',
            currentValue: 1250,
            predictedValue: 1380,
            trend: 'increasing' as const,
            confidence: 0.85,
            timeframe: 'next 7 days',
            factors: ['Weekend activity spike', 'Seasonal growth pattern', 'Recent feature launches']
          }
        ],
        contentInsights: [
          {
            contentType: 'question',
            pattern: 'promotional_keywords_spike',
            frequency: 45,
            impact: 'negative' as const,
            recommendation: 'Update spam detection keywords for promotional content',
            examples: ['Special offer keywords', 'Discount promotions', 'External links to commercial sites']
          }
        ],
        userPatterns: [
          {
            pattern: 'new_user_violation_spike',
            userCount: 23,
            riskLevel: 'high' as const,
            description: 'New users with multiple violations within first week',
            indicators: ['Multiple spam reports', 'Low engagement quality', 'Rapid posting frequency'],
            suggestedActions: ['Implement progressive onboarding', 'Increase new user content review', 'Add educational prompts']
          }
        ],
        optimizations: [
          {
            area: 'Automated Decision Accuracy',
            currentEfficiency: 78,
            potentialImprovement: 15,
            implementationCost: 'medium' as const,
            priority: 9,
            description: 'Improve AI model accuracy through better training data and feature engineering',
            steps: ['Integrate community feedback', 'Add cultural context features', 'Implement ensemble model', 'Regular retraining']
          }
        ],
        predictiveAlerts: [
          {
            id: 'alert_001',
            type: 'volume_spike',
            severity: 'medium' as const,
            prediction: 'Content volume expected to increase by 40% in next 3 days',
            probability: 0.76,
            timeframe: 'next 72 hours',
            impact: 'Potential queue backlog and increased response times',
            recommendedActions: ['Prepare additional moderator coverage', 'Increase automation thresholds'],
            createdAt: new Date()
          }
        ],
        recommendations: [
          '🎯 Focus on improving model accuracy - current rate is below optimal',
          '👥 Low community agreement - review recent decisions and gather more feedback',
          '📈 Negative trends detected - implement preventive measures before issues escalate'
        ]
      };
      
      return NextResponse.json({
        success: true,
        data: {
          timeframe: {
            period: timeframe.period,
            start: timeframe.start.toISOString(),
            end: timeframe.end.toISOString()
          },
          report
        }
      });

    } else if (action === 'overview') {
      // Get overview metrics only
      const report = await moderationAnalytics.generateComprehensiveReport(timeframe);
      
      return NextResponse.json({
        success: true,
        data: {
          overview: report.overview,
          topRecommendations: report.recommendations.slice(0, 3),
          criticalAlerts: report.predictiveAlerts.filter(alert => alert.severity === 'critical' || alert.severity === 'high')
        }
      });

    } else if (action === 'trends') {
      // Get trend analysis
      const report = await moderationAnalytics.generateComprehensiveReport(timeframe);
      
      return NextResponse.json({
        success: true,
        data: {
          trends: report.trends,
          predictions: report.predictiveAlerts
        }
      });

    } else if (action === 'patterns') {
      // Get content and user patterns
      const report = await moderationAnalytics.generateComprehensiveReport(timeframe);
      
      return NextResponse.json({
        success: true,
        data: {
          contentInsights: report.contentInsights,
          userPatterns: report.userPatterns
        }
      });

    } else if (action === 'optimizations') {
      // Get optimization recommendations
      const report = await moderationAnalytics.generateComprehensiveReport(timeframe);
      
      // Sort optimizations by priority
      const sortedOptimizations = report.optimizations.sort((a, b) => b.priority - a.priority);
      
      return NextResponse.json({
        success: true,
        data: {
          optimizations: sortedOptimizations,
          quickWins: sortedOptimizations.filter(opt => opt.implementationCost === 'low' && opt.priority >= 7),
          highImpact: sortedOptimizations.filter(opt => opt.potentialImprovement >= 20)
        }
      });

    } else if (action === 'metric_history') {
      // Get historical data for a specific metric
      const metric = searchParams.get('metric');
      const granularity = searchParams.get('granularity') as 'hour' | 'day' || 'day';
      
      if (!metric) {
        return NextResponse.json(
          { success: false, error: 'Metric parameter required' },
          { status: 400 }
        );
      }

      const history = await moderationAnalytics.getMetricHistory(metric, timeframe, granularity);
      
      return NextResponse.json({
        success: true,
        data: {
          metric,
          timeframe,
          granularity,
          history
        }
      });

    } else if (action === 'export') {
      // Export analytics report
      const format = searchParams.get('format') as 'json' | 'csv' | 'pdf' || 'json';
      
      const exportData = await moderationAnalytics.exportAnalyticsReport(timeframe, format);
      
      // Set appropriate headers based on format
      const headers: Record<string, string> = {
        'Content-Type': format === 'json' ? 'application/json' : 
                      format === 'csv' ? 'text/csv' : 
                      'application/pdf'
      };

      if (format !== 'json') {
        headers['Content-Disposition'] = `attachment; filename="moderation_analytics_${timeframe.period}.${format}"`;
      }

      return new NextResponse(exportData, { headers });

    } else if (action === 'real_time') {
      // Get real-time metrics (last hour)
      const realTimeframe: AnalyticsTimeframe = {
        period: 'hour',
        start: new Date(Date.now() - 60 * 60 * 1000),
        end: new Date()
      };

      const report = await moderationAnalytics.generateComprehensiveReport(realTimeframe);
      
      return NextResponse.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          metrics: {
            activeAlerts: report.predictiveAlerts.filter(alert => 
              alert.severity === 'high' || alert.severity === 'critical'
            ).length,
            contentProcessed: report.overview.contentVolumeProcessed,
            averageResponseTime: report.overview.responseTime,
            automationRate: Math.round(report.overview.automationRate * 100),
            queueBacklog: 0, // Would be calculated from actual queue data
            systemHealth: report.overview.accuracyRate > 0.8 ? 'healthy' : 
                         report.overview.accuracyRate > 0.6 ? 'warning' : 'critical'
          },
          alerts: report.predictiveAlerts.filter(alert => 
            alert.severity === 'high' || alert.severity === 'critical'
          )
        }
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action parameter' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error handling analytics request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

// POST /api/moderation/analytics - Create custom reports or alerts
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'create_alert_rule') {
      // Create custom alert rule
      const { name, description, conditions, actions, isActive } = body;

      if (!name || !description || !conditions || !actions) {
        return NextResponse.json(
          { success: false, error: 'Name, description, conditions, and actions are required' },
          { status: 400 }
        );
      }

      // In a real implementation, this would save to database
      const alertRuleId = `alert_rule_${Date.now()}`;

      return NextResponse.json({
        success: true,
        data: { alertRuleId },
        message: `Alert rule "${name}" created successfully`
      });

    } else if (action === 'schedule_report') {
      // Schedule recurring analytics report
      const { reportName, frequency, recipients, reportType } = body;

      if (!reportName || !frequency || !recipients || !reportType) {
        return NextResponse.json(
          { success: false, error: 'Report name, frequency, recipients, and type are required' },
          { status: 400 }
        );
      }

      // In a real implementation, this would set up scheduled reporting
      const scheduleId = `schedule_${Date.now()}`;

      return NextResponse.json({
        success: true,
        data: { scheduleId },
        message: `Report schedule "${reportName}" created successfully`
      });

    } else if (action === 'generate_custom_report') {
      // Generate custom report with specific parameters
      const { metrics, timeframe, filters, groupBy } = body;

      if (!metrics || !timeframe) {
        return NextResponse.json(
          { success: false, error: 'Metrics and timeframe are required' },
          { status: 400 }
        );
      }

      // Generate custom report based on parameters
      const customTimeframe: AnalyticsTimeframe = {
        period: timeframe.period,
        start: new Date(timeframe.start),
        end: new Date(timeframe.end)
      };

      const report = await moderationAnalytics.generateComprehensiveReport(customTimeframe);

      // Filter report based on requested metrics
      const customReport: any = {};
      
      if (metrics.includes('overview')) customReport.overview = report.overview;
      if (metrics.includes('trends')) customReport.trends = report.trends;
      if (metrics.includes('insights')) customReport.contentInsights = report.contentInsights;
      if (metrics.includes('patterns')) customReport.userPatterns = report.userPatterns;
      if (metrics.includes('optimizations')) customReport.optimizations = report.optimizations;
      if (metrics.includes('alerts')) customReport.predictiveAlerts = report.predictiveAlerts;

      return NextResponse.json({
        success: true,
        data: {
          customReport,
          generatedAt: new Date().toISOString(),
          parameters: { metrics, timeframe, filters, groupBy }
        }
      });

    } else if (action === 'benchmark_comparison') {
      // Compare current metrics against historical benchmarks
      const { comparisonPeriods, metrics } = body;

      if (!comparisonPeriods || !Array.isArray(comparisonPeriods)) {
        return NextResponse.json(
          { success: false, error: 'Comparison periods array is required' },
          { status: 400 }
        );
      }

      const comparisons = [];
      
      for (const period of comparisonPeriods) {
        const timeframe: AnalyticsTimeframe = {
          period: period.period,
          start: new Date(period.start),
          end: new Date(period.end)
        };
        
        const report = await moderationAnalytics.generateComprehensiveReport(timeframe);
        comparisons.push({
          period: period.name || `${period.start} to ${period.end}`,
          metrics: report.overview
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          comparisons,
          insights: this.generateComparisonInsights(comparisons)
        }
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error handling analytics POST request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process analytics request' },
      { status: 500 }
    );
  }
}

// PUT /api/moderation/analytics - Update alert rules or report schedules
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, id, updates } = body;

    if (action === 'update_alert_rule') {
      // Update existing alert rule
      if (!id || !updates) {
        return NextResponse.json(
          { success: false, error: 'Alert rule ID and updates are required' },
          { status: 400 }
        );
      }

      // In a real implementation, this would update the database
      return NextResponse.json({
        success: true,
        message: 'Alert rule updated successfully'
      });

    } else if (action === 'update_report_schedule') {
      // Update report schedule
      if (!id || !updates) {
        return NextResponse.json(
          { success: false, error: 'Schedule ID and updates are required' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Report schedule updated successfully'
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error handling analytics PUT request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update analytics configuration' },
      { status: 500 }
    );
  }
}

// Helper function to generate comparison insights
function generateComparisonInsights(comparisons: any[]): string[] {
  const insights: string[] = [];
  
  if (comparisons.length >= 2) {
    const latest = comparisons[0];
    const previous = comparisons[1];
    
    // Accuracy comparison
    const accuracyChange = latest.metrics.accuracyRate - previous.metrics.accuracyRate;
    if (Math.abs(accuracyChange) > 0.05) {
      insights.push(`Accuracy ${accuracyChange > 0 ? 'improved' : 'declined'} by ${Math.abs(accuracyChange * 100).toFixed(1)}%`);
    }
    
    // Response time comparison
    const responseTimeChange = latest.metrics.responseTime - previous.metrics.responseTime;
    if (Math.abs(responseTimeChange) > 50) {
      insights.push(`Response time ${responseTimeChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(responseTimeChange).toFixed(0)}ms`);
    }
    
    // Volume comparison
    const volumeChange = latest.metrics.contentVolumeProcessed - previous.metrics.contentVolumeProcessed;
    if (Math.abs(volumeChange) > previous.metrics.contentVolumeProcessed * 0.1) {
      const percentChange = (volumeChange / previous.metrics.contentVolumeProcessed) * 100;
      insights.push(`Content volume ${volumeChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(percentChange).toFixed(1)}%`);
    }
  }
  
  return insights;
}