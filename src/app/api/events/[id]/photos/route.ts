import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import logger from '@/lib/logger';

const prisma = new PrismaClient();

// Get photos for an event
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventId = params.id;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50); // Max 50 photos per page
    const userId = searchParams.get('user_id'); // For checking user's like status
    
    const skip = (page - 1) * limit;

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        allow_photos: true,
        status: true
      }
    });

    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }

    if (!event.allow_photos) {
      return NextResponse.json({
        success: false,
        error: 'Photo sharing is not enabled for this event'
      }, { status: 400 });
    }

    // Get photos with pagination
    const [photos, totalCount] = await Promise.all([
      prisma.eventPhoto.findMany({
        where: {
          event_id: eventId,
          status: 'approved' // Only show approved photos
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profile_image_url: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          },
          ...(userId && {
            likes: {
              where: { user_id: userId },
              select: { id: true },
              take: 1
            }
          })
        },
        orderBy: [
          { created_at: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.eventPhoto.count({
        where: {
          event_id: eventId,
          status: 'approved'
        }
      })
    ]);

    const responseData = {
      photos: photos.map(photo => ({
        id: photo.id,
        image_url: photo.image_url,
        thumbnail_url: photo.thumbnail_url,
        caption: photo.caption,
        taken_at: photo.taken_at?.toISOString(),
        created_at: photo.created_at.toISOString(),
        user: {
          id: photo.user.id,
          name: photo.user.name,
          profile_image_url: photo.user.profile_image_url
        },
        likes_count: photo._count.likes,
        comments_count: photo._count.comments,
        user_has_liked: userId ? photo.likes.length > 0 : false
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        has_next: skip + limit < totalCount,
        has_prev: page > 1
      },
      event: {
        id: event.id,
        title: event.title,
        allow_photos: event.allow_photos
      }
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    logger.error('Event Photos API - Error fetching photos:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch photos',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

// Upload photo to event
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventId = params.id;
    const formData = await request.formData();
    
    const user_id = formData.get('user_id') as string;
    const caption = formData.get('caption') as string || '';
    const taken_at = formData.get('taken_at') as string;
    const image_file = formData.get('image') as File;

    if (!user_id) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    if (!image_file) {
      return NextResponse.json({
        success: false,
        error: 'Image file is required'
      }, { status: 400 });
    }

    // Verify event exists and allows photos
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        allow_photos: true,
        status: true,
        organizer_id: true,
        end_date: true
      }
    });

    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }

    if (!event.allow_photos) {
      return NextResponse.json({
        success: false,
        error: 'Photo sharing is not enabled for this event'
      }, { status: 400 });
    }

    // Check if user attended the event (has confirmed RSVP)
    const userRsvp = await prisma.eventRSVP.findUnique({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: user_id
        }
      }
    });

    const isOrganizer = event.organizer_id === user_id;
    const hasAttended = userRsvp?.status === 'confirmed';

    if (!isOrganizer && !hasAttended) {
      return NextResponse.json({
        success: false,
        error: 'Only event attendees and organizers can upload photos'
      }, { status: 403 });
    }

    // Validate image file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(image_file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Only JPEG, PNG, and WebP images are allowed'
      }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (image_file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'Image file must be smaller than 10MB'
      }, { status: 400 });
    }

    // Check user's upload limit (10 photos per event)
    const userPhotoCount = await prisma.eventPhoto.count({
      where: {
        event_id: eventId,
        user_id: user_id
      }
    });

    if (userPhotoCount >= 10) {
      return NextResponse.json({
        success: false,
        error: 'Maximum 10 photos allowed per user per event'
      }, { status: 400 });
    }

    // In a real implementation, you would:
    // 1. Upload the image to cloud storage (AWS S3, Cloudinary, etc.)
    // 2. Generate thumbnails
    // 3. Get the URLs
    
    // For now, we'll simulate this with placeholder URLs
    const timestamp = Date.now();
    const filename = `${eventId}_${user_id}_${timestamp}.${image_file.type.split('/')[1]}`;
    
    // Simulated upload URLs - replace with actual upload logic
    const image_url = `/uploads/events/${eventId}/photos/${filename}`;
    const thumbnail_url = `/uploads/events/${eventId}/photos/thumb_${filename}`;

    // Create photo record
    const photo = await prisma.eventPhoto.create({
      data: {
        event_id: eventId,
        user_id: user_id,
        image_url,
        thumbnail_url,
        caption: caption.trim(),
        taken_at: taken_at ? new Date(taken_at) : null,
        status: isOrganizer ? 'approved' : 'pending', // Auto-approve organizer photos
        file_size: image_file.size,
        mime_type: image_file.type,
        original_filename: image_file.name
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        }
      }
    });

    logger.info('Event Photos API - Photo uploaded successfully', {
      eventId,
      photoId: photo.id,
      userId: user_id,
      fileSize: image_file.size,
      status: photo.status
    });

    // TODO: Implement actual file upload logic here
    // For now, we'll just log the file info
    console.log('File to upload:', {
      name: image_file.name,
      size: image_file.size,
      type: image_file.type
    });

    return NextResponse.json({
      success: true,
      data: {
        id: photo.id,
        image_url: photo.image_url,
        thumbnail_url: photo.thumbnail_url,
        caption: photo.caption,
        status: photo.status,
        created_at: photo.created_at.toISOString(),
        user: photo.user,
        message: photo.status === 'pending' 
          ? 'Photo uploaded and is pending approval'
          : 'Photo uploaded successfully'
      }
    }, { status: 201 });

  } catch (error) {
    logger.error('Event Photos API - Error uploading photo:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to upload photo',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';