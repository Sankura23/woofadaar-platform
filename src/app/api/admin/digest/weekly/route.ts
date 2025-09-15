import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { ForumNotificationService } from '@/lib/notification-service';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    // For scheduled jobs, you might want to use a specific admin token or API key
    // For now, we'll allow it to run without authentication for scheduled execution
    if (token) {
      const user = await verifyToken(token);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Invalid token' },
          { status: 401 }
        );
      }
      // Check if user has admin permissions here
    }

    // Send weekly digest
    await ForumNotificationService.sendWeeklyDigest();

    return NextResponse.json({
      success: true,
      message: 'Weekly digest sent successfully'
    });
  } catch (error) {
    console.error('Error sending weekly digest:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send weekly digest' },
      { status: 500 }
    );
  }
}

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

    // Preview the weekly digest data
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const [popularPosts, totalUsers, totalPosts, totalComments] = await Promise.all([
      // Popular posts from last week
      prisma.forumPost.findMany({
        where: {
          created_at: { gte: oneWeekAgo },
          status: 'active'
        },
        include: {
          user: {
            select: { name: true }
          },
          category: {
            select: { name: true, icon: true }
          }
        },
        orderBy: [
          { like_count: 'desc' },
          { comment_count: 'desc' },
          { view_count: 'desc' }
        ],
        take: 5
      }),

      // Total active users
      prisma.user.count({
        where: { status: 'active' }
      }),

      // Posts this week
      prisma.forumPost.count({
        where: {
          created_at: { gte: oneWeekAgo },
          status: 'active'
        }
      }),

      // Comments this week
      prisma.communityComment.count({
        where: {
          created_at: { gte: oneWeekAgo },
          status: 'active',
          forum_post_id: { not: null }
        }
      })
    ]);

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      data: {
        preview: {
          weekStart: oneWeekAgo.toISOString(),
          weekEnd: new Date().toISOString(),
          popularPosts: popularPosts.map(post => ({
            id: post.id,
            title: post.title,
            category: post.category.name,
            author: post.user.name,
            engagement: post.like_count + post.comment_count,
            views: post.view_count
          })),
          stats: {
            totalUsers,
            postsThisWeek: totalPosts,
            commentsThisWeek: totalComments
          }
        }
      }
    });
  } catch (error) {
    console.error('Error previewing weekly digest:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to preview weekly digest' },
      { status: 500 }
    );
  }
}