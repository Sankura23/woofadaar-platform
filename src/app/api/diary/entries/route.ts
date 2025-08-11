import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken, getTokenFromRequest, isPetParent } from '@/lib/auth';

// POST /api/diary/entries - Create diary entry
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !isPetParent(payload)) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const userId = payload.userId;
    const body = await request.json();

    const {
      dog_id,
      title,
      content,
      entry_type,
      photos,
      milestone_type,
      mood,
      weather,
      location,
      tags,
      privacy_level
    } = body;

    if (!dog_id || !title || !content) {
      return NextResponse.json(
        { error: 'Dog ID, title, and content are required' },
        { status: 400 }
      );
    }

    // Verify dog ownership
    const dog = await prisma.dog.findFirst({
      where: {
        id: dog_id,
        user_id: userId
      }
    });

    if (!dog) {
      return NextResponse.json(
        { error: 'Dog not found or access denied' },
        { status: 404 }
      );
    }

    // Create diary entry
    const diaryEntry = await prisma.diaryEntry.create({
      data: {
        dog_id,
        user_id: userId,
        title,
        content,
        entry_type: entry_type || 'general',
        photos: photos || [],
        milestone_type,
        mood_emoji: mood,
        weather,
        location,
        tags: tags || [],
        privacy_level: privacy_level || 'public'
      },
      include: {
        dog: {
          select: {
            id: true,
            name: true,
            breed: true,
            photo_url: true
          }
        },
        comments: {
          select: {
            id: true
          }
        }
      }
    });

    // Award points for diary entry
    try {
      // Skip points for now - will be implemented later with proper internal API call
      console.log(`Diary entry created - ${entry_type === 'milestone' ? 15 : 10} points would be awarded`);
    } catch (pointsError) {
      console.error('Error awarding points:', pointsError);
    }

    return NextResponse.json({
      success: true,
      message: 'Diary entry created successfully',
      data: { entry: diaryEntry }
    });

  } catch (error) {
    console.error('Error creating diary entry:', error);
    return NextResponse.json(
      { error: 'Failed to create diary entry' },
      { status: 500 }
    );
  }
}

// GET /api/diary/entries - Get diary entries with filters
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !isPetParent(payload)) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const userId = payload.userId;
    const { searchParams } = new URL(request.url);
    
    const dogId = searchParams.get('dog_id');
    const entryType = searchParams.get('entry_type');
    const tag = searchParams.get('tag');
    const milestoneType = searchParams.get('milestone_type');
    const isPrivate = searchParams.get('is_private');
    const publicOnly = searchParams.get('public_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const whereClause: any = {};
    
    if (dogId) {
      // If specific dog requested, verify ownership
      const dog = await prisma.dog.findFirst({
        where: {
          id: dogId,
          user_id: userId
        }
      });

      if (!dog) {
        return NextResponse.json(
          { error: 'Dog not found or access denied' },
          { status: 404 }
        );
      }
      
      whereClause.dog_id = dogId;
    } else if (!publicOnly) {
      // Show only user's entries if not requesting public feed
      whereClause.dog = {
        user_id: userId
      };
    }

    if (entryType) {
      whereClause.entry_type = entryType;
    }

    if (tag) {
      whereClause.tags = {
        has: tag
      };
    }

    if (milestoneType) {
      whereClause.milestone_type = milestoneType;
    }

    if (isPrivate !== null) {
      whereClause.privacy_level = isPrivate === 'true' ? 'private' : 'public';
    }

    if (publicOnly) {
      whereClause.privacy_level = 'public';
    }

    const [entries, totalCount] = await Promise.all([
      prisma.diaryEntry.findMany({
        where: whereClause,
        include: {
          dog: {
            select: {
              id: true,
              name: true,
              breed: true,
              photo_url: true,
              User: {
                select: {
                  id: true,
                  name: true,
                  profile_image_url: true
                }
              }
            }
          },
          comments: {
            select: {
              id: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.diaryEntry.count({ where: whereClause })
    ]);

    // Format entries with like status
    const formattedEntries = entries.map(entry => ({
      ...entry,
      isLiked: false, // TODO: Implement likes system
      likesCount: entry.likes_count || 0,
      commentsCount: entry.comments_count || 0,
      is_private: entry.privacy_level === 'private',
      mood: entry.mood_emoji
    }));

    return NextResponse.json({
      success: true,
      data: {
        entries: formattedEntries,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + entries.length < totalCount
        }
      }
    });

  } catch (error) {
    console.error('Error fetching diary entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch diary entries' },
      { status: 500 }
    );
  }
}