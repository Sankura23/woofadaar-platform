import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken, getTokenFromRequest, isPetParent } from '@/lib/auth';

// POST /api/health/insights - Generate AI health insights
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !isPetParent(payload)) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const userId = payload.userId;
    const body = await request.json();
    const { dog_id, analysis_period = 30 } = body;

    if (!dog_id) {
      return NextResponse.json(
        { error: 'Dog ID is required' },
        { status: 400 }
      );
    }

    // Verify dog ownership
    const dog = await prisma.dog.findFirst({
      where: {
        id: dog_id,
        user_id: userId
      }
    });

    if (!dog) {
      return NextResponse.json(
        { error: 'Dog not found or access denied' },
        { status: 404 }
      );
    }

    // Get health logs for analysis
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - analysis_period);

    const healthLogs = await prisma.healthLog.findMany({
      where: {
        dog_id,
        log_date: { gte: startDate }
      },
      orderBy: { log_date: 'asc' }
    });

    if (healthLogs.length < 3) {
      return NextResponse.json({
        success: true,
        message: 'Need more data for meaningful insights',
        data: {
          insights: [{
            id: 'insufficient-data',
            title: 'More Data Needed',
            description: 'Log more daily health data to unlock AI-powered insights and pattern recognition.',
            severity: 'info',
            confidence: 100,
            category: 'data_collection',
            recommendations: [
              'Try to log health data for at least 7 consecutive days',
              'Include weight, mood, exercise, and appetite information',
              'Note any symptoms or unusual behaviors'
            ],
            created_at: new Date(),
            is_read: false
          }]
        }
      });
    }

    // Generate insights based on patterns
    const insights = await generateHealthInsights(dog, healthLogs);

    // Save insights to database
    const savedInsights = [];
    for (const insight of insights) {
      const saved = await prisma.healthInsight.create({
        data: {
          dog_id,
          title: insight.title,
          description: insight.description,
          severity: insight.severity,
          confidence: insight.confidence,
          category: insight.category,
          recommendations: insight.recommendations,
          data_analyzed: insight.data_analyzed,
          pattern_detected: insight.pattern_detected,
          is_read: false
        }
      });
      savedInsights.push(saved);
    }

    return NextResponse.json({
      success: true,
      message: 'Health insights generated successfully',
      data: { insights: savedInsights }
    });

  } catch (error) {
    console.error('Error generating health insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate health insights' },
      { status: 500 }
    );
  }
}

// GET /api/health/insights - Get health insights for a dog
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !isPetParent(payload)) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const userId = payload.userId;
    const { searchParams } = new URL(request.url);
    const dogId = searchParams.get('dog_id');
    const limit = parseInt(searchParams.get('limit') || '10');
    const unreadOnly = searchParams.get('unread_only') === 'true';

    if (!dogId) {
      return NextResponse.json(
        { error: 'Dog ID is required' },
        { status: 400 }
      );
    }

    // Verify dog ownership
    const dog = await prisma.dog.findFirst({
      where: {
        id: dogId,
        user_id: userId
      }
    });

    if (!dog) {
      return NextResponse.json(
        { error: 'Dog not found or access denied' },
        { status: 404 }
      );
    }

    const whereClause: any = { dog_id: dogId };
    if (unreadOnly) {
      whereClause.is_read = false;
    }

    const insights = await prisma.healthInsight.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      take: limit
    });

    const summary = {
      totalInsights: await prisma.healthInsight.count({ where: { dog_id: dogId } }),
      unreadInsights: await prisma.healthInsight.count({ 
        where: { dog_id: dogId, is_read: false } 
      }),
      criticalInsights: await prisma.healthInsight.count({
        where: { dog_id: dogId, severity: 'critical' }
      })
    };

    return NextResponse.json({
      success: true,
      data: { insights, summary }
    });

  } catch (error) {
    console.error('Error fetching health insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health insights' },
      { status: 500 }
    );
  }
}

// AI Pattern Recognition Functions
async function generateHealthInsights(dog: any, healthLogs: any[]) {
  const insights = [];
  
  // Weight trend analysis
  const weightInsight = analyzeWeightTrends(dog, healthLogs);
  if (weightInsight) insights.push(weightInsight);

  // Mood pattern analysis
  const moodInsight = analyzeMoodPatterns(healthLogs);
  if (moodInsight) insights.push(moodInsight);

  // Exercise pattern analysis
  const exerciseInsight = analyzeExercisePatterns(healthLogs);
  if (exerciseInsight) insights.push(exerciseInsight);

  // Appetite pattern analysis
  const appetiteInsight = analyzeAppetitePatterns(healthLogs);
  if (appetiteInsight) insights.push(appetiteInsight);

  // Symptom pattern analysis
  const symptomInsight = analyzeSymptomPatterns(healthLogs);
  if (symptomInsight) insights.push(symptomInsight);

  // Behavioral correlation analysis
  const correlationInsight = analyzeBehavioralCorrelations(healthLogs);
  if (correlationInsight) insights.push(correlationInsight);

  return insights;
}

function analyzeWeightTrends(dog: any, logs: any[]) {
  const weightLogs = logs.filter(log => log.weight_kg !== null).slice(-14); // Last 14 entries
  
  if (weightLogs.length < 3) return null;

  const weights = weightLogs.map(log => log.weight_kg);
  const recentWeights = weights.slice(-5);
  const olderWeights = weights.slice(0, 5);

  const recentAvg = recentWeights.reduce((a, b) => a + b) / recentWeights.length;
  const olderAvg = olderWeights.reduce((a, b) => a + b) / olderWeights.length;
  const weightChange = recentAvg - olderAvg;
  const changePercentage = (weightChange / olderAvg) * 100;

  let severity = 'info';
  let title = 'Weight Stable';
  let description = `${dog.name}'s weight has remained relatively stable.`;
  let recommendations = ['Continue current feeding and exercise routine'];
  
  if (Math.abs(changePercentage) > 10) {
    severity = 'critical';
    title = changePercentage > 0 ? 'Significant Weight Gain' : 'Significant Weight Loss';
    description = `${dog.name} has ${changePercentage > 0 ? 'gained' : 'lost'} ${Math.abs(changePercentage).toFixed(1)}% body weight recently.`;
    recommendations = [
      'Consult with a veterinarian immediately',
      'Review current diet and feeding schedule',
      'Consider underlying health issues'
    ];
  } else if (Math.abs(changePercentage) > 5) {
    severity = 'warning';
    title = changePercentage > 0 ? 'Gradual Weight Gain' : 'Gradual Weight Loss';
    description = `${dog.name} has ${changePercentage > 0 ? 'gained' : 'lost'} ${Math.abs(changePercentage).toFixed(1)}% body weight.`;
    recommendations = [
      'Monitor weight closely',
      'Adjust food portions if needed',
      'Ensure adequate exercise'
    ];
  }

  return {
    title,
    description,
    severity,
    confidence: Math.min(95, 60 + (weightLogs.length * 3)),
    category: 'weight_management',
    recommendations,
    data_analyzed: weightLogs.length,
    pattern_detected: `Weight change: ${changePercentage.toFixed(1)}%`
  };
}

function analyzeMoodPatterns(logs: any[]) {
  const moodLogs = logs.filter(log => log.mood_rating !== null).slice(-21); // Last 21 entries
  
  if (moodLogs.length < 7) return null;

  const moods = moodLogs.map(log => log.mood_rating);
  const avgMood = moods.reduce((a, b) => a + b) / moods.length;
  const recentMoods = moods.slice(-7);
  const recentAvgMood = recentMoods.reduce((a, b) => a + b) / recentMoods.length;
  const moodTrend = recentAvgMood - avgMood;

  // Check for concerning patterns
  const lowMoodDays = recentMoods.filter(mood => mood <= 2).length;
  const veryLowMoodStreak = getConsecutiveCount(recentMoods, mood => mood <= 2);

  let severity = 'info';
  let title = 'Mood Pattern Normal';
  let description = 'Mood levels are within normal range.';
  let recommendations = ['Continue current care routine'];

  if (veryLowMoodStreak >= 3 || lowMoodDays >= 5) {
    severity = 'critical';
    title = 'Concerning Mood Pattern';
    description = 'Persistent low mood detected. This could indicate health issues, stress, or discomfort.';
    recommendations = [
      'Schedule veterinary examination',
      'Review recent changes in environment or routine',
      'Consider pain or discomfort sources',
      'Evaluate social interaction and exercise levels'
    ];
  } else if (moodTrend < -0.5 && avgMood < 3.5) {
    severity = 'warning';
    title = 'Declining Mood Trend';
    description = 'Recent mood scores show a declining pattern.';
    recommendations = [
      'Monitor closely for other symptoms',
      'Increase engagement and play time',
      'Check for physical discomfort'
    ];
  }

  return {
    title,
    description,
    severity,
    confidence: Math.min(90, 50 + (moodLogs.length * 2)),
    category: 'behavioral_health',
    recommendations,
    data_analyzed: moodLogs.length,
    pattern_detected: `Average mood: ${avgMood.toFixed(1)}, Trend: ${moodTrend.toFixed(2)}`
  };
}

function analyzeExercisePatterns(logs: any[]) {
  const exerciseLogs = logs.filter(log => log.exercise_duration !== null).slice(-14);
  
  if (exerciseLogs.length < 5) return null;

  const exercises = exerciseLogs.map(log => log.exercise_duration);
  const avgExercise = exercises.reduce((a, b) => a + b) / exercises.length;
  const zeroExerciseDays = exercises.filter(ex => ex === 0).length;
  const lowExerciseDays = exercises.filter(ex => ex > 0 && ex < 15).length;

  let severity = 'info';
  let title = 'Exercise Pattern Normal';
  let description = 'Exercise levels are appropriate.';
  let recommendations = ['Maintain current exercise routine'];

  if (zeroExerciseDays >= 5 || avgExercise < 10) {
    severity = 'warning';
    title = 'Low Exercise Activity';
    description = 'Exercise levels are below recommended amounts for optimal health.';
    recommendations = [
      'Gradually increase daily exercise',
      'Try shorter, more frequent walks',
      'Consider indoor activities during bad weather',
      'Ensure exercise is appropriate for age and breed'
    ];
  } else if (avgExercise > 120) {
    severity = 'warning';
    title = 'High Exercise Activity';
    description = 'Exercise levels are quite high. Monitor for signs of overexertion.';
    recommendations = [
      'Watch for signs of fatigue or overexertion',
      'Ensure adequate rest and recovery time',
      'Provide plenty of water during exercise'
    ];
  }

  return {
    title,
    description,
    severity,
    confidence: Math.min(85, 45 + (exerciseLogs.length * 3)),
    category: 'activity_level',
    recommendations,
    data_analyzed: exerciseLogs.length,
    pattern_detected: `Average exercise: ${avgExercise.toFixed(1)} minutes/day`
  };
}

function analyzeAppetitePatterns(logs: any[]) {
  const appetiteLogs = logs.filter(log => log.appetite_level !== null).slice(-14);
  
  if (appetiteLogs.length < 5) return null;

  const appetites = appetiteLogs.map(log => log.appetite_level);
  const avgAppetite = appetites.reduce((a, b) => a + b) / appetites.length;
  const poorAppetiteDays = appetites.filter(app => app <= 2).length;
  const poorAppetiteStreak = getConsecutiveCount(appetites, app => app <= 2);

  let severity = 'info';
  let title = 'Appetite Pattern Normal';
  let description = 'Appetite levels are healthy.';
  let recommendations = ['Continue current feeding routine'];

  if (poorAppetiteStreak >= 3 || poorAppetiteDays >= 5) {
    severity = 'critical';
    title = 'Poor Appetite Pattern';
    description = 'Persistent poor appetite detected. This could indicate underlying health issues.';
    recommendations = [
      'Consult veterinarian immediately',
      'Check for dental problems or mouth pain',
      'Review food quality and freshness',
      'Consider stress factors or environmental changes'
    ];
  } else if (avgAppetite < 3 && poorAppetiteDays >= 3) {
    severity = 'warning';
    title = 'Declining Appetite';
    description = 'Recent appetite scores show concerning patterns.';
    recommendations = [
      'Monitor food intake closely',
      'Try different food textures or flavors',
      'Schedule veterinary check if continues'
    ];
  }

  return {
    title,
    description,
    severity,
    confidence: Math.min(88, 50 + (appetiteLogs.length * 2.5)),
    category: 'nutrition',
    recommendations,
    data_analyzed: appetiteLogs.length,
    pattern_detected: `Average appetite: ${avgAppetite.toFixed(1)}/5`
  };
}

function analyzeSymptomPatterns(logs: any[]) {
  const symptomsLogs = logs.filter(log => log.symptoms && log.symptoms.length > 0);
  
  if (symptomsLogs.length === 0) return null;

  // Count symptom occurrences
  const symptomCounts: { [key: string]: number } = {};
  symptomsLogs.forEach(log => {
    log.symptoms.forEach((symptom: string) => {
      symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
    });
  });

  const mostCommonSymptoms = Object.entries(symptomCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  if (mostCommonSymptoms.length === 0) return null;

  const [topSymptom, topCount] = mostCommonSymptoms[0];
  const totalLogs = logs.length;
  const symptomFrequency = (topCount / totalLogs) * 100;

  let severity = 'info';
  let title = 'Occasional Symptoms';
  let description = `Occasional symptoms noted: ${topSymptom}`;
  let recommendations = ['Monitor symptoms and note any patterns'];

  if (symptomFrequency > 30 || topCount >= 5) {
    severity = 'critical';
    title = 'Recurring Symptoms';
    description = `Frequent occurrence of ${topSymptom} (${topCount} times). This pattern requires immediate attention.`;
    recommendations = [
      'Schedule veterinary examination immediately',
      'Document exact timing and circumstances of symptoms',
      'Consider emergency care if symptoms worsen',
      'Review potential triggers or environmental factors'
    ];
  } else if (symptomFrequency > 15 || topCount >= 3) {
    severity = 'warning';
    title = 'Notable Symptom Pattern';
    description = `${topSymptom} has occurred ${topCount} times recently.`;
    recommendations = [
      'Schedule veterinary consultation',
      'Keep detailed symptom diary',
      'Monitor for additional symptoms'
    ];
  }

  return {
    title,
    description,
    severity,
    confidence: Math.min(92, 60 + (symptomsLogs.length * 4)),
    category: 'symptom_tracking',
    recommendations,
    data_analyzed: totalLogs,
    pattern_detected: `${topSymptom}: ${topCount} occurrences (${symptomFrequency.toFixed(1)}% frequency)`
  };
}

function analyzeBehavioralCorrelations(logs: any[]) {
  const completeLogs = logs.filter(log => 
    log.mood_rating !== null && 
    log.exercise_duration !== null && 
    log.appetite_level !== null
  );

  if (completeLogs.length < 7) return null;

  // Find correlations between exercise and mood
  let exerciseMoodCorrelation = 0;
  let correlationCount = 0;

  for (let i = 0; i < completeLogs.length - 1; i++) {
    const today = completeLogs[i];
    const tomorrow = completeLogs[i + 1];
    
    if (today.exercise_duration > 30 && tomorrow.mood_rating > today.mood_rating) {
      exerciseMoodCorrelation += 1;
    }
    correlationCount += 1;
  }

  const correlationStrength = correlationCount > 0 ? (exerciseMoodCorrelation / correlationCount) * 100 : 0;

  if (correlationStrength > 60) {
    return {
      title: 'Exercise-Mood Connection Detected',
      description: `Strong correlation found: days with more exercise (>30min) tend to be followed by improved mood scores.`,
      severity: 'info',
      confidence: Math.min(80, 40 + (completeLogs.length * 2)),
      category: 'behavioral_insights',
      recommendations: [
        'Consider maintaining consistent daily exercise',
        'Target at least 30 minutes of activity for optimal mood',
        'Use exercise as a natural mood booster'
      ],
      data_analyzed: completeLogs.length,
      pattern_detected: `Exercise-mood correlation: ${correlationStrength.toFixed(1)}%`
    };
  }

  return null;
}

function getConsecutiveCount(array: any[], condition: (item: any) => boolean): number {
  let maxConsecutive = 0;
  let currentConsecutive = 0;

  for (const item of array) {
    if (condition(item)) {
      currentConsecutive += 1;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 0;
    }
  }

  return maxConsecutive;
}