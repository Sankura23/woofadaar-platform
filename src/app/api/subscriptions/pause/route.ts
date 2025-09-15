// Week 25 Phase 1: Subscription Pause/Resume API
// Family plan exclusive feature for temporary suspension

import { NextRequest, NextResponse } from 'next/server';
import { subscriptionManager } from '@/lib/subscription-manager';
import jwt from 'jsonwebtoken';

// POST /api/subscriptions/pause - Pause subscription (family plans only)
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { pause_duration } = body;

    if (!pause_duration || pause_duration < 1 || pause_duration > 90) {
      return NextResponse.json(
        { success: false, message: 'Pause duration must be between 1-90 days' },
        { status: 400 }
      );
    }

    const result = await subscriptionManager.pauseSubscription(userId, pause_duration);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: result.success ? {
        resume_date: result.resumeDate
      } : null
    }, { status: result.success ? 200 : 400 });

  } catch (error) {
    console.error('Subscription pause error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to pause subscription' 
      },
      { status: 500 }
    );
  }
}