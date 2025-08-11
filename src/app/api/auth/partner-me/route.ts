import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('partner-token')?.value;

    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'No authentication token found'
      }, { status: 401 });
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      if (decoded.type !== 'partner') {
        return NextResponse.json({
          success: false,
          message: 'Invalid token type'
        }, { status: 401 });
      }

      // Get partner info from database
      const partner = await prisma.partner.findUnique({
        where: { id: decoded.partnerId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          partner_type: true,
          business_name: true,
          location: true,
          website: true,
          bio: true,
          services_offered: true,
          consultation_fee: true,
          availability_hours: true,
          languages_spoken: true,
          certifications: true,
          status: true,
          verified: true,
          health_id_access: true,
          profile_image_url: true,
          created_at: true,
          verification_date: true
        }
      });

      if (!partner) {
        return NextResponse.json({
          success: false,
          message: 'Partner not found'
        }, { status: 404 });
      }

      if (partner.status !== 'approved') {
        return NextResponse.json({
          success: false,
          message: 'Partner account not approved'
        }, { status: 403 });
      }

      return NextResponse.json({
        success: true,
        partner
      });

    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return NextResponse.json({
        success: false,
        message: 'Invalid or expired token'
      }, { status: 401 });
    }

  } catch (error) {
    console.error('Partner authentication check error:', error);
    return NextResponse.json({
      success: false,
      message: 'Authentication check failed'
    }, { status: 500 });
  }
}