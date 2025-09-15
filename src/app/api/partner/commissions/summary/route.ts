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

    // Get query parameters for date filtering
    const url = new URL(request.url);
    const startDateStr = url.searchParams.get('start_date');
    const endDateStr = url.searchParams.get('end_date');

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const summary = await PartnerCommissionService.getPartnerCommissionSummary(
      partnerId,
      startDate,
      endDate
    );

    return NextResponse.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Get commission summary error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to get commission summary' 
      },
      { status: 500 }
    );
  }
}