import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, verifyToken, isPetParent } from '@/lib/auth';

// GET /api/health/analytics/[dogId] - Get health analytics and charts data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dogId } = await params;
    
    // Verify authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !isPetParent(payload)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid authentication'
      }, { status: 401 });
    }

    // Verify dog ownership
    const dog = await prisma.dog.findFirst({
      where: {
        id: dogId,
        user_id: payload.userId
      }
    });

    if (!dog) {
      return NextResponse.json({
        success: false,
        message: 'Dog not found or access denied'
      }, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const chartType = searchParams.get('chart_type'); // 'weight', 'exercise', 'mood', 'all'

    try {
      const periodDays = parseInt(period);
      const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

      // Get health logs for the specified period
      const healthLogs = await prisma.healthLog.findMany({
        where: {
          dog_id: dogId,
          user_id: payload.userId,
          log_date: {
            gte: startDate
          }
        },
        orderBy: {
          log_date: 'asc'
        }
      });

      // Get health insights
      const insights = await prisma.healthInsight.findMany({
        where: {
          dog_id: dogId,
          created_at: {
            gte: startDate
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        take: 10
      });

      // Build analytics data
      const analytics = {
        period_days: periodDays,
        total_logs: healthLogs.length,
        date_range: {
          start: startDate.toISOString(),
          end: new Date().toISOString()
        },
        charts: generateChartData(healthLogs, chartType),
        summary: generateSummaryStats(healthLogs),
        insights: insights.map(insight => ({
          ...insight,
          data_points: undefined // Remove data_points from response for cleaner output
        })),
        recommendations: generateRecommendations(healthLogs, insights)
      };

      return NextResponse.json({
        success: true,
        data: analytics
      });

    } catch (dbError) {
      console.error('Database error in health analytics:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Failed to generate health analytics'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Health analytics error:', error);
    return NextResponse.json({
      success: false,
      message: 'Invalid request format'
    }, { status: 400 });
  }
}

// Generate chart data for visualization
function generateChartData(healthLogs: any[], chartType?: string | null) {
  const charts: any = {};

  // Weight chart
  if (!chartType || chartType === 'weight' || chartType === 'all') {
    const weightData = healthLogs
      .filter(log => log.weight_kg !== null)
      .map(log => ({
        date: log.log_date.toISOString().split('T')[0],
        value: log.weight_kg,
        label: `${log.weight_kg} kg`
      }));

    charts.weight = {
      type: 'line',
      title: 'Weight Trend',
      data: weightData,
      unit: 'kg',
      color: '#3B82F6'
    };
  }

  // Exercise chart
  if (!chartType || chartType === 'exercise' || chartType === 'all') {
    const exerciseData = healthLogs
      .filter(log => log.exercise_duration !== null)
      .map(log => ({
        date: log.log_date.toISOString().split('T')[0],
        value: log.exercise_duration,
        label: `${log.exercise_duration} min`,
        type: log.exercise_type || 'General'
      }));

    charts.exercise = {
      type: 'bar',
      title: 'Daily Exercise',
      data: exerciseData,
      unit: 'minutes',
      color: '#10B981'
    };
  }

  // Mood chart
  if (!chartType || chartType === 'mood' || chartType === 'all') {
    const moodData = healthLogs
      .filter(log => log.mood_score !== null)
      .map(log => ({
        date: log.log_date.toISOString().split('T')[0],
        value: log.mood_score,
        label: getMoodLabel(log.mood_score)
      }));

    charts.mood = {
      type: 'line',
      title: 'Mood Tracking',
      data: moodData,
      unit: 'score (1-5)',
      color: '#F59E0B'
    };
  }

  // Water intake chart
  if (!chartType || chartType === 'water' || chartType === 'all') {
    const waterData = healthLogs
      .filter(log => log.water_intake !== null)
      .map(log => ({
        date: log.log_date.toISOString().split('T')[0],
        value: log.water_intake,
        label: `${log.water_intake} ml`
      }));

    charts.water = {
      type: 'bar',
      title: 'Water Intake',
      data: waterData,
      unit: 'ml',
      color: '#06B6D4'
    };
  }

  // Food amount chart
  if (!chartType || chartType === 'food' || chartType === 'all') {
    const foodData = healthLogs
      .filter(log => log.food_amount !== null)
      .map(log => ({
        date: log.log_date.toISOString().split('T')[0],
        value: log.food_amount,
        label: `${log.food_amount}g`,
        type: log.food_type || 'Regular'
      }));

    charts.food = {
      type: 'bar',
      title: 'Food Intake',
      data: foodData,
      unit: 'grams',
      color: '#8B5CF6'
    };
  }

  return charts;
}

// Generate summary statistics
function generateSummaryStats(healthLogs: any[]) {
  const summary: any = {
    total_entries: healthLogs.length,
    date_range: {
      first_entry: healthLogs.length > 0 ? healthLogs[0].log_date : null,
      last_entry: healthLogs.length > 0 ? healthLogs[healthLogs.length - 1].log_date : null
    }
  };

  // Weight stats
  const weightLogs = healthLogs.filter(log => log.weight_kg !== null);
  if (weightLogs.length > 0) {
    const weights = weightLogs.map(log => log.weight_kg);
    summary.weight = {
      current: weights[weights.length - 1],
      average: weights.reduce((a, b) => a + b, 0) / weights.length,
      min: Math.min(...weights),
      max: Math.max(...weights),
      trend: weights.length > 1 ? 
        weights[weights.length - 1] - weights[0] : 0,
      entries: weights.length
    };
  }

  // Exercise stats
  const exerciseLogs = healthLogs.filter(log => log.exercise_duration !== null);
  if (exerciseLogs.length > 0) {
    const exercises = exerciseLogs.map(log => log.exercise_duration);
    summary.exercise = {
      total_minutes: exercises.reduce((a, b) => a + b, 0),
      average_daily: exercises.reduce((a, b) => a + b, 0) / exercises.length,
      max_session: Math.max(...exercises),
      most_common_type: getMostCommonValue(exerciseLogs.map(log => log.exercise_type).filter(Boolean)),
      entries: exercises.length
    };
  }

  // Mood stats
  const moodLogs = healthLogs.filter(log => log.mood_score !== null);
  if (moodLogs.length > 0) {
    const moods = moodLogs.map(log => log.mood_score);
    summary.mood = {
      average: moods.reduce((a, b) => a + b, 0) / moods.length,
      current: moods[moods.length - 1],
      best: Math.max(...moods),
      distribution: {
        excellent: moods.filter(m => m === 5).length,
        good: moods.filter(m => m === 4).length,
        okay: moods.filter(m => m === 3).length,
        poor: moods.filter(m => m === 2).length,
        bad: moods.filter(m => m === 1).length
      },
      entries: moods.length
    };
  }

  return summary;
}

// Generate personalized recommendations
function generateRecommendations(healthLogs: any[], insights: any[]) {
  const recommendations = [];

  // Check recent critical insights
  const criticalInsights = insights.filter(insight => insight.severity === 'critical' || insight.severity === 'warning');
  if (criticalInsights.length > 0) {
    recommendations.push({
      type: 'urgent',
      title: 'Health Concerns Detected',
      description: 'We\'ve detected some patterns that may need attention.',
      action: 'Review your health insights and consider consulting your vet.',
      priority: 'high'
    });
  }

  // Check logging consistency
  const recentLogs = healthLogs.filter(log => {
    const logDate = new Date(log.log_date);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return logDate >= sevenDaysAgo;
  });

  if (recentLogs.length < 3) {
    recommendations.push({
      type: 'engagement',
      title: 'Improve Health Tracking',
      description: 'Regular logging helps us provide better insights.',
      action: 'Try to log your dog\'s health daily for better trend analysis.',
      priority: 'medium'
    });
  }

  // Exercise recommendations
  const exerciseLogs = healthLogs.filter(log => log.exercise_duration !== null);
  if (exerciseLogs.length > 0) {
    const avgExercise = exerciseLogs.reduce((sum, log) => sum + log.exercise_duration, 0) / exerciseLogs.length;
    if (avgExercise < 30) {
      recommendations.push({
        type: 'exercise',
        title: 'Increase Daily Activity',
        description: 'Your dog may benefit from more daily exercise.',
        action: 'Aim for at least 60 minutes of activity per day.',
        priority: 'medium'
      });
    }
  }

  return recommendations;
}

// Helper functions
function getMoodLabel(score: number): string {
  const labels = ['', 'Very Low', 'Low', 'Okay', 'Good', 'Excellent'];
  return labels[score] || 'Unknown';
}

function getMostCommonValue(arr: string[]): string | null {
  if (arr.length === 0) return null;
  
  const frequency: { [key: string]: number } = {};
  arr.forEach(item => {
    frequency[item] = (frequency[item] || 0) + 1;
  });
  
  return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
}