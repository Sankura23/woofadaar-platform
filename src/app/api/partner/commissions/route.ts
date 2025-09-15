import { NextRequest, NextResponse } from 'next/server';
import { PartnerCommissionService } from '@/lib/partner-commissions';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    // Authenticate partner
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    let partnerId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { partnerId: string };
      partnerId = decoded.partnerId;
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status') || undefined;

    const result = await PartnerCommissionService.getPartnerCommissions(
      partnerId,
      page,
      limit,
      status
    );

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get partner commissions error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to get commissions' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate partner or admin
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    let partnerId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { partnerId: string };
      partnerId = decoded.partnerId;
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      user_id, 
      amount, 
      service_type, 
      reference_id, 
      metadata 
    } = body;

    if (!user_id || !amount || !service_type || !reference_id) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const commission = await PartnerCommissionService.recordCommission(
      partnerId,
      user_id,
      amount * 100, // Convert to paise
      service_type,
      reference_id,
      metadata
    );

    return NextResponse.json({
      success: true,
      message: 'Commission recorded successfully',
      data: {
        id: commission.id,
        commission_amount: commission.commission_amount / 100,
        status: commission.status
      }
    });

  } catch (error) {
    console.error('Record commission error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to record commission' 
      },
      { status: 500 }
    );
  }
}