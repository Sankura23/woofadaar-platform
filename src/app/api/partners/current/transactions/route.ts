import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🚨 DEPRECATED API CALLED: /api/partners/current/transactions - RETURNING MOCK DATA');
  console.log('Referrer:', request.headers.get('referer'));
  
  // Return mock transaction data for now
  return NextResponse.json({
    success: true,
    data: {
      transactions: [
        {
          id: 'txn_1',
          amount: 500,
          type: 'appointment_fee',
          status: 'pending',
          created_at: new Date().toISOString(),
          description: 'Consultation fee'
        }
      ],
      total: 1
    }
  });
}