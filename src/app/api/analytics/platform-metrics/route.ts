import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { userBehaviorTracker } from '@/lib/user-behavior-tracker';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and admin access
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin privileges (you may want to implement this check)
    // For now, we'll allow any authenticated user to view platform metrics
    // In production, add proper admin role checking

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    // Get platform-wide behavior metrics
    const metrics = await userBehaviorTracker.getPlatformBehaviorMetrics(days);

    return NextResponse.json({
      success: true,
      data: metrics,
      timeframe: `${days} days`,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching platform metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}