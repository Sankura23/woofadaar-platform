// Week 25 Phase 2: Coupon Application API
// Apply coupon codes and record usage

import { NextRequest, NextResponse } from 'next/server';
import { couponService } from '@/lib/coupon-service';
import jwt from 'jsonwebtoken';

// POST /api/coupons/apply - Apply coupon code
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
      coupon_code, 
      order_amount,
      order_id,
      subscription_id,
      plan_id
    } = body;

    if (!coupon_code || !order_amount) {
      return NextResponse.json(
        { success: false, message: 'coupon_code and order_amount are required' },
        { status: 400 }
      );
    }

    const result = await couponService.applyCoupon(
      coupon_code,
      userId,
      parseFloat(order_amount),
      order_id,
      subscription_id,
      plan_id
    );

    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: result.success ? {
        usage: result.usage,
        discount_applied: result.usage?.discount_amount,
        final_amount: result.usage?.final_amount,
        original_amount: result.usage?.original_amount
      } : null
    }, { status: result.success ? 200 : 400 });

  } catch (error) {
    console.error('Apply coupon error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to apply coupon' 
      },
      { status: 500 }
    );
  }
}