import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

// GET /api/health/[dogId] - Get health overview for a dog
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dogId: string }> }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const userId = payload.userId;
    const { dogId } = await params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

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

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    // Get recent health logs
    const recentLogs = await prisma.healthLog.findMany({
      where: {
        dog_id: dogId,
        log_date: {
          gte: dateFrom
        }
      },
      orderBy: { log_date: 'desc' },
      take: 20
    });

    // Get current medications
    const activeMedications = await prisma.medication.findMany({
      where: {
        dog_id: dogId,
        is_active: true,
        OR: [
          { end_date: null },
          { end_date: { gte: new Date() } }
        ]
      },
      orderBy: { created_at: 'desc' }
    });

    // Get upcoming vet appointments
    const upcomingAppointments = await prisma.vetAppointment.findMany({
      where: {
        dog_id: dogId,
        appointment_datetime: {
          gte: new Date()
        },
        status: { in: ['scheduled', 'confirmed'] }
      },
      include: {
        vet: {
          select: {
            id: true,
            name: true,
            business_name: true,
            phone: true,
            specialization: true
          }
        }
      },
      orderBy: { appointment_datetime: 'asc' },
      take: 5
    });

    // Get recent health insights
    const recentInsights = await prisma.healthInsight.findMany({
      where: {
        dog_id: dogId
      },
      orderBy: { created_at: 'desc' },
      take: 10
    });

    // Calculate health trends
    const healthTrends = calculateHealthTrends(recentLogs);

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
          unreadInsights: recentInsights.filter(i => !i.acknowledged_at).length
        }
      }
    });

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
  const weightLogs = sortedLogs.filter(log => log.weight_kg !== null);
  const weightTrend = weightLogs.length >= 2 ? 
    weightLogs[weightLogs.length - 1].weight_kg - weightLogs[0].weight_kg : 0;

  // Exercise trend
  const exerciseLogs = sortedLogs.filter(log => log.exercise_duration !== null);
  const avgExercise = exerciseLogs.length > 0 ? 
    exerciseLogs.reduce((sum, log) => sum + (log.exercise_duration || 0), 0) / exerciseLogs.length : 0;

  // Mood trend
  const moodLogs = sortedLogs.filter(log => log.mood_rating !== null);
  const avgMood = moodLogs.length > 0 ? 
    moodLogs.reduce((sum, log) => sum + (log.mood_rating || 0), 0) / moodLogs.length : 0;

  // Appetite trend
  const appetiteLogs = sortedLogs.filter(log => log.appetite_level !== null);
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