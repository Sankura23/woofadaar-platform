import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { aiInsightsEngine } from '@/lib/ai-insights-engine';

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
    const type = searchParams.get('type'); // 'user', 'business', 'predictive'
    const userId = searchParams.get('userId');

    let insights: any[] = [];

    switch (type) {
      case 'user':
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required for user insights' },
            { status: 400 }
          );
        }
        insights = await aiInsightsEngine.generateUserInsights(userId);
        break;

      case 'business':
        insights = await aiInsightsEngine.generateBusinessInsights();
        break;

      case 'predictive':
        insights = await aiInsightsEngine.generatePredictiveInsights();
        break;

      default:
        // Return all types
        const [userInsights, businessInsights, predictiveInsights] = await Promise.all([
          userId ? aiInsightsEngine.generateUserInsights(userId) : [],
          aiInsightsEngine.generateBusinessInsights(),
          aiInsightsEngine.generatePredictiveInsights()
        ]);

        insights = {
          user: userInsights,
          business: businessInsights,
          predictive: predictiveInsights
        };
        break;
    }

    return NextResponse.json({
      success: true,
      data: insights,
      type: type || 'all',
      generatedAt: new Date().toISOString(),
      count: Array.isArray(insights) ? insights.length : Object.keys(insights).length
    });

  } catch (error) {
    console.error('Error generating AI insights:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint for requesting specific insight generation
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
    const { type, userId, parameters } = body;

    let insights: any[] = [];

    switch (type) {
      case 'user_detailed':
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required' },
            { status: 400 }
          );
        }
        insights = await aiInsightsEngine.generateUserInsights(userId);
        break;

      case 'business_analysis':
        insights = await aiInsightsEngine.generateBusinessInsights();
        break;

      case 'predictive_modeling':
        insights = await aiInsightsEngine.generatePredictiveInsights();
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid insight type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: insights,
      type,
      requestedAt: new Date().toISOString(),
      parameters: parameters || {}
    });

  } catch (error) {
    console.error('Error processing insight request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}