import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🚨 DEPRECATED API CALLED: /api/partners/current/stats - REDIRECTING TO CORRECT ENDPOINT');
  console.log('Referrer:', request.headers.get('referer'));
  
  try {
    // Redirect to the correct API endpoint internally
    const authHeader = request.headers.get('authorization');
    
    const correctUrl = `${request.nextUrl.origin}/api/partner/dashboard/stats`;
    console.log('🔄 Redirecting internally to:', correctUrl);
    
    const response = await fetch(correctUrl, {
      headers: {
        'Authorization': authHeader || '',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Redirected stats API returned data:', data.success);
      return NextResponse.json(data);
    } else {
      console.error('❌ Redirected stats API failed:', response.status);
      return NextResponse.json({ success: false, message: 'Failed to fetch stats' }, { status: response.status });
    }
  } catch (error) {
    console.error('🔴 Stats redirect failed:', error);
    return NextResponse.json({
      success: false,
      message: 'This API endpoint is deprecated. Use /api/partner/dashboard/stats instead.'
    }, { status: 404 });
  }
}