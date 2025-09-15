import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

// Helper function to verify corporate admin token
const verifyCorporateAdmin = (authHeader: string | null) => {
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Authentication required', status: 401 };
  }

  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
  
  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    if (!decoded.userId || decoded.userType !== 'corporate-admin') {
      return { error: 'Invalid corporate admin token', status: 401 };
    }
    return { decoded };
  } catch (error) {
    return { error: 'Invalid authentication token', status: 401 };
  }
};

// GET /api/corporate/companies/[id] - Get company details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = verifyCorporateAdmin(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({
        success: false,
        message: authResult.error
      }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const companyId = params.id;

    // Check if user has access to this company
    if (decoded.role !== 'admin' && decoded.companyId !== companyId) {
      return NextResponse.json({
        success: false,
        message: 'Access denied to this company'
      }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        employee_enrollments: {
          include: {
            employee_user: {
              select: { id: true, name: true, email: true }
            },
            benefit_claims: {
              select: { 
                id: true, 
                claim_type: true, 
                claim_amount: true, 
                approval_status: true,
                claim_date: true
              }
            }
          }
        },
        dogs: {
          where: { is_corporate_pet: true },
          select: {
            id: true,
            name: true,
            breed: true,
            health_id: true,
            corporate_benefits_active: true,
            created_at: true
          }
        },
        corporate_billing: {
          orderBy: { created_at: 'desc' },
          take: 10
        },
        _count: {
          select: {
            employee_enrollments: true,
            dogs: true,
            corporate_admins: true
          }
        }
      }
    });

    if (!company) {
      return NextResponse.json({
        success: false,
        message: 'Company not found'
      }, { status: 404 });
    }

    // Calculate statistics
    const statistics = {
      total_employees: company._count.employee_enrollments,
      active_employees: company.employee_enrollments.filter(e => e.status === 'active').length,
      total_pets: company._count.dogs,
      active_pets: company.dogs.filter(d => d.corporate_benefits_active).length,
      pending_claims: company.employee_enrollments.reduce((total, enrollment) => 
        total + enrollment.benefit_claims.filter(claim => claim.approval_status === 'pending').length, 0
      ),
      total_admins: company._count.corporate_admins
    };

    return NextResponse.json({
      success: true,
      data: {
        company,
        statistics
      }
    });

  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// PUT /api/corporate/companies/[id] - Update company
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = verifyCorporateAdmin(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({
        success: false,
        message: authResult.error
      }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const companyId = params.id;

    // Check permissions
    if (decoded.role !== 'admin' && decoded.companyId !== companyId) {
      return NextResponse.json({
        success: false,
        message: 'Access denied to update this company'
      }, { status: 403 });
    }

    const body = await request.json();
    const updateData: any = {};

    // Fields that can be updated
    const allowedFields = [
      'name', 'industry', 'employee_count', 'address', 'billing_address',
      'contact_person', 'contact_email', 'contact_phone', 'logo_url'
    ];

    // Admin-only fields
    const adminOnlyFields = ['subscription_tier', 'billing_cycle', 'status'];

    // Add allowed fields
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Add admin-only fields if user is admin
    if (decoded.role === 'admin') {
      adminOnlyFields.forEach(field => {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      });
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No valid fields provided for update'
      }, { status: 400 });
    }

    updateData.updated_at = new Date();

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: updateData
    });

    console.log(`Company updated: ${updatedCompany.name} by ${decoded.email}`);

    return NextResponse.json({
      success: true,
      message: 'Company updated successfully',
      data: { company: updatedCompany }
    });

  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// DELETE /api/corporate/companies/[id] - Delete company (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = verifyCorporateAdmin(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({
        success: false,
        message: authResult.error
      }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const companyId = params.id;

    // Only system admin can delete companies
    if (decoded.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Only system administrators can delete companies'
      }, { status: 403 });
    }

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: {
            employee_enrollments: true,
            dogs: true
          }
        }
      }
    });

    if (!company) {
      return NextResponse.json({
        success: false,
        message: 'Company not found'
      }, { status: 404 });
    }

    // Soft delete by setting status to 'cancelled'
    await prisma.company.update({
      where: { id: companyId },
      data: { 
        status: 'cancelled',
        updated_at: new Date()
      }
    });

    console.log(`Company deleted: ${company.name} by ${decoded.email}`);

    return NextResponse.json({
      success: true,
      message: 'Company deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}