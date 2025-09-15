import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
import AIService from '@/lib/ai-service';

interface DecodedToken {
  userId: string;
  email: string;
}

async function verifyToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

// POST /api/ai/analyze-health-patterns - Analyze dog health patterns using AI
export async function POST(request: NextRequest) {
  const userId = await verifyToken(request);
  
  if (!userId) {
    return NextResponse.json({ 
      success: false,
      message: 'Authentication required' 
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { dog_id, analysis_period_days = 30 } = body;

    // Validation
    if (!dog_id) {
      return NextResponse.json({
        success: false,
        message: 'Dog ID is required'
      }, { status: 400 });
    }

    // Verify dog belongs to user
    const dog = await prisma.dog.findFirst({
      where: { 
        id: dog_id,
        user_id: userId 
      },
      select: {
        id: true,
        name: true,
        breed: true,
        age_months: true,
        weight_kg: true,
        gender: true
      }
    });

    if (!dog) {
      return NextResponse.json({
        success: false,
        message: 'Dog not found or access denied'
      }, { status: 404 });
    }

    // Get recent health logs
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - analysis_period_days);

    const healthLogs = await prisma.healthLog.findMany({
      where: {
        dog_id,
        log_date: {
          gte: cutoffDate
        }
      },
      orderBy: { log_date: 'desc' },
      take: 50, // Limit to last 50 logs
      select: {
        log_date: true,
        activity_level: true,
        appetite: true,
        mood: true,
        physical_condition: true,
        notes: true
      }
    });

    // Get existing medical records for context
    const medicalRecords = await prisma.medicalRecord.findMany({
      where: { dog_id },
      select: {
        diagnosis: true,
        condition: true,
        notes: true
      },
      take: 10
    });

    // Prepare data for AI analysis
    const analysisInput = {
      dogProfile: {
        breed: dog.breed,
        age_months: dog.age_months,
        weight_kg: dog.weight_kg,
        gender: dog.gender
      },
      healthLogs: healthLogs.map(log => ({
        log_date: log.log_date.toISOString().split('T')[0],
        activity_level: log.activity_level || 'unknown',
        appetite: log.appetite || 'unknown',
        mood: log.mood || 'unknown',
        physical_condition: log.physical_condition || 'unknown',
        notes: log.notes || undefined
      })),
      medicalHistory: medicalRecords.map(record => 
        `${record.diagnosis || record.condition}: ${record.notes || 'No additional notes'}`
      ).filter(Boolean)
    };

    // Get AI analysis
    const aiService = AIService.getInstance();
    const predictions = await aiService.analyzeHealthPatterns(analysisInput);

    // Save predictions to database
    const savedPredictions = await Promise.all(
      predictions.map(prediction => 
        prisma.healthPrediction.create({
          data: {
            dog_id,
            prediction_type: prediction.prediction_type,
            predicted_condition: prediction.predicted_condition,
            risk_level: prediction.risk_level,
            confidence_score: prediction.confidence_score,
            prediction_data: prediction.prediction_data,
            recommendations: prediction.recommendations,
            prediction_date: new Date()
          }
        })
      )
    );

    // Generate AI recommendations based on predictions
    const recommendations = await aiService.generateRecommendations(userId, dog_id, {
      predictions,
      dogProfile: dog,
      recentActivity: healthLogs.length,
      analysisDate: new Date().toISOString()
    });

    // Save recommendations to database
    const savedRecommendations = await Promise.all(
      recommendations.map(rec => 
        prisma.aIRecommendation.create({
          data: {
            user_id: userId,
            dog_id,
            recommendation_type: rec.type,
            title: rec.title,
            description: rec.description,
            confidence_score: rec.confidence_score,
            data_sources: rec.data_sources,
            action_url: rec.action_url,
            priority: rec.priority,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
          }
        })
      )
    );

    // Log analytics event
    await prisma.userBehaviorAnalytics.create({
      data: {
        user_id: userId,
        session_id: `ai-analysis-${Date.now()}`,
        action_type: 'ai_health_analysis',
        metadata: {
          dog_id,
          predictions_count: predictions.length,
          recommendations_count: recommendations.length,
          analysis_period_days,
          health_logs_analyzed: healthLogs.length
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Health analysis completed successfully',
      data: {
        dog: {
          id: dog.id,
          name: dog.name,
          breed: dog.breed
        },
        analysis: {
          period_days: analysis_period_days,
          logs_analyzed: healthLogs.length,
          predictions_count: predictions.length,
          recommendations_count: recommendations.length
        },
        predictions: savedPredictions.map(p => ({
          id: p.id,
          type: p.prediction_type,
          condition: p.predicted_condition,
          risk_level: p.risk_level,
          confidence: p.confidence_score,
          recommendations: p.recommendations,
          created_at: p.created_at
        })),
        recommendations: savedRecommendations.map(r => ({
          id: r.id,
          type: r.recommendation_type,
          title: r.title,
          description: r.description,
          priority: r.priority,
          action_url: r.action_url,
          expires_at: r.expires_at
        })),
        next_analysis_recommended: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('Health analysis error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to analyze health patterns',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

// GET /api/ai/analyze-health-patterns - Get analysis status and recent results
export async function GET(request: NextRequest) {
  const userId = await verifyToken(request);
  
  if (!userId) {
    return NextResponse.json({ 
      success: false,
      message: 'Authentication required' 
    }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const dog_id = searchParams.get('dog_id');

    if (!dog_id) {
      return NextResponse.json({
        success: false,
        message: 'Dog ID is required'
      }, { status: 400 });
    }

    // Verify dog belongs to user
    const dog = await prisma.dog.findFirst({
      where: { 
        id: dog_id,
        user_id: userId 
      },
      select: { id: true, name: true, breed: true }
    });

    if (!dog) {
      return NextResponse.json({
        success: false,
        message: 'Dog not found or access denied'
      }, { status: 404 });
    }

    // Get recent predictions
    const predictions = await prisma.healthPrediction.findMany({
      where: { dog_id },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: {
        id: true,
        prediction_type: true,
        predicted_condition: true,
        risk_level: true,
        confidence_score: true,
        recommendations: true,
        status: true,
        prediction_date: true,
        created_at: true
      }
    });

    // Get recent recommendations
    const recommendations = await prisma.aIRecommendation.findMany({
      where: { 
        dog_id,
        status: 'active',
        expires_at: { gt: new Date() }
      },
      orderBy: { created_at: 'desc' },
      take: 5,
      select: {
        id: true,
        recommendation_type: true,
        title: true,
        description: true,
        priority: true,
        action_url: true,
        confidence_score: true,
        created_at: true,
        expires_at: true
      }
    });

    // Get health logs count for context
    const healthLogsCount = await prisma.healthLog.count({
      where: { 
        dog_id,
        log_date: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    // Check if analysis is due
    const lastAnalysis = predictions[0]?.created_at;
    const daysSinceLastAnalysis = lastAnalysis 
      ? Math.floor((Date.now() - lastAnalysis.getTime()) / (24 * 60 * 60 * 1000))
      : null;
    
    const analysisRecommended = !lastAnalysis || daysSinceLastAnalysis >= 7;

    return NextResponse.json({
      success: true,
      data: {
        dog: {
          id: dog.id,
          name: dog.name,
          breed: dog.breed
        },
        analysis_status: {
          last_analysis: lastAnalysis,
          days_since_last_analysis: daysSinceLastAnalysis,
          analysis_recommended: analysisRecommended,
          health_logs_available: healthLogsCount >= 7 // Need at least 7 logs for meaningful analysis
        },
        recent_predictions: predictions,
        active_recommendations: recommendations,
        summary: {
          total_predictions: predictions.length,
          active_recommendations: recommendations.length,
          high_risk_predictions: predictions.filter(p => p.risk_level === 'high' || p.risk_level === 'critical').length,
          recent_health_logs: healthLogsCount
        }
      }
    });

  } catch (error) {
    console.error('Get analysis status error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to get analysis status'
    }, { status: 500 });
  }
}