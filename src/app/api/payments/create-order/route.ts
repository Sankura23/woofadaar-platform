import { NextRequest, NextResponse } from 'next/server';
import { razorpayClient, RazorpayUtils, SUBSCRIPTION_PLANS } from '@/lib/razorpay';
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
    const { plan_id, payment_method = 'razorpay' } = body;

    // Validate plan
    if (!RazorpayUtils.isValidPlan(plan_id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid subscription plan' },
        { status: 400 }
      );
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user already has active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: { in: ['active', 'trialing'] }
      }
    });

    if (existingSubscription) {
      return NextResponse.json(
        { success: false, message: 'You already have an active subscription' },
        { status: 409 }
      );
    }

    const planDetails = RazorpayUtils.getPlanDetails(plan_id)!;
    const amount = planDetails.amount;
    const gstAmount = RazorpayUtils.calculateGST(amount);
    const totalAmount = amount + gstAmount;

    // Create Razorpay order
    const orderData = await razorpayClient.createOrder({
      amount: totalAmount,
      currency: 'INR',
      receipt: RazorpayUtils.generateReceiptId(),
      notes: {
        user_id: userId,
        plan_id: plan_id,
        plan_name: planDetails.name,
        amount: amount.toString(),
        gst_amount: gstAmount.toString(),
        total_amount: totalAmount.toString()
      }
    });

    // Save order to database
    const payment = await prisma.payment.create({
      data: {
        user_id: userId,
        razorpay_order_id: orderData.id,
        amount: amount / 100, // Convert paise to rupees
        currency: 'INR',
        status: 'created',
        gst_amount: gstAmount / 100,
        invoice_number: `WD-${Date.now()}`,
        metadata: JSON.stringify({
          plan_id,
          plan_name: planDetails.name,
          trial_period_days: planDetails.trial_period_days,
          razorpay_order: orderData
        })
      }
    });

    // Return order details for frontend
    return NextResponse.json({
      success: true,
      data: {
        order_id: orderData.id,
        amount: totalAmount,
        currency: 'INR',
        name: 'Woofadaar Premium',
        description: `${planDetails.name} Subscription`,
        image: '/woofadaar-logo.svg',
        order: orderData,
        prefill: {
          name: user.name,
          email: user.email,
          contact: ''
        },
        notes: {
          user_id: userId,
          plan_id: plan_id
        },
        theme: {
          color: '#3bbca8'
        },
        payment_id: payment.id,
        plan_details: {
          name: planDetails.name,
          amount: RazorpayUtils.formatAmount(amount),
          gst: RazorpayUtils.formatAmount(gstAmount),
          total: RazorpayUtils.formatAmount(totalAmount),
          features: planDetails.features,
          trial_days: planDetails.trial_period_days
        }
      }
    });

  } catch (error) {
    console.error('Create payment order error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to create payment order' 
      },
      { status: 500 }
    );
  }
}