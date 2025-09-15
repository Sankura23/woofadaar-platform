// Week 26 Phase 2: Emergency Consultation API
// Handle urgent pet health emergencies with priority response

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { EmergencyConsultationService, EmergencyConsultationRequest } from '@/lib/emergency-consultation-service';

const prisma = new PrismaClient();

/**
 * GET /api/premium/emergency-consultation
 * Get emergency consultation status and history
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

    const { searchParams } = new URL(request.url);
    const emergencyId = searchParams.get('emergency_id');
    const action = searchParams.get('action') || 'status';

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
        upgrade_message: 'Emergency consultations are a premium feature. Upgrade to ₹99/month for 24/7 expert emergency support.',
        emergency_vet_info: 'For immediate help, contact your nearest emergency veterinary clinic.'
      }, { status: 403 });
    }

    switch (action) {
      case 'status':
        if (!emergencyId) {
          return NextResponse.json({
            error: 'Emergency ID required for status check'
          }, { status: 400 });
        }

        const statusResult = await EmergencyConsultationService.getEmergencyConsultationStatus(
          emergencyId, 
          userId
        );

        if (!statusResult.success) {
          return NextResponse.json({
            error: statusResult.error
          }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          emergency_consultation: statusResult.emergency,
          premium_feature: true
        });

      case 'history':
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = parseInt(searchParams.get('offset') || '0');

        const emergencies = await prisma.emergencyConsultation.findMany({
          where: { user_id: userId },
          orderBy: { created_at: 'desc' },
          take: limit,
          skip: offset,
          include: {
            dog: {
              select: { id: true, name: true, breed: true }
            },
            expert: {
              select: {
                id: true,
                name: true,
                ExpertProfile: {
                  select: {
                    specializations: true,
                    rating_average: true
                  }
                }
              }
            }
          }
        });

        const totalEmergencies = await prisma.emergencyConsultation.count({
          where: { user_id: userId }
        });

        return NextResponse.json({
          success: true,
          emergency_consultations: emergencies.map(emergency => ({
            id: emergency.id,
            dog: emergency.dog,
            expert: emergency.expert ? {
              id: emergency.expert.id,
              name: emergency.expert.name,
              specializations: emergency.expert.ExpertProfile?.specializations || [],
              rating: emergency.expert.ExpertProfile?.rating_average || 0
            } : null,
            emergency_type: emergency.emergency_type,
            severity_level: emergency.severity_level,
            description: emergency.description.substring(0, 100) + (emergency.description.length > 100 ? '...' : ''),
            status: emergency.status,
            triage_priority: emergency.triage_priority,
            requires_immediate_vet_visit: emergency.requires_immediate_vet_visit,
            created_at: emergency.created_at,
            resolved_at: emergency.resolved_at,
            credits_used: emergency.credits_used,
            response_time_minutes: emergency.assigned_at && emergency.created_at
              ? Math.round((emergency.assigned_at.getTime() - emergency.created_at.getTime()) / (1000 * 60))
              : null
          })),
          pagination: {
            total: totalEmergencies,
            limit,
            offset,
            has_more: offset + limit < totalEmergencies
          },
          premium_feature: true
        });

      default:
        return NextResponse.json({
          error: 'Invalid action parameter'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in emergency consultation API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        emergency_help: 'For immediate help, contact your nearest emergency veterinary clinic.',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/premium/emergency-consultation
 * Submit new emergency consultation or escalate existing one
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

    const body = await request.json();
    const { action } = body;

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
        upgrade_message: 'Emergency consultations are a premium feature. Upgrade to ₹99/month for 24/7 expert emergency support.',
        emergency_vet_info: 'For immediate help, contact your nearest emergency veterinary clinic.'
      }, { status: 403 });
    }

    switch (action) {
      case 'submit':
        const {
          dog_id,
          emergency_type,
          severity_level = 'moderate',
          description,
          symptoms = [],
          photos = [],
          location,
          contact_phone
        } = body;

        // Validate required fields
        if (!dog_id || !emergency_type || !description || !symptoms.length) {
          return NextResponse.json({
            error: 'Missing required fields: dog_id, emergency_type, description, symptoms'
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

        const emergencyRequest: EmergencyConsultationRequest = {
          userId,
          dogId: dog_id,
          emergencyType: emergency_type,
          severityLevel: severity_level,
          description,
          symptoms,
          photos,
          location,
          contactPhone: contact_phone
        };

        const emergencyResult = await EmergencyConsultationService.submitEmergencyConsultation(
          emergencyRequest
        );

        if (!emergencyResult.success) {
          return NextResponse.json({
            error: emergencyResult.message,
            nearest_vet_clinics: emergencyResult.nearest_vet_clinics,
            escalation_required: emergencyResult.escalation_required
          }, { status: emergencyResult.message.includes('Premium subscription required') ? 403 : 400 });
        }

        // Track premium feature usage
        await trackPremiumFeatureUsage(userId, 'emergency_consultation_submission');

        return NextResponse.json({
          success: true,
          emergency_consultation: {
            id: emergencyResult.emergency_id,
            status: 'submitted',
            assigned_expert: emergencyResult.assigned_expert,
            response_time: emergencyResult.response_time,
            immediate_actions: emergencyResult.immediate_actions,
            escalation_required: emergencyResult.escalation_required,
            nearest_vet_clinics: emergencyResult.nearest_vet_clinics
          },
          message: emergencyResult.message,
          premium_feature: true,
          credits_used: 3
        });

      case 'escalate':
        const { emergency_id, escalation_reason } = body;

        if (!emergency_id || !escalation_reason) {
          return NextResponse.json({
            error: 'Missing required fields: emergency_id, escalation_reason'
          }, { status: 400 });
        }

        const escalationResult = await EmergencyConsultationService.escalateToVetClinic(
          emergency_id,
          userId,
          escalation_reason
        );

        if (!escalationResult.success) {
          return NextResponse.json({
            error: escalationResult.message
          }, { status: 400 });
        }

        // Track premium feature usage
        await trackPremiumFeatureUsage(userId, 'emergency_escalation');

        return NextResponse.json({
          success: true,
          message: escalationResult.message,
          nearest_vet_clinics: escalationResult.clinic_contacts,
          escalated: true
        });

      default:
        return NextResponse.json({
          error: 'Invalid action. Use "submit" or "escalate"'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing emergency consultation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process emergency consultation',
        emergency_help: 'For immediate help, contact your nearest emergency veterinary clinic.',
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
          endpoint: '/api/premium/emergency-consultation',
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error tracking premium feature usage:', error);
  }
}