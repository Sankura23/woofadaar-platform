import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

// GET /api/auth/corporate-admin - Get current corporate admin info
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
    
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret) as any;
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: 'Invalid authentication token'
      }, { status: 401 });
    }

    if (!decoded.userId || decoded.userType !== 'corporate-admin') {
      return NextResponse.json({
        success: false,
        message: 'Invalid corporate admin token'
      }, { status: 401 });
    }

    // Fetch current corporate admin details
    const corporateAdmin = await prisma.corporateAdmin.findUnique({
      where: { id: decoded.corporateId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            profile_image_url: true,
            updated_at: true
          }
        },
        company: {
          select: {
            id: true,
            name: true,
            email_domain: true,
            industry: true,
            employee_count: true,
            subscription_tier: true,
            billing_cycle: true,
            status: true,
            logo_url: true,
            contact_person: true,
            contact_email: true,
            created_at: true
          }
        }
      }
    });

    if (!corporateAdmin) {
      return NextResponse.json({
        success: false,
        message: 'Corporate admin not found'
      }, { status: 404 });
    }

    // Get company statistics
    const [employeeCount, activeEmployees, totalPets, activeClaims] = await Promise.all([
      prisma.employeeEnrollment.count({
        where: { company_id: corporateAdmin.company_id }
      }),
      prisma.employeeEnrollment.count({
        where: { 
          company_id: corporateAdmin.company_id,
          status: 'active'
        }
      }),
      prisma.dog.count({
        where: { 
          company_id: corporateAdmin.company_id,
          is_corporate_pet: true
        }
      }),
      prisma.petBenefitClaim.count({
        where: { 
          employee_enrollment: {
            company_id: corporateAdmin.company_id
          },
          approval_status: 'pending'
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        admin: corporateAdmin,
        company: corporateAdmin.company,
        user: corporateAdmin.user,
        statistics: {
          total_employees: employeeCount,
          active_employees: activeEmployees,
          total_corporate_pets: totalPets,
          pending_claims: activeClaims
        }
      }
    });

  } catch (error) {
    console.error('Error fetching corporate admin:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// PUT /api/auth/corporate-admin - Update corporate admin info
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
    
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret) as any;
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: 'Invalid authentication token'
      }, { status: 401 });
    }

    if (!decoded.userId || decoded.userType !== 'corporate-admin') {
      return NextResponse.json({
        success: false,
        message: 'Invalid corporate admin token'
      }, { status: 401 });
    }

    const body = await request.json();
    const { name, profile_image_url, permissions } = body;

    // Update user info
    if (name || profile_image_url) {
      await prisma.user.update({
        where: { id: decoded.userId },
        data: {
          ...(name && { name }),
          ...(profile_image_url && { profile_image_url }),
          updated_at: new Date()
        }
      });
    }

    // Update corporate admin permissions (only if user has admin role)
    if (permissions && decoded.role === 'admin') {
      await prisma.corporateAdmin.update({
        where: { id: decoded.corporateId },
        data: { permissions }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Corporate admin updated successfully'
    });

  } catch (error) {
    console.error('Error updating corporate admin:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}