// Week 26 Phase 3: Insurance Partnership API
// Connect premium users with pet insurance providers

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { InsurancePartnershipService } from '@/lib/insurance-partnership-service';

const prisma = new PrismaClient();

/**
 * GET /api/premium/insurance
 * Get insurance recommendations, claims, or provider connections
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
        upgrade_message: 'Insurance partnerships are a premium feature. Upgrade to ₹99/month for exclusive access to pet insurance providers with special discounts.',
        trial_available: true
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'recommendations';
    const dogId = searchParams.get('dog_id');

    switch (action) {
      case 'recommendations':
        if (!dogId) {
          return NextResponse.json({
            error: 'Dog ID is required for insurance recommendations'
          }, { status: 400 });
        }

        try {
          const recommendations = await InsurancePartnershipService.getInsuranceRecommendations(
            userId,
            dogId
          );

          return NextResponse.json({
            success: true,
            insurance_recommendations: recommendations,
            premium_feature: true,
            woofadaar_benefits: {
              exclusive_discounts: 'Up to 18% off on premiums',
              dedicated_support: 'Claim assistance and priority support',
              expert_guidance: 'Personalized recommendations based on your pet\'s health data'
            }
          });
        } catch (error) {
          return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to get recommendations'
          }, { status: 400 });
        }

      case 'claims':
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');

        const claimsResult = await InsurancePartnershipService.getUserInsuranceClaims(
          userId,
          limit,
          offset
        );

        if (!claimsResult.success) {
          return NextResponse.json({
            error: claimsResult.message
          }, { status: 403 });
        }

        return NextResponse.json({
          success: true,
          insurance_claims: claimsResult.claims,
          pagination: claimsResult.pagination,
          premium_feature: true,
          woofadaar_assistance: {
            available: true,
            benefits: [
              'Dedicated claim specialist support',
              'Document review and assistance',
              'Direct communication with insurance providers',
              'Faster claim processing'
            ]
          }
        });

      case 'connections':
        const connections = await prisma.insuranceConnection.findMany({
          where: { user_id: userId },
          orderBy: { created_at: 'desc' },
          take: 10,
          include: {
            dog: {
              select: { id: true, name: true, breed: true }
            }
          }
        });

        return NextResponse.json({
          success: true,
          insurance_connections: connections.map(conn => ({
            id: conn.id,
            dog: conn.dog,
            provider_id: conn.provider_id,
            plan_type: conn.plan_type,
            status: conn.status,
            created_at: conn.created_at,
            connection_details: conn.connection_details
          })),
          premium_feature: true
        });

      case 'providers':
        // Return available insurance providers with Woofadaar partnership details
        const providers = [
          {
            id: 'bajaj_allianz_pet',
            name: 'Bajaj Allianz Pet Insurance',
            logo_url: '/insurance/bajaj-allianz.png',
            description: 'Comprehensive pet insurance with nationwide coverage',
            premium_range: { min_monthly: 599, max_monthly: 2499 },
            woofadaar_discount: 15,
            rating: 4.3,
            key_features: [
              'Cashless treatment at 500+ clinics',
              'No age limit for enrollment',
              '24/7 helpline support'
            ]
          },
          {
            id: 'tata_aig_pet',
            name: 'Tata AIG Pet Insurance',
            logo_url: '/insurance/tata-aig.png',
            description: 'Reliable pet protection with preventive care focus',
            premium_range: { min_monthly: 499, max_monthly: 1999 },
            woofadaar_discount: 12,
            rating: 4.1,
            key_features: [
              'Coverage from day 1 for accidents',
              'Preventive care package included',
              'Direct billing at partner clinics'
            ]
          },
          {
            id: 'icici_lombard_pet',
            name: 'ICICI Lombard Pet Insurance',
            logo_url: '/insurance/icici-lombard.png',
            description: 'Digital-first pet insurance with instant processing',
            premium_range: { min_monthly: 699, max_monthly: 2899 },
            woofadaar_discount: 18,
            rating: 4.4,
            key_features: [
              'Instant policy issuance',
              'AI-powered claim processing',
              'Telemedicine consultations included'
            ]
          }
        ];

        return NextResponse.json({
          success: true,
          insurance_providers: providers,
          partnership_benefits: {
            exclusive_discounts: 'Up to 18% discount with Woofadaar partnership',
            priority_support: 'Dedicated customer support for Woofadaar users',
            enhanced_features: 'Additional benefits not available to regular customers'
          },
          premium_feature: true
        });

      default:
        return NextResponse.json({
          error: 'Invalid action parameter'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in insurance partnership API:', error);
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
 * POST /api/premium/insurance
 * Submit insurance claim or connect with provider
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
        upgrade_message: 'Insurance partnerships are a premium feature. Upgrade to ₹99/month for exclusive access.'
      }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'submit_claim':
        const {
          dog_id,
          provider_id,
          policy_number,
          claim_amount,
          claim_type,
          incident_date,
          description,
          supporting_documents = [],
          vet_bills = [],
          request_assistance = true
        } = body;

        // Validate required fields
        if (!dog_id || !provider_id || !policy_number || !claim_amount || !claim_type || !incident_date || !description) {
          return NextResponse.json({
            error: 'Missing required fields: dog_id, provider_id, policy_number, claim_amount, claim_type, incident_date, description'
          }, { status: 400 });
        }

        const claimResult = await InsurancePartnershipService.submitInsuranceClaim(
          userId,
          {
            dog_id,
            provider_id,
            policy_number,
            claim_amount: parseFloat(claim_amount),
            claim_type,
            incident_date: new Date(incident_date),
            description,
            supporting_documents,
            vet_bills,
            request_assistance
          }
        );

        if (!claimResult.success) {
          return NextResponse.json({
            error: claimResult.message
          }, { status: 400 });
        }

        // Track premium feature usage
        await trackPremiumFeatureUsage(userId, 'insurance_claim_submission');

        return NextResponse.json({
          success: true,
          claim: {
            id: claimResult.claim_id,
            message: claimResult.message,
            assistance_included: claimResult.assistance_included,
            next_steps: request_assistance ? [
              'Woofadaar specialist will review your documents',
              'You will receive a call within 24 hours',
              'We will handle all communication with the insurance provider',
              'Track progress in your insurance dashboard'
            ] : [
              'Your claim has been submitted to the insurance provider',
              'You will receive updates via email and SMS',
              'Expected processing time: 7-10 working days',
              'Contact support if you need assistance'
            ]
          },
          premium_feature: true
        });

      case 'connect_provider':
        const { provider_id, dog_id, plan_type } = body;

        if (!provider_id || !dog_id || !plan_type) {
          return NextResponse.json({
            error: 'Missing required fields: provider_id, dog_id, plan_type'
          }, { status: 400 });
        }

        const connectionResult = await InsurancePartnershipService.connectWithInsuranceProvider(
          userId,
          provider_id,
          dog_id,
          plan_type
        );

        if (!connectionResult.success) {
          return NextResponse.json({
            error: connectionResult.message
          }, { status: 400 });
        }

        // Track premium feature usage
        await trackPremiumFeatureUsage(userId, 'insurance_provider_connection');

        return NextResponse.json({
          success: true,
          connection: {
            message: connectionResult.message,
            details: connectionResult.connection_details,
            next_steps: [
              'Insurance provider will contact you within 24 hours',
              'They will provide personalized quote with Woofadaar discount',
              'Our team will assist with policy selection and documentation',
              'You can track the connection status in your dashboard'
            ]
          },
          premium_feature: true
        });

      default:
        return NextResponse.json({
          error: 'Invalid action. Use "submit_claim" or "connect_provider"'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing insurance request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process insurance request',
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
          endpoint: '/api/premium/insurance',
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error tracking premium feature usage:', error);
  }
}