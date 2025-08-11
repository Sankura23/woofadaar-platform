import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const tags = searchParams.get('tags')?.split(',');
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const isPinned = searchParams.get('isPinned');
    const isFeatured = searchParams.get('isFeatured');

    // Build where clause
    const where: any = { status };
    
    if (categoryId) where.category_id = categoryId;
    if (tags && tags.length > 0) where.tags = { hasSome: tags };
    if (isPinned === 'true') where.is_pinned = true;
    if (isFeatured === 'true') where.is_featured = true;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } }
      ];
    }

    // Build order by clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const posts = await prisma.forumPost.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true
          }
        },
        comments: {
          where: { status: 'active' },
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                profile_image_url: true
              }
            }
          }
        },
        _count: {
          select: {
            comments: true
          }
        }
      },
      orderBy,
      take: limit,
      skip: offset
    });

    const total = await prisma.forumPost.count({ where });

    return NextResponse.json({
      success: true,
      data: {
        posts,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching forum posts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch forum posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, content, categoryId, tags, photoUrl } = body;

    if (!title || !content || !categoryId) {
      return NextResponse.json(
        { success: false, error: 'Title, content, and category are required' },
        { status: 400 }
      );
    }

    // Check if category exists and is active
    const category = await prisma.forumCategory.findFirst({
      where: { id: categoryId, is_active: true }
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Invalid or inactive category' },
        { status: 400 }
      );
    }

    // Create the forum post
    const post = await prisma.forumPost.create({
      data: {
        user_id: 'userId' in user ? user.userId : user.partnerId,
        category_id: categoryId,
        title,
        content,
        tags: tags || [],
        photo_url: photoUrl || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true
          }
        }
      }
    });

    // Update category post count
    await prisma.forumCategory.update({
      where: { id: categoryId },
      data: { post_count: { increment: 1 } }
    });

    // Award points for posting in forum
    await prisma.userEngagement.create({
      data: {
        user_id: 'userId' in user ? user.userId : user.partnerId,
        action_type: 'forum_post',
        points_earned: 8,
        description: `Posted in forum: ${title}`,
        related_id: post.id,
        related_type: 'forum_post'
      }
    });

    return NextResponse.json({
      success: true,
      data: { post }
    });
  } catch (error) {
    console.error('Error creating forum post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create forum post' },
      { status: 500 }
    );
  }
} 