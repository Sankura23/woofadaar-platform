import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { userBehaviorTracker } from '@/lib/user-behavior-tracker';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || authResult.userId;
    const days = parseInt(searchParams.get('days') || '30');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user behavior analytics
    const analytics = await userBehaviorTracker.getUserBehaviorAnalytics(userId, days);

    return NextResponse.json({
      success: true,
      data: analytics,
      userId,
      timeframe: `${days} days`
    });

  } catch (error) {
    console.error('Error fetching user behavior analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      sessionId,
      pageViews,
      timeOnPlatform,
      featuresUsed,
      actionsTaken,
      deviceType,
      browser,
      locationCity,
      referralSource,
      conversionEvents
    } = body;

    // Validate required fields
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Track user analytics
    await userBehaviorTracker.trackUserAnalytics({
      userId: authResult.userId!,
      sessionId,
      pageViews,
      timeOnPlatform,
      featuresUsed,
      actionsTaken,
      deviceType,
      browser,
      locationCity,
      referralSource,
      conversionEvents
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error tracking user analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}