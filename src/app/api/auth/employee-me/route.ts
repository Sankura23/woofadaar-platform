import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

const verifyEmployeeToken = (authHeader: string | null) => {
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Authentication required', status: 401 };
  }
  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    if (!decoded.userId || decoded.userType !== 'employee') {
      return { error: 'Invalid employee token', status: 401 };
    }
    return { decoded };
  } catch (error) {
    return { error: 'Invalid authentication token', status: 401 };
  }
};

// GET /api/auth/employee-me - Get current employee profile with benefits info
export async function GET(request: NextRequest) {
  try {
    const authResult = verifyEmployeeToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;

    // Find employee enrollment record
    const enrollment = await prisma.employeeEnrollment.findFirst({
      where: { 
        employee_user_id: decoded.userId,
        status: 'active'
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            subscription_tier: true,
            logo_url: true,
            employee_count: true
          }
        },
        employee_user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile_image_url: true
          }
        },
        benefit_claims: {
          select: {
            id: true,
            claim_amount: true,
            approved_amount: true,
            approval_status: true,
            claim_date: true
          },
          orderBy: { claim_date: 'desc' },
          take: 10
        }
      }
    });

    if (!enrollment) {
      return NextResponse.json({
        success: false,
        message: 'Employee enrollment not found. Please contact your HR department.'
      }, { status: 404 });
    }

    // Calculate total allowance used from approved claims
    const approvedClaims = enrollment.benefit_claims.filter(c => c.approval_status === 'approved');
    const totalUsed = approvedClaims.reduce((sum, claim) => sum + (claim.approved_amount || 0), 0);

    // Get corporate pets count for this employee
    const corporatePetsCount = await prisma.dog.count({
      where: {
        user_id: decoded.userId,
        is_corporate_pet: true,
        corporate_benefits_active: true
      }
    });

    // Prepare employee data
    const employeeData = {
      id: enrollment.id,
      employee_name: enrollment.employee_name,
      employee_email: enrollment.employee_email,
      department: enrollment.department,
      status: enrollment.status,
      enrollment_date: enrollment.enrollment_date,
      pet_allowance_limit: enrollment.pet_allowance_limit,
      pet_allowance_used: totalUsed,
      invitation_code: enrollment.invitation_code,
      company: enrollment.company,
      employee_user: enrollment.employee_user,
      benefit_claims: enrollment.benefit_claims,
      corporate_pets_count: corporatePetsCount
    };

    // Get company statistics for context
    const companyStats = await prisma.company.findUnique({
      where: { id: enrollment.company_id },
      select: {
        _count: {
          select: {
            employee_enrollments: {
              where: { status: 'active' }
            },
            dogs: {
              where: {
                is_corporate_pet: true,
                corporate_benefits_active: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Employee profile retrieved successfully',
      data: {
        employee: employeeData,
        company_stats: {
          total_active_employees: companyStats?._count.employee_enrollments || 0,
          total_corporate_pets: companyStats?._count.dogs || 0
        },
        benefit_summary: {
          allowance_limit: enrollment.pet_allowance_limit,
          allowance_used: totalUsed,
          allowance_remaining: enrollment.pet_allowance_limit - totalUsed,
          utilization_percentage: Math.round((totalUsed / enrollment.pet_allowance_limit) * 100),
          total_claims: enrollment.benefit_claims.length,
          approved_claims: approvedClaims.length,
          pending_claims: enrollment.benefit_claims.filter(c => c.approval_status === 'pending').length,
          corporate_pets: corporatePetsCount
        }
      }
    });

  } catch (error) {
    console.error('Error fetching employee profile:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}