import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
import { PREMIUM_SERVICES, FREE_TIER_LIMITS } from '@/lib/revenue-config';

const verifyToken = (authHeader: string | null) => {
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Authentication required', status: 401 };
  }
  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    if (!decoded.userId) {
      return { error: 'Invalid authentication token', status: 401 };
    }
    return { decoded };
  } catch (error) {
    return { error: 'Invalid authentication token', status: 401 };
  }
};

// GET /api/premium/access - Check user's premium feature access and usage limits
export async function GET(request: NextRequest) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const { searchParams } = new URL(request.url);
    
    const feature = searchParams.get('feature'); // Specific feature to check
    const includeUsage = searchParams.get('include_usage') !== 'false';

    // Get user's active premium subscriptions
    const activeSubscriptions = await prisma.userPremiumService.findMany({
      where: {
        user_id: decoded.userId,
        status: 'active',
        expires_at: { gt: new Date() }
      }
    });

    // Determine user's access level
    const isPremiumUser = activeSubscriptions.length > 0;
    const activeServiceIds = activeSubscriptions.map(sub => sub.service_id);

    // Build comprehensive access map
    const featureAccess: { [key: string]: any } = {};
    
    // Process each premium service to determine available features
    for (const [serviceId, serviceConfig] of Object.entries(PREMIUM_SERVICES)) {
      const hasAccess = activeServiceIds.includes(serviceId);
      const subscription = activeSubscriptions.find(sub => sub.service_id === serviceId);
      
      featureAccess[serviceId] = {
        has_access: hasAccess,
        service_name: serviceConfig.name,
        category: serviceConfig.category,
        features: serviceConfig.features,
        subscription_info: subscription ? {
          expires_at: subscription.expires_at,
          days_remaining: Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          auto_renew: subscription.auto_renew
        } : null
      };
    }

    // Calculate current usage and limits
    let usageLimits: any = {};
    if (includeUsage) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get user's dogs for limit calculations
      const userDogs = await prisma.dog.findMany({
        where: { owner_id: decoded.userId },
        select: { id: true, name: true }
      });

      // Calculate health history access (free tier: 7 days, premium: unlimited)
      const healthHistoryDays = isPremiumUser ? null : FREE_TIER_LIMITS.health_history_days;
      
      // Calculate photo storage usage
      const photoStorageUsed = await prisma.$queryRaw`
        SELECT COUNT(*) as photo_count 
        FROM health_logs 
        WHERE user_id = ${decoded.userId}
        AND JSON_LENGTH(photos) > 0
      ` as any[];

      const photoCount = Number(photoStorageUsed[0]?.photo_count || 0);
      const photoStorageLimit = isPremiumUser ? null : FREE_TIER_LIMITS.photo_storage_limit;

      // Calculate expert consultations usage (current month)
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const expertConsultationsUsed = await prisma.appointment.count({
        where: {
          user_id: decoded.userId,
          appointment_type: 'consultation',
          appointment_date: { gte: currentMonth },
          status: { in: ['completed', 'scheduled'] }
        }
      });

      const consultationLimit = isPremiumUser ? null : FREE_TIER_LIMITS.expert_consultations_per_month;

      usageLimits = {
        health_history: {
          limit_days: healthHistoryDays,
          has_unlimited_access: isPremiumUser,
          description: isPremiumUser ? 'Unlimited health history access' : `${healthHistoryDays} days history access`
        },
        photo_storage: {
          used: photoCount,
          limit: photoStorageLimit,
          has_unlimited_storage: isPremiumUser,
          usage_percentage: photoStorageLimit ? Math.min(100, (photoCount / photoStorageLimit) * 100) : 0,
          description: isPremiumUser ? 'Unlimited photo storage' : `${photoCount}/${photoStorageLimit} photos used`
        },
        expert_consultations: {
          used_this_month: expertConsultationsUsed,
          monthly_limit: consultationLimit,
          has_unlimited_consultations: isPremiumUser,
          remaining: consultationLimit ? Math.max(0, consultationLimit - expertConsultationsUsed) : null,
          description: isPremiumUser ? 'Unlimited expert consultations' : `${expertConsultationsUsed}/${consultationLimit} consultations this month`
        },
        dog_profiles: {
          current_count: userDogs.length,
          has_unlimited_profiles: isPremiumUser,
          description: isPremiumUser ? 'Unlimited dog profiles' : `${userDogs.length} dog profiles`
        },
        community_features: {
          has_ad_free_experience: isPremiumUser,
          has_priority_support: isPremiumUser,
          description: isPremiumUser ? 'Ad-free experience with priority support' : 'Standard experience with ads'
        }
      };
    }

    // If checking for a specific feature, return targeted response
    if (feature) {
      const specificFeatureAccess = featureAccess[feature];
      if (!specificFeatureAccess) {
        return NextResponse.json({
          success: false,
          message: 'Unknown feature specified'
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        data: {
          feature,
          has_access: specificFeatureAccess.has_access,
          feature_details: specificFeatureAccess,
          ...(includeUsage && { usage_limits: usageLimits })
        }
      });
    }

    // Return comprehensive access information
    return NextResponse.json({
      success: true,
      data: {
        user_tier: isPremiumUser ? 'premium' : 'free',
        active_subscriptions: activeSubscriptions.length,
        feature_access: featureAccess,
        premium_services_active: activeServiceIds,
        ...(includeUsage && { usage_limits: usageLimits }),
        upgrade_recommendations: isPremiumUser ? [] : generateUpgradeRecommendations(usageLimits)
      }
    });

  } catch (error) {
    console.error('Error checking premium access:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// POST /api/premium/access - Validate and enforce feature usage limits
export async function POST(request: NextRequest) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const body = await request.json();
    
    const {
      feature,
      action, // 'validate_access', 'consume_quota', 'check_limit'
      resource_type, // 'photo', 'consultation', 'export', etc.
      quantity = 1
    } = body;

    if (!feature || !action) {
      return NextResponse.json({
        success: false,
        message: 'Feature and action are required'
      }, { status: 400 });
    }

    // Get user's active premium subscriptions
    const activeSubscriptions = await prisma.userPremiumService.findMany({
      where: {
        user_id: decoded.userId,
        status: 'active',
        expires_at: { gt: new Date() }
      }
    });

    const isPremiumUser = activeSubscriptions.length > 0;
    const hasFeatureAccess = activeSubscriptions.some(sub => {
      const serviceConfig = PREMIUM_SERVICES[sub.service_id as keyof typeof PREMIUM_SERVICES];
      return serviceConfig?.features.includes(feature);
    });

    switch (action) {
      case 'validate_access':
        return NextResponse.json({
          success: true,
          data: {
            has_access: hasFeatureAccess,
            is_premium_user: isPremiumUser,
            access_level: isPremiumUser ? 'premium' : 'free',
            feature_available: hasFeatureAccess || !isPremiumFeature(feature)
          }
        });

      case 'check_limit':
        const limitCheck = await checkUsageLimit(decoded.userId, resource_type, quantity, isPremiumUser);
        return NextResponse.json({
          success: true,
          data: limitCheck
        });

      case 'consume_quota':
        if (!isPremiumUser && isPremiumFeature(feature)) {
          const limitCheck = await checkUsageLimit(decoded.userId, resource_type, quantity, isPremiumUser);
          if (!limitCheck.within_limit) {
            return NextResponse.json({
              success: false,
              message: 'Usage limit exceeded',
              data: {
                limit_info: limitCheck,
                upgrade_required: true
              }
            }, { status: 429 });
          }
        }

        // Log usage for tracking
        await logFeatureUsage(decoded.userId, feature, resource_type, quantity);

        return NextResponse.json({
          success: true,
          message: 'Quota consumed successfully',
          data: {
            feature,
            resource_type,
            quantity_consumed: quantity,
            remaining_quota: isPremiumUser ? 'unlimited' : 'calculated_dynamically'
          }
        });

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action specified'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing premium access request:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper functions

function isPremiumFeature(feature: string): boolean {
  const premiumFeatures = [
    'advanced_analytics',
    'priority_support',
    'unlimited_photo_storage',
    'health_report_export',
    'custom_dog_id_designs',
    'ad_free_experience',
    'unlimited_consultations'
  ];
  return premiumFeatures.includes(feature);
}

async function checkUsageLimit(userId: string, resourceType: string, quantity: number, isPremiumUser: boolean): Promise<any> {
  if (isPremiumUser) {
    return {
      within_limit: true,
      is_premium: true,
      usage_description: 'Unlimited usage (Premium user)'
    };
  }

  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  switch (resourceType) {
    case 'photo':
      const photoCount = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM health_logs 
        WHERE user_id = ${userId}
        AND JSON_LENGTH(photos) > 0
      ` as any[];
      
      const currentPhotos = Number(photoCount[0]?.count || 0);
      const photoLimit = FREE_TIER_LIMITS.photo_storage_limit;
      
      return {
        within_limit: (currentPhotos + quantity) <= photoLimit,
        current_usage: currentPhotos,
        limit: photoLimit,
        requested_quantity: quantity,
        would_exceed: (currentPhotos + quantity) > photoLimit
      };

    case 'consultation':
      const consultationCount = await prisma.appointment.count({
        where: {
          user_id: userId,
          appointment_type: 'consultation',
          appointment_date: { gte: currentMonth },
          status: { in: ['completed', 'scheduled'] }
        }
      });
      
      const consultationLimit = FREE_TIER_LIMITS.expert_consultations_per_month;
      
      return {
        within_limit: (consultationCount + quantity) <= consultationLimit,
        current_usage: consultationCount,
        limit: consultationLimit,
        requested_quantity: quantity,
        would_exceed: (consultationCount + quantity) > consultationLimit
      };

    default:
      return {
        within_limit: true,
        message: 'No specific limit for this resource type'
      };
  }
}

async function logFeatureUsage(userId: string, feature: string, resourceType: string, quantity: number): Promise<void> {
  try {
    // Create a simple usage log (you could extend this with a dedicated model)
    await prisma.$executeRaw`
      INSERT INTO user_activity_logs (user_id, activity_type, activity_data, created_at)
      VALUES (${userId}, 'feature_usage', ${JSON.stringify({
        feature,
        resource_type: resourceType,
        quantity,
        timestamp: new Date().toISOString()
      })}, NOW())
      ON DUPLICATE KEY UPDATE activity_data = VALUES(activity_data)
    `;
  } catch (error) {
    console.error('Error logging feature usage:', error);
    // Don't throw error - logging failure shouldn't break functionality
  }
}

function generateUpgradeRecommendations(usageLimits: any): any[] {
  const recommendations = [];

  if (usageLimits.photo_storage?.usage_percentage > 80) {
    recommendations.push({
      feature: 'unlimited_photo_storage',
      reason: 'You\'re running low on photo storage space',
      service_id: 'premium_monthly',
      benefit: 'Unlimited photo storage for all your pets'
    });
  }

  if (usageLimits.expert_consultations?.remaining <= 0) {
    recommendations.push({
      feature: 'unlimited_consultations',
      reason: 'You\'ve reached your monthly consultation limit',
      service_id: 'premium_monthly',
      benefit: 'Unlimited expert consultations'
    });
  }

  if (!usageLimits.community_features?.has_ad_free_experience) {
    recommendations.push({
      feature: 'ad_free_experience',
      reason: 'Enjoy an ad-free experience',
      service_id: 'premium_monthly',
      benefit: 'Clean, distraction-free interface'
    });
  }

  return recommendations;
}