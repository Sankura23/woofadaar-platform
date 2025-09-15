import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import logger from '@/lib/logger';

const prisma = new PrismaClient();

// Get user's events (organizing, attending, waiting list)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    // Get events user is organizing
    const organizingEvents = await prisma.event.findMany({
      where: {
        organizer_id: userId,
        status: {
          not: 'deleted' // Exclude deleted events
        }
      },
      select: {
        id: true,
        title: true,
        description: true,
        event_type: true,
        category: true,
        status: true,
        is_virtual: true,
        is_premium_only: true,
        is_featured: true,
        start_date: true,
        end_date: true,
        venue_name: true,
        city: true,
        state: true,
        cover_image_url: true,
        is_free: true,
        price: true,
        max_participants: true,
        current_participants: true,
        created_at: true,
        _count: {
          select: {
            rsvps: {
              where: { status: 'confirmed' }
            },
            waiting_list: {
              where: { status: 'waiting' }
            }
          }
        }
      },
      orderBy: { start_date: 'asc' }
    });

    // Get events user is attending (confirmed RSVPs)
    const attendingEvents = await prisma.event.findMany({
      where: {
        status: 'published',
        rsvps: {
          some: {
            user_id: userId,
            status: 'confirmed'
          }
        }
      },
      select: {
        id: true,
        title: true,
        description: true,
        event_type: true,
        category: true,
        status: true,
        is_virtual: true,
        is_premium_only: true,
        is_featured: true,
        start_date: true,
        end_date: true,
        venue_name: true,
        city: true,
        state: true,
        cover_image_url: true,
        is_free: true,
        price: true,
        max_participants: true,
        current_participants: true,
        rsvps: {
          where: { user_id: userId },
          select: {
            status: true,
            guest_count: true,
            created_at: true
          },
          take: 1
        },
        _count: {
          select: {
            rsvps: {
              where: { status: 'confirmed' }
            },
            waiting_list: {
              where: { status: 'waiting' }
            }
          }
        }
      },
      orderBy: { start_date: 'asc' }
    });

    // Get events user is on waiting list for
    const waitingListEvents = await prisma.event.findMany({
      where: {
        status: 'published',
        waiting_list: {
          some: {
            user_id: userId,
            status: 'waiting'
          }
        }
      },
      select: {
        id: true,
        title: true,
        description: true,
        event_type: true,
        category: true,
        status: true,
        is_virtual: true,
        is_premium_only: true,
        is_featured: true,
        start_date: true,
        end_date: true,
        venue_name: true,
        city: true,
        state: true,
        cover_image_url: true,
        is_free: true,
        price: true,
        max_participants: true,
        current_participants: true,
        waiting_list: {
          where: { user_id: userId, status: 'waiting' },
          select: {
            position: true,
            joined_at: true
          },
          take: 1
        },
        _count: {
          select: {
            rsvps: {
              where: { status: 'confirmed' }
            },
            waiting_list: {
              where: { status: 'waiting' }
            }
          }
        }
      },
      orderBy: { start_date: 'asc' }
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
      confirmed_attendees_count: event._count?.rsvps || event.current_participants || 0,
      waiting_list_count: event._count?.waiting_list || 0,
      ...(includeUserData && event.rsvps?.[0] && {
        user_rsvp: {
          status: event.rsvps[0].status,
          guest_count: event.rsvps[0].guest_count,
          created_at: event.rsvps[0].created_at.toISOString()
        }
      }),
      ...(includeUserData && event.waiting_list?.[0] && {
        user_waiting_position: event.waiting_list[0].position
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

    logger.info('My Events API - User events fetched successfully', {
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
    logger.error('My Events API - Error fetching user events:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch events',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';