import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause for filtering
    const where: any = {
      status: 'approved',
      verified: true
    };

    if (location) {
      where.location = {
        contains: location,
        mode: 'insensitive'
      };
    }

    if (type) {
      where.partner_type = type;
    }

    try {
      const partners = await prisma.partner.findMany({
        where,
        select: {
          id: true,
          name: true,
          partner_type: true,
          business_name: true,
          location: true,
          phone: true,
          website: true,
          bio: true,
          services_offered: true,
          consultation_fee: true,
          availability_hours: true,
          languages_spoken: true,
          certifications: true,
          profile_image_url: true,
          verified: true,
          verification_date: true,
          created_at: true
        },
        orderBy: {
          verification_date: 'desc'
        },
        take: limit,
        skip: offset
      });

      const total = await prisma.partner.count({ where });

      return NextResponse.json({
        partners,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });
    } catch (dbError) {
      console.error('Database error in partner search:', dbError);
      return NextResponse.json(
        { error: 'Database temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Partner search error:', error);
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const isAdmin = request.headers.get('authorization') === 'Bearer admin-token';
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { partner_id, status, verified, health_id_access, admin_notes } = body;

    if (!partner_id) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      );
    }

    try {
      const updateData: any = {};
      
      if (status && ['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
        updateData.status = status;
      }
      
      if (typeof verified === 'boolean') {
        updateData.verified = verified;
        if (verified) {
          updateData.verification_date = new Date();
        }
      }
      
      if (typeof health_id_access === 'boolean') {
        updateData.health_id_access = health_id_access;
      }
      
      if (admin_notes !== undefined) {
        updateData.admin_notes = admin_notes;
      }

      const updatedPartner = await prisma.partner.update({
        where: { id: partner_id },
        data: updateData
      });

      return NextResponse.json({
        success: true,
        message: 'Partner updated successfully',
        partner: updatedPartner
      });

    } catch (dbError) {
      console.error('Database error in partner update:', dbError);
      return NextResponse.json(
        { error: 'Failed to update partner' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Partner update error:', error);
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
  }
}