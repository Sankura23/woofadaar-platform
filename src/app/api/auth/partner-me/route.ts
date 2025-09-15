import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: NextRequest) {
  try {
    // Check for Bearer token in Authorization header (from localStorage)
    const authHeader = request.headers.get('authorization');
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Fallback to cookie for backward compatibility
      token = request.cookies.get('partner-token')?.value;
    }

    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'No authentication token found'
      }, { status: 401 });
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      console.log('Decoded JWT token:', { 
        userType: decoded.userType, 
        type: decoded.type, 
        partnerId: decoded.partnerId, 
        userId: decoded.userId 
      });
      
      // Check if this is a partner token (either from new system or old system)
      if (decoded.userType !== 'partner' && decoded.type !== 'partner') {
        console.log('Invalid token type:', { userType: decoded.userType, type: decoded.type });
        return NextResponse.json({
          success: false,
          message: 'Invalid token type - Partner authentication required'
        }, { status: 401 });
      }

      const partnerId = decoded.partnerId || decoded.userId;
      console.log('Extracted partner ID:', partnerId);

      if (!partnerId) {
        return NextResponse.json({
          success: false,
          message: 'Invalid token - Partner ID not found'
        }, { status: 401 });
      }

      // Get partner info from database
      let partner;
      
      try {
        partner = await prisma.partner.findUnique({
          where: { id: partnerId },
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
            consultation_fee_range: true,
            availability_schedule: true,
            languages_spoken: true,
            certifications: true,
            status: true,
            verified: true,
            health_id_access: true,
            profile_image_url: true,
            created_at: true,
            verification_date: true,
            partnership_tier: true,
            total_appointments: true,
            rating_average: true
          }
        });

        console.log('Partner found in database:', !!partner);

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

        // Format data for frontend compatibility
        const formattedPartner = {
          ...partner,
          rating: partner.rating_average || 0,
          availability_hours: partner.availability_schedule || '9:00 AM - 6:00 PM',
          consultation_fee: (() => {
            if (partner.consultation_fee_range) {
              const feeRange = partner.consultation_fee_range as any;
              return typeof feeRange === 'object' && feeRange.min ? feeRange.min : 800;
            }
            return 800;
          })()
        };
        
        partner = formattedPartner;

      } catch (dbError) {
        console.error('Database error finding partner:', dbError);
        return NextResponse.json({
          success: false,
          message: 'Database error occurred'
        }, { status: 500 });
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
    console.error('Partner authentication error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}