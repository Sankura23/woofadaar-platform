import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

interface DecodedToken {
  userId?: string;
  partnerId?: string;
  email: string;
  userType?: string;
}

async function verifyToken(request: NextRequest): Promise<{ userId?: string; partnerId?: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    return {
      userId: decoded.userId,
      partnerId: decoded.partnerId
    };
  } catch (error) {
    return null;
  }
}

// POST /api/dog-id/partner-access - Grant partner access to dog ID
export async function POST(request: NextRequest) {
  try {
    // For demo purposes, we'll accept requests without strict auth
    const auth = await verifyToken(request);
    
    const body = await request.json();
    const { dog_id, partner_id, access_level } = body;

    // Validation
    if (!dog_id) {
      return NextResponse.json({
        success: false,
        message: 'Dog ID is required'
      }, { status: 400 });
    }

    if (!partner_id) {
      return NextResponse.json({
        success: false,
        message: 'Partner ID is required'
      }, { status: 400 });
    }

    if (!access_level) {
      return NextResponse.json({
        success: false,
        message: 'Access level is required'
      }, { status: 400 });
    }

    const validAccessLevels = ['basic', 'limited', 'full'];
    if (!validAccessLevels.includes(access_level)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid access level'
      }, { status: 400 });
    }

    // Try to get partner information
    let partnerName = 'Unknown Partner';
    try {
      const partner = await prisma.partner.findUnique({
        where: { id: partner_id },
        select: { name: true, business_name: true }
      });
      
      if (partner) {
        partnerName = partner.business_name || partner.name;
      }
    } catch (error) {
      console.warn('Could not fetch partner details:', error);
    }

    // For demo purposes, simulate successful access grant
    const accessData = {
      id: `access_${Date.now()}`,
      dog_id,
      partner_id,
      partner_name: partnerName,
      access_level,
      granted_at: new Date().toISOString(),
      granted_by: auth?.userId || 'demo_user',
      expires_at: null, // No expiration for this demo
      is_active: true
    };

    // In a real implementation, you would:
    // 1. Verify the dog belongs to the authenticated user
    // 2. Verify the partner exists and is approved
    // 3. Create a record in a DogIDPartnerAccess table
    // 4. Send notification to the partner
    // 5. Log the access grant for audit purposes

    return NextResponse.json({
      success: true,
      message: `Successfully granted ${access_level} access to ${partnerName}`,
      data: accessData
    });

  } catch (error) {
    console.error('Partner access grant error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to grant partner access. Please try again.'
    }, { status: 500 });
  }
}

// GET /api/dog-id/partner-access - Get all partner access grants for user's dogs
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyToken(request);
    
    // For demo purposes, return some mock access grants
    const mockAccessGrants = [
      {
        id: 'access_1',
        dog_id: 'DOG000001',
        dog_name: 'Buddy',
        partner_id: 'partner_1',
        partner_name: 'Dr. Smith Veterinary Clinic',
        partner_type: 'vet',
        access_level: 'full',
        granted_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        expires_at: null,
        is_active: true
      },
      {
        id: 'access_2',
        dog_id: 'DOG000002',
        dog_name: 'Luna',
        partner_id: 'partner_2',
        partner_name: 'Happy Paws Training Center',
        partner_type: 'trainer',
        access_level: 'limited',
        granted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true
      }
    ];

    return NextResponse.json({
      success: true,
      message: 'Partner access grants retrieved successfully',
      data: {
        access_grants: mockAccessGrants,
        total_count: mockAccessGrants.length
      }
    });

  } catch (error) {
    console.error('Partner access retrieval error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve partner access grants'
    }, { status: 500 });
  }
}

// DELETE /api/dog-id/partner-access - Revoke partner access
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyToken(request);
    
    const { searchParams } = new URL(request.url);
    const accessId = searchParams.get('id');

    if (!accessId) {
      return NextResponse.json({
        success: false,
        message: 'Access ID is required'
      }, { status: 400 });
    }

    // For demo purposes, simulate successful revocation
    return NextResponse.json({
      success: true,
      message: 'Partner access revoked successfully',
      data: {
        access_id: accessId,
        revoked_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Partner access revocation error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to revoke partner access'
    }, { status: 500 });
  }
}