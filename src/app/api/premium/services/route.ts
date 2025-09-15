import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
import { PREMIUM_SERVICES } from '@/lib/revenue-config';

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

const isAdmin = (userType: string) => userType === 'admin';

// GET /api/premium/services - Get available premium services and user subscriptions
export async function GET(request: NextRequest) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const { searchParams } = new URL(request.url);
    
    const includeUserSubscriptions = searchParams.get('include_subscriptions') !== 'false';
    const category = searchParams.get('category');
    const activeOnly = searchParams.get('active_only') !== 'false';

    // Get user's current premium service subscriptions
    let userSubscriptions: any[] = [];
    if (includeUserSubscriptions) {
      const whereClause: any = { user_id: decoded.userId };
      if (activeOnly) {
        whereClause.status = 'active';
        whereClause.expires_at = { gt: new Date() };
      }

      userSubscriptions = await prisma.userPremiumService.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' }
      });
    }

    // Filter premium services by category if specified
    let availableServices = Object.entries(PREMIUM_SERVICES);
    if (category) {
      availableServices = availableServices.filter(([key, service]) => 
        service.category === category
      );
    }

    // Enhance services with user subscription status
    const enhancedServices = availableServices.map(([serviceId, serviceConfig]) => {
      const userSubscription = userSubscriptions.find(sub => sub.service_id === serviceId);
      
      return {
        service_id: serviceId,
        ...serviceConfig,
        user_subscription: userSubscription ? {
          id: userSubscription.id,
          status: userSubscription.status,
          activated_at: userSubscription.activated_at,
          expires_at: userSubscription.expires_at,
          is_active: userSubscription.status === 'active' && 
            new Date(userSubscription.expires_at) > new Date(),
          days_remaining: userSubscription.expires_at ? 
            Math.max(0, Math.ceil((new Date(userSubscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0
        } : null,
        is_subscribed: !!userSubscription && userSubscription.status === 'active' && 
          new Date(userSubscription.expires_at) > new Date()
      };
    });

    // Get service categories for filtering
    const categories = [...new Set(Object.values(PREMIUM_SERVICES).map(service => service.category))];

    // Calculate user's premium service statistics
    const userStats = {
      total_active_services: userSubscriptions.filter(sub => 
        sub.status === 'active' && new Date(sub.expires_at) > new Date()
      ).length,
      total_services_used: userSubscriptions.length,
      total_spent: userSubscriptions.reduce((sum, sub) => {
        const service = PREMIUM_SERVICES[sub.service_id as keyof typeof PREMIUM_SERVICES];
        return sum + (service?.price || 0);
      }, 0),
      expiring_soon: userSubscriptions.filter(sub => {
        if (sub.status !== 'active') return false;
        const daysRemaining = Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysRemaining <= 7 && daysRemaining > 0;
      }).length
    };

    return NextResponse.json({
      success: true,
      data: {
        available_services: enhancedServices,
        categories: categories,
        user_statistics: userStats,
        ...(includeUserSubscriptions && {
          user_subscriptions: userSubscriptions
        })
      }
    });

  } catch (error) {
    console.error('Error fetching premium services:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// POST /api/premium/services - Subscribe to a premium service
export async function POST(request: NextRequest) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const body = await request.json();
    
    const {
      service_id,
      billing_period = 'monthly', // monthly, yearly
      auto_renew = true,
      payment_method = 'razorpay',
      promo_code
    } = body;

    // Validate service ID
    if (!service_id || !PREMIUM_SERVICES[service_id as keyof typeof PREMIUM_SERVICES]) {
      return NextResponse.json({
        success: false,
        message: 'Invalid premium service ID'
      }, { status: 400 });
    }

    const serviceConfig = PREMIUM_SERVICES[service_id as keyof typeof PREMIUM_SERVICES];

    // Check if user already has an active subscription to this service
    const existingSubscription = await prisma.userPremiumService.findFirst({
      where: {
        user_id: decoded.userId,
        service_id: service_id,
        status: 'active',
        expires_at: { gt: new Date() }
      }
    });

    if (existingSubscription) {
      return NextResponse.json({
        success: false,
        message: 'You already have an active subscription to this service',
        data: { existing_subscription: existingSubscription }
      }, { status: 409 });
    }

    // Calculate pricing based on billing period
    let servicePrice = serviceConfig.price;
    let billingCycleMonths = 1;
    
    if (billing_period === 'yearly') {
      servicePrice = serviceConfig.yearlyPrice || serviceConfig.price * 10; // 2 months free for yearly
      billingCycleMonths = 12;
    }

    // Apply promo code discount if provided
    let discountAmount = 0;
    let finalPrice = servicePrice;
    
    if (promo_code) {
      // Simple promo code validation (extend this based on your promo system)
      const promoDiscounts: { [key: string]: number } = {
        'FIRST20': 0.2, // 20% off
        'WELCOME10': 0.1, // 10% off
        'YEARLY50': billing_period === 'yearly' ? 0.5 : 0 // 50% off yearly only
      };
      
      if (promoDiscounts[promo_code]) {
        discountAmount = servicePrice * promoDiscounts[promo_code];
        finalPrice = servicePrice - discountAmount;
      }
    }

    // Calculate subscription period
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + billingCycleMonths);

    // Create the premium service subscription
    const subscription = await prisma.userPremiumService.create({
      data: {
        user_id: decoded.userId,
        service_id: service_id,
        service_name: serviceConfig.name,
        service_price: finalPrice,
        billing_period: billing_period,
        status: payment_method === 'free_trial' ? 'trialing' : 'pending_payment',
        activated_at: payment_method === 'free_trial' ? now : null,
        expires_at: expiresAt,
        auto_renew: auto_renew,
        metadata: {
          original_price: servicePrice,
          discount_applied: discountAmount,
          promo_code: promo_code,
          billing_cycle_months: billingCycleMonths,
          service_category: serviceConfig.category,
          features: serviceConfig.features
        }
      }
    });

    // If this is a free trial, activate immediately
    if (payment_method === 'free_trial') {
      console.log(`Free trial activated: ${service_id} for user ${decoded.userId}`);
      
      return NextResponse.json({
        success: true,
        message: 'Free trial activated successfully',
        data: {
          subscription,
          trial_info: {
            expires_at: expiresAt,
            days_remaining: Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          }
        }
      });
    }

    // For paid subscriptions, return payment information
    const paymentInfo = {
      amount: finalPrice,
      currency: 'INR',
      service_name: serviceConfig.name,
      billing_period: billing_period,
      discount_applied: discountAmount,
      final_amount: finalPrice,
      subscription_id: subscription.id
    };

    console.log(`Premium service subscription created: ${service_id} for user ${decoded.userId} (₹${finalPrice})`);

    return NextResponse.json({
      success: true,
      message: 'Premium service subscription created successfully',
      data: {
        subscription,
        payment_info: paymentInfo,
        next_steps: {
          action: 'complete_payment',
          payment_methods: ['razorpay', 'upi', 'card'],
          payment_amount: finalPrice
        }
      }
    });

  } catch (error) {
    console.error('Error creating premium service subscription:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// PUT /api/premium/services - Update premium service subscription
export async function PUT(request: NextRequest) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const body = await request.json();
    
    const {
      subscription_id,
      action, // 'cancel', 'pause', 'resume', 'upgrade', 'renew'
      auto_renew,
      new_service_id, // For upgrades
      cancellation_reason
    } = body;

    if (!subscription_id) {
      return NextResponse.json({
        success: false,
        message: 'Subscription ID is required'
      }, { status: 400 });
    }

    // Find the subscription
    const subscription = await prisma.userPremiumService.findUnique({
      where: { id: subscription_id }
    });

    if (!subscription) {
      return NextResponse.json({
        success: false,
        message: 'Subscription not found'
      }, { status: 404 });
    }

    // Permission check
    if (!isAdmin(decoded.userType) && subscription.user_id !== decoded.userId) {
      return NextResponse.json({
        success: false,
        message: 'Access denied: You can only modify your own subscriptions'
      }, { status: 403 });
    }

    let updateData: any = {};
    let responseMessage = '';

    switch (action) {
      case 'cancel':
        updateData = {
          status: 'cancelled',
          cancelled_at: new Date(),
          auto_renew: false,
          cancellation_reason: cancellation_reason || 'User requested'
        };
        responseMessage = 'Subscription cancelled successfully';
        break;

      case 'pause':
        updateData = {
          status: 'paused',
          paused_at: new Date()
        };
        responseMessage = 'Subscription paused successfully';
        break;

      case 'resume':
        if (subscription.status !== 'paused') {
          return NextResponse.json({
            success: false,
            message: 'Subscription is not paused'
          }, { status: 400 });
        }
        updateData = {
          status: 'active',
          paused_at: null
        };
        responseMessage = 'Subscription resumed successfully';
        break;

      case 'renew':
        const renewalDate = new Date();
        const newExpiryDate = new Date(renewalDate);
        newExpiryDate.setMonth(newExpiryDate.getMonth() + 1); // Add 1 month
        
        updateData = {
          status: 'active',
          expires_at: newExpiryDate,
          renewed_at: renewalDate
        };
        responseMessage = 'Subscription renewed successfully';
        break;

      default:
        if (auto_renew !== undefined) {
          updateData.auto_renew = auto_renew;
          responseMessage = `Auto-renewal ${auto_renew ? 'enabled' : 'disabled'} successfully`;
        }
    }

    // Update the subscription
    const updatedSubscription = await prisma.userPremiumService.update({
      where: { id: subscription_id },
      data: updateData
    });

    console.log(`Premium service subscription ${action || 'updated'}: ${subscription_id} for user ${decoded.userId}`);

    return NextResponse.json({
      success: true,
      message: responseMessage || 'Subscription updated successfully',
      data: {
        subscription: updatedSubscription
      }
    });

  } catch (error) {
    console.error('Error updating premium service subscription:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}