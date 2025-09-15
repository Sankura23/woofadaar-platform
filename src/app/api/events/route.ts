import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import logger from '@/lib/logger';
import { mockEvents } from '@/lib/mock-events-data';

const prisma = new PrismaClient();

// Flag to use mock data for demo (set to true when database is not available)
const USE_MOCK_DATA = true;

// Get all events with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const city = searchParams.get('city');
    const event_type = searchParams.get('event_type');
    const is_virtual = searchParams.get('is_virtual') === 'true';
    const is_free = searchParams.get('is_free') === 'true';
    const upcoming_only = searchParams.get('upcoming_only') !== 'false'; // default true
    const featured_only = searchParams.get('featured_only') === 'true';
    const premium_only = searchParams.get('premium_only') === 'true';
    
    const skip = (page - 1) * limit;
    
    // Build where clause
    const where: any = {
      status: 'published'
    };
    
    if (category) where.category = category;
    if (city) where.city = city;
    if (event_type) where.event_type = event_type;
    if (is_virtual !== undefined) where.is_virtual = is_virtual;
    if (is_free !== undefined) where.is_free = is_free;
    if (featured_only) where.is_featured = true;
    if (premium_only) where.is_premium_only = true;
    
    if (upcoming_only) {
      where.start_date = {
        gte: new Date()
      };
    }
    
    // Get events with pagination
    const [events, totalCount] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
              profile_image_url: true
            }
          },
          rsvps: {
            select: {
              id: true,
              status: true
            }
          },
          _count: {
            select: {
              rsvps: {
                where: { status: 'confirmed' }
              },
              waiting_list: true,
              comments: true
            }
          }
        },
        orderBy: [
          { is_featured: 'desc' },
          { start_date: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.event.count({ where })
    ]);
    
    // Format events for response
    const formattedEvents = events.map(event => ({
      ...event,
      confirmed_rsvps: event._count.rsvps,
      waiting_list_count: event._count.waiting_list,
      comments_count: event._count.comments,
      is_full: event.max_participants ? 
        event._count.rsvps >= event.max_participants : false,
      _count: undefined // Remove internal count object
    }));
    
    logger.info(`Events API - Retrieved ${events.length} events`, {
      page,
      limit,
      totalCount,
      filters: { category, city, event_type, is_virtual, is_free }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        events: formattedEvents,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      }
    });
    
  } catch (error) {
    logger.error('Events API - Error fetching events:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch events',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

// Create new event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['title', 'description', 'event_type', 'category', 'start_date', 'end_date', 'city', 'organizer_id'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        missingFields
      }, { status: 400 });
    }
    
    // Validate dates
    const startDate = new Date(body.start_date);
    const endDate = new Date(body.end_date);
    
    if (startDate >= endDate) {
      return NextResponse.json({
        success: false,
        error: 'Start date must be before end date'
      }, { status: 400 });
    }
    
    // Validate organizer exists
    const organizer = await prisma.user.findUnique({
      where: { id: body.organizer_id },
      select: { id: true, name: true }
    });
    
    if (!organizer) {
      return NextResponse.json({
        success: false,
        error: 'Invalid organizer ID'
      }, { status: 400 });
    }
    
    // Create event
    const eventData = {
      title: body.title,
      description: body.description,
      event_type: body.event_type,
      category: body.category,
      status: body.status || 'draft',
      is_virtual: body.is_virtual || false,
      is_premium_only: body.is_premium_only || false,
      is_featured: body.is_featured || false,
      start_date: startDate,
      end_date: endDate,
      timezone: body.timezone || 'Asia/Kolkata',
      registration_start: body.registration_start ? new Date(body.registration_start) : null,
      registration_end: body.registration_end ? new Date(body.registration_end) : null,
      max_participants: body.max_participants,
      waiting_list_enabled: body.waiting_list_enabled !== false,
      allow_guests: body.allow_guests || false,
      max_guests_per_user: body.max_guests_per_user || 1,
      venue_name: body.venue_name,
      address: body.address,
      city: body.city,
      state: body.state || 'Maharashtra',
      country: body.country || 'India',
      latitude: body.latitude,
      longitude: body.longitude,
      virtual_link: body.virtual_link,
      is_free: body.is_free !== false,
      price: body.price,
      currency: body.currency || 'INR',
      refund_policy: body.refund_policy,
      agenda: body.agenda,
      requirements: body.requirements || [],
      tags: body.tags || [],
      cover_image_url: body.cover_image_url,
      additional_images: body.additional_images || [],
      organizer_id: body.organizer_id,
      co_organizers: body.co_organizers || [],
      partner_organizations: body.partner_organizations || [],
      auto_approve_rsvp: body.auto_approve_rsvp !== false,
      send_reminders: body.send_reminders !== false,
      allow_photos: body.allow_photos !== false,
      is_recurring: body.is_recurring || false,
      recurring_pattern: body.recurring_pattern
    };
    
    const event = await prisma.event.create({
      data: eventData,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        }
      }
    });
    
    logger.info('Events API - Event created successfully', {
      eventId: event.id,
      title: event.title,
      organizerId: event.organizer_id
    });
    
    return NextResponse.json({
      success: true,
      data: event
    }, { status: 201 });
    
  } catch (error) {
    logger.error('Events API - Error creating event:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create event',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

// Delete/Close Event API
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');
    const userId = searchParams.get('user_id'); // organizer verification
    
    if (!eventId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Event ID and User ID required'
      }, { status: 400 });
    }
    
    // Verify organizer
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizer_id: userId
      }
    });
    
    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'Event not found or unauthorized'
      }, { status: 404 });
    }
    
    // Soft delete by changing status
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: { status: 'cancelled' }
    });
    
    logger.info('Events API - Event cancelled', {
      eventId,
      organizerId: userId
    });
    
    return NextResponse.json({
      success: true,
      data: updatedEvent
    });
    
  } catch (error) {
    logger.error('Events API - Error deleting event:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to cancel event',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';