import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

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

// GET /api/corporate/employees/[id] - Get employee details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = verifyCorporateAdmin(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const employeeId = params.id;

    const employee = await prisma.employeeEnrollment.findUnique({
      where: { id: employeeId },
      include: {
        employee_user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile_image_url: true,
            created_at: true,
            Dog: {
              where: { is_corporate_pet: true },
              select: {
                id: true,
                name: true,
                breed: true,
                health_id: true,
                corporate_benefits_active: true,
                created_at: true
              }
            }
          }
        },
        benefit_claims: {
          orderBy: { created_at: 'desc' },
          take: 10
        },
        company: {
          select: {
            id: true,
            name: true,
            subscription_tier: true
          }
        }
      }
    });

    if (!employee) {
      return NextResponse.json({
        success: false,
        message: 'Employee not found'
      }, { status: 404 });
    }

    // Check if user has access to this employee's company
    if (decoded.role !== 'admin' && decoded.companyId !== employee.company_id) {
      return NextResponse.json({
        success: false,
        message: 'Access denied'
      }, { status: 403 });
    }

    // Calculate employee statistics
    const totalClaimsAmount = employee.benefit_claims.reduce((sum, claim) => 
      sum + (claim.approved_amount || claim.claim_amount), 0
    );

    const approvedClaims = employee.benefit_claims.filter(claim => 
      claim.approval_status === 'approved'
    );

    return NextResponse.json({
      success: true,
      data: {
        employee,
        statistics: {
          total_pets: employee.employee_user?.Dog?.length || 0,
          active_pets: employee.employee_user?.Dog?.filter(dog => dog.corporate_benefits_active).length || 0,
          total_claims: employee.benefit_claims.length,
          approved_claims: approvedClaims.length,
          total_claims_amount: totalClaimsAmount,
          allowance_remaining: employee.pet_allowance_limit - employee.pet_allowance_used,
          allowance_utilization: Math.round((employee.pet_allowance_used / employee.pet_allowance_limit) * 100)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// PUT /api/corporate/employees/[id] - Update employee
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = verifyCorporateAdmin(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const employeeId = params.id;
    const body = await request.json();

    const employee = await prisma.employeeEnrollment.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      return NextResponse.json({
        success: false,
        message: 'Employee not found'
      }, { status: 404 });
    }

    // Check access
    if (decoded.role !== 'admin' && decoded.companyId !== employee.company_id) {
      return NextResponse.json({
        success: false,
        message: 'Access denied'
      }, { status: 403 });
    }

    const updateData: any = {};
    const allowedFields = ['employee_name', 'department', 'status', 'pet_allowance_limit'];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No valid fields provided for update'
      }, { status: 400 });
    }

    const updatedEmployee = await prisma.employeeEnrollment.update({
      where: { id: employeeId },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message: 'Employee updated successfully',
      data: { employee: updatedEmployee }
    });

  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// DELETE /api/corporate/employees/[id] - Remove employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = verifyCorporateAdmin(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const employeeId = params.id;

    const employee = await prisma.employeeEnrollment.findUnique({
      where: { id: employeeId },
      include: {
        benefit_claims: {
          where: { approval_status: 'pending' }
        }
      }
    });

    if (!employee) {
      return NextResponse.json({
        success: false,
        message: 'Employee not found'
      }, { status: 404 });
    }

    // Check access
    if (decoded.role !== 'admin' && decoded.companyId !== employee.company_id) {
      return NextResponse.json({
        success: false,
        message: 'Access denied'
      }, { status: 403 });
    }

    // Check if employee has pending claims
    if (employee.benefit_claims.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Cannot remove employee with pending benefit claims. Please process claims first.'
      }, { status: 400 });
    }

    // Soft delete by setting status to inactive
    await prisma.employeeEnrollment.update({
      where: { id: employeeId },
      data: { status: 'inactive' }
    });

    return NextResponse.json({
      success: true,
      message: 'Employee removed successfully'
    });

  } catch (error) {
    console.error('Error removing employee:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}