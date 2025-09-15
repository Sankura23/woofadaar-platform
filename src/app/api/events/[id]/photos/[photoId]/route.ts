import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import logger from '@/lib/logger';

const prisma = new PrismaClient();

// Get individual photo details
export async function GET(request: NextRequest, { params }: { params: { id: string; photoId: string } }) {
  try {
    const eventId = params.id;
    const photoId = params.photoId;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    const photo = await prisma.eventPhoto.findUnique({
      where: {
        id: photoId,
        event_id: eventId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        },
        event: {
          select: {
            id: true,
            title: true,
            organizer_id: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        },
        likes: userId ? {
          where: { user_id: userId },
          select: { id: true, user_id: true },
          take: 10 // Show some recent likes
        } : {
          select: { 
            id: true, 
            user: {
              select: {
                id: true,
                name: true,
                profile_image_url: true
              }
            }
          },
          take: 10,
          orderBy: { created_at: 'desc' }
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profile_image_url: true
              }
            }
          },
          orderBy: { created_at: 'asc' },
          take: 50 // Limit comments for performance
        }
      }
    });

    if (!photo) {
      return NextResponse.json({
        success: false,
        error: 'Photo not found'
      }, { status: 404 });
    }

    // Check if user can view this photo
    if (photo.status !== 'approved') {
      const isOwner = photo.user_id === userId;
      const isOrganizer = photo.event.organizer_id === userId;
      
      if (!isOwner && !isOrganizer) {
        return NextResponse.json({
          success: false,
          error: 'Photo not found'
        }, { status: 404 });
      }
    }

    const responseData = {
      id: photo.id,
      image_url: photo.image_url,
      thumbnail_url: photo.thumbnail_url,
      caption: photo.caption,
      taken_at: photo.taken_at?.toISOString(),
      created_at: photo.created_at.toISOString(),
      status: photo.status,
      user: photo.user,
      event: {
        id: photo.event.id,
        title: photo.event.title
      },
      likes_count: photo._count.likes,
      comments_count: photo._count.comments,
      user_has_liked: userId ? photo.likes.some(like => like.user_id === userId) : false,
      recent_likes: photo.likes.slice(0, 5),
      comments: photo.comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at.toISOString(),
        user: comment.user
      }))
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    logger.error('Event Photo Detail API - Error fetching photo:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch photo',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

// Update photo (caption, etc.)
export async function PUT(request: NextRequest, { params }: { params: { id: string; photoId: string } }) {
  try {
    const eventId = params.id;
    const photoId = params.photoId;
    const body = await request.json();
    const { user_id, caption, status } = body;

    if (!user_id) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    // Find photo and verify permissions
    const photo = await prisma.eventPhoto.findUnique({
      where: {
        id: photoId,
        event_id: eventId
      },
      include: {
        event: {
          select: {
            organizer_id: true
          }
        }
      }
    });

    if (!photo) {
      return NextResponse.json({
        success: false,
        error: 'Photo not found'
      }, { status: 404 });
    }

    const isOwner = photo.user_id === user_id;
    const isOrganizer = photo.event.organizer_id === user_id;

    if (!isOwner && !isOrganizer) {
      return NextResponse.json({
        success: false,
        error: 'You do not have permission to edit this photo'
      }, { status: 403 });
    }

    // Update photo
    const updateData: any = {};
    
    if (caption !== undefined && isOwner) {
      updateData.caption = caption.trim();
    }
    
    if (status !== undefined && isOrganizer) {
      // Only organizers can approve/reject photos
      if (['approved', 'rejected', 'pending'].includes(status)) {
        updateData.status = status;
      }
    }

    const updatedPhoto = await prisma.eventPhoto.update({
      where: { id: photoId },
      data: updateData,
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

    logger.info('Event Photo API - Photo updated', {
      photoId,
      eventId,
      userId: user_id,
      updates: updateData
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedPhoto.id,
        caption: updatedPhoto.caption,
        status: updatedPhoto.status,
        updated_at: updatedPhoto.updated_at.toISOString()
      }
    });

  } catch (error) {
    logger.error('Event Photo API - Error updating photo:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to update photo',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

// Delete photo
export async function DELETE(request: NextRequest, { params }: { params: { id: string; photoId: string } }) {
  try {
    const eventId = params.id;
    const photoId = params.photoId;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    // Find photo and verify permissions
    const photo = await prisma.eventPhoto.findUnique({
      where: {
        id: photoId,
        event_id: eventId
      },
      include: {
        event: {
          select: {
            organizer_id: true
          }
        }
      }
    });

    if (!photo) {
      return NextResponse.json({
        success: false,
        error: 'Photo not found'
      }, { status: 404 });
    }

    const isOwner = photo.user_id === userId;
    const isOrganizer = photo.event.organizer_id === userId;

    if (!isOwner && !isOrganizer) {
      return NextResponse.json({
        success: false,
        error: 'You do not have permission to delete this photo'
      }, { status: 403 });
    }

    // Soft delete - update status to deleted
    await prisma.eventPhoto.update({
      where: { id: photoId },
      data: {
        status: 'deleted',
        updated_at: new Date()
      }
    });

    // TODO: In a real implementation, also delete the actual image files from storage

    logger.info('Event Photo API - Photo deleted', {
      photoId,
      eventId,
      userId,
      deletedBy: isOwner ? 'owner' : 'organizer'
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Photo deleted successfully'
      }
    });

  } catch (error) {
    logger.error('Event Photo API - Error deleting photo:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to delete photo',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';