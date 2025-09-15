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

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get moderation statistics
    const [pending, approved, rejected, totalToday, autoFlagged] = await Promise.all([
      // Pending items
      prisma.moderationQueue.count({
        where: { status: 'pending' }
      }),
      
      // Approved today
      prisma.moderationQueue.count({
        where: {
          status: 'approved',
          processed_at: {
            gte: today,
            lt: tomorrow
          }
        }
      }),
      
      // Rejected today
      prisma.moderationQueue.count({
        where: {
          status: 'rejected',
          processed_at: {
            gte: today,
            lt: tomorrow
          }
        }
      }),
      
      // Total processed today
      prisma.moderationQueue.count({
        where: {
          processed_at: {
            gte: today,
            lt: tomorrow
          }
        }
      }),
      
      // Auto-flagged items (pending)
      prisma.moderationQueue.count({
        where: {
          status: 'pending',
          auto_flagged: true
        }
      })
    ]);

    const stats = {
      pending,
      approved,
      rejected,
      total_today: totalToday,
      auto_flagged: autoFlagged
    };

    return NextResponse.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Error fetching moderation stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch moderation stats' },
      { status: 500 }
    );
  }
}