import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Increment view count
    await prisma.forumPost.update({
      where: { 
        id,
        status: 'active'
      },
      data: {
        view_count: { increment: 1 }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'View count updated'
    });
  } catch (error) {
    console.error('Error updating view count:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update view count' },
      { status: 500 }
    );
  }
}