// Week 25 Phase 2: Coupon Validation and Application API
// Validate coupon codes and apply discounts

import { NextRequest, NextResponse } from 'next/server';
import { couponService } from '@/lib/coupon-service';
import jwt from 'jsonwebtoken';

// POST /api/coupons/validate - Validate coupon code
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
      plan_id 
    } = body;

    if (!coupon_code || !order_amount) {
      return NextResponse.json(
        { success: false, message: 'coupon_code and order_amount are required' },
        { status: 400 }
      );
    }

    const validation = await couponService.validateCoupon(
      coupon_code,
      userId,
      parseFloat(order_amount),
      plan_id
    );

    return NextResponse.json({
      success: validation.valid,
      message: validation.message,
      data: validation.valid ? {
        coupon: validation.coupon,
        discount_amount: validation.discount_amount,
        final_amount: validation.final_amount,
        savings: validation.discount_amount,
        savings_percentage: Math.round((validation.discount_amount / parseFloat(order_amount)) * 100)
      } : null
    });

  } catch (error) {
    console.error('Validate coupon error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to validate coupon' 
      },
      { status: 500 }
    );
  }
}