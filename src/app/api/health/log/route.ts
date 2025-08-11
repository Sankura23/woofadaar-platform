import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

// POST /api/health/log - Create or update health log entry
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
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const userId = payload.userId;
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
      symptoms,
      energy_level,
      appetite_level
    } = body;

    if (!dog_id || !log_date) {
      return NextResponse.json(
        { error: 'Dog ID and log date are required' },
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

    // Create or update health log entry (upsert based on dog_id + log_date)
    const healthLog = await prisma.healthLog.upsert({
      where: {
        dog_id_log_date: {
          dog_id,
          log_date: new Date(log_date)
        }
      },
      update: {
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
        photos: photos || [],
        symptoms: symptoms || [],
        energy_level,
        appetite_level,
        updated_at: new Date()
      },
      create: {
        dog_id,
        user_id: userId,
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
        photos: photos || [],
        symptoms: symptoms || [],
        energy_level,
        appetite_level
      }
    });

    // Award points for health logging
    if (healthLog) {
      try {
        // Skip points for now - will be implemented later with proper internal API call  
        console.log(`Health log created - 5 points would be awarded for ${dog.name}`);
      } catch (pointsError) {
        console.error('Error awarding points:', pointsError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Health log saved successfully',
      data: { healthLog }
    });

  } catch (error) {
    console.error('Error saving health log:', error);
    return NextResponse.json(
      { error: 'Failed to save health log' },
      { status: 500 }
    );
  }
}