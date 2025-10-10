// Week 26 Phase 3: Premium Dashboard API
// Comprehensive dashboard showing all premium features, usage, and benefits

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { HealthAnalyticsService } from '@/lib/health-analytics-service';
import { ExpertConsultationCreditService } from '@/lib/expert-consultation-credits';
import { LoyaltyRewardsService } from '@/lib/loyalty-rewards-service';

const prisma = new PrismaClient();

/**
 * GET /api/premium/dashboard
 * Get comprehensive premium dashboard data
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
      },
      include: {
        payments: {
          where: { status: 'completed' },
          orderBy: { created_at: 'desc' },
          take: 1
        }
      }
    });

    if (!subscription) {
      return NextResponse.json({
        error: 'Premium subscription required',
        upgrade_message: 'Access the comprehensive premium dashboard with advanced health analytics, expert consultations, insurance partnerships, and exclusive rewards.',
        premium_benefits: {
          health_analytics: 'AI-powered health insights and predictions',
          expert_consultations: 'Priority access to veterinary experts',
          insurance_partnerships: 'Exclusive insurance deals and claim assistance',
          priority_support: '24/7 priority customer support',
          loyalty_rewards: 'Earn rewards and unlock exclusive benefits'
        },
        upgrade_cta: 'Subscribe to Premium for ₹99/month'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '30'; // days
    const timeframeDays = parseInt(timeframe);

    // Get user's dogs for dashboard
    const dogs = await prisma.dog.findMany({
      where: { user_id: userId },
      include: {
        health_logs: {
          take: 5,
          orderBy: { created_at: 'desc' }
        },
        vet_appointments: {
          take: 3,
          orderBy: { appointment_datetime: 'desc' }
        }
      }
    });

    // Get subscription details
    const subscriptionDetails = {
      plan_type: subscription.plan_type,
      status: subscription.status,
      start_date: subscription.start_date,
      end_date: subscription.end_date,
      next_billing_date: subscription.next_billing_date,
      last_payment: subscription.payments[0] ? {
        amount: subscription.payments[0].amount,
        date: subscription.payments[0].created_at,
        status: subscription.payments[0].status
      } : null,
      days_remaining: Math.ceil((subscription.end_date.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)),
      auto_renewal: subscription.auto_renewal
    };

    // Get consultation credit balance
    const creditBalance = await ExpertConsultationCreditService.getCreditBalance(userId);

    // Get loyalty status
    const loyaltyStatus = await LoyaltyRewardsService.getUserLoyaltyStatus(userId);

    // Get recent premium feature usage
    const featureUsage = await prisma.featureUsageLog.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { created_at: 'desc' },
      take: 20
    });

    // Calculate usage statistics
    const usageStats = {
      total_feature_uses: featureUsage.length,
      health_analytics_uses: featureUsage.filter(f => f.feature_id.includes('health')).length,
      consultation_uses: featureUsage.filter(f => f.feature_id.includes('consultation')).length,
      insurance_uses: featureUsage.filter(f => f.feature_id.includes('insurance')).length,
      support_uses: featureUsage.filter(f => f.feature_id.includes('support')).length,
      most_used_features: getMostUsedFeatures(featureUsage)
    };

    // Get recent health analytics for primary dog
    let healthInsights = null;
    if (dogs.length > 0) {
      try {
        healthInsights = await HealthAnalyticsService.generateHealthAnalytics(
          dogs[0].id,
          userId,
          timeframeDays
        );
      } catch (error) {
        console.warn('Could not generate health insights:', error);
      }
    }

    // Get recent support tickets
    const recentSupportTickets = await prisma.supportTicket.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 3,
      select: {
        id: true,
        subject: true,
        status: true,
        priority: true,
        created_at: true,
        category: true
      }
    });

    // Get recent expert consultations
    const recentConsultations = await prisma.expertConsultation.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 3,
      include: {
        expert: {
          select: { id: true, name: true }
        },
        dog: {
          select: { id: true, name: true }
        }
      }
    });

    // Get insurance claims
    const insuranceClaims = await prisma.insuranceClaim.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 3,
      select: {
        id: true,
        claim_amount: true,
        status: true,
        claim_type: true,
        created_at: true,
        provider_id: true
      }
    });

    // Get upcoming appointments
    const upcomingAppointments = await prisma.vetAppointment.findMany({
      where: {
        user_id: userId,
        appointment_datetime: {
          gte: new Date()
        }
      },
      orderBy: { appointment_datetime: 'asc' },
      take: 5,
      include: {
        dog: {
          select: { id: true, name: true }
        },
        vet: {
          select: { id: true, name: true }
        }
      }
    });

    // Get recent loyalty rewards
    const recentRewards = await LoyaltyRewardsService.getUserLoyaltyRewards(userId);
    const unredeemedRewards = recentRewards.filter(r => !r.redeemed);

    // Calculate premium value delivered
    const premiumValue = calculatePremiumValue(
      creditBalance,
      loyaltyStatus,
      featureUsage.length,
      timeframeDays
    );

    // Build comprehensive dashboard response
    const dashboardData = {
      subscription: subscriptionDetails,
      user_profile: {
        premium_since: subscription.start_date,
        loyalty_tier: loyaltyStatus?.current_tier || 'bronze',
        total_dogs: dogs.length,
        active_features: getActiveFeaturesCount(featureUsage)
      },
      quick_stats: {
        consultation_credits_available: creditBalance?.available_credits || 0,
        emergency_credits_available: creditBalance?.emergency_credits || 0,
        loyalty_points: loyaltyStatus?.available_points || 0,
        unredeemed_rewards: unredeemedRewards.length,
        active_support_tickets: recentSupportTickets.filter(t => t.status !== 'closed').length,
        upcoming_appointments: upcomingAppointments.length
      },
      feature_usage: {
        timeframe_days: timeframeDays,
        ...usageStats,
        usage_trend: calculateUsageTrend(featureUsage, timeframeDays)
      },
      health_overview: healthInsights ? {
        overall_score: healthInsights.overall_health_score,
        trending_concerns: healthInsights.alerts.slice(0, 3),
        recent_predictions: healthInsights.predictions.slice(0, 2),
        dogs_tracked: dogs.length
      } : null,
      consultations: {
        credit_balance: creditBalance,
        recent_consultations: recentConsultations.map(consultation => ({
          id: consultation.id,
          expert_name: consultation.expert?.name || 'Expert',
          dog_name: consultation.dog?.name || 'Dog',
          consultation_type: consultation.consultation_type,
          status: consultation.status,
          created_at: consultation.created_at
        })),
        next_credit_refresh: creditBalance?.next_refresh_date
      },
      insurance: {
        active_claims: insuranceClaims.length,
        recent_claims: insuranceClaims.map(claim => ({
          id: claim.id,
          amount: claim.claim_amount,
          status: claim.status,
          type: claim.claim_type,
          created_at: claim.created_at
        })),
        partnership_benefits: [
          'Exclusive discounts up to 18%',
          'Dedicated claim assistance',
          'Priority processing'
        ]
      },
      support: {
        recent_tickets: recentSupportTickets,
        premium_benefits: {
          priority_queue: true,
          dedicated_agents: true,
          phone_support: true,
          response_time: 'Within 4 hours'
        }
      },
      loyalty: loyaltyStatus ? {
        current_tier: loyaltyStatus.current_tier,
        tier_progress: {
          months_completed: loyaltyStatus.premium_months,
          next_tier: loyaltyStatus.next_tier,
          months_to_next: loyaltyStatus.months_to_next_tier
        },
        rewards_summary: {
          available_rewards: unredeemedRewards.length,
          total_points: loyaltyStatus.total_loyalty_points,
          referral_code: null // Would be fetched separately if needed
        },
        referral_stats: {
          total_referrals: loyaltyStatus.referrals_made,
          successful_conversions: loyaltyStatus.successful_referrals
        }
      } : null,
      appointments: {
        upcoming: upcomingAppointments.map(apt => ({
          id: apt.id,
          dog_name: apt.dog?.name,
          vet_name: apt.vet?.name,
          date: apt.appointment_datetime,
          type: apt.appointment_type,
          is_premium_booking: apt.is_premium_booking
        })),
        priority_booking_available: true
      },
      premium_value: premiumValue,
      recommendations: generateDashboardRecommendations(
        creditBalance,
        loyaltyStatus,
        featureUsage,
        upcomingAppointments.length,
        healthInsights
      )
    };

    // Track dashboard access
    await trackFeatureUsage(userId, 'premium_dashboard_access');

    return NextResponse.json({
      success: true,
      dashboard: dashboardData,
      generated_at: new Date().toISOString(),
      premium_active: true
    });

  } catch (error) {
    console.error('Error generating premium dashboard:', error);
    return NextResponse.json(
      {
        error: 'Failed to load premium dashboard',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// Helper methods
function getMostUsedFeatures(featureUsage: any[]): Array<{feature: string, count: number}> {
    const featureCounts: {[key: string]: number} = {};
    
    featureUsage.forEach(usage => {
      const feature = usage.feature_id;
      featureCounts[feature] = (featureCounts[feature] || 0) + 1;
    });

    return Object.entries(featureCounts)
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

function getActiveFeaturesCount(featureUsage: any[]): number {
    const uniqueFeatures = new Set(featureUsage.map(usage => usage.feature_id));
    return uniqueFeatures.size;
  }

function calculateUsageTrend(featureUsage: any[], timeframeDays: number): string {
    if (featureUsage.length < 2) return 'stable';

    const halfwayPoint = Date.now() - (timeframeDays * 24 * 60 * 60 * 1000) / 2;
    const recentUsage = featureUsage.filter(usage => 
      usage.created_at.getTime() > halfwayPoint
    ).length;
    const olderUsage = featureUsage.length - recentUsage;

    if (recentUsage > olderUsage * 1.2) return 'increasing';
    if (recentUsage < olderUsage * 0.8) return 'decreasing';
    return 'stable';
  }

function calculatePremiumValue(
    creditBalance: any,
    loyaltyStatus: any,
    featureUsageCount: number,
    timeframeDays: number
  ): any {
    const monthlySubscriptionCost = 99;
    const periodMultiplier = timeframeDays / 30;
    const periodCost = monthlySubscriptionCost * periodMultiplier;

    // Calculate value delivered
    const consultationValue = (creditBalance?.used_credits || 0) * 150; // ₹150 per consultation
    const supportValue = featureUsageCount * 50; // ₹50 value per feature use
    const loyaltyValue = (loyaltyStatus?.total_loyalty_points || 0) * 0.1; // ₹0.1 per point
    const insuranceValue = 500; // Fixed insurance partnership value

    const totalValue = consultationValue + supportValue + loyaltyValue + insuranceValue;
    const valueSaved = Math.max(0, totalValue - periodCost);

    return {
      subscription_cost: periodCost,
      value_delivered: totalValue,
      value_saved: valueSaved,
      roi_percentage: periodCost > 0 ? Math.round((valueSaved / periodCost) * 100) : 0,
      breakdown: {
        consultation_value: consultationValue,
        support_value: supportValue,
        loyalty_value: loyaltyValue,
        insurance_value: insuranceValue
      }
    };
  }

function generateDashboardRecommendations(
    creditBalance: any,
    loyaltyStatus: any,
    featureUsage: any[],
    upcomingAppointments: number,
    healthInsights: any
  ): string[] {
    const recommendations = [];

    // Credit-based recommendations
    if (creditBalance && creditBalance.available_credits < 2) {
      recommendations.push('Your consultation credits are running low. Consider purchasing additional credits or wait for monthly refresh.');
    }

    // Loyalty recommendations
    if (loyaltyStatus && loyaltyStatus.months_to_next_tier <= 2) {
      recommendations.push(`You're ${loyaltyStatus.months_to_next_tier} months away from ${loyaltyStatus.next_tier} tier! Unlock exclusive benefits.`);
    }

    // Health recommendations
    if (healthInsights && healthInsights.overall_health_score < 75) {
      recommendations.push('Your pet\'s health score could improve. Book a vet consultation or review our health recommendations.');
    }

    // Appointment recommendations
    if (upcomingAppointments === 0) {
      recommendations.push('No upcoming appointments scheduled. Use priority booking to schedule regular checkups.');
    }

    // Feature usage recommendations
    const lowUsageFeatures = ['health_analytics', 'insurance', 'emergency_consultation'];
    const unusedFeatures = lowUsageFeatures.filter(feature => 
      !featureUsage.some(usage => usage.feature_id.includes(feature))
    );

    if (unusedFeatures.length > 0) {
      recommendations.push(`You haven't used these premium features yet: ${unusedFeatures.join(', ')}. Explore them to get more value!`);
    }

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

async function trackFeatureUsage(userId: string, featureName: string): Promise<void> {
    try {
      await prisma.featureUsageLog.create({
        data: {
          user_id: userId,
          feature_id: featureName,
          usage_count: 1,
          metadata: {
            timestamp: new Date(),
            endpoint: '/api/premium/dashboard'
          }
        }
      });
    } catch (error) {
      console.error('Error tracking feature usage:', error);
    }
  }