import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

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
    const status = searchParams.get('status') || 'all';
    const includeHistory = searchParams.get('include_history') === 'true';

    // Verify premium access
    const premiumSubscription = await prisma.premiumSubscription.findFirst({
      where: {
        user_id: userId,
        status: { in: ['trial', 'active'] }
      }
    });

    if (!premiumSubscription) {
      return NextResponse.json({
        error: 'Premium subscription required',
        message: 'Expert consultations are available with premium subscription',
        upgrade_options: {
          trial: 'Start 14-day free trial',
          monthly: 'Premium monthly at ₹99/month',
          annual: 'Premium annual at ₹999/year (save ₹199)'
        }
      }, { status: 403 });
    }

    // Check consultation usage limits
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlyUsage = await prisma.premiumFeatureUsage.findUnique({
      where: {
        premium_subscription_id_feature_name_usage_month: {
          premium_subscription_id: premiumSubscription.id,
          feature_name: 'expert_consultation',
          usage_month: currentMonth
        }
      }
    });

    const consultationsUsed = monthlyUsage?.usage_count || 0;
    const consultationsLimit = monthlyUsage?.monthly_limit || 3; // Default 3 per month
    const consultationsRemaining = Math.max(0, consultationsLimit - consultationsUsed);

    // Get user's consultations
    const whereClause: any = { user_id: userId };
    if (status !== 'all') {
      whereClause.status = status;
    }

    const consultations = await prisma.expertConsultation.findMany({
      where: whereClause,
      include: {
        expert: {
          select: {
            id: true,
            name: true,
            business_name: true,
            specialization: true,
            experience_years: true,
            rating_average: true,
            certifications: true
          }
        },
        dog: {
          select: {
            id: true,
            name: true,
            breed: true,
            age_months: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: includeHistory ? 50 : 10
    });

    // Get available experts for booking
    const availableExperts = await prisma.partner.findMany({
      where: {
        partner_type: { in: ['veterinarian', 'expert'] },
        verified: true,
        status: 'active'
      },
      select: {
        id: true,
        name: true,
        business_name: true,
        specialization: true,
        experience_years: true,
        rating_average: true,
        rating_count: true,
        certifications: true,
        languages_spoken: true,
        availability_schedule: true,
        pricing_info: true
      },
      orderBy: [
        { rating_average: 'desc' },
        { experience_years: 'desc' }
      ],
      take: 20
    });

    return NextResponse.json({
      success: true,
      subscription_status: {
        type: premiumSubscription.subscription_type,
        status: premiumSubscription.status,
        consultations_used: consultationsUsed,
        consultations_remaining: consultationsRemaining,
        consultations_limit: consultationsLimit,
        resets_on: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
      },
      consultations: {
        total: consultations.length,
        by_status: consultations.reduce((acc: any, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        }, {}),
        recent: consultations
      },
      available_experts: availableExperts.map(expert => ({
        ...expert,
        next_available: generateNextAvailableSlots(expert.availability_schedule),
        consultation_fee: extractConsultationFee(expert.pricing_info),
        premium_discount: '20% off for premium members'
      })),
      consultation_types: [
        {
          type: 'general_health',
          name: 'General Health Consultation',
          duration: '30 minutes',
          description: 'Comprehensive health discussion with veterinary expert'
        },
        {
          type: 'behavioral',
          name: 'Behavioral Consultation',
          duration: '45 minutes',
          description: 'Expert advice on training and behavioral issues'
        },
        {
          type: 'nutrition',
          name: 'Nutrition Consultation',
          duration: '30 minutes',
          description: 'Personalized nutrition and dietary planning'
        },
        {
          type: 'emergency',
          name: 'Emergency Consultation',
          duration: '15-30 minutes',
          description: 'Urgent health concerns requiring immediate expert advice'
        }
      ]
    });

  } catch (error) {
    console.error('Error fetching expert consultations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const {
      expert_partner_id,
      dog_id,
      consultation_type = 'general_health',
      preferred_datetime,
      consultation_reason,
      health_history_summary,
      specific_questions = [],
      urgency_level = 'normal',
      preferred_language = 'en'
    } = body;

    // Verify premium access and usage limits
    const premiumSubscription = await prisma.premiumSubscription.findFirst({
      where: {
        user_id: userId,
        status: { in: ['trial', 'active'] }
      }
    });

    if (!premiumSubscription) {
      return NextResponse.json({
        error: 'Premium subscription required for expert consultations'
      }, { status: 403 });
    }

    // Check monthly consultation limits
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlyUsage = await prisma.premiumFeatureUsage.findUnique({
      where: {
        premium_subscription_id_feature_name_usage_month: {
          premium_subscription_id: premiumSubscription.id,
          feature_name: 'expert_consultation',
          usage_month: currentMonth
        }
      }
    });

    const consultationsUsed = monthlyUsage?.usage_count || 0;
    const consultationsLimit = monthlyUsage?.monthly_limit || 3;

    if (consultationsUsed >= consultationsLimit && urgency_level !== 'emergency') {
      return NextResponse.json({
        error: 'Monthly consultation limit reached',
        message: `You have used ${consultationsUsed}/${consultationsLimit} consultations this month`,
        suggestions: [
          'Wait for next month\'s reset',
          'Upgrade to higher tier for more consultations',
          'Use emergency consultation if urgent'
        ]
      }, { status: 429 });
    }

    // Validate expert availability
    const expert = await prisma.partner.findUnique({
      where: { id: expert_partner_id },
      select: {
        id: true,
        name: true,
        business_name: true,
        verified: true,
        status: true,
        availability_schedule: true,
        pricing_info: true
      }
    });

    if (!expert || !expert.verified || expert.status !== 'active') {
      return NextResponse.json({
        error: 'Expert not available',
        message: 'Selected expert is not currently available for consultations'
      }, { status: 400 });
    }

    // Validate dog ownership
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

    // Calculate pricing with premium discount
    const baseFee = extractConsultationFee(expert.pricing_info, consultation_type);
    const premiumDiscount = 0.2; // 20% discount for premium users
    const finalFee = Math.round(baseFee * (1 - premiumDiscount));

    // Create consultation booking
    const consultation = await prisma.expertConsultation.create({
      data: {
        user_id: userId,
        dog_id: dog_id,
        expert_partner_id: expert_partner_id,
        consultation_type,
        status: 'requested',
        scheduled_at: new Date(preferred_datetime),
        consultation_reason,
        health_history_summary,
        specific_questions,
        urgency_level,
        preferred_language,
        consultation_fee: finalFee,
        premium_discount_applied: premiumDiscount,
        original_fee: baseFee,
        payment_status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      },
      include: {
        expert: {
          select: {
            name: true,
            business_name: true,
            specialization: true
          }
        },
        dog: {
          select: {
            name: true,
            breed: true
          }
        }
      }
    });

    // Track feature usage (only if not emergency override)
    if (urgency_level !== 'emergency' || consultationsUsed < consultationsLimit) {
      await trackConsultationUsage(premiumSubscription.id);
    }

    // Send confirmation notifications (would implement email/push notifications here)
    await sendConsultationConfirmation(consultation, expert, dog);

    return NextResponse.json({
      success: true,
      message: 'Expert consultation requested successfully',
      consultation: {
        id: consultation.id,
        consultation_type: consultation.consultation_type,
        expert: consultation.expert,
        dog: consultation.dog,
        scheduled_at: consultation.scheduled_at,
        consultation_fee: consultation.consultation_fee,
        original_fee: consultation.original_fee,
        premium_savings: baseFee - finalFee,
        status: consultation.status,
        urgency_level: consultation.urgency_level
      },
      next_steps: [
        'Expert will confirm availability within 2 hours',
        'You will receive payment instructions once confirmed',
        'Consultation link will be provided 15 minutes before scheduled time'
      ],
      payment_info: {
        amount: finalFee,
        currency: 'INR',
        premium_discount: `₹${baseFee - finalFee} saved with premium membership`
      }
    });

  } catch (error) {
    console.error('Error creating expert consultation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.id;

    const body = await request.json();
    const { consultation_id, action, ...updateData } = body;

    // Find and validate consultation ownership
    const consultation = await prisma.expertConsultation.findFirst({
      where: {
        id: consultation_id,
        user_id: userId
      }
    });

    if (!consultation) {
      return NextResponse.json({
        error: 'Consultation not found or access denied'
      }, { status: 404 });
    }

    let updatedConsultation;

    switch (action) {
      case 'reschedule':
        if (!updateData.new_datetime) {
          return NextResponse.json({
            error: 'New datetime required for rescheduling'
          }, { status: 400 });
        }
        
        updatedConsultation = await prisma.expertConsultation.update({
          where: { id: consultation_id },
          data: {
            scheduled_at: new Date(updateData.new_datetime),
            status: 'rescheduled',
            rescheduled_at: new Date(),
            reschedule_reason: updateData.reason,
            updated_at: new Date()
          }
        });
        break;

      case 'cancel':
        // Check cancellation policy
        const hoursUntilConsultation = (new Date(consultation.scheduled_at).getTime() - new Date().getTime()) / (1000 * 60 * 60);
        const refundEligible = hoursUntilConsultation > 24;

        updatedConsultation = await prisma.expertConsultation.update({
          where: { id: consultation_id },
          data: {
            status: 'cancelled',
            cancelled_at: new Date(),
            cancellation_reason: updateData.reason,
            refund_eligible: refundEligible,
            updated_at: new Date()
          }
        });

        // Process refund if eligible
        if (refundEligible && consultation.payment_status === 'completed') {
          await processConsultationRefund(consultation);
        }
        break;

      case 'add_notes':
        updatedConsultation = await prisma.expertConsultation.update({
          where: { id: consultation_id },
          data: {
            additional_notes: updateData.notes,
            updated_at: new Date()
          }
        });
        break;

      case 'complete_payment':
        if (!updateData.payment_id) {
          return NextResponse.json({
            error: 'Payment ID required'
          }, { status: 400 });
        }

        updatedConsultation = await prisma.expertConsultation.update({
          where: { id: consultation_id },
          data: {
            payment_status: 'completed',
            payment_id: updateData.payment_id,
            payment_completed_at: new Date(),
            status: 'confirmed',
            updated_at: new Date()
          }
        });
        break;

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported actions: reschedule, cancel, add_notes, complete_payment'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Consultation ${action} successful`,
      consultation: updatedConsultation
    });

  } catch (error) {
    console.error('Error updating expert consultation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
function generateNextAvailableSlots(schedule: any): string[] {
  // Simplified implementation - in reality, this would parse the schedule JSON
  // and find actual available time slots
  const slots = [];
  const now = new Date();
  
  for (let i = 1; i <= 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    slots.push(date.toISOString());
  }
  
  return slots.slice(0, 3); // Return next 3 available slots
}

function extractConsultationFee(pricingInfo: any, consultationType: string = 'general_health'): number {
  // Default pricing structure
  const defaultPricing = {
    'general_health': 500,
    'behavioral': 600,
    'nutrition': 450,
    'emergency': 800
  };

  if (pricingInfo && typeof pricingInfo === 'object') {
    return pricingInfo[consultationType] || pricingInfo.consultation || 500;
  }

  return (defaultPricing as any)[consultationType] || 500;
}

async function trackConsultationUsage(subscriptionId: string) {
  const currentMonth = new Date().toISOString().substring(0, 7);
  
  try {
    await prisma.premiumFeatureUsage.upsert({
      where: {
        premium_subscription_id_feature_name_usage_month: {
          premium_subscription_id: subscriptionId,
          feature_name: 'expert_consultation',
          usage_month: currentMonth
        }
      },
      update: {
        usage_count: { increment: 1 },
        last_used_at: new Date()
      },
      create: {
        premium_subscription_id: subscriptionId,
        feature_name: 'expert_consultation',
        usage_count: 1,
        usage_month: currentMonth,
        monthly_limit: 3, // Default limit
        last_used_at: new Date()
      }
    });
  } catch (error) {
    console.error('Error tracking consultation usage:', error);
  }
}

async function sendConsultationConfirmation(consultation: any, expert: any, dog: any) {
  // Implementation would send email/push notifications
  console.log(`Consultation confirmation sent for ${consultation.id}:`);
  console.log(`- Expert: ${expert.name}`);
  console.log(`- Dog: ${dog.name}`);
  console.log(`- Scheduled: ${consultation.scheduled_at}`);
  
  // In real implementation:
  // - Send email to user with consultation details
  // - Send notification to expert about new booking request
  // - Schedule reminder notifications
}

async function processConsultationRefund(consultation: any) {
  // Implementation would process refund through payment gateway
  console.log(`Processing refund for consultation ${consultation.id}: ₹${consultation.consultation_fee}`);
  
  // In real implementation:
  // - Call Razorpay refund API
  // - Update payment status
  // - Send refund confirmation
}