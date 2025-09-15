import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import logger from '@/lib/logger';

const prisma = new PrismaClient();

// Get waiting list for an event
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id'); // For checking user's position
    
    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        waiting_list_enabled: true,
        organizer_id: true
      }
    });

    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }

    if (!event.waiting_list_enabled) {
      return NextResponse.json({
        success: false,
        error: 'Waiting list is not enabled for this event'
      }, { status: 400 });
    }

    // Get waiting list
    const waitingList = await prisma.eventWaitingList.findMany({
      where: {
        event_id: eventId,
        status: 'waiting'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        }
      },
      orderBy: { position: 'asc' }
    });

    // Check user's position if userId provided
    let userPosition = null;
    if (userId) {
      const userEntry = await prisma.eventWaitingList.findUnique({
        where: {
          event_id_user_id: {
            event_id: eventId,
            user_id: userId
          }
        }
      });
      
      if (userEntry && userEntry.status === 'waiting') {
        userPosition = userEntry.position;
      }
    }

    // Only show detailed info to organizer or user on waiting list
    const canViewDetails = userId === event.organizer_id || userPosition !== null;

    const responseData = {
      event_id: eventId,
      event_title: event.title,
      waiting_list_count: waitingList.length,
      user_position: userPosition,
      ...(canViewDetails && {
        waiting_list: waitingList.map(entry => ({
          position: entry.position,
          joined_at: entry.joined_at,
          user: entry.user
        }))
      })
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    logger.error('Waiting List API - Error fetching waiting list:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch waiting list',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

// Join waiting list
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventId = params.id;
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    // Check if event exists and waiting list is enabled
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        status: true,
        waiting_list_enabled: true,
        max_participants: true,
        current_participants: true,
        start_date: true,
        registration_start: true,
        registration_end: true
      }
    });

    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }

    if (event.status !== 'published') {
      return NextResponse.json({
        success: false,
        error: 'Event is not available for registration'
      }, { status: 400 });
    }

    if (!event.waiting_list_enabled) {
      return NextResponse.json({
        success: false,
        error: 'Waiting list is not enabled for this event'
      }, { status: 400 });
    }

    // Check registration window
    const now = new Date();
    if (event.registration_start && now < event.registration_start) {
      return NextResponse.json({
        success: false,
        error: 'Registration has not started yet'
      }, { status: 400 });
    }

    if (event.registration_end && now > event.registration_end) {
      return NextResponse.json({
        success: false,
        error: 'Registration has ended'
      }, { status: 400 });
    }

    // Check if event has already started
    if (now >= event.start_date) {
      return NextResponse.json({
        success: false,
        error: 'Cannot join waiting list for an event that has already started'
      }, { status: 400 });
    }

    // Check if user already has an RSVP
    const existingRsvp = await prisma.eventRSVP.findUnique({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: user_id
        }
      }
    });

    if (existingRsvp) {
      return NextResponse.json({
        success: false,
        error: 'You already have an RSVP for this event',
        current_status: existingRsvp.status
      }, { status: 400 });
    }

    // Check if user is already on waiting list
    const existingWaitingList = await prisma.eventWaitingList.findUnique({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: user_id
        }
      }
    });

    if (existingWaitingList) {
      return NextResponse.json({
        success: false,
        error: 'You are already on the waiting list',
        current_position: existingWaitingList.position
      }, { status: 400 });
    }

    // Check if event is actually full
    if (!event.max_participants || event.current_participants < event.max_participants) {
      return NextResponse.json({
        success: false,
        error: 'Event is not full. Please RSVP directly instead of joining the waiting list.',
        available_spots: event.max_participants ? event.max_participants - event.current_participants : 'unlimited'
      }, { status: 400 });
    }

    // Get next position in waiting list
    const nextPosition = await prisma.eventWaitingList.count({
      where: { 
        event_id: eventId,
        status: 'waiting'
      }
    }) + 1;

    // Add user to waiting list
    const waitingListEntry = await prisma.eventWaitingList.create({
      data: {
        event_id: eventId,
        user_id: user_id,
        position: nextPosition
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile_image_url: true
          }
        },
        event: {
          select: {
            id: true,
            title: true,
            start_date: true,
            organizer_id: true
          }
        }
      }
    });

    // Send waiting list confirmation notification
    // await EventNotificationService.sendWaitingListConfirmation(waitingListEntry);

    logger.info('Waiting List API - User added to waiting list', {
      eventId,
      userId: user_id,
      position: nextPosition,
      waitingListId: waitingListEntry.id
    });

    return NextResponse.json({
      success: true,
      data: {
        waiting_list_id: waitingListEntry.id,
        position: nextPosition,
        joined_at: waitingListEntry.joined_at,
        message: `You are #${nextPosition} on the waiting list. We'll notify you if a spot opens up!`,
        event_title: waitingListEntry.event.title
      }
    }, { status: 201 });

  } catch (error) {
    logger.error('Waiting List API - Error joining waiting list:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to join waiting list',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

// Leave waiting list
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    // Find existing waiting list entry
    const waitingListEntry = await prisma.eventWaitingList.findUnique({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: userId
        }
      }
    });

    if (!waitingListEntry) {
      return NextResponse.json({
        success: false,
        error: 'You are not on the waiting list for this event'
      }, { status: 404 });
    }

    if (waitingListEntry.status !== 'waiting') {
      return NextResponse.json({
        success: false,
        error: 'Cannot remove from waiting list - status is not waiting',
        current_status: waitingListEntry.status
      }, { status: 400 });
    }

    const removedPosition = waitingListEntry.position;

    // Remove from waiting list (soft delete by changing status)
    await prisma.eventWaitingList.update({
      where: { id: waitingListEntry.id },
      data: {
        status: 'expired' // Could also use 'cancelled'
      }
    });

    // Reorder remaining waiting list positions
    await prisma.eventWaitingList.updateMany({
      where: {
        event_id: eventId,
        status: 'waiting',
        position: {
          gt: removedPosition
        }
      },
      data: {
        position: {
          decrement: 1
        }
      }
    });

    logger.info('Waiting List API - User removed from waiting list', {
      eventId,
      userId,
      removedPosition,
      waitingListId: waitingListEntry.id
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Successfully removed from waiting list',
        removed_position: removedPosition
      }
    });

  } catch (error) {
    logger.error('Waiting List API - Error removing from waiting list:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to remove from waiting list',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';