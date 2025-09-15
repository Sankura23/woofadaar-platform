import { NextRequest, NextResponse } from 'next/server';
import { mockEvents, mockRsvps, mockWaitingList } from '@/lib/mock-events-data';

// Get user's events (organizing, attending, waiting list) - Demo version
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || 'demo-user-id';
    
    // Get events user is organizing (none for demo user, but some for organizers)
    const organizingEvents = mockEvents.filter(event => event.organizer_id === userId);

    // Get events user is attending (based on mockRsvps)
    const userRsvps = mockRsvps.filter(rsvp => rsvp.user_id === userId);
    const attendingEvents = mockEvents.filter(event => 
      userRsvps.some(rsvp => rsvp.event_id === event.id && rsvp.status === 'confirmed')
    ).map(event => {
      const rsvp = userRsvps.find(r => r.event_id === event.id);
      return {
        ...event,
        user_rsvp: rsvp ? {
          status: rsvp.status,
          guest_count: rsvp.guest_count,
          created_at: rsvp.created_at.toISOString()
        } : undefined
      };
    });

    // Get events user is on waiting list for (based on mockWaitingList)
    const userWaitingList = mockWaitingList.filter(wait => wait.user_id === userId);
    const waitingListEvents = mockEvents.filter(event => 
      userWaitingList.some(wait => wait.event_id === event.id && wait.status === 'waiting')
    ).map(event => {
      const wait = userWaitingList.find(w => w.event_id === event.id);
      return {
        ...event,
        user_waiting_position: wait?.position
      };
    });

    // Format the response data
    const formatEvent = (event: any, includeUserData = false) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      category: event.category,
      status: event.status,
      is_virtual: event.is_virtual,
      is_premium_only: event.is_premium_only,
      is_featured: event.is_featured,
      start_date: event.start_date.toISOString(),
      end_date: event.end_date.toISOString(),
      venue_name: event.venue_name,
      city: event.city,
      state: event.state,
      cover_image_url: event.cover_image_url,
      is_free: event.is_free,
      price: event.price,
      max_participants: event.max_participants,
      confirmed_attendees_count: event.confirmed_attendees_count,
      waiting_list_count: event.waiting_list_count,
      ...(includeUserData && event.user_rsvp && {
        user_rsvp: event.user_rsvp
      }),
      ...(includeUserData && event.user_waiting_position && {
        user_waiting_position: event.user_waiting_position
      })
    });

    const responseData = {
      organizing: organizingEvents.map(event => formatEvent(event)),
      attending: attendingEvents.map(event => formatEvent(event, true)),
      waiting_list: waitingListEvents.map(event => formatEvent(event, true)),
      counts: {
        organizing: organizingEvents.length,
        attending: attendingEvents.length,
        waiting_list: waitingListEvents.length,
        total: organizingEvents.length + attendingEvents.length + waitingListEvents.length
      }
    };

    console.log('Demo My Events API - User events fetched successfully', {
      userId,
      organizingCount: organizingEvents.length,
      attendingCount: attendingEvents.length,
      waitingCount: waitingListEvents.length
    });

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Demo My Events API - Error fetching user events:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch events',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';