import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface AnalyticsEvent {
  user_id?: string;
  session_id: string;
  action_type: string;
  page_url?: string;
  element_clicked?: string;
  time_spent_seconds?: number;
  device_type?: string;
  browser?: string;
  location_city?: string;
  language?: string;
  ab_variant?: string;
  referrer?: string;
  error_code?: string;
  metadata?: Record<string, any>;
}

// POST /api/analytics/events - Batch insert user behavior analytics
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events } = body;

    if (!events || !Array.isArray(events)) {
      return NextResponse.json({
        success: false,
        message: 'Events array is required'
      }, { status: 400 });
    }

    // Validate and sanitize events
    const validEvents = events
      .filter((event: AnalyticsEvent) => event.session_id && event.action_type)
      .map((event: AnalyticsEvent) => ({
        user_id: event.user_id || null,
        session_id: event.session_id.substring(0, 100), // Limit length
        action_type: event.action_type.substring(0, 100),
        page_url: event.page_url?.substring(0, 500) || null,
        element_clicked: event.element_clicked?.substring(0, 200) || null,
        time_spent_seconds: event.time_spent_seconds || null,
        device_type: event.device_type?.substring(0, 50) || null,
        browser: event.browser?.substring(0, 50) || null,
        location_city: event.location_city?.substring(0, 100) || null,
        language: event.language || 'en',
        ab_variant: event.ab_variant?.substring(0, 50) || null,
        referrer: event.referrer?.substring(0, 500) || null,
        error_code: event.error_code?.substring(0, 100) || null,
        metadata: event.metadata || {},
        timestamp: new Date()
      }));

    if (validEvents.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No valid events to process'
      }, { status: 400 });
    }

    // Batch insert events
    await prisma.userBehaviorAnalytics.createMany({
      data: validEvents,
      skipDuplicates: true
    });

    console.log(`Analytics: Processed ${validEvents.length} events`);

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${validEvents.length} events`,
      data: {
        processed: validEvents.length,
        skipped: events.length - validEvents.length
      }
    });

  } catch (error) {
    console.error('Analytics events processing error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to process analytics events'
    }, { status: 500 });
  }
}

// GET /api/analytics/events - Query user behavior analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const session_id = searchParams.get('session_id');
    const action_type = searchParams.get('action_type');
    const device_type = searchParams.get('device_type');
    const language = searchParams.get('language');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '100');
    const page = parseInt(searchParams.get('page') || '1');

    // Build where clause
    const where: any = {};
    
    if (user_id) where.user_id = user_id;
    if (session_id) where.session_id = session_id;
    if (action_type) where.action_type = action_type;
    if (device_type) where.device_type = device_type;
    if (language) where.language = language;
    
    if (start_date || end_date) {
      where.timestamp = {};
      if (start_date) where.timestamp.gte = new Date(start_date);
      if (end_date) where.timestamp.lte = new Date(end_date);
    }

    // Get events with pagination
    const [events, totalCount] = await Promise.all([
      prisma.userBehaviorAnalytics.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          user_id: true,
          session_id: true,
          action_type: true,
          page_url: true,
          element_clicked: true,
          time_spent_seconds: true,
          device_type: true,
          browser: true,
          location_city: true,
          language: true,
          ab_variant: true,
          referrer: true,
          error_code: true,
          metadata: true,
          timestamp: true
        }
      }),
      prisma.userBehaviorAnalytics.count({ where })
    ]);

    // Get aggregated statistics
    const stats = await prisma.userBehaviorAnalytics.groupBy({
      by: ['action_type', 'device_type', 'language'],
      where,
      _count: true
    });

    return NextResponse.json({
      success: true,
      data: {
        events,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        },
        statistics: {
          total_events: totalCount,
          by_action: stats.reduce((acc: any, stat) => {
            acc[stat.action_type] = (acc[stat.action_type] || 0) + stat._count;
            return acc;
          }, {}),
          by_device: stats.reduce((acc: any, stat) => {
            acc[stat.device_type || 'unknown'] = (acc[stat.device_type || 'unknown'] || 0) + stat._count;
            return acc;
          }, {}),
          by_language: stats.reduce((acc: any, stat) => {
            acc[stat.language] = (acc[stat.language] || 0) + stat._count;
            return acc;
          }, {})
        }
      }
    });

  } catch (error) {
    console.error('Analytics events query error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to query analytics events'
    }, { status: 500 });
  }
}