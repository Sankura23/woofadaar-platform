import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: { users: [] }
      });
    }

    // Search for users by name
    const users = await prisma.user.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive'
        },
        status: 'active' // Only active users can be mentioned
      },
      select: {
        id: true,
        name: true,
        profile_image_url: true
      },
      take: limit,
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search users' },
      { status: 500 }
    );
  }
}