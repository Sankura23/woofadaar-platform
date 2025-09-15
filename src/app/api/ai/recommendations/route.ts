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

// GET /api/ai/recommendations - Get personalized AI recommendations
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
    const type = searchParams.get('type'); // health_alert, expert_suggestion, content, partner_match
    const priority = searchParams.get('priority'); // low, medium, high, urgent
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build where clause for filtering
    const where: any = {
      user_id: userId,
      status: 'active',
      expires_at: { gt: new Date() }
    };

    if (dog_id) {
      where.dog_id = dog_id;
    }

    if (type) {
      where.recommendation_type = type;
    }

    if (priority) {
      where.priority = priority;
    }

    // Get active recommendations
    const recommendations = await prisma.aIRecommendation.findMany({
      where,
      orderBy: [
        { priority: 'desc' }, // urgent > high > medium > low
        { confidence_score: 'desc' },
        { created_at: 'desc' }
      ],
      take: limit,
      select: {
        id: true,
        recommendation_type: true,
        title: true,
        description: true,
        confidence_score: true,
        data_sources: true,
        action_url: true,
        priority: true,
        status: true,
        expires_at: true,
        created_at: true,
        dog: {
          select: {
            id: true,
            name: true,
            breed: true
          }
        }
      }
    });

    // Get recommendation statistics
    const stats = await prisma.aIRecommendation.groupBy({
      by: ['recommendation_type', 'priority'],
      where: {
        user_id: userId,
        status: 'active',
        expires_at: { gt: new Date() }
      },
      _count: true
    });

    // Log analytics
    await prisma.userBehaviorAnalytics.create({
      data: {
        user_id: userId,
        session_id: `recommendations-${Date.now()}`,
        action_type: 'view_ai_recommendations',
        metadata: {
          recommendations_count: recommendations.length,
          filters: { type, priority, dog_id },
          timestamp: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        recommendations: recommendations.map(rec => ({
          id: rec.id,
          type: rec.recommendation_type,
          title: rec.title,
          description: rec.description,
          confidence: rec.confidence_score,
          data_sources: rec.data_sources,
          action_url: rec.action_url,
          priority: rec.priority,
          dog: rec.dog,
          expires_at: rec.expires_at,
          created_at: rec.created_at
        })),
        statistics: {
          total_active: recommendations.length,
          by_type: stats.reduce((acc: any, stat) => {
            if (!acc[stat.recommendation_type]) {
              acc[stat.recommendation_type] = 0;
            }
            acc[stat.recommendation_type] += stat._count;
            return acc;
          }, {}),
          by_priority: stats.reduce((acc: any, stat) => {
            if (!acc[stat.priority]) {
              acc[stat.priority] = 0;
            }
            acc[stat.priority] += stat._count;
            return acc;
          }, {}),
          urgent_count: stats.filter(s => s.priority === 'urgent').reduce((sum, s) => sum + s._count, 0)
        }
      }
    });

  } catch (error) {
    console.error('Get recommendations error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to get recommendations'
    }, { status: 500 });
  }
}

// POST /api/ai/recommendations - Generate new recommendations
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
    const { dog_id, context_type = 'general' } = body;

    // Get user profile and activity
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        experience_level: true,
        preferred_language: true,
        is_premium: true,
        location: true,
        created_at: true
      }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Get dog information if specified
    let dog = null;
    if (dog_id) {
      dog = await prisma.dog.findFirst({
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
    }

    // Get recent user activity for context
    const recentActivity = await prisma.userBehaviorAnalytics.findMany({
      where: { 
        user_id: userId,
        timestamp: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    // Get community engagement
    const communityStats = await prisma.communityQuestion.count({
      where: { 
        user_id: userId,
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    const answerStats = await prisma.communityAnswer.count({
      where: { 
        user_id: userId,
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    // Get health tracking activity if dog specified
    let healthActivity = null;
    if (dog_id) {
      healthActivity = {
        logs_count: await prisma.healthLog.count({
          where: { 
            dog_id,
            log_date: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        recent_predictions: await prisma.healthPrediction.count({
          where: { 
            dog_id,
            created_at: {
              gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
            }
          }
        })
      };
    }

    // Prepare context for AI
    const context = {
      user: {
        experience_level: user.experience_level,
        language: user.preferred_language,
        is_premium: user.is_premium,
        location: user.location,
        days_since_signup: Math.floor((Date.now() - user.created_at.getTime()) / (24 * 60 * 60 * 1000))
      },
      dog: dog ? {
        breed: dog.breed,
        age_months: dog.age_months,
        weight_kg: dog.weight_kg,
        gender: dog.gender
      } : null,
      activity: {
        recent_actions: recentActivity.length,
        action_types: [...new Set(recentActivity.map(a => a.action_type))],
        community_engagement: {
          questions_asked: communityStats,
          answers_given: answerStats
        },
        health_tracking: healthActivity
      },
      context_type
    };

    // Generate recommendations using AI
    const aiService = AIService.getInstance();
    const recommendations = await aiService.generateRecommendations(userId, dog_id || null, context);

    // Save recommendations to database
    const savedRecommendations = await Promise.all(
      recommendations.map(rec => 
        prisma.aIRecommendation.create({
          data: {
            user_id: userId,
            dog_id: dog_id || null,
            recommendation_type: rec.type,
            title: rec.title,
            description: rec.description,
            confidence_score: rec.confidence_score,
            data_sources: rec.data_sources,
            action_url: rec.action_url,
            priority: rec.priority,
            expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
          }
        })
      )
    );

    // Log analytics
    await prisma.userBehaviorAnalytics.create({
      data: {
        user_id: userId,
        session_id: `generate-recommendations-${Date.now()}`,
        action_type: 'generate_ai_recommendations',
        metadata: {
          dog_id,
          context_type,
          recommendations_generated: recommendations.length,
          user_activity_analyzed: recentActivity.length
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Recommendations generated successfully',
      data: {
        recommendations: savedRecommendations.map(rec => ({
          id: rec.id,
          type: rec.recommendation_type,
          title: rec.title,
          description: rec.description,
          confidence: rec.confidence_score,
          priority: rec.priority,
          action_url: rec.action_url,
          expires_at: rec.expires_at,
          created_at: rec.created_at
        })),
        context_analyzed: {
          user_profile: !!user,
          dog_profile: !!dog,
          recent_activity_events: recentActivity.length,
          community_engagement: communityStats + answerStats,
          health_activity: healthActivity
        }
      }
    });

  } catch (error) {
    console.error('Generate recommendations error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to generate recommendations'
    }, { status: 500 });
  }
}

// PUT /api/ai/recommendations/:id - Update recommendation status (dismiss, act upon)
export async function PUT(request: NextRequest) {
  const userId = await verifyToken(request);
  
  if (!userId) {
    return NextResponse.json({ 
      success: false,
      message: 'Authentication required' 
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { recommendation_id, action, feedback } = body;

    if (!recommendation_id || !action) {
      return NextResponse.json({
        success: false,
        message: 'Recommendation ID and action are required'
      }, { status: 400 });
    }

    const validActions = ['dismiss', 'act_upon', 'snooze'];
    if (!validActions.includes(action)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid action. Must be dismiss, act_upon, or snooze'
      }, { status: 400 });
    }

    // Verify recommendation belongs to user
    const recommendation = await prisma.aIRecommendation.findFirst({
      where: {
        id: recommendation_id,
        user_id: userId
      }
    });

    if (!recommendation) {
      return NextResponse.json({
        success: false,
        message: 'Recommendation not found or access denied'
      }, { status: 404 });
    }

    // Update recommendation based on action
    let updateData: any = {};
    
    switch (action) {
      case 'dismiss':
        updateData = { status: 'dismissed' };
        break;
      case 'act_upon':
        updateData = { status: 'acted_upon' };
        break;
      case 'snooze':
        updateData = { 
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
        };
        break;
    }

    const updatedRecommendation = await prisma.aIRecommendation.update({
      where: { id: recommendation_id },
      data: updateData
    });

    // Log analytics
    await prisma.userBehaviorAnalytics.create({
      data: {
        user_id: userId,
        session_id: `recommendation-action-${Date.now()}`,
        action_type: `recommendation_${action}`,
        metadata: {
          recommendation_id,
          recommendation_type: recommendation.recommendation_type,
          action,
          feedback: feedback || null
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Recommendation ${action.replace('_', ' ')} successfully`,
      data: {
        id: updatedRecommendation.id,
        status: updatedRecommendation.status,
        expires_at: updatedRecommendation.expires_at
      }
    });

  } catch (error) {
    console.error('Update recommendation error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update recommendation'
    }, { status: 500 });
  }
}