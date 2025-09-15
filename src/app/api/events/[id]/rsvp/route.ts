import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import logger from '@/lib/logger';

const prisma = new PrismaClient();

// RSVP to event
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventId = params.id;
    const body = await request.json();
    const { user_id, guest_count = 0, guest_names = [], special_requirements, email_reminders = true, sms_reminders = false, push_reminders = true } = body;

    if (!user_id) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    // Check if event exists and is published
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        status: true,
        max_participants: true,
        current_participants: true,
        allow_guests: true,
        max_guests_per_user: true,
        registration_start: true,
        registration_end: true,
        start_date: true,
        auto_approve_rsvp: true,
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

    if (event.status !== 'published') {
      return NextResponse.json({
        success: false,
        error: 'Event is not available for registration'
      }, { status: 400 });
    }

    // Check registration window
    const now = new Date();
    if (event.registration_start && now < event.registration_start) {
      return NextResponse.json({
        success: false,
        error: 'Registration has not started yet',
        registration_start: event.registration_start
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
        error: 'Cannot RSVP to an event that has already started'
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
        error: 'You have already RSVP\'d to this event',
        current_status: existingRsvp.status
      }, { status: 400 });
    }

    // Check if user is on waiting list
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
        error: 'You are already on the waiting list for this event',
        waiting_position: existingWaitingList.position
      }, { status: 400 });
    }

    // Validate guest count
    if (guest_count > 0) {
      if (!event.allow_guests) {
        return NextResponse.json({
          success: false,
          error: 'Guests are not allowed for this event'
        }, { status: 400 });
      }

      if (guest_count > event.max_guests_per_user) {
        return NextResponse.json({
          success: false,
          error: `Maximum ${event.max_guests_per_user} guests allowed per person`
        }, { status: 400 });
      }

      if (guest_names.length !== guest_count) {
        return NextResponse.json({
          success: false,
          error: 'Please provide names for all guests'
        }, { status: 400 });
      }
    }

    // Check capacity
    const totalSpotsNeeded = 1 + guest_count; // User + guests
    const availableSpots = event.max_participants ? 
      event.max_participants - event.current_participants : 
      Infinity;

    if (event.max_participants && availableSpots < totalSpotsNeeded) {
      // Event is full - add to waiting list if enabled
      if (event.waiting_list_enabled) {
        const waitingListPosition = await prisma.eventWaitingList.count({
          where: { 
            event_id: eventId,
            status: 'waiting'
          }
        }) + 1;

        const waitingListEntry = await prisma.eventWaitingList.create({
          data: {
            event_id: eventId,
            user_id: user_id,
            position: waitingListPosition
          }
        });

        logger.info('RSVP API - User added to waiting list', {
          eventId,
          userId: user_id,
          position: waitingListPosition,
          spotsNeeded: totalSpotsNeeded,
          availableSpots
        });

        return NextResponse.json({
          success: true,
          data: {
            status: 'waiting_list',
            position: waitingListPosition,
            message: 'Event is full. You have been added to the waiting list.'
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Event is full and waiting list is not enabled'
        }, { status: 400 });
      }
    }

    // Create RSVP
    const rsvp = await prisma.eventRSVP.create({
      data: {
        event_id: eventId,
        user_id: user_id,
        status: event.auto_approve_rsvp ? 'confirmed' : 'pending',
        guest_count,
        guest_names,
        special_requirements,
        email_reminders,
        sms_reminders,
        push_reminders
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

    // Update event participant count
    if (rsvp.status === 'confirmed') {
      await prisma.event.update({
        where: { id: eventId },
        data: {
          current_participants: {
            increment: totalSpotsNeeded
          }
        }
      });
    }

    // Send confirmation notification (implement in notification service later)
    // await EventNotificationService.sendRsvpConfirmation(rsvp);

    // Notify organizer
    // await EventNotificationService.notifyOrganizerNewRsvp(event.organizer_id, rsvp);

    logger.info('RSVP API - RSVP created successfully', {
      eventId,
      userId: user_id,
      rsvpId: rsvp.id,
      status: rsvp.status,
      guestCount: guest_count,
      totalSpots: totalSpotsNeeded
    });

    return NextResponse.json({
      success: true,
      data: {
        rsvp_id: rsvp.id,
        status: rsvp.status,
        message: rsvp.status === 'confirmed' ? 
          'Your RSVP has been confirmed!' : 
          'Your RSVP is pending approval from the organizer.',
        guest_count: rsvp.guest_count,
        created_at: rsvp.created_at
      }
    }, { status: 201 });

  } catch (error) {
    logger.error('RSVP API - Error creating RSVP:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to create RSVP',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

// Update RSVP
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventId = params.id;
    const body = await request.json();
    const { user_id, guest_count, guest_names, special_requirements, email_reminders, sms_reminders, push_reminders } = body;

    if (!user_id) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    // Find existing RSVP
    const existingRsvp = await prisma.eventRSVP.findUnique({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: user_id
        }
      },
      include: {
        event: {
          select: {
            allow_guests: true,
            max_guests_per_user: true,
            max_participants: true,
            current_participants: true,
            start_date: true
          }
        }
      }
    });

    if (!existingRsvp) {
      return NextResponse.json({
        success: false,
        error: 'RSVP not found'
      }, { status: 404 });
    }

    // Check if event has started
    const now = new Date();
    if (now >= existingRsvp.event.start_date) {
      return NextResponse.json({
        success: false,
        error: 'Cannot update RSVP for an event that has already started'
      }, { status: 400 });
    }

    // Validate guest count if provided
    if (guest_count !== undefined) {
      if (guest_count > 0 && !existingRsvp.event.allow_guests) {
        return NextResponse.json({
          success: false,
          error: 'Guests are not allowed for this event'
        }, { status: 400 });
      }

      if (guest_count > existingRsvp.event.max_guests_per_user) {
        return NextResponse.json({
          success: false,
          error: `Maximum ${existingRsvp.event.max_guests_per_user} guests allowed per person`
        }, { status: 400 });
      }

      // Check capacity for additional guests
      const currentTotalSpots = 1 + existingRsvp.guest_count;
      const newTotalSpots = 1 + guest_count;
      const additionalSpots = newTotalSpots - currentTotalSpots;

      if (additionalSpots > 0 && existingRsvp.event.max_participants) {
        const availableSpots = existingRsvp.event.max_participants - existingRsvp.event.current_participants;
        if (availableSpots < additionalSpots) {
          return NextResponse.json({
            success: false,
            error: 'Not enough spots available for additional guests'
          }, { status: 400 });
        }
      }

      // Update participant count if changing guest count
      if (existingRsvp.status === 'confirmed' && additionalSpots !== 0) {
        await prisma.event.update({
          where: { id: eventId },
          data: {
            current_participants: {
              increment: additionalSpots
            }
          }
        });
      }
    }

    // Update RSVP
    const updatedRsvp = await prisma.eventRSVP.update({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: user_id
        }
      },
      data: {
        ...(guest_count !== undefined && { guest_count }),
        ...(guest_names && { guest_names }),
        ...(special_requirements !== undefined && { special_requirements }),
        ...(email_reminders !== undefined && { email_reminders }),
        ...(sms_reminders !== undefined && { sms_reminders }),
        ...(push_reminders !== undefined && { push_reminders }),
        updated_at: new Date()
      }
    });

    logger.info('RSVP API - RSVP updated successfully', {
      eventId,
      userId: user_id,
      rsvpId: updatedRsvp.id,
      changes: { guest_count, guest_names, special_requirements }
    });

    return NextResponse.json({
      success: true,
      data: updatedRsvp
    });

  } catch (error) {
    logger.error('RSVP API - Error updating RSVP:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to update RSVP',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

// Cancel RSVP
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

    // Find existing RSVP
    const existingRsvp = await prisma.eventRSVP.findUnique({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: userId
        }
      },
      include: {
        event: {
          select: {
            start_date: true,
            waiting_list_enabled: true,
            title: true
          }
        }
      }
    });

    if (!existingRsvp) {
      return NextResponse.json({
        success: false,
        error: 'RSVP not found'
      }, { status: 404 });
    }

    const totalSpots = 1 + existingRsvp.guest_count;

    // Update RSVP status to cancelled (soft delete)
    const cancelledRsvp = await prisma.eventRSVP.update({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: userId
        }
      },
      data: {
        status: 'cancelled',
        updated_at: new Date()
      }
    });

    // Update event participant count
    if (existingRsvp.status === 'confirmed') {
      await prisma.event.update({
        where: { id: eventId },
        data: {
          current_participants: {
            decrement: totalSpots
          }
        }
      });

      // Check waiting list and promote next person
      if (existingRsvp.event.waiting_list_enabled) {
        const nextWaiting = await prisma.eventWaitingList.findFirst({
          where: {
            event_id: eventId,
            status: 'waiting'
          },
          orderBy: { position: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

        if (nextWaiting) {
          // Promote from waiting list to confirmed RSVP
          await prisma.$transaction([
            // Update waiting list status
            prisma.eventWaitingList.update({
              where: { id: nextWaiting.id },
              data: {
                status: 'promoted',
                promoted_at: new Date(),
                notified_at: new Date()
              }
            }),
            // Create confirmed RSVP
            prisma.eventRSVP.create({
              data: {
                event_id: eventId,
                user_id: nextWaiting.user_id,
                status: 'confirmed',
                guest_count: 0, // Default for promoted users
                email_reminders: true,
                push_reminders: true
              }
            }),
            // Update event participant count
            prisma.event.update({
              where: { id: eventId },
              data: {
                current_participants: {
                  increment: 1 // Just the promoted user, no guests initially
                }
              }
            })
          ]);

          // Send promotion notification
          // await EventNotificationService.notifyWaitingListPromotion(nextWaiting.id);

          logger.info('RSVP API - Promoted user from waiting list', {
            eventId,
            promotedUserId: nextWaiting.user_id,
            previousPosition: nextWaiting.position
          });
        }
      }
    }

    logger.info('RSVP API - RSVP cancelled successfully', {
      eventId,
      userId,
      rsvpId: cancelledRsvp.id,
      spotsFreed: totalSpots
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'RSVP cancelled successfully',
        cancelled_at: cancelledRsvp.updated_at,
        spots_freed: totalSpots
      }
    });

  } catch (error) {
    logger.error('RSVP API - Error cancelling RSVP:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to cancel RSVP',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';