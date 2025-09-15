import { NextRequest, NextResponse } from 'next/server';
import { PremiumFeatureService, FeatureName } from '@/lib/premium-features';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { feature } = body;

    if (!feature) {
      return NextResponse.json(
        { success: false, message: 'Feature name is required' },
        { status: 400 }
      );
    }

    // Validate feature name
    const validFeatures: FeatureName[] = [
      'advanced_health_analytics',
      'priority_vet_appointments', 
      'unlimited_photo_storage',
      'custom_dog_id_designs',
      'health_report_exports',
      'expert_consultations',
      'ad_free_experience',
      'priority_support',
      'health_history_unlimited'
    ];

    if (!validFeatures.includes(feature)) {
      return NextResponse.json(
        { success: false, message: 'Invalid feature name' },
        { status: 400 }
      );
    }

    // Try to get user ID from token (optional for some checks)
    let userId: string | null = null;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        userId = decoded.userId;
      } catch (error) {
        // Token invalid but we can still return feature info for anonymous users
        console.log('Invalid token provided, continuing with anonymous check');
      }
    }

    if (!userId) {
      // For anonymous users or invalid tokens, return free tier access info
      const freeTierAccess = {
        hasAccess: false,
        reason: 'Premium feature requires subscription',
        upgradeRequired: true,
        currentUsage: 0,
        limit: 0
      };

      return NextResponse.json({
        success: true,
        data: freeTierAccess
      });
    }

    // Check feature access for authenticated user
    const access = await PremiumFeatureService.checkFeatureAccess(userId, feature);

    return NextResponse.json({
      success: true,
      data: access
    });

  } catch (error) {
    console.error('Premium access check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to check premium access' 
      },
      { status: 500 }
    );
  }
}