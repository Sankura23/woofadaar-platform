import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authorization
    const isAdmin = request.headers.get('authorization') === 'Bearer admin-token';
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      );
    }

    try {
      // Check if entry exists
      const existingEntry = await prisma.waitlist.findUnique({
        where: { id }
      });

      if (!existingEntry) {
        return NextResponse.json(
          { error: 'Entry not found' },
          { status: 404 }
        );
      }

      // Delete the entry
      await prisma.waitlist.delete({
        where: { id }
      });

      return NextResponse.json(
        { message: 'Entry deleted successfully' },
        { status: 200 }
      );
    } catch (dbError) {
      console.error('Database error in delete:', dbError);
      return NextResponse.json(
        { error: 'Database temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Delete waitlist entry error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 