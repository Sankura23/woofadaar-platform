import prisma from '@/lib/db';
import { FREE_TIER_LIMITS } from '@/lib/razorpay';

export type FeatureName = 
  | 'advanced_health_analytics'
  | 'priority_vet_appointments'
  | 'unlimited_photo_storage'
  | 'custom_dog_id_designs'
  | 'health_report_exports'
  | 'expert_consultations'
  | 'ad_free_experience'
  | 'priority_support'
  | 'health_history_unlimited';

export interface FeatureAccess {
  hasAccess: boolean;
  reason?: string;
  limitReached?: boolean;
  currentUsage?: number;
  limit?: number;
  upgradeRequired?: boolean;
  trialExpired?: boolean;
}

export class PremiumFeatureService {
  /**
   * Check if user has access to a premium feature
   */
  static async checkFeatureAccess(userId: string, feature: FeatureName): Promise<FeatureAccess> {
    try {
      // Get user's current subscription
      const subscription = await prisma.subscription.findFirst({
        where: {
          user_id: userId,
          status: { in: ['active', 'trialing'] }
        },
        orderBy: { created_at: 'desc' }
      });

      // If no subscription, check free tier limits
      if (!subscription) {
        return this.checkFreeTierAccess(userId, feature);
      }

      // Check if subscription is valid
      const now = new Date();
      const endDate = new Date(subscription.end_date);
      
      if (now > endDate) {
        return {
          hasAccess: false,
          reason: 'Subscription expired',
          upgradeRequired: true
        };
      }

      // Premium users have access to all features
      return {
        hasAccess: true
      };

    } catch (error) {
      console.error('Feature access check error:', error);
      return {
        hasAccess: false,
        reason: 'Error checking feature access'
      };
    }
  }

  /**
   * Check free tier access and limits
   */
  private static async checkFreeTierAccess(userId: string, feature: FeatureName): Promise<FeatureAccess> {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    switch (feature) {
      case 'expert_consultations':
        const consultationsThisMonth = await prisma.premiumFeatureUsage.count({
          where: {
            user_id: userId,
            feature_name: 'expert_consultation',
            created_at: { gte: currentMonth }
          }
        });

        return {
          hasAccess: consultationsThisMonth < FREE_TIER_LIMITS.expert_consultations_per_month,
          limitReached: consultationsThisMonth >= FREE_TIER_LIMITS.expert_consultations_per_month,
          currentUsage: consultationsThisMonth,
          limit: FREE_TIER_LIMITS.expert_consultations_per_month,
          upgradeRequired: consultationsThisMonth >= FREE_TIER_LIMITS.expert_consultations_per_month,
          reason: consultationsThisMonth >= FREE_TIER_LIMITS.expert_consultations_per_month 
            ? 'Monthly expert consultation limit reached' 
            : undefined
        };

      case 'unlimited_photo_storage':
        const photoCount = await prisma.dogPhoto.count({
          where: {
            dog: { user_id: userId }
          }
        });

        return {
          hasAccess: photoCount < FREE_TIER_LIMITS.photo_storage_limit,
          limitReached: photoCount >= FREE_TIER_LIMITS.photo_storage_limit,
          currentUsage: photoCount,
          limit: FREE_TIER_LIMITS.photo_storage_limit,
          upgradeRequired: photoCount >= FREE_TIER_LIMITS.photo_storage_limit,
          reason: photoCount >= FREE_TIER_LIMITS.photo_storage_limit 
            ? 'Photo storage limit reached' 
            : undefined
        };

      case 'health_history_unlimited':
        // Free tier can only see last 7 days of health history
        return {
          hasAccess: false,
          reason: 'Health history limited to 7 days on free plan',
          upgradeRequired: true
        };

      case 'advanced_health_analytics':
      case 'priority_vet_appointments':
      case 'custom_dog_id_designs':
      case 'health_report_exports':
      case 'ad_free_experience':
      case 'priority_support':
        return {
          hasAccess: false,
          reason: 'Premium feature requires subscription',
          upgradeRequired: true
        };

      default:
        return {
          hasAccess: false,
          reason: 'Unknown feature',
          upgradeRequired: true
        };
    }
  }

  /**
   * Track premium feature usage
   */
  static async trackFeatureUsage(
    userId: string, 
    featureName: string, 
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.premiumFeatureUsage.create({
        data: {
          user_id: userId,
          feature_name: featureName,
          usage_count: 1,
          metadata: metadata ? JSON.stringify(metadata) : undefined
        }
      });
    } catch (error) {
      console.error('Feature usage tracking error:', error);
    }
  }

  /**
   * Get user's feature usage stats
   */
  static async getFeatureUsageStats(userId: string): Promise<Record<string, number>> {
    try {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const usageStats = await prisma.premiumFeatureUsage.groupBy({
        by: ['feature_name'],
        where: {
          user_id: userId,
          created_at: { gte: currentMonth }
        },
        _sum: {
          usage_count: true
        }
      });

      const stats: Record<string, number> = {};
      usageStats.forEach(stat => {
        stats[stat.feature_name] = stat._sum.usage_count || 0;
      });

      return stats;
    } catch (error) {
      console.error('Feature usage stats error:', error);
      return {};
    }
  }

  /**
   * Check if user can access health history for specific days
   */
  static async checkHealthHistoryAccess(userId: string, daysBack: number): Promise<FeatureAccess> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: { in: ['active', 'trialing'] }
      }
    });

    if (subscription) {
      // Premium users have unlimited access
      return { hasAccess: true };
    }

    // Free tier limited to 7 days
    if (daysBack <= FREE_TIER_LIMITS.health_history_days) {
      return { hasAccess: true };
    }

    return {
      hasAccess: false,
      reason: `Health history limited to ${FREE_TIER_LIMITS.health_history_days} days on free plan`,
      upgradeRequired: true
    };
  }

  /**
   * Get filtered health logs based on subscription
   */
  static async getHealthLogsWithAccess(userId: string, dogId?: string) {
    const hasAccess = await this.checkFeatureAccess(userId, 'health_history_unlimited');
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - FREE_TIER_LIMITS.health_history_days);

    const whereClause: any = {
      dog: { user_id: userId }
    };

    if (dogId) {
      whereClause.dog_id = dogId;
    }

    // If not premium, limit to recent logs
    if (!hasAccess.hasAccess) {
      whereClause.created_at = { gte: sevenDaysAgo };
    }

    return prisma.healthLog.findMany({
      where: whereClause,
      include: {
        dog: {
          select: { id: true, name: true, breed: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }
}

/**
 * Middleware-style function to check feature access in API routes
 */
export async function requirePremiumFeature(
  userId: string, 
  feature: FeatureName
): Promise<{ allowed: boolean; response?: any }> {
  const access = await PremiumFeatureService.checkFeatureAccess(userId, feature);
  
  if (!access.hasAccess) {
    return {
      allowed: false,
      response: {
        success: false,
        message: access.reason || 'Premium feature requires subscription',
        feature_required: feature,
        upgrade_required: access.upgradeRequired,
        current_usage: access.currentUsage,
        limit: access.limit,
        premium_features_url: '/premium/upgrade'
      }
    };
  }

  return { allowed: true };
}