import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

// GET /api/health/logs/[dogId] - Get health logs with filters
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
    
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type'); // 'weight', 'exercise', 'mood', etc.

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

    // Build where clause
    const whereClause: any = {
      dog_id: dogId
    };

    // Date filtering
    if (startDate && endDate) {
      whereClause.log_date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    } else if (startDate) {
      whereClause.log_date = { gte: new Date(startDate) };
    } else if (endDate) {
      whereClause.log_date = { lte: new Date(endDate) };
    }

    // Type-specific filtering
    if (type) {
      switch (type) {
        case 'weight':
          whereClause.weight_kg = { not: null };
          break;
        case 'exercise':
          whereClause.exercise_duration = { not: null };
          break;
        case 'mood':
          whereClause.mood_score = { not: null };
          break;
        case 'appetite':
          whereClause.appetite_level = { not: null };
          break;
        case 'symptoms':
          whereClause.symptoms = { not: [] };
          break;
      }
    }

    const [logs, totalCount] = await Promise.all([
      prisma.healthLog.findMany({
        where: whereClause,
        orderBy: { log_date: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          log_date: true,
          food_amount: true,
          food_type: true,
          water_intake: true,
          exercise_duration: true,
          exercise_type: true,
          mood_score: true,
          bathroom_frequency: true,
          weight_kg: true,
          temperature_celsius: true,
          notes: true,
          photos: true,
          symptoms: true,
          energy_level: true,
          appetite_level: true,
          created_at: true,
          updated_at: true
        }
      }),
      prisma.healthLog.count({ where: whereClause })
    ]);

    // Calculate analytics if requested
    const includeAnalytics = searchParams.get('analytics') === 'true';
    let analytics = null;

    if (includeAnalytics && logs.length > 0) {
      analytics = {
        averages: {
          weight: calculateAverage(logs, 'weight_kg'),
          exerciseDuration: calculateAverage(logs, 'exercise_duration'),
          moodRating: calculateAverage(logs, 'mood_score'),
          energyLevel: calculateAverage(logs, 'energy_level'),
          appetiteLevel: calculateAverage(logs, 'appetite_level'),
          bathroomFrequency: calculateAverage(logs, 'bathroom_frequency'),
          waterIntake: calculateAverage(logs, 'water_intake')
        },
        trends: {
          weightChange: calculateTrend(logs, 'weight_kg'),
          exerciseChange: calculateTrend(logs, 'exercise_duration'),
          moodChange: calculateTrend(logs, 'mood_score')
        },
        commonSymptoms: getCommonSymptoms(logs),
        frequentExerciseTypes: getFrequentValues(logs, 'exercise_type'),
        frequentFoodTypes: getFrequentValues(logs, 'food_type')
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + logs.length < totalCount
        },
        analytics
      }
    });

  } catch (error) {
    console.error('Error fetching health logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health logs' },
      { status: 500 }
    );
  }
}

// Utility functions for analytics
function calculateAverage(logs: any[], field: string): number | null {
  const values = logs
    .map(log => log[field])
    .filter(value => value !== null && value !== undefined);
  
  if (values.length === 0) return null;
  
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

function calculateTrend(logs: any[], field: string): 'increasing' | 'decreasing' | 'stable' | null {
  const values = logs
    .filter(log => log[field] !== null && log[field] !== undefined)
    .sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())
    .map(log => log[field]);

  if (values.length < 2) return null;

  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));

  const firstAvg = firstHalf.reduce((acc, val) => acc + val, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((acc, val) => acc + val, 0) / secondHalf.length;

  const difference = secondAvg - firstAvg;
  const threshold = firstAvg * 0.1; // 10% threshold

  if (difference > threshold) return 'increasing';
  if (difference < -threshold) return 'decreasing';
  return 'stable';
}

function getCommonSymptoms(logs: any[]): Array<{ symptom: string; count: number }> {
  const symptomCounts: { [key: string]: number } = {};
  
  logs.forEach(log => {
    if (Array.isArray(log.symptoms)) {
      log.symptoms.forEach((symptom: string) => {
        symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
      });
    }
  });

  return Object.entries(symptomCounts)
    .map(([symptom, count]) => ({ symptom, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function getFrequentValues(logs: any[], field: string): Array<{ value: string; count: number }> {
  const valueCounts: { [key: string]: number } = {};
  
  logs.forEach(log => {
    const value = log[field];
    if (value && typeof value === 'string') {
      valueCounts[value] = (valueCounts[value] || 0) + 1;
    }
  });

  return Object.entries(valueCounts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}