import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import logger from '@/lib/logger';

const prisma = new PrismaClient();

// Toggle like on a photo
export async function POST(request: NextRequest, { params }: { params: { id: string; photoId: string } }) {
  try {
    const eventId = params.id;
    const photoId = params.photoId;
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    // Verify photo exists and is approved
    const photo = await prisma.eventPhoto.findUnique({
      where: {
        id: photoId,
        event_id: eventId
      },
      select: {
        id: true,
        status: true,
        user_id: true
      }
    });

    if (!photo) {
      return NextResponse.json({
        success: false,
        error: 'Photo not found'
      }, { status: 404 });
    }

    if (photo.status !== 'approved') {
      return NextResponse.json({
        success: false,
        error: 'Cannot like this photo'
      }, { status: 400 });
    }

    // Check if user already liked this photo
    const existingLike = await prisma.eventPhotoLike.findUnique({
      where: {
        photo_id_user_id: {
          photo_id: photoId,
          user_id: user_id
        }
      }
    });

    let action: 'liked' | 'unliked';
    let likesCount: number;

    if (existingLike) {
      // Unlike the photo
      await prisma.eventPhotoLike.delete({
        where: { id: existingLike.id }
      });
      
      action = 'unliked';
      
      // Get updated likes count
      likesCount = await prisma.eventPhotoLike.count({
        where: { photo_id: photoId }
      });
      
      logger.info('Photo Like API - Photo unliked', {
        photoId,
        userId: user_id,
        eventId
      });
    } else {
      // Like the photo
      await prisma.eventPhotoLike.create({
        data: {
          photo_id: photoId,
          user_id: user_id
        }
      });
      
      action = 'liked';
      
      // Get updated likes count
      likesCount = await prisma.eventPhotoLike.count({
        where: { photo_id: photoId }
      });
      
      logger.info('Photo Like API - Photo liked', {
        photoId,
        userId: user_id,
        eventId
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        action,
        likes_count: likesCount,
        user_has_liked: action === 'liked'
      }
    });

  } catch (error) {
    logger.error('Photo Like API - Error toggling like:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to toggle like',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

// Get likes for a photo
export async function GET(request: NextRequest, { params }: { params: { id: string; photoId: string } }) {
  try {
    const eventId = params.id;
    const photoId = params.photoId;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const skip = (page - 1) * limit;

    // Verify photo exists
    const photo = await prisma.eventPhoto.findUnique({
      where: {
        id: photoId,
        event_id: eventId
      },
      select: {
        id: true,
        status: true
      }
    });

    if (!photo) {
      return NextResponse.json({
        success: false,
        error: 'Photo not found'
      }, { status: 404 });
    }

    if (photo.status !== 'approved') {
      return NextResponse.json({
        success: false,
        error: 'Photo not available'
      }, { status: 400 });
    }

    // Get likes with user information
    const [likes, totalCount] = await Promise.all([
      prisma.eventPhotoLike.findMany({
        where: { photo_id: photoId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profile_image_url: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      prisma.eventPhotoLike.count({
        where: { photo_id: photoId }
      })
    ]);

    const responseData = {
      likes: likes.map(like => ({
        id: like.id,
        created_at: like.created_at.toISOString(),
        user: like.user
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        has_next: skip + limit < totalCount,
        has_prev: page > 1
      }
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    logger.error('Photo Likes API - Error fetching likes:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch likes',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';