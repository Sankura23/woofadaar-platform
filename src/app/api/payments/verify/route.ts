import { NextRequest, NextResponse } from 'next/server';
import { RazorpayUtils } from '@/lib/razorpay';
import prisma from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      payment_method = 'card'
    } = body;

    // Validate required fields
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, message: 'Missing payment verification parameters' },
        { status: 400 }
      );
    }

    // Verify payment signature
    const isValidSignature = RazorpayUtils.verifyPaymentSignature(
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      return NextResponse.json(
        { success: false, message: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Find the payment record
    const payment = await prisma.payment.findFirst({
      where: {
        razorpay_order_id: razorpay_order_id,
        user_id: userId,
        status: 'created'
      }
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, message: 'Payment record not found' },
        { status: 404 }
      );
    }

    // Parse metadata to get plan details
    const metadata = JSON.parse(payment.metadata || '{}');
    const planId = metadata.plan_id;
    
    if (!planId) {
      return NextResponse.json(
        { success: false, message: 'Invalid payment metadata' },
        { status: 400 }
      );
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update payment record
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          razorpay_payment_id: razorpay_payment_id,
          status: 'paid',
          payment_method: payment_method,
          updated_at: new Date()
        }
      });

      // Calculate subscription dates
      const now = new Date();
      const trialEndDate = new Date(now);
      trialEndDate.setDate(trialEndDate.getDate() + (metadata.trial_period_days || 14));
      
      const subscriptionEndDate = new Date(trialEndDate);
      if (planId === 'premium_yearly') {
        subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
      } else {
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
      }

      // Create subscription record
      const subscription = await tx.subscription.create({
        data: {
          user_id: userId,
          plan_type: 'premium',
          status: 'trialing', // Start with trial
          start_date: now,
          trial_end_date: trialEndDate,
          end_date: subscriptionEndDate,
          amount_paid: payment.amount,
          currency: 'INR',
          billing_cycle: planId === 'premium_yearly' ? 'yearly' : 'monthly',
          auto_renew: true,
          metadata: JSON.stringify({
            plan_id: planId,
            plan_name: metadata.plan_name,
            razorpay_payment_id: razorpay_payment_id,
            razorpay_order_id: razorpay_order_id,
            trial_period_days: metadata.trial_period_days
          })
        }
      });

      // Link payment to subscription
      await tx.payment.update({
        where: { id: payment.id },
        data: { subscription_id: subscription.id }
      });

      return { subscription, payment: updatedPayment };
    });

    // Create welcome notification or email (implement as needed)
    console.log(`User ${userId} successfully subscribed to ${metadata.plan_name}`);

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        subscription: {
          id: result.subscription.id,
          plan_type: result.subscription.plan_type,
          status: result.subscription.status,
          trial_end_date: result.subscription.trial_end_date,
          end_date: result.subscription.end_date,
          billing_cycle: result.subscription.billing_cycle
        },
        trial_days_remaining: Math.ceil(
          (new Date(result.subscription.trial_end_date).getTime() - Date.now()) / 
          (1000 * 60 * 60 * 24)
        )
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Payment verification failed' 
      },
      { status: 500 }
    );
  }
}