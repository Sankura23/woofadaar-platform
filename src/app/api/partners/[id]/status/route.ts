import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function PUT(
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
    const body = await request.json();
    const { status } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      );
    }

    if (!status || !['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required' },
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

      // Update partner status
      const updatedPartner = await prisma.partner.update({
        where: { id },
        data: {
          status,
          verified: status === 'approved',
          verification_date: status === 'approved' ? new Date() : null
        }
      });

      return NextResponse.json({
        message: 'Partner status updated successfully',
        partner: updatedPartner
      });

    } catch (dbError) {
      console.error('Database error in partner status update:', dbError);
      return NextResponse.json(
        { error: 'Database temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Update partner status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 