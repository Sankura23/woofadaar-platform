import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, verifyToken, isPetParent } from '@/lib/auth';

// PUT /api/health/logs/[id] - Update existing health log
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    // Verify health log ownership
    const existingLog = await prisma.healthLog.findFirst({
      where: {
        id,
        user_id: payload.userId
      }
    });

    if (!existingLog) {
      return NextResponse.json({
        success: false,
        message: 'Health log not found or access denied'
      }, { status: 404 });
    }

    const body = await request.json();
    const {
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

    // Validate mood score if provided
    if (mood_score && (mood_score < 1 || mood_score > 5)) {
      return NextResponse.json({
        success: false,
        message: 'Mood score must be between 1 and 5'
      }, { status: 400 });
    }

    try {
      // Update health log
      const updatedLog = await prisma.healthLog.update({
        where: { id },
        data: {
          food_amount: food_amount !== undefined ? food_amount : existingLog.food_amount,
          food_type: food_type !== undefined ? food_type : existingLog.food_type,
          water_intake: water_intake !== undefined ? water_intake : existingLog.water_intake,
          exercise_duration: exercise_duration !== undefined ? exercise_duration : existingLog.exercise_duration,
          exercise_type: exercise_type !== undefined ? exercise_type : existingLog.exercise_type,
          mood_score: mood_score !== undefined ? mood_score : existingLog.mood_score,
          bathroom_frequency: bathroom_frequency !== undefined ? bathroom_frequency : existingLog.bathroom_frequency,
          weight_kg: weight_kg !== undefined ? weight_kg : existingLog.weight_kg,
          temperature_celsius: temperature_celsius !== undefined ? temperature_celsius : existingLog.temperature_celsius,
          notes: notes !== undefined ? notes : existingLog.notes,
          photos: photos !== undefined ? photos : existingLog.photos,
          voice_notes: voice_notes !== undefined ? voice_notes : existingLog.voice_notes,
          symptoms: symptoms !== undefined ? symptoms : existingLog.symptoms,
          updated_at: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Health log updated successfully',
        data: {
          health_log: updatedLog
        }
      });

    } catch (dbError) {
      console.error('Database error in health log update:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Failed to update health log'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Health log update error:', error);
    return NextResponse.json({
      success: false,
      message: 'Invalid request format'
    }, { status: 400 });
  }
}

// DELETE /api/health/logs/[id] - Delete health log
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    // Verify health log ownership
    const existingLog = await prisma.healthLog.findFirst({
      where: {
        id,
        user_id: payload.userId
      }
    });

    if (!existingLog) {
      return NextResponse.json({
        success: false,
        message: 'Health log not found or access denied'
      }, { status: 404 });
    }

    try {
      // Delete health log
      await prisma.healthLog.delete({
        where: { id }
      });

      return NextResponse.json({
        success: true,
        message: 'Health log deleted successfully'
      });

    } catch (dbError) {
      console.error('Database error in health log deletion:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Failed to delete health log'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Health log deletion error:', error);
    return NextResponse.json({
      success: false,
      message: 'Invalid request format'
    }, { status: 400 });
  }
}

// GET /api/health/logs/[id] - Get specific health log
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    try {
      // Get health log with dog info
      const healthLog = await prisma.healthLog.findFirst({
        where: {
          id,
          user_id: payload.userId
        },
        include: {
          Dog: {
            select: {
              id: true,
              name: true,
              breed: true,
              age_months: true,
              photo_url: true
            }
          }
        }
      });

      if (!healthLog) {
        return NextResponse.json({
          success: false,
          message: 'Health log not found or access denied'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: {
          health_log: healthLog
        }
      });

    } catch (dbError) {
      console.error('Database error in health log retrieval:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Failed to retrieve health log'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Health log retrieval error:', error);
    return NextResponse.json({
      success: false,
      message: 'Invalid request format'
    }, { status: 400 });
  }
}