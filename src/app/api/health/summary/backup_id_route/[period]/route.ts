import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, verifyToken, isPetParent } from '@/lib/auth';

// GET /api/health/summary/[dogId]/[period] - Get health summary for specific period
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; period: string }> }
) {
  try {
    const { id: dogId, period } = await params;
    
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

    // Validate period
    const validPeriods = ['week', 'month', 'quarter', 'year', 'all'];
    if (!validPeriods.includes(period)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid period. Use: week, month, quarter, year, or all'
      }, { status: 400 });
    }

    try {
      // Calculate date range
      const dateRange = getDateRange(period);
      
      // Get health summary data
      const summary = await generateHealthSummary(dogId, payload.userId, dateRange, period);

      return NextResponse.json({
        success: true,
        data: {
          dog_info: {
            id: dog.id,
            name: dog.name,
            breed: dog.breed,
            age_months: dog.age_months,
            photo_url: dog.photo_url
          },
          period,
          date_range: dateRange,
          summary
        }
      });

    } catch (dbError) {
      console.error('Database error in health summary:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Failed to generate health summary'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Health summary error:', error);
    return NextResponse.json({
      success: false,
      message: 'Invalid request format'
    }, { status: 400 });
  }
}

// Helper function to get date range based on period
function getDateRange(period: string) {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'quarter':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
      startDate = new Date('2020-01-01'); // Far back date
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return {
    start: startDate,
    end: now,
    period_name: period,
    days: Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
  };
}

// Helper function to generate comprehensive health summary
async function generateHealthSummary(dogId: string, userId: string, dateRange: any, period: string) {
  const whereClause = {
    dog_id: dogId,
    user_id: userId
  };

  const dateFilter = period !== 'all' ? {
    gte: dateRange.start,
    lte: dateRange.end
  } : undefined;

  // Get health logs
  const healthLogs = await prisma.healthLog.findMany({
    where: {
      ...whereClause,
      log_date: dateFilter
    },
    orderBy: {
      log_date: 'desc'
    }
  });

  // Get medical records
  const medicalRecords = await prisma.medicalRecord.findMany({
    where: {
      ...whereClause,
      record_date: dateFilter
    },
    orderBy: {
      record_date: 'desc'
    }
  });

  // Get health insights
  const healthInsights = await prisma.healthInsight.findMany({
    where: {
      dog_id: dogId,
      created_at: dateFilter
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  // Calculate comprehensive statistics
  const stats = {
    overview: {
      total_health_logs: healthLogs.length,
      total_medical_records: medicalRecords.length,
      total_insights: healthInsights.length,
      logging_frequency: healthLogs.length / Math.max(dateRange.days, 1),
      last_log_date: healthLogs.length > 0 ? healthLogs[0].log_date : null
    },

    health_metrics: calculateHealthMetrics(healthLogs),
    medical_summary: calculateMedicalSummary(medicalRecords),
    insights_summary: calculateInsightsSummary(healthInsights),
    trends: calculateTrends(healthLogs),
    achievements: calculateAchievements(healthLogs, dateRange),
    recommendations: generateRecommendations(healthLogs, medicalRecords, healthInsights)
  };

  return stats;
}

function calculateHealthMetrics(healthLogs: any[]) {
  const metrics: any = {
    weight: { entries: 0, trend: null, latest: null, average: null },
    exercise: { entries: 0, total_minutes: 0, average_daily: 0, most_common_type: null },
    mood: { entries: 0, average: 0, distribution: {}, trend: null },
    food: { entries: 0, average_amount: 0, most_common_type: null },
    water: { entries: 0, average_daily: 0 },
    symptoms: { total_reported: 0, most_common: null }
  };

  // Weight analysis
  const weightLogs = healthLogs.filter(log => log.weight_kg !== null);
  if (weightLogs.length > 0) {
    const weights = weightLogs.map(log => log.weight_kg);
    metrics.weight = {
      entries: weights.length,
      latest: weights[0],
      average: weights.reduce((a, b) => a + b, 0) / weights.length,
      trend: weights.length > 1 ? weights[0] - weights[weights.length - 1] : 0,
      min: Math.min(...weights),
      max: Math.max(...weights)
    };
  }

  // Exercise analysis
  const exerciseLogs = healthLogs.filter(log => log.exercise_duration !== null);
  if (exerciseLogs.length > 0) {
    const totalMinutes = exerciseLogs.reduce((sum, log) => sum + log.exercise_duration, 0);
    const exerciseTypes = exerciseLogs.map(log => log.exercise_type).filter(Boolean);
    
    metrics.exercise = {
      entries: exerciseLogs.length,
      total_minutes: totalMinutes,
      average_daily: totalMinutes / exerciseLogs.length,
      most_common_type: getMostCommon(exerciseTypes),
      consistency: (exerciseLogs.length / healthLogs.length) * 100
    };
  }

  // Mood analysis
  const moodLogs = healthLogs.filter(log => log.mood_score !== null);
  if (moodLogs.length > 0) {
    const moods = moodLogs.map(log => log.mood_score);
    const moodDistribution = {
      excellent: moods.filter(m => m === 5).length,
      good: moods.filter(m => m === 4).length,
      okay: moods.filter(m => m === 3).length,
      poor: moods.filter(m => m === 2).length,
      bad: moods.filter(m => m === 1).length
    };

    metrics.mood = {
      entries: moods.length,
      average: moods.reduce((a, b) => a + b, 0) / moods.length,
      distribution: moodDistribution,
      trend: moods.length > 1 ? moods[0] - moods[moods.length - 1] : 0,
      stability: calculateStability(moods)
    };
  }

  // Food analysis
  const foodLogs = healthLogs.filter(log => log.food_amount !== null);
  if (foodLogs.length > 0) {
    const amounts = foodLogs.map(log => log.food_amount);
    const foodTypes = foodLogs.map(log => log.food_type).filter(Boolean);

    metrics.food = {
      entries: foodLogs.length,
      average_amount: amounts.reduce((a, b) => a + b, 0) / amounts.length,
      most_common_type: getMostCommon(foodTypes),
      consistency: (foodLogs.length / healthLogs.length) * 100
    };
  }

  // Water analysis
  const waterLogs = healthLogs.filter(log => log.water_intake !== null);
  if (waterLogs.length > 0) {
    const intakes = waterLogs.map(log => log.water_intake);
    metrics.water = {
      entries: waterLogs.length,
      average_daily: intakes.reduce((a, b) => a + b, 0) / intakes.length,
      total: intakes.reduce((a, b) => a + b, 0)
    };
  }

  // Symptoms analysis
  const symptomLogs = healthLogs.filter(log => log.symptoms && log.symptoms.length > 0);
  if (symptomLogs.length > 0) {
    const allSymptoms = symptomLogs.flatMap(log => log.symptoms);
    metrics.symptoms = {
      total_reported: allSymptoms.length,
      unique_symptoms: [...new Set(allSymptoms)].length,
      most_common: getMostCommon(allSymptoms),
      frequency: symptomLogs.length / healthLogs.length * 100
    };
  }

  return metrics;
}

function calculateMedicalSummary(medicalRecords: any[]) {
  const summary: any = {
    total_records: medicalRecords.length,
    by_type: {},
    recent_visits: [],
    upcoming_due_dates: [],
    total_cost: 0,
    most_frequent_vet: null
  };

  // Group by record type
  const recordsByType = medicalRecords.reduce((acc, record) => {
    acc[record.record_type] = (acc[record.record_type] || 0) + 1;
    return acc;
  }, {});

  summary.by_type = recordsByType;

  // Recent visits (vet visits and checkups)
  summary.recent_visits = medicalRecords
    .filter(record => ['vet_visit', 'checkup', 'emergency'].includes(record.record_type))
    .slice(0, 5)
    .map(record => ({
      date: record.record_date,
      type: record.record_type,
      title: record.title,
      vet_name: record.vet_name
    }));

  // Calculate total cost
  summary.total_cost = medicalRecords
    .filter(record => record.cost)
    .reduce((sum, record) => sum + record.cost, 0);

  // Most frequent vet
  const vets = medicalRecords.map(record => record.vet_name).filter(Boolean);
  summary.most_frequent_vet = getMostCommon(vets);

  return summary;
}

function calculateInsightsSummary(insights: any[]) {
  return {
    total_insights: insights.length,
    by_severity: insights.reduce((acc, insight) => {
      acc[insight.severity] = (acc[insight.severity] || 0) + 1;
      return acc;
    }, {}),
    by_category: insights.reduce((acc, insight) => {
      acc[insight.category] = (acc[insight.category] || 0) + 1;
      return acc;
    }, {}),
    unread_count: insights.filter(insight => !insight.is_read).length,
    critical_count: insights.filter(insight => insight.severity === 'critical').length
  };
}

function calculateTrends(healthLogs: any[]) {
  const trends: any = {};

  // Weight trend
  const weightLogs = healthLogs.filter(log => log.weight_kg !== null).slice(0, 10);
  if (weightLogs.length >= 3) {
    const weights = weightLogs.map(log => log.weight_kg);
    trends.weight = calculateTrendDirection(weights);
  }

  // Exercise trend
  const exerciseLogs = healthLogs.filter(log => log.exercise_duration !== null).slice(0, 10);
  if (exerciseLogs.length >= 3) {
    const exercises = exerciseLogs.map(log => log.exercise_duration);
    trends.exercise = calculateTrendDirection(exercises);
  }

  // Mood trend
  const moodLogs = healthLogs.filter(log => log.mood_score !== null).slice(0, 10);
  if (moodLogs.length >= 3) {
    const moods = moodLogs.map(log => log.mood_score);
    trends.mood = calculateTrendDirection(moods);
  }

  return trends;
}

function calculateAchievements(healthLogs: any[], dateRange: any) {
  const achievements = [] as any[];

  // Logging streak
  const streak = calculateLoggingStreak(healthLogs);
  if (streak >= 7) {
    achievements.push({
      type: 'consistency',
      title: 'Consistent Logger',
      description: `${streak} day logging streak!`,
      icon: '🎯'
    });
  }

  // Exercise goals
  const exerciseLogs = healthLogs.filter(log => log.exercise_duration !== null);
  if (exerciseLogs.length > 0) {
    const avgExercise = exerciseLogs.reduce((sum, log) => sum + log.exercise_duration, 0) / exerciseLogs.length;
    if (avgExercise >= 60) {
      achievements.push({
        type: 'exercise',
        title: 'Active Dog Parent',
        description: 'Maintaining excellent exercise routine!',
        icon: '🏃‍♂️'
      });
    }
  }

  // Mood tracking
  const moodLogs = healthLogs.filter(log => log.mood_score !== null);
  if (moodLogs.length > 0) {
    const goodMoodDays = moodLogs.filter(log => log.mood_score >= 4).length;
    const moodPercentage = (goodMoodDays / moodLogs.length) * 100;
    if (moodPercentage >= 80) {
      achievements.push({
        type: 'mood',
        title: 'Happy Pup',
        description: 'Your dog is happy most of the time!',
        icon: '😊'
      });
    }
  }

  return achievements;
}

function generateRecommendations(healthLogs: any[], medicalRecords: any[], insights: any[]) {
  const recommendations = [] as any[];

  // Check for critical insights
  const criticalInsights = insights.filter(insight => insight.severity === 'critical');
  if (criticalInsights.length > 0) {
    recommendations.push({
      priority: 'high',
      title: 'Address Critical Health Concerns',
      description: 'You have critical health insights that need attention.',
      action: 'Review insights and consult your veterinarian.'
    });
  }

  // Check logging consistency
  if (healthLogs.length > 0) {
    const streak = calculateLoggingStreak(healthLogs);
    if (streak < 3) {
      recommendations.push({
        priority: 'medium',
        title: 'Improve Health Tracking',
        description: 'Regular logging helps identify patterns and health issues early.',
        action: 'Try to log daily health observations.'
      });
    }
  }

  // Check overdue medical records
  const overdueRecords = medicalRecords.filter(record => 
    record.next_due_date && new Date(record.next_due_date) < new Date()
  );
  if (overdueRecords.length > 0) {
    recommendations.push({
      priority: 'high',
      title: 'Overdue Medical Appointments',
      description: `You have ${overdueRecords.length} overdue medical items.`,
      action: 'Schedule appointments for overdue items.'
    });
  }

  return recommendations;
}

// Helper functions
function getMostCommon(arr: any[]): any {
  if (arr.length === 0) return null;
  const frequency: { [key: string]: number } = {};
  arr.forEach(item => {
    frequency[item] = (frequency[item] || 0) + 1;
  });
  return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
}

function calculateStability(values: number[]): number {
  if (values.length < 2) return 100;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.max(0, 100 - (variance * 25)); // Convert to 0-100 scale
}

function calculateTrendDirection(values: number[]): string {
  if (values.length < 3) return 'stable';
  
  const recent = values.slice(0, Math.floor(values.length / 2));
  const older = values.slice(Math.floor(values.length / 2));
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  
  const change = ((recentAvg - olderAvg) / olderAvg) * 100;
  
  if (change > 5) return 'increasing';
  if (change < -5) return 'decreasing';
  return 'stable';
}

function calculateLoggingStreak(healthLogs: any[]): number {
  const today = new Date();
  let streak = 0;
  
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const hasLog = healthLogs.some(log => 
      new Date(log.log_date).toDateString() === checkDate.toDateString()
    );
    
    if (hasLog) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}