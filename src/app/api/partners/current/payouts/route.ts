import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🚨 DEPRECATED API CALLED: /api/partners/current/payouts - RETURNING MOCK DATA');
  console.log('Referrer:', request.headers.get('referer'));
  
  // Return mock payout data for now
  return NextResponse.json({
    success: true,
    data: {
      payouts: [
        {
          id: 'payout_1',
          amount: 0,
          status: 'pending',
          created_at: new Date().toISOString(),
          description: 'Monthly payout - August 2025'
        }
      ],
      total_pending: 2900,
      total_paid: 0
    }
  });
}