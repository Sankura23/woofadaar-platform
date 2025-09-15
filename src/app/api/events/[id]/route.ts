import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import logger from '@/lib/logger';

const prisma = new PrismaClient();

// Get single event by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id'); // For checking user's RSVP status
    
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            profile_image_url: true,
            location: true
          }
        },
        rsvps: {
          where: { status: 'confirmed' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profile_image_url: true
              }
            }
          },
          take: 10 // Show first 10 confirmed attendees
        },
        waiting_list: {
          where: { status: 'waiting' },
          orderBy: { position: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profile_image_url: true
              }
            }
          },
          take: 5 // Show first 5 waiting
        },
        comments: {
          where: { is_approved: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profile_image_url: true
              }
            },
            replies: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    profile_image_url: true
                  }
                }
              }
            }
          },
          orderBy: { created_at: 'desc' },
          take: 20
        },
        photos: {
          where: { is_approved: true },
          include: {
            uploader: {
              select: {
                id: true,
                name: true,
                profile_image_url: true
              }
            },
            _count: {
              select: { likes: true }
            }
          },
          orderBy: [
            { is_featured: 'desc' },
            { uploaded_at: 'desc' }
          ],
          take: 12
        },
        updates: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                profile_image_url: true
              }
            }
          },
          orderBy: { created_at: 'desc' },
          take: 10
        },
        _count: {
          select: {
            rsvps: {
              where: { status: 'confirmed' }
            },
            waiting_list: {
              where: { status: 'waiting' }
            },
            comments: {
              where: { is_approved: true }
            },
            photos: {
              where: { is_approved: true }
            }
          }
        }
      }
    });
    
    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }
    
    // Check user's RSVP status if userId provided
    let userRsvpStatus = null;
    let userWaitingPosition = null;
    
    if (userId) {
      const userRsvp = await prisma.eventRSVP.findUnique({
        where: {
          event_id_user_id: {
            event_id: eventId,
            user_id: userId
          }
        }
      });
      
      if (userRsvp) {
        userRsvpStatus = userRsvp.status;
      } else {
        // Check if user is on waiting list
        const waitingListEntry = await prisma.eventWaitingList.findUnique({
          where: {
            event_id_user_id: {
              event_id: eventId,
              user_id: userId
            }
          }
        });
        
        if (waitingListEntry) {
          userWaitingPosition = waitingListEntry.position;
        }
      }
    }
    
    // Calculate derived fields
    const confirmedCount = event._count.rsvps;
    const waitingCount = event._count.waiting_list;
    const isEventFull = event.max_participants ? confirmedCount >= event.max_participants : false;
    const spotsRemaining = event.max_participants ? Math.max(0, event.max_participants - confirmedCount) : null;
    
    // Check if registration is open
    const now = new Date();
    const registrationOpen = (!event.registration_start || now >= event.registration_start) &&
                           (!event.registration_end || now <= event.registration_end) &&
                           event.status === 'published';
    
    const responseData = {
      ...event,
      confirmed_attendees_count: confirmedCount,
      waiting_list_count: waitingCount,
      comments_count: event._count.comments,
      photos_count: event._count.photos,
      is_full: isEventFull,
      spots_remaining: spotsRemaining,
      registration_open: registrationOpen,
      user_rsvp_status: userRsvpStatus,
      user_waiting_position: userWaitingPosition,
      can_user_rsvp: registrationOpen && !userRsvpStatus && !userWaitingPosition,
      can_user_join_waitlist: isEventFull && event.waiting_list_enabled && !userRsvpStatus && !userWaitingPosition,
      _count: undefined // Remove internal count object
    };
    
    logger.info('Events API - Event details retrieved', {
      eventId,
      userId: userId || 'anonymous',
      confirmedCount,
      waitingCount
    });
    
    return NextResponse.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    logger.error('Events API - Error fetching event details:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch event details',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

// Update event
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventId = params.id;
    const body = await request.json();
    const { user_id, ...updateData } = body;
    
    if (!user_id) {
      return NextResponse.json({
        success: false,
        error: 'User ID required for authentication'
      }, { status: 401 });
    }
    
    // Verify user is the organizer
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizer_id: user_id
      }
    });
    
    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'Event not found or unauthorized'
      }, { status: 404 });
    }
    
    // Validate dates if provided
    if (updateData.start_date && updateData.end_date) {
      const startDate = new Date(updateData.start_date);
      const endDate = new Date(updateData.end_date);
      
      if (startDate >= endDate) {
        return NextResponse.json({
          success: false,
          error: 'Start date must be before end date'
        }, { status: 400 });
      }
    }
    
    // Convert date strings to Date objects
    const processedUpdateData = { ...updateData };
    const dateFields = ['start_date', 'end_date', 'registration_start', 'registration_end'];
    dateFields.forEach(field => {
      if (processedUpdateData[field]) {
        processedUpdateData[field] = new Date(processedUpdateData[field]);
      }
    });
    
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: processedUpdateData,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        },
        _count: {
          select: {
            rsvps: {
              where: { status: 'confirmed' }
            }
          }
        }
      }
    });
    
    logger.info('Events API - Event updated', {
      eventId,
      organizerId: user_id,
      fieldsUpdated: Object.keys(updateData)
    });
    
    return NextResponse.json({
      success: true,
      data: updatedEvent
    });
    
  } catch (error) {
    logger.error('Events API - Error updating event:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update event',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

// Delete event (hard delete for organizers)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID required for authentication'
      }, { status: 401 });
    }
    
    // Verify user is the organizer
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizer_id: userId
      },
      include: {
        _count: {
          select: { rsvps: true }
        }
      }
    });
    
    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'Event not found or unauthorized'
      }, { status: 404 });
    }
    
    // If event has RSVPs, don't allow hard delete - suggest cancellation instead
    if (event._count.rsvps > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete event with RSVPs. Consider cancelling instead.',
        suggestion: 'Use PUT /api/events/[id] with status: "cancelled"'
      }, { status: 400 });
    }
    
    // Hard delete event (cascading deletes handled by Prisma)
    await prisma.event.delete({
      where: { id: eventId }
    });
    
    logger.info('Events API - Event deleted', {
      eventId,
      organizerId: userId
    });
    
    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    });
    
  } catch (error) {
    logger.error('Events API - Error deleting event:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to delete event',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';