import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

// GET /api/health/[dogId] - Get health overview for a dog using demo storage
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dogId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
    
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret) as any;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    if (!decoded.userId || decoded.userType !== 'pet-parent') {
      return NextResponse.json(
        { error: 'Invalid user token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
    const { dogId } = await params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Verify dog ownership using database
    try {
      const dog = await prisma.dog.findFirst({
        where: {
          id: dogId,
          user_id: userId
        },
        select: {
          id: true,
          name: true,
          breed: true,
          age_months: true,
          weight_kg: true
        }
      });

      if (!dog) {
        console.warn(`Dog not found for user ${userId}, dogId: ${dogId}`);
        return NextResponse.json(
          { error: 'Dog not found or access denied' },
          { status: 404 }
        );
      }

      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      // Get health logs from database (with error handling)
      let recentLogs = [];
      try {
        recentLogs = await prisma.healthLog.findMany({
          where: {
            dog_id: dogId,
            log_date: {
              gte: dateFrom
            }
          },
          orderBy: {
            log_date: 'desc'
          },
          take: 20,
          select: {
            id: true,
            dog_id: true,
            log_date: true,
            mood_score: true,
            energy_level: true,
            appetite_level: true,
            exercise_duration: true,
            weight_kg: true,
            temperature_celsius: true,
            symptoms: true,
            notes: true,
            created_at: true
          }
        });
      } catch (logsError) {
        console.warn('Could not fetch health logs:', logsError);
        recentLogs = [];
      }

      // Get medications and appointments from database (with error handling)
      let activeMedications = [];
      try {
        activeMedications = await prisma.medication.findMany({
          where: {
            dog_id: dogId,
            end_date: {
              gte: new Date()
            }
          },
          select: {
            id: true,
            name: true,
            dosage: true,
            frequency: true,
            start_date: true,
            end_date: true
          }
        });
      } catch (medError) {
        console.warn('Could not fetch medications:', medError);
        activeMedications = [];
      }

      let upcomingAppointments = [];
      try {
        upcomingAppointments = await prisma.appointment.findMany({
          where: {
            dog_id: dogId,
            appointment_date: {
              gte: new Date()
            },
            status: {
              in: ['scheduled', 'confirmed']
            }
          },
          take: 5,
          orderBy: {
            appointment_date: 'asc'
          },
          include: {
            Partner: {
              select: {
                name: true,
                business_name: true
              }
            }
          }
        });
      } catch (apptError) {
        console.warn('Could not fetch appointments:', apptError);
        upcomingAppointments = [];
      }

      const recentInsights: any[] = []; // Can be added later

      // Calculate health trends
      const healthTrends = calculateHealthTrends(recentLogs);

      console.log(`Health overview for dog ${dogId}, user ${userId}:`, {
        dogName: dog.name,
        totalHealthLogs: recentLogs.length,
        dateRange: `${dateFrom.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`
      });

      return NextResponse.json({
        success: true,
        data: {
          dog: {
            id: dog.id,
            name: dog.name,
            breed: dog.breed,
            age_months: dog.age_months,
            weight_kg: dog.weight_kg
          },
          recentLogs,
          activeMedications,
          upcomingAppointments,
          recentInsights,
          trends: healthTrends,
          summary: {
            totalLogs: recentLogs.length,
            activeMedicationsCount: activeMedications.length,
            upcomingAppointmentsCount: upcomingAppointments.length,
            unreadInsights: recentInsights.length
          }
        }
      });
    } catch (dbError) {
      console.error('Database error in health overview:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error fetching health overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health data' },
      { status: 500 }
    );
  }
}

function calculateHealthTrends(logs: any[]) {
  if (logs.length === 0) return null;

  const sortedLogs = logs.sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());
  
  // Weight trend
  const weightLogs = sortedLogs.filter(log => log.weight_kg !== null && log.weight_kg !== undefined);
  const weightTrend = weightLogs.length >= 2 ? 
    weightLogs[weightLogs.length - 1].weight_kg - weightLogs[0].weight_kg : 0;

  // Exercise trend (using exercise_duration from database)
  const exerciseLogs = sortedLogs.filter(log => log.exercise_duration !== null && log.exercise_duration !== undefined);
  const avgExercise = exerciseLogs.length > 0 ? 
    exerciseLogs.reduce((sum, log) => sum + (log.exercise_duration || 0), 0) / exerciseLogs.length : 0;

  // Mood trend (using mood_score from database)
  const moodLogs = sortedLogs.filter(log => log.mood_score !== null && log.mood_score !== undefined);
  const avgMood = moodLogs.length > 0 ? 
    moodLogs.reduce((sum, log) => sum + (log.mood_score || 0), 0) / moodLogs.length : 0;

  // Appetite trend (using appetite_level from database)
  const appetiteLogs = sortedLogs.filter(log => log.appetite_level !== null && log.appetite_level !== undefined);
  const avgAppetite = appetiteLogs.length > 0 ? 
    appetiteLogs.reduce((sum, log) => sum + (log.appetite_level || 0), 0) / appetiteLogs.length : 0;

  return {
    weight: {
      change: weightTrend,
      trend: weightTrend > 0 ? 'increasing' : weightTrend < 0 ? 'decreasing' : 'stable',
      dataPoints: weightLogs.length
    },
    exercise: {
      average: Math.round(avgExercise),
      dataPoints: exerciseLogs.length
    },
    mood: {
      average: Math.round(avgMood * 10) / 10,
      dataPoints: moodLogs.length
    },
    appetite: {
      average: Math.round(avgAppetite * 10) / 10,
      dataPoints: appetiteLogs.length
    }
  };
}