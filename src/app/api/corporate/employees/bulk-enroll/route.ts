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

// POST /api/corporate/employees/bulk-enroll - Bulk employee enrollment
export async function POST(request: NextRequest) {
  try {
    const authResult = verifyCorporateAdmin(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const body = await request.json();
    const { employees, send_invitations = true } = body;

    if (!Array.isArray(employees) || employees.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Employees array is required and must not be empty'
      }, { status: 400 });
    }

    // Get company details
    const company = await prisma.company.findUnique({
      where: { id: decoded.companyId }
    });

    if (!company) {
      return NextResponse.json({
        success: false,
        message: 'Company not found'
      }, { status: 404 });
    }

    const results = [];
    const errors = [];

    for (const emp of employees) {
      try {
        const { employee_email, employee_name, department, pet_allowance_limit = 5000.00 } = emp;

        if (!employee_email || !employee_name) {
          errors.push({
            employee: emp,
            error: 'Missing employee_email or employee_name'
          });
          continue;
        }

        // Validate email domain
        const emailDomain = employee_email.split('@')[1];
        if (emailDomain !== company.email_domain) {
          errors.push({
            employee: emp,
            error: `Email domain must be ${company.email_domain}`
          });
          continue;
        }

        // Check if employee already enrolled
        const existingEmployee = await prisma.employeeEnrollment.findFirst({
          where: {
            company_id: decoded.companyId,
            employee_email
          }
        });

        if (existingEmployee) {
          errors.push({
            employee: emp,
            error: 'Employee already enrolled'
          });
          continue;
        }

        // Try to find existing user
        const existingUser = await prisma.user.findUnique({
          where: { email: employee_email }
        });

        // Create employee enrollment
        const enrollment = await prisma.employeeEnrollment.create({
          data: {
            company_id: decoded.companyId,
            employee_email,
            employee_name,
            department,
            pet_allowance_limit,
            employee_user_id: existingUser?.id || null
          }
        });

        // Generate invitation code
        const invitationCode = `WOOF-${company.name.replace(/[^A-Z0-9]/gi, '').substring(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

        results.push({
          enrollment,
          invitation_code: invitationCode,
          already_registered: !!existingUser
        });

        // Log invitation (replace with actual email service)
        if (send_invitations) {
          console.log(`Invitation sent to ${employee_email} for ${company.name} corporate benefits`);
        }

      } catch (error) {
        errors.push({
          employee: emp,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk enrollment completed. ${results.length} successful, ${errors.length} errors`,
      data: {
        successful: results,
        errors,
        summary: {
          total_processed: employees.length,
          successful_count: results.length,
          error_count: errors.length,
          success_rate: Math.round((results.length / employees.length) * 100)
        }
      }
    });

  } catch (error) {
    console.error('Bulk enrollment error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}