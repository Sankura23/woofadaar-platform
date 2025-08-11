import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, verifyToken, isPetParent } from '@/lib/auth';

// POST /api/health/daily-log - Create or update daily health log
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const {
      dog_id,
      log_date,
      food_amount,
      food_type,
      water_intake,
      exercise_duration,
      exercise_type,
      mood_score,
      bathroom_frequency,
      weight_kg,
      temperature_celsius,
      notes,
      photos,
      voice_notes,
      symptoms
    } = body;

    // Validation
    if (!dog_id || !log_date) {
      return NextResponse.json({
        success: false,
        message: 'Dog ID and log date are required'
      }, { status: 400 });
    }

    // Verify dog ownership
    const dog = await prisma.dog.findFirst({
      where: {
        id: dog_id,
        user_id: payload.userId
      }
    });

    if (!dog) {
      return NextResponse.json({
        success: false,
        message: 'Dog not found or access denied'
      }, { status: 404 });
    }

    // Validate mood score if provided
    if (mood_score && (mood_score < 1 || mood_score > 5)) {
      return NextResponse.json({
        success: false,
        message: 'Mood score must be between 1 and 5'
      }, { status: 400 });
    }

    try {
      // Check if log already exists for this date
      const existingLog = await prisma.healthLog.findFirst({
        where: {
          dog_id,
          user_id: payload.userId,
          log_date: new Date(log_date)
        }
      });

      let healthLog;

      if (existingLog) {
        // Update existing log
        healthLog = await prisma.healthLog.update({
          where: { id: existingLog.id },
          data: {
            food_amount: food_amount || existingLog.food_amount,
            food_type: food_type || existingLog.food_type,
            water_intake: water_intake || existingLog.water_intake,
            exercise_duration: exercise_duration || existingLog.exercise_duration,
            exercise_type: exercise_type || existingLog.exercise_type,
            mood_score: mood_score || existingLog.mood_score,
            bathroom_frequency: bathroom_frequency || existingLog.bathroom_frequency,
            weight_kg: weight_kg || existingLog.weight_kg,
            temperature_celsius: temperature_celsius || existingLog.temperature_celsius,
            notes: notes !== undefined ? notes : existingLog.notes,
            photos: photos || existingLog.photos,
            voice_notes: voice_notes || existingLog.voice_notes,
            symptoms: symptoms || existingLog.symptoms,
            updated_at: new Date()
          }
        });
      } else {
        // Create new log
        healthLog = await prisma.healthLog.create({
          data: {
            dog_id,
            user_id: payload.userId,
            log_date: new Date(log_date),
            food_amount,
            food_type,
            water_intake,
            exercise_duration,
            exercise_type,
            mood_score,
            bathroom_frequency,
            weight_kg,
            temperature_celsius,
            notes,
            photos,
            voice_notes,
            symptoms: symptoms || []
          }
        });
      }

      // Create health insights if significant changes detected
      await generateHealthInsights(dog_id, healthLog);

      return NextResponse.json({
        success: true,
        message: existingLog ? 'Health log updated successfully' : 'Health log created successfully',
        data: {
          health_log: healthLog,
          is_update: !!existingLog
        }
      });

    } catch (dbError) {
      console.error('Database error in health log creation:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Failed to save health log'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Health log creation error:', error);
    return NextResponse.json({
      success: false,
      message: 'Invalid request format'
    }, { status: 400 });
  }
}

// Helper function to generate health insights
async function generateHealthInsights(dogId: string, healthLog: any) {
  try {
    // Get recent logs for comparison (last 7 days)
    const recentLogs = await prisma.healthLog.findMany({
      where: {
        dog_id: dogId,
        log_date: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: {
        log_date: 'desc'
      },
      take: 7
    });

    const insights = [];

    // Weight change detection
    if (healthLog.weight_kg && recentLogs.length > 1) {
      const previousWeights = recentLogs
        .filter(log => log.weight_kg && log.id !== healthLog.id)
        .map(log => log.weight_kg);

      if (previousWeights.length > 0) {
        const avgPreviousWeight = previousWeights.reduce((a, b) => a + b, 0) / previousWeights.length;
        const weightChange = ((healthLog.weight_kg - avgPreviousWeight) / avgPreviousWeight) * 100;

        if (Math.abs(weightChange) > 5) {
          insights.push({
            dog_id: dogId,
            insight_type: 'anomaly',
            category: 'weight',
            title: `${weightChange > 0 ? 'Weight Gain' : 'Weight Loss'} Detected`,
            description: `Your dog's weight has ${weightChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(weightChange).toFixed(1)}% over the past week.`,
            severity: Math.abs(weightChange) > 10 ? 'warning' : 'info',
            data_points: {
              current_weight: healthLog.weight_kg,
              previous_average: avgPreviousWeight,
              change_percentage: weightChange
            },
            recommendations: weightChange > 0 
              ? ['Monitor food portions', 'Increase exercise', 'Consult vet if trend continues']
              : ['Check for health issues', 'Monitor appetite', 'Consult vet if concerned']
          });
        }
      }
    }

    // Mood pattern detection
    if (healthLog.mood_score && recentLogs.length >= 3) {
      const recentMoods = recentLogs
        .filter(log => log.mood_score)
        .slice(0, 5)
        .map(log => log.mood_score);

      if (recentMoods.length >= 3) {
        const avgMood = recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length;
        
        if (avgMood <= 2) {
          insights.push({
            dog_id: dogId,
            insight_type: 'trend',
            category: 'mood',
            title: 'Low Mood Pattern Detected',
            description: 'Your dog has been showing consistently low mood scores recently.',
            severity: 'warning',
            data_points: {
              recent_moods: recentMoods,
              average_mood: avgMood
            },
            recommendations: [
              'Increase playtime and interaction',
              'Check for signs of illness',
              'Consider environmental changes',
              'Consult vet if pattern persists'
            ]
          });
        }
      }
    }

    // Exercise consistency check
    const exerciseLogs = recentLogs.filter(log => log.exercise_duration);
    if (exerciseLogs.length >= 3) {
      const avgExercise = exerciseLogs.reduce((sum, log) => sum + log.exercise_duration, 0) / exerciseLogs.length;
      
      if (avgExercise < 30) {
        insights.push({
          dog_id: dogId,
          insight_type: 'recommendation',
          category: 'exercise',
          title: 'Low Exercise Activity',
          description: 'Your dog may benefit from more daily exercise.',
          severity: 'info',
          data_points: {
            average_exercise: avgExercise,
            recent_exercises: exerciseLogs.map(log => log.exercise_duration)
          },
          recommendations: [
            'Aim for at least 60 minutes of daily activity',
            'Try different exercise types',
            'Consider the dog\'s age and breed requirements'
          ]
        });
      }
    }

    // Save insights
    for (const insight of insights) {
      await prisma.healthInsight.create({
        data: {
          ...insight,
          confidence_score: 0.8,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      });
    }

  } catch (error) {
    console.error('Error generating health insights:', error);
    // Don't fail the main operation if insights fail
  }
}