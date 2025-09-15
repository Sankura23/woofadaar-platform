import { NextRequest, NextResponse } from 'next/server';
import { SUBSCRIPTION_PLANS } from '@/lib/razorpay';

export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const { planId } = params;

    if (!planId) {
      return NextResponse.json(
        { success: false, message: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Get plan details from configuration
    const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
    
    if (!plan) {
      return NextResponse.json(
        { success: false, message: 'Plan not found' },
        { status: 404 }
      );
    }

    // Calculate display amount with GST
    const baseAmount = plan.amount / 100; // Convert from paise to rupees
    const gstAmount = Math.round(baseAmount * 0.18);
    const totalAmount = baseAmount + gstAmount;

    const planDetails = {
      id: plan.id,
      name: plan.name,
      amount: `₹${totalAmount}`,
      base_amount: `₹${baseAmount}`,
      gst_amount: `₹${gstAmount}`,
      features: plan.features,
      trial_days: plan.trial_period_days,
      interval: plan.interval,
      description: plan.description || 'Premium subscription with advanced features',
      savings: planId === 'premium_yearly' ? '₹198 (2 months free!)' : null
    };

    return NextResponse.json({
      success: true,
      data: planDetails
    });

  } catch (error) {
    console.error('Get plan details error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to get plan details' 
      },
      { status: 500 }
    );
  }
}