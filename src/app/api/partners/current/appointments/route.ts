import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🚨 DEPRECATED API CALLED: /api/partners/current/appointments - REDIRECTING TO CORRECT ENDPOINT');
  console.log('Referrer:', request.headers.get('referer'));
  
  try {
    // Redirect to the correct API endpoint internally
    const authHeader = request.headers.get('authorization');
    const searchParams = request.nextUrl.searchParams.toString();
    
    const correctUrl = `${request.nextUrl.origin}/api/partner/appointments${searchParams ? `?${searchParams}` : ''}`;
    console.log('🔄 Redirecting internally to:', correctUrl);
    
    const response = await fetch(correctUrl, {
      headers: {
        'Authorization': authHeader || '',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Redirected API returned data:', data.data?.appointments?.length || 0, 'appointments');
      return NextResponse.json(data);
    } else {
      console.error('❌ Redirected API failed:', response.status);
      return NextResponse.json({ success: false, message: 'Failed to fetch appointments' }, { status: response.status });
    }
  } catch (error) {
    console.error('🔴 Redirect failed:', error);
    return NextResponse.json({
      success: false,
      message: 'This API endpoint is deprecated. Use /api/partner/appointments instead.'
    }, { status: 404 });
  }
}