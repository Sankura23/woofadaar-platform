import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const prisma = new PrismaClient();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

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
    const { subscription_id, subscription_type = 'monthly' } = body;

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get subscription details
    const subscription = await prisma.premiumSubscription.findFirst({
      where: { 
        id: subscription_id,
        user_id: userId
      }
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Calculate amount based on subscription type
    const amount = subscription_type === 'monthly' 
      ? subscription.monthly_price 
      : subscription.annual_price;
    
    const amountInPaise = Math.round(amount * 100);

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `premium_${subscription_id}_${Date.now()}`,
      notes: {
        user_id: userId,
        subscription_id: subscription_id,
        subscription_type: subscription_type,
        service_type: 'premium_subscription'
      }
    });

    // Create subscription payment record
    const subscriptionPayment = await prisma.subscriptionPayment.create({
      data: {
        premium_subscription_id: subscription_id,
        user_id: userId,
        amount: amount,
        currency: 'INR',
        payment_status: 'pending',
        razorpay_order_id: razorpayOrder.id,
        billing_period_start: new Date(),
        billing_period_end: subscription_type === 'monthly' 
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 365 days
        invoice_number: `WD-INV-${new Date().toISOString().substring(0, 7).replace('-', '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      order_id: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID,
      subscription_payment_id: subscriptionPayment.id,
      user_details: {
        name: user.name,
        email: user.email
      },
      subscription_details: {
        type: subscription_type,
        amount_display: `₹${amount}`,
        billing_cycle: subscription_type === 'monthly' ? '1 Month' : '12 Months'
      }
    });

  } catch (error) {
    console.error('Error creating premium payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      subscription_payment_id
    } = body;

    // Verify Razorpay payment signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ 
        error: 'Invalid payment signature' 
      }, { status: 400 });
    }

    // Update subscription payment record
    const subscriptionPayment = await prisma.subscriptionPayment.update({
      where: { id: subscription_payment_id },
      data: {
        payment_status: 'completed',
        razorpay_payment_id: razorpay_payment_id,
        razorpay_signature: razorpay_signature,
        processed_at: new Date(),
        updated_at: new Date()
      },
      include: {
        premium_subscription: true,
        user: true
      }
    });

    if (!subscriptionPayment.premium_subscription) {
      return NextResponse.json({ 
        error: 'Associated subscription not found' 
      }, { status: 404 });
    }

    // Update subscription status to active
    const updatedSubscription = await prisma.premiumSubscription.update({
      where: { id: subscriptionPayment.premium_subscription_id! },
      data: {
        status: 'active',
        current_period_start: new Date(),
        current_period_end: subscriptionPayment.billing_period_end,
        next_billing_date: subscriptionPayment.billing_period_end,
        last_payment_date: new Date(),
        updated_at: new Date()
      }
    });

    // Update user's premium status
    await prisma.user.update({
      where: { id: subscriptionPayment.user_id },
      data: { is_premium: true }
    });

    // Create success log
    console.log(`Premium subscription activated for user ${subscriptionPayment.user_id}: ${updatedSubscription.subscription_type} plan - ₹${subscriptionPayment.amount}`);

    return NextResponse.json({
      success: true,
      message: 'Premium subscription activated successfully',
      subscription: updatedSubscription,
      payment: {
        amount: subscriptionPayment.amount,
        currency: subscriptionPayment.currency,
        invoice_number: subscriptionPayment.invoice_number,
        processed_at: subscriptionPayment.processed_at
      }
    });

  } catch (error) {
    console.error('Error confirming premium payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const includeAnalytics = searchParams.get('include_analytics') === 'true';

    // Get user's payment history
    const payments = await prisma.subscriptionPayment.findMany({
      where: { user_id: userId },
      include: {
        premium_subscription: {
          select: {
            subscription_type: true,
            status: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    let analytics = null;
    if (includeAnalytics) {
      const completedPayments = payments.filter(p => p.payment_status === 'completed');
      
      analytics = {
        total_payments: payments.length,
        successful_payments: completedPayments.length,
        total_spent: completedPayments.reduce((sum, p) => sum + p.amount, 0),
        average_payment: completedPayments.length > 0 
          ? completedPayments.reduce((sum, p) => sum + p.amount, 0) / completedPayments.length 
          : 0,
        payment_methods: payments.reduce((acc: any, p) => {
          const method = p.payment_method || 'razorpay';
          acc[method] = (acc[method] || 0) + 1;
          return acc;
        }, {}),
        monthly_spending: completedPayments
          .filter(p => p.processed_at && new Date(p.processed_at).getMonth() === new Date().getMonth())
          .reduce((sum, p) => sum + p.amount, 0)
      };
    }

    return NextResponse.json({
      success: true,
      payments,
      analytics
    });

  } catch (error) {
    console.error('Error fetching premium payment history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}