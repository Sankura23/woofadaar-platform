import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

// POST /api/health/log - Create or update health log entry
export async function POST(request: NextRequest) {
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
    const body = await request.json();

    const {
      dog_id,
      log_date,
      food_amount,
      food_type,
      water_intake,
      exercise_duration,
      exercise_type,
      mood_rating,
      mood_score, // Also accept mood_score for compatibility
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

    // Verify dog ownership using database
    try {
      const dog = await prisma.dog.findFirst({
        where: {
          id: dog_id,
          user_id: userId
        },
        select: {
          id: true,
          name: true
        }
      });

      if (!dog) {
        return NextResponse.json(
          { error: 'Dog not found or access denied' },
          { status: 404 }
        );
      }

      // Create or update health log entry in database
      const logDateParsed = new Date(log_date);
      
      const healthLog = await prisma.healthLog.upsert({
        where: {
          dog_id_log_date: {
            dog_id: dog_id,
            log_date: logDateParsed
          }
        },
        update: {
          food_amount,
          food_type,
          water_intake,
          exercise_duration,
          exercise_type,
          mood_score: mood_rating || mood_score, // Use mood_rating if available, fall back to mood_score
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
          user_id: userId,
          dog_id: dog_id,
          log_date: logDateParsed,
          food_amount,
          food_type,
          water_intake,
          exercise_duration,
          exercise_type,
          mood_score: mood_rating || mood_score,
          bathroom_frequency,
          weight_kg,
          temperature_celsius,
          notes,
          photos: photos || [],
          symptoms: symptoms || [],
          energy_level,
          appetite_level
        },
        select: {
          id: true,
          log_date: true,
          mood_score: true,
          energy_level: true,
          appetite_level: true,
          exercise_duration: true,
          weight_kg: true,
          created_at: true
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
    } catch (dbError) {
      console.error('Database error saving health log:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error saving health log:', error);
    return NextResponse.json(
      { error: 'Failed to save health log' },
      { status: 500 }
    );
  }
}