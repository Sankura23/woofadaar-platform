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
        { error: 'Partner ID is required' },
        { status: 400 }
      );
    }

    try {
      // Check if partner exists
      const existingPartner = await prisma.partner.findUnique({
        where: { id }
      });

      if (!existingPartner) {
        return NextResponse.json(
          { error: 'Partner not found' },
          { status: 404 }
        );
      }

      // Delete the partner
      await prisma.partner.delete({
        where: { id }
      });

      return NextResponse.json(
        { message: 'Partner deleted successfully' },
        { status: 200 }
      );
    } catch (dbError) {
      console.error('Database error in partner delete:', dbError);
      return NextResponse.json(
        { error: 'Database temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Delete partner error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 