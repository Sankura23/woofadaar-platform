import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('payment_id');
    const orderId = searchParams.get('order_id');

    if (!paymentId || !orderId) {
      return NextResponse.json(
        { success: false, message: 'Payment ID and Order ID are required' },
        { status: 400 }
      );
    }

    // Find payment record
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        razorpay_order_id: orderId,
        user_id: userId,
        status: 'paid'
      },
      include: {
        subscription: {
          select: {
            id: true,
            plan_type: true,
            status: true,
            trial_end_date: true,
            end_date: true,
            billing_cycle: true,
            metadata: true
          }
        }
      }
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, message: 'Payment not found or not completed' },
        { status: 404 }
      );
    }

    // Parse metadata to get plan details
    const metadata = JSON.parse(payment.metadata || '{}');
    const subscriptionMetadata = payment.subscription ? JSON.parse(payment.subscription.metadata || '{}') : {};

    const responseData = {
      payment_id: payment.razorpay_payment_id || payment.id,
      order_id: payment.razorpay_order_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      payment_method: payment.payment_method,
      created_at: payment.created_at,
      invoice_number: payment.invoice_number,
      invoice_url: payment.invoice_url,
      plan_name: metadata.plan_name || subscriptionMetadata.plan_name || 'Premium Plan',
      subscription_id: payment.subscription?.id,
      trial_end_date: payment.subscription?.trial_end_date,
      subscription_status: payment.subscription?.status,
      billing_cycle: payment.subscription?.billing_cycle,
      next_billing_date: payment.subscription?.end_date
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Get payment details error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to get payment details' 
      },
      { status: 500 }
    );
  }
}