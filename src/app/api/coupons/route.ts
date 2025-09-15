// Week 25 Phase 2: Coupon Management API
// Create, validate, and apply promotional codes and discounts

import { NextRequest, NextResponse } from 'next/server';
import { couponService } from '@/lib/coupon-service';
import jwt from 'jsonwebtoken';

// GET /api/coupons - Get available coupons for user
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('plan_id');
    const orderAmount = searchParams.get('order_amount');

    const availableCoupons = await couponService.getUserAvailableCoupons(
      userId,
      planId || undefined,
      orderAmount ? parseFloat(orderAmount) : undefined
    );

    return NextResponse.json({
      success: true,
      data: {
        coupons: availableCoupons,
        count: availableCoupons.length
      }
    });

  } catch (error) {
    console.error('Get available coupons error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to get available coupons' 
      },
      { status: 500 }
    );
  }
}

// POST /api/coupons - Create new coupon (admin only)
export async function POST(request: NextRequest) {
  try {
    // Admin authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    let adminUserId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      adminUserId = decoded.userId;
      
      // In production, verify admin role here
      // const user = await prisma.user.findUnique({ where: { id: adminUserId } });
      // if (user?.role !== 'admin') throw new Error('Insufficient permissions');
      
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid token or insufficient permissions' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      code,
      name,
      description,
      type,
      value,
      minimum_order_amount,
      maximum_discount_amount,
      usage_limit,
      usage_limit_per_user,
      valid_from,
      valid_until,
      applicable_plans,
      first_time_users_only,
      metadata
    } = body;

    // Validate required fields
    if (!code || !name || !type || value === undefined || !valid_from || !valid_until) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate coupon type and value
    if (!['percentage', 'fixed_amount', 'free_trial_extension'].includes(type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid coupon type' },
        { status: 400 }
      );
    }

    if (type === 'percentage' && (value < 0 || value > 100)) {
      return NextResponse.json(
        { success: false, message: 'Percentage value must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (type === 'fixed_amount' && value < 0) {
      return NextResponse.json(
        { success: false, message: 'Fixed amount must be positive' },
        { status: 400 }
      );
    }

    const result = await couponService.createCoupon(
      {
        code,
        name,
        description,
        type,
        value,
        minimum_order_amount,
        maximum_discount_amount,
        usage_limit,
        usage_limit_per_user,
        valid_from: new Date(valid_from),
        valid_until: new Date(valid_until),
        applicable_plans,
        first_time_users_only: first_time_users_only || false,
        metadata
      },
      adminUserId
    );

    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: result.coupon || null
    }, { status: result.success ? 201 : 400 });

  } catch (error) {
    console.error('Create coupon error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to create coupon' 
      },
      { status: 500 }
    );
  }
}