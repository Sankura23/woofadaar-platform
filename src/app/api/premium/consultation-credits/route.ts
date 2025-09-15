// Week 26 Phase 2: Expert Consultation Credits API
// Manage consultation credits for premium users

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { ExpertConsultationCreditService } from '@/lib/expert-consultation-credits';

const prisma = new PrismaClient();

/**
 * GET /api/premium/consultation-credits
 * Get user's consultation credit balance and history
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
    const action = searchParams.get('action') || 'balance';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    switch (action) {
      case 'balance':
        const creditBalance = await ExpertConsultationCreditService.getCreditBalance(userId);
        
        if (!creditBalance) {
          return NextResponse.json({
            error: 'Premium subscription required',
            upgrade_message: 'Expert consultations are a premium feature. Upgrade to ₹99/month for instant access to veterinary experts.',
            trial_available: true
          }, { status: 403 });
        }

        return NextResponse.json({
          success: true,
          credit_balance: creditBalance,
          premium_feature: true,
          consultation_types: {
            text_consultation: { cost: 1, description: 'Text-based consultation with expert' },
            video_consultation: { cost: 2, description: 'Video call consultation with expert' },
            emergency_consultation: { cost: 3, description: 'Emergency consultation with priority response' },
            follow_up: { cost: 0.5, description: 'Follow-up question on existing consultation' }
          }
        });

      case 'history':
        const history = await ExpertConsultationCreditService.getConsultationHistory(userId, limit, offset);
        
        const totalConsultations = await prisma.expertConsultation.count({
          where: { user_id: userId }
        });

        return NextResponse.json({
          success: true,
          consultations: history,
          pagination: {
            total: totalConsultations,
            limit,
            offset,
            has_more: offset + limit < totalConsultations
          }
        });

      case 'experts':
        const specialization = searchParams.get('specialization') || undefined;
        const consultationType = searchParams.get('type') as any || 'text';
        
        const availableExperts = await ExpertConsultationCreditService.getAvailableExperts(
          specialization,
          consultationType
        );

        return NextResponse.json({
          success: true,
          available_experts: availableExperts,
          consultation_type: consultationType,
          specialization: specialization,
          total_experts: availableExperts.length
        });

      default:
        return NextResponse.json({
          error: 'Invalid action parameter'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in consultation credits API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/premium/consultation-credits
 * Use credits for consultation or purchase additional credits
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
    const { action, consultation_type, expert_id, consultation_id, credit_count, payment_id } = body;

    switch (action) {
      case 'use_credits':
        if (!consultation_type || !expert_id || !consultation_id) {
          return NextResponse.json({
            error: 'Missing required fields: consultation_type, expert_id, consultation_id'
          }, { status: 400 });
        }

        const creditResult = await ExpertConsultationCreditService.useCredits(
          userId,
          consultation_type,
          expert_id,
          consultation_id
        );

        if (!creditResult.success) {
          return NextResponse.json({
            error: creditResult.message,
            upgrade_required: creditResult.message.includes('Premium subscription required')
          }, { status: creditResult.message.includes('Premium subscription required') ? 403 : 400 });
        }

        // Track premium feature usage
        await trackPremiumFeatureUsage(userId, 'expert_consultation_credits');

        return NextResponse.json({
          success: true,
          message: creditResult.message,
          remaining_credits: creditResult.remaining_credits,
          consultation_type,
          expert_id
        });

      case 'purchase_credits':
        if (!credit_count || !payment_id || credit_count <= 0) {
          return NextResponse.json({
            error: 'Invalid credit count or missing payment ID'
          }, { status: 400 });
        }

        const purchaseResult = await ExpertConsultationCreditService.purchaseAdditionalCredits(
          userId,
          credit_count,
          payment_id
        );

        if (!purchaseResult.success) {
          return NextResponse.json({
            error: purchaseResult.message
          }, { status: 400 });
        }

        // Track premium feature usage
        await trackPremiumFeatureUsage(userId, 'credit_purchase');

        return NextResponse.json({
          success: true,
          message: purchaseResult.message,
          credits_purchased: credit_count,
          payment_id
        });

      default:
        return NextResponse.json({
          error: 'Invalid action. Use "use_credits" or "purchase_credits"'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing consultation credits:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process credit request',
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
          endpoint: '/api/premium/consultation-credits',
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error tracking premium feature usage:', error);
  }
}