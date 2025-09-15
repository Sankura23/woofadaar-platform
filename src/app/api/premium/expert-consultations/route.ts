// Week 26 Phase 2: Expert Consultation API
// Create and manage expert consultations using credit system

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { ExpertConsultationCreditService } from '@/lib/expert-consultation-credits';

const prisma = new PrismaClient();

/**
 * GET /api/premium/expert-consultations
 * Get user's expert consultations
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.id;

    // Verify premium access
    const subscription = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: 'active'
      }
    });

    if (!subscription) {
      return NextResponse.json({
        error: 'Premium subscription required',
        upgrade_message: 'Expert consultations are a premium feature. Upgrade to ₹99/month for instant access to veterinary experts.',
        trial_available: true
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const consultationId = searchParams.get('consultation_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (consultationId) {
      // Get specific consultation
      const consultation = await prisma.expertConsultation.findFirst({
        where: {
          id: consultationId,
          user_id: userId
        },
        include: {
          expert: {
            select: {
              id: true,
              name: true,
              ExpertProfile: {
                select: {
                  specializations: true,
                  rating_average: true,
                  experience_years: true,
                  consultation_count: true
                }
              }
            }
          },
          dog: {
            select: { id: true, name: true, breed: true, age_months: true }
          },
          messages: {
            orderBy: { created_at: 'asc' }
          }
        }
      });

      if (!consultation) {
        return NextResponse.json({
          error: 'Consultation not found'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        consultation: {
          id: consultation.id,
          dog: consultation.dog,
          expert: {
            id: consultation.expert.id,
            name: consultation.expert.name,
            specializations: consultation.expert.ExpertProfile?.specializations || [],
            rating: consultation.expert.ExpertProfile?.rating_average || 0,
            experience_years: consultation.expert.ExpertProfile?.experience_years || 0,
            total_consultations: consultation.expert.ExpertProfile?.consultation_count || 0
          },
          consultation_type: consultation.consultation_type,
          question: consultation.question,
          status: consultation.status,
          created_at: consultation.created_at,
          responded_at: consultation.responded_at,
          rating: consultation.rating,
          feedback: consultation.feedback,
          follow_up_available: consultation.follow_up_allowed,
          credits_used: consultation.credits_used,
          messages: consultation.messages,
          metadata: consultation.metadata
        }
      });
    }

    // Get user's consultations list
    const whereClause: any = { user_id: userId };
    if (status) {
      whereClause.status = status;
    }

    const consultations = await prisma.expertConsultation.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      include: {
        expert: {
          select: {
            id: true,
            name: true,
            ExpertProfile: {
              select: {
                specializations: true,
                rating_average: true,
                response_time_hours: true
              }
            }
          }
        },
        dog: {
          select: { id: true, name: true, breed: true }
        }
      }
    });

    const totalConsultations = await prisma.expertConsultation.count({
      where: whereClause
    });

    return NextResponse.json({
      success: true,
      consultations: consultations.map(consultation => ({
        id: consultation.id,
        dog: consultation.dog,
        expert: {
          id: consultation.expert.id,
          name: consultation.expert.name,
          specializations: consultation.expert.ExpertProfile?.specializations || [],
          rating: consultation.expert.ExpertProfile?.rating_average || 0,
          response_time: consultation.expert.ExpertProfile?.response_time_hours || 24
        },
        consultation_type: consultation.consultation_type,
        question: consultation.question.substring(0, 100) + (consultation.question.length > 100 ? '...' : ''),
        status: consultation.status,
        created_at: consultation.created_at,
        responded_at: consultation.responded_at,
        rating: consultation.rating,
        is_follow_up: consultation.is_follow_up,
        follow_up_available: consultation.follow_up_allowed,
        credits_used: consultation.credits_used
      })),
      pagination: {
        total: totalConsultations,
        limit,
        offset,
        has_more: offset + limit < totalConsultations
      }
    });

  } catch (error) {
    console.error('Error fetching expert consultations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consultations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/premium/expert-consultations
 * Create new expert consultation
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.id;

    // Verify premium access
    const subscription = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: 'active'
      }
    });

    if (!subscription) {
      return NextResponse.json({
        error: 'Premium subscription required',
        upgrade_message: 'Expert consultations are a premium feature. Upgrade to ₹99/month for instant access to veterinary experts.',
        trial_available: true
      }, { status: 403 });
    }

    const body = await request.json();
    const {
      dog_id,
      consultation_type = 'text',
      question,
      expert_id,
      urgency_level = 'normal',
      photos = [],
      follow_up_consultation_id
    } = body;

    // Validate required fields
    if (!dog_id || !question) {
      return NextResponse.json({
        error: 'Missing required fields: dog_id, question'
      }, { status: 400 });
    }

    // Verify dog ownership
    const dog = await prisma.dog.findFirst({
      where: {
        id: dog_id,
        user_id: userId
      }
    });

    if (!dog) {
      return NextResponse.json({
        error: 'Dog not found or access denied'
      }, { status: 404 });
    }

    // Check credit balance
    const creditBalance = await ExpertConsultationCreditService.getCreditBalance(userId);
    if (!creditBalance) {
      return NextResponse.json({
        error: 'Unable to verify credit balance'
      }, { status: 500 });
    }

    const consultationCost = ExpertConsultationCreditService['getConsultationCost'](consultation_type);
    
    if (consultation_type === 'emergency' && creditBalance.emergency_credits < consultationCost) {
      return NextResponse.json({
        error: `Insufficient emergency credits. Need ${consultationCost} credits, have ${creditBalance.emergency_credits}.`,
        upgrade_message: 'Purchase additional credits or upgrade your plan for more monthly credits.'
      }, { status: 400 });
    } else if (consultation_type !== 'emergency' && creditBalance.available_credits < consultationCost) {
      return NextResponse.json({
        error: `Insufficient credits. Need ${consultationCost} credits, have ${creditBalance.available_credits}.`,
        next_refresh: creditBalance.next_refresh_date
      }, { status: 400 });
    }

    // Auto-assign expert if not specified
    let assignedExpert = null;
    if (expert_id) {
      assignedExpert = await prisma.expertProfile.findFirst({
        where: {
          user_id: expert_id,
          verification_status: 'verified',
          availability_status: 'available'
        },
        include: { user: true }
      });
    } else {
      // Auto-assign best available expert
      const availableExperts = await ExpertConsultationCreditService.getAvailableExperts(
        undefined,
        consultation_type as any
      );
      if (availableExperts.length > 0) {
        const expertId = availableExperts[0].id;
        assignedExpert = await prisma.expertProfile.findFirst({
          where: { user_id: expertId },
          include: { user: true }
        });
      }
    }

    if (!assignedExpert) {
      return NextResponse.json({
        error: 'No available experts found for this consultation type'
      }, { status: 503 });
    }

    // Create the consultation
    const consultation = await prisma.expertConsultation.create({
      data: {
        user_id: userId,
        dog_id: dog_id,
        expert_id: assignedExpert.user_id,
        consultation_type,
        question,
        urgency_level,
        photos,
        status: 'submitted',
        is_follow_up: Boolean(follow_up_consultation_id),
        follow_up_consultation_id,
        credits_used: consultationCost,
        metadata: {
          auto_assigned: !expert_id,
          submission_timestamp: new Date().toISOString(),
          expected_response_time: assignedExpert.response_time_hours
        }
      }
    });

    // Use credits for the consultation
    const creditResult = await ExpertConsultationCreditService.useCredits(
      userId,
      consultation_type as any,
      assignedExpert.user_id,
      consultation.id
    );

    if (!creditResult.success) {
      // If credit usage failed, delete the consultation
      await prisma.expertConsultation.delete({
        where: { id: consultation.id }
      });
      
      return NextResponse.json({
        error: creditResult.message
      }, { status: 400 });
    }

    // Update consultation status
    await prisma.expertConsultation.update({
      where: { id: consultation.id },
      data: {
        status: 'assigned',
        assigned_at: new Date()
      }
    });

    // Create initial message
    await prisma.consultationMessage.create({
      data: {
        consultation_id: consultation.id,
        sender_id: userId,
        sender_type: 'user',
        message: question,
        message_type: 'question',
        attachments: photos.length > 0 ? photos : undefined
      }
    });

    // Track premium feature usage
    await trackPremiumFeatureUsage(userId, 'expert_consultation');

    return NextResponse.json({
      success: true,
      consultation: {
        id: consultation.id,
        dog_id: dog_id,
        expert: {
          id: assignedExpert.user.id,
          name: assignedExpert.user.name,
          specializations: assignedExpert.specializations,
          expected_response_time: assignedExpert.response_time_hours
        },
        consultation_type,
        status: 'assigned',
        created_at: consultation.created_at,
        credits_used: consultationCost,
        remaining_credits: creditResult.remaining_credits,
        expected_response: `Within ${assignedExpert.response_time_hours} hours`
      },
      message: `Consultation submitted successfully! Expert ${assignedExpert.user.name} will respond within ${assignedExpert.response_time_hours} hours.`
    });

  } catch (error) {
    console.error('Error creating expert consultation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create consultation',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

async function trackPremiumFeatureUsage(userId: string, featureName: string) {
  try {
    await prisma.featureUsageLog.create({
      data: {
        user_id: userId,
        feature_id: featureName,
        usage_count: 1,
        metadata: {
          endpoint: '/api/premium/expert-consultations',
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error tracking premium feature usage:', error);
  }
}