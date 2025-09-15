import { NextRequest, NextResponse } from 'next/server';
import { mockEvents, mockRsvps, mockWaitingList } from '@/lib/mock-events-data';

// Get individual event details with user context
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: eventId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || 'demo-user-id';

    // Find event in mock data
    const event = mockEvents.find(e => e.id === eventId);
    
    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }

    // Check user's RSVP status
    const userRsvp = mockRsvps.find(r => r.event_id === eventId && r.user_id === userId);
    const userWaiting = mockWaitingList.find(w => w.event_id === eventId && w.user_id === userId);

    // Generate mock attendees list
    const mockAttendees = [
      { user: { id: 'user-1', name: 'Arjun Patel', profile_image_url: null } },
      { user: { id: 'user-2', name: 'Deepika Sharma', profile_image_url: null } },
      { user: { id: 'user-3', name: 'Rohit Kumar', profile_image_url: null } },
      { user: { id: 'user-4', name: 'Sneha Gupta', profile_image_url: null } },
      { user: { id: 'user-5', name: 'Vikram Singh', profile_image_url: null } }
    ];

    // Generate mock waiting list
    const mockWaitingListUsers = [
      { user: { id: 'wait-1', name: 'Anita Mehta', profile_image_url: null }, position: 1 },
      { user: { id: 'wait-2', name: 'Raj Kapoor', profile_image_url: null }, position: 2 },
      { user: { id: 'demo-user-id', name: 'Demo User', profile_image_url: null }, position: 3 }
    ].filter(w => event.waiting_list_count > 0);

    // Determine user's permissions and status
    const canUserRsvp = !userRsvp && !userWaiting && event.registration_open && !event.is_full;
    const canUserJoinWaitlist = !userRsvp && !userWaiting && event.waiting_list_enabled && event.is_full;

    const eventData = {
      ...event,
      start_date: event.start_date.toISOString(),
      end_date: event.end_date.toISOString(),
      created_at: event.created_at.toISOString(),
      user_rsvp_status: userRsvp?.status || null,
      user_waiting_position: userWaiting?.position || null,
      can_user_rsvp: canUserRsvp,
      can_user_join_waitlist: canUserJoinWaitlist,
      rsvps: event.confirmed_attendees_count > 0 ? mockAttendees.slice(0, Math.min(event.confirmed_attendees_count, 5)) : [],
      waiting_list: mockWaitingListUsers
    };

    return NextResponse.json({
      success: true,
      data: eventData
    });

  } catch (error) {
    console.error('Demo Event Detail API - Error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch event details',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';