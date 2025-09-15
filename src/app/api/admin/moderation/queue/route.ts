import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
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

    // Check if user is admin/moderator (implement your own logic)
    // For now, we'll assume any authenticated user can access moderation
    // In production, you'd check user roles/permissions here

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (severity && severity !== 'all') where.severity = severity;

    const items = await prisma.moderationQueue.findMany({
      where,
      include: {
        reported_by_user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { severity: 'desc' }, // Critical first
        { created_at: 'desc' }
      ],
      take: limit,
      skip: offset
    });

    // Fetch content details for each item
    const enrichedItems = await Promise.all(items.map(async (item) => {
      let content = null;

      try {
        switch (item.item_type) {
          case 'forum_post':
            const forumPost = await prisma.forumPost.findUnique({
              where: { id: item.item_id },
              include: {
                user: {
                  select: { id: true, name: true }
                }
              }
            });
            if (forumPost) {
              content = {
                title: forumPost.title,
                content: forumPost.content,
                author: forumPost.user
              };
            }
            break;

          case 'comment':
            const comment = await prisma.communityComment.findUnique({
              where: { id: item.item_id },
              include: {
                user: {
                  select: { id: true, name: true }
                }
              }
            });
            if (comment) {
              content = {
                content: comment.content,
                author: comment.user
              };
            }
            break;

          case 'question':
            const question = await prisma.communityQuestion.findUnique({
              where: { id: item.item_id },
              include: {
                user: {
                  select: { id: true, name: true }
                }
              }
            });
            if (question) {
              content = {
                title: question.title,
                content: question.content,
                author: question.user
              };
            }
            break;

          case 'answer':
            const answer = await prisma.communityAnswer.findUnique({
              where: { id: item.item_id },
              include: {
                user: {
                  select: { id: true, name: true }
                }
              }
            });
            if (answer) {
              content = {
                content: answer.content,
                author: answer.user
              };
            }
            break;
        }
      } catch (error) {
        console.error(`Error fetching content for ${item.item_type} ${item.item_id}:`, error);
      }

      return {
        ...item,
        content
      };
    }));

    const total = await prisma.moderationQueue.count({ where });

    return NextResponse.json({
      success: true,
      data: {
        items: enrichedItems,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching moderation queue:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch moderation queue' },
      { status: 500 }
    );
  }
}