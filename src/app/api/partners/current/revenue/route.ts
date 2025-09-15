import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🚨 DEPRECATED API CALLED: /api/partners/current/revenue - RETURNING MOCK DATA');
  console.log('Referrer:', request.headers.get('referer'));
  
  // Return mock revenue data for now
  return NextResponse.json({
    success: true,
    data: {
      total_revenue: 2900,
      pending_revenue: 2900,
      completed_revenue: 0,
      monthly_breakdown: [
        { month: 'August 2025', revenue: 2900, appointments: 5 }
      ]
    }
  });
}