import { NextRequest, NextResponse } from 'next/server';
import { mockEvents } from '@/lib/mock-events-data';

// Demo events API endpoint with mock data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const city = searchParams.get('city') || '';
    const event_type = searchParams.get('event_type') || '';
    const is_virtual = searchParams.get('is_virtual');
    const is_free = searchParams.get('is_free');
    const is_featured = searchParams.get('is_featured');
    const status = searchParams.get('status') || 'published';
    
    const skip = (page - 1) * limit;

    // Use mock data
    let filteredEvents = mockEvents.filter(event => event.status === status);

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase();
      filteredEvents = filteredEvents.filter(event => 
        event.title.toLowerCase().includes(searchLower) || 
        event.description.toLowerCase().includes(searchLower)
      );
    }
    if (category) filteredEvents = filteredEvents.filter(event => event.category === category);
    if (city) filteredEvents = filteredEvents.filter(event => event.city === city);
    if (event_type) filteredEvents = filteredEvents.filter(event => event.event_type === event_type);
    if (is_virtual !== null) filteredEvents = filteredEvents.filter(event => event.is_virtual === (is_virtual === 'true'));
    if (is_free !== null) filteredEvents = filteredEvents.filter(event => event.is_free === (is_free === 'true'));
    if (is_featured !== null) filteredEvents = filteredEvents.filter(event => event.is_featured === (is_featured === 'true'));

    // Sort by featured first, then by date
    filteredEvents.sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });

    const totalCount = filteredEvents.length;
    const paginatedEvents = filteredEvents.slice(skip, skip + limit);

    const events = paginatedEvents.map(event => ({
      ...event,
      start_date: event.start_date.toISOString(),
      end_date: event.end_date.toISOString(),
      created_at: event.created_at.toISOString(),
      _count: {
        rsvps: event.confirmed_attendees_count,
        waiting_list: event.waiting_list_count,
        comments: event.comments_count,
        photos: event.photos_count
      }
    }));

    const responseData = {
      events,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        has_next: skip + limit < totalCount,
        has_prev: page > 1
      },
      filters: {
        search,
        category,
        city,
        event_type,
        is_virtual,
        is_free,
        is_featured,
        status
      }
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Demo Events API - Error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch events',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';