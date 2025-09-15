import { NextRequest, NextResponse } from 'next/server';
import { userBehaviorTracker } from '@/lib/user-behavior-tracker';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      sessionId,
      eventType,
      eventCategory,
      eventName,
      eventData,
      pageUrl,
      referrerUrl,
      deviceInfo,
      locationData,
      userAgent,
      timestamp
    } = body;

    // Validate required fields
    if (!sessionId || !eventType || !eventCategory || !eventName) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, eventType, eventCategory, eventName' },
        { status: 400 }
      );
    }

    // Track the behavior event
    await userBehaviorTracker.trackEvent({
      userId: userId || undefined,
      sessionId,
      eventType,
      eventCategory,
      eventName,
      eventData: eventData || {},
      pageUrl: pageUrl || undefined,
      referrerUrl: referrerUrl || undefined,
      deviceInfo: deviceInfo || undefined,
      locationData: locationData || undefined,
      userAgent: userAgent || request.headers.get('user-agent') || undefined
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error tracking behavior:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support GET for simple ping/health check
export async function GET() {
  return NextResponse.json({ 
    service: 'behavior-tracking',
    status: 'active',
    timestamp: new Date().toISOString()
  });
}