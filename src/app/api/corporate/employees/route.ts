import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

interface DecodedToken {
  userId?: string;
  partnerId?: string;
  email: string;
  userType?: string;
}

async function verifyToken(request: NextRequest): Promise<{ userId?: string; partnerId?: string; email?: string; isAdmin?: boolean } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    
    const isAdmin = decoded.email === 'admin@woofadaar.com' || decoded.userType === 'admin';
    
    return {
      userId: decoded.userId,
      partnerId: decoded.partnerId,
      email: decoded.email,
      isAdmin
    };
  } catch (error) {
    return null;
  }
}

// Helper function to validate corporate email domain
async function validateCorporateEmail(email: string, enrollmentId?: string) {
  if (enrollmentId) {
    // If enrollment ID provided, validate against that specific enrollment
    const enrollment = await prisma.corporateEnrollment.findUnique({
      where: { id: enrollmentId }
    });
    
    if (!enrollment) {
      return { valid: false, message: 'Corporate enrollment not found' };
    }

    // For now, simple domain matching. In production, you'd have more sophisticated validation
    const emailDomain = email.split('@')[1];
    const companyDomain = enrollment.company_email.split('@')[1];
    
    if (emailDomain !== companyDomain) {
      return { 
        valid: false, 
        message: `Email domain must match company domain: @${companyDomain}`,
        enrollment 
      };
    }

    return { valid: true, enrollment };
  }

  // If no enrollment ID, find matching corporate enrollment by email domain
  const emailDomain = email.split('@')[1];
  const enrollment = await prisma.corporateEnrollment.findFirst({
    where: {
      company_email: {
        endsWith: `@${emailDomain}`
      },
      status: 'active'
    }
  });

  if (!enrollment) {
    return { 
      valid: false, 
      message: `No active corporate enrollment found for domain: @${emailDomain}` 
    };
  }

  return { valid: true, enrollment };
}

// Helper function to generate invitation code
function generateInvitationCode(companyName: string, employeeEmail: string): string {
  const timestamp = Date.now().toString(36);
  const companyCode = companyName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
  const emailCode = employeeEmail.split('@')[0].substring(0, 3).toUpperCase();
  return `WOOF-${companyCode}-${emailCode}-${timestamp}`;
}

// Helper function to send employee invitation
async function sendEmployeeInvitation(employee: any, enrollment: any, invitationCode: string) {
  console.log(`Employee invitation queued:`, {
    to: employee.employee_email,
    subject: 'Pet Benefits Enrollment - Your Company Benefits',
    template: 'employee_invitation',
    data: {
      employee_name: employee.employee_name,
      company_name: enrollment.company_name,
      invitation_code: invitationCode,
      package_type: enrollment.package_type,
      benefits_url: `${process.env.FRONTEND_URL}/corporate/enroll/${invitationCode}`,
      message: `${employee.employee_name}, your company ${enrollment.company_name} has enrolled in Woofadaar pet benefits! Use invitation code ${invitationCode} to enroll your pet(s).`
    }
  });
}

// POST /api/corporate/employees - Add employee to corporate enrollment or employee self-enrollment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      corporate_enrollment_id,
      employee_email,
      employee_name,
      action = 'add_employee', // 'add_employee', 'self_enroll', 'bulk_invite'
      employee_list, // For bulk operations
      send_invitation = true
    } = body;

    // Validation
    if (!employee_email && !employee_list) {
      return NextResponse.json({
        success: false,
        message: 'employee_email or employee_list is required'
      }, { status: 400 });
    }

    if (!corporate_enrollment_id && action !== 'self_enroll') {
      return NextResponse.json({
        success: false,
        message: 'corporate_enrollment_id is required'
      }, { status: 400 });
    }

    // Handle self-enrollment (employee enrolling themselves)
    if (action === 'self_enroll') {
      const validation = await validateCorporateEmail(employee_email);
      
      if (!validation.valid) {
        return NextResponse.json({
          success: false,
          message: validation.message
        }, { status: 400 });
      }

      const enrollment = validation.enrollment!;

      // Check if employee already exists
      const existingEmployee = await prisma.corporateEmployee.findFirst({
        where: {
          corporate_enrollment_id: enrollment.id,
          employee_email
        }
      });

      if (existingEmployee) {
        return NextResponse.json({
          success: false,
          message: 'Employee is already enrolled in this corporate program',
          data: {
            employee: existingEmployee,
            invitation_code: generateInvitationCode(enrollment.company_name, employee_email)
          }
        }, { status: 409 });
      }

      // Check if corporate enrollment has capacity
      const currentEmployeeCount = await prisma.corporateEmployee.count({
        where: {
          corporate_enrollment_id: enrollment.id,
          status: 'active'
        }
      });

      if (currentEmployeeCount >= enrollment.employee_count) {
        return NextResponse.json({
          success: false,
          message: 'Corporate enrollment has reached maximum employee capacity'
        }, { status: 400 });
      }

      // Create employee record
      const newEmployee = await prisma.corporateEmployee.create({
        data: {
          corporate_enrollment_id: enrollment.id,
          employee_email,
          employee_name: employee_name || employee_email.split('@')[0],
          status: 'active'
        }
      });

      // Generate invitation code
      const invitationCode = generateInvitationCode(enrollment.company_name, employee_email);

      // Send invitation if requested
      if (send_invitation) {
        await sendEmployeeInvitation(newEmployee, enrollment, invitationCode);
      }

      return NextResponse.json({
        success: true,
        message: 'Employee self-enrollment completed successfully',
        data: {
          employee: newEmployee,
          corporate_enrollment: {
            id: enrollment.id,
            company_name: enrollment.company_name,
            package_type: enrollment.package_type
          },
          invitation_code: invitationCode,
          benefits_access: {
            max_pets_per_employee: enrollment.package_type === 'enterprise' ? 3 : 
                                  enrollment.package_type === 'premium' ? 2 : 1,
            features: getCorporateFeatures(enrollment.package_type)
          }
        }
      });
    }

    // Handle bulk employee invitation
    if (action === 'bulk_invite' && employee_list) {
      if (!Array.isArray(employee_list) || employee_list.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'employee_list must be a non-empty array'
        }, { status: 400 });
      }

      const enrollment = await prisma.corporateEnrollment.findUnique({
        where: { id: corporate_enrollment_id }
      });

      if (!enrollment) {
        return NextResponse.json({
          success: false,
          message: 'Corporate enrollment not found'
        }, { status: 404 });
      }

      const results = [];
      const errors = [];

      for (const emp of employee_list) {
        try {
          if (!emp.employee_email || !emp.employee_name) {
            errors.push({
              employee: emp,
              error: 'Missing employee_email or employee_name'
            });
            continue;
          }

          // Validate email domain
          const validation = await validateCorporateEmail(emp.employee_email, enrollment.id);
          if (!validation.valid) {
            errors.push({
              employee: emp,
              error: validation.message
            });
            continue;
          }

          // Check if already exists
          const existing = await prisma.corporateEmployee.findFirst({
            where: {
              corporate_enrollment_id: enrollment.id,
              employee_email: emp.employee_email
            }
          });

          if (existing) {
            errors.push({
              employee: emp,
              error: 'Employee already enrolled'
            });
            continue;
          }

          // Create employee
          const newEmployee = await prisma.corporateEmployee.create({
            data: {
              corporate_enrollment_id: enrollment.id,
              employee_email: emp.employee_email,
              employee_name: emp.employee_name,
              status: 'active'
            }
          });

          const invitationCode = generateInvitationCode(enrollment.company_name, emp.employee_email);

          if (send_invitation) {
            await sendEmployeeInvitation(newEmployee, enrollment, invitationCode);
          }

          results.push({
            employee: newEmployee,
            invitation_code: invitationCode,
            invitation_sent: send_invitation
          });

        } catch (error) {
          errors.push({
            employee: emp,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Bulk invitation completed. ${results.length} successful, ${errors.length} errors`,
        data: {
          successful_invitations: results,
          errors: errors,
          summary: {
            total_processed: employee_list.length,
            successful: results.length,
            failed: errors.length
          }
        }
      });
    }

    // Handle single employee addition (admin/HR initiated)
    const enrollment = await prisma.corporateEnrollment.findUnique({
      where: { id: corporate_enrollment_id }
    });

    if (!enrollment) {
      return NextResponse.json({
        success: false,
        message: 'Corporate enrollment not found'
      }, { status: 404 });
    }

    // Validate email domain
    const validation = await validateCorporateEmail(employee_email, enrollment.id);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        message: validation.message
      }, { status: 400 });
    }

    // Check if employee already exists
    const existingEmployee = await prisma.corporateEmployee.findFirst({
      where: {
        corporate_enrollment_id: enrollment.id,
        employee_email
      }
    });

    if (existingEmployee) {
      return NextResponse.json({
        success: false,
        message: 'Employee is already enrolled in this corporate program'
      }, { status: 409 });
    }

    // Check capacity
    const currentEmployeeCount = await prisma.corporateEmployee.count({
      where: {
        corporate_enrollment_id: enrollment.id,
        status: 'active'
      }
    });

    if (currentEmployeeCount >= enrollment.employee_count) {
      return NextResponse.json({
        success: false,
        message: 'Corporate enrollment has reached maximum employee capacity'
      }, { status: 400 });
    }

    // Create employee record
    const newEmployee = await prisma.corporateEmployee.create({
      data: {
        corporate_enrollment_id: enrollment.id,
        employee_email,
        employee_name: employee_name || employee_email.split('@')[0],
        status: 'active'
      }
    });

    // Generate invitation code
    const invitationCode = generateInvitationCode(enrollment.company_name, employee_email);

    // Send invitation if requested
    if (send_invitation) {
      await sendEmployeeInvitation(newEmployee, enrollment, invitationCode);
    }

    return NextResponse.json({
      success: true,
      message: 'Employee added to corporate enrollment successfully',
      data: {
        employee: newEmployee,
        invitation_code: invitationCode,
        invitation_sent: send_invitation,
        corporate_enrollment: {
          id: enrollment.id,
          company_name: enrollment.company_name,
          package_type: enrollment.package_type
        }
      }
    });

  } catch (error) {
    console.error('Corporate employee management error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error during employee management'
    }, { status: 500 });
  }
}

// GET /api/corporate/employees - Get corporate employees or validate employee eligibility
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const corporate_enrollment_id = searchParams.get('corporate_enrollment_id');
    const employee_email = searchParams.get('employee_email');
    const action = searchParams.get('action') || 'list';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Validate employee eligibility for self-enrollment
    if (action === 'validate' && employee_email) {
      const validation = await validateCorporateEmail(employee_email);
      
      if (!validation.valid) {
        return NextResponse.json({
          success: false,
          message: validation.message,
          data: { eligible: false }
        });
      }

      const enrollment = validation.enrollment!;

      // Check if already enrolled
      const existingEmployee = await prisma.corporateEmployee.findFirst({
        where: {
          corporate_enrollment_id: enrollment.id,
          employee_email
        }
      });

      // Check current capacity
      const currentEmployeeCount = await prisma.corporateEmployee.count({
        where: {
          corporate_enrollment_id: enrollment.id,
          status: 'active'
        }
      });

      const hasCapacity = currentEmployeeCount < enrollment.employee_count;

      return NextResponse.json({
        success: true,
        data: {
          eligible: !existingEmployee && hasCapacity,
          already_enrolled: !!existingEmployee,
          corporate_enrollment: {
            id: enrollment.id,
            company_name: enrollment.company_name,
            package_type: enrollment.package_type,
            current_employees: currentEmployeeCount,
            max_employees: enrollment.employee_count,
            has_capacity: hasCapacity
          },
          benefits: getCorporateFeatures(enrollment.package_type),
          max_pets_per_employee: enrollment.package_type === 'enterprise' ? 3 : 
                                 enrollment.package_type === 'premium' ? 2 : 1
        }
      });
    }

    // List employees for a corporate enrollment
    if (!corporate_enrollment_id) {
      return NextResponse.json({
        success: false,
        message: 'corporate_enrollment_id is required'
      }, { status: 400 });
    }

    const enrollment = await prisma.corporateEnrollment.findUnique({
      where: { id: corporate_enrollment_id }
    });

    if (!enrollment) {
      return NextResponse.json({
        success: false,
        message: 'Corporate enrollment not found'
      }, { status: 404 });
    }

    // Get employees with pagination
    const [employees, totalCount] = await Promise.all([
      prisma.corporateEmployee.findMany({
        where: { corporate_enrollment_id },
        orderBy: { enrollment_date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              created_at: true,
              Dog: {
                select: {
                  id: true,
                  name: true,
                  breed: true,
                  health_id: true
                }
              }
            }
          }
        }
      }),
      prisma.corporateEmployee.count({
        where: { corporate_enrollment_id }
      })
    ]);

    // Calculate statistics
    const activeEmployees = employees.filter(emp => emp.status === 'active');
    const totalPetsEnrolled = employees.reduce((sum, emp) => {
      return sum + (emp.user?.Dog?.length || 0);
    }, 0);

    return NextResponse.json({
      success: true,
      data: {
        corporate_enrollment: {
          id: enrollment.id,
          company_name: enrollment.company_name,
          package_type: enrollment.package_type,
          employee_count: enrollment.employee_count,
          enrolled_pets: totalPetsEnrolled
        },
        employees: employees.map(emp => ({
          id: emp.id,
          employee_email: emp.employee_email,
          employee_name: emp.employee_name,
          pets_enrolled: emp.pets_enrolled,
          enrollment_date: emp.enrollment_date,
          status: emp.status,
          user_registered: !!emp.user,
          pets: emp.user?.Dog || []
        })),
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalCount / limit),
          total_count: totalCount,
          per_page: limit
        },
        statistics: {
          total_employees: totalCount,
          active_employees: activeEmployees.length,
          total_pets_enrolled: totalPetsEnrolled,
          utilization_rate: enrollment.employee_count > 0 ? 
            Math.round((activeEmployees.length / enrollment.employee_count) * 100) : 0,
          average_pets_per_employee: activeEmployees.length > 0 ? 
            Math.round((totalPetsEnrolled / activeEmployees.length) * 10) / 10 : 0
        }
      }
    });

  } catch (error) {
    console.error('Corporate employees fetch error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while fetching corporate employees'
    }, { status: 500 });
  }
}

// Helper function to get corporate features
function getCorporateFeatures(packageType: string): string[] {
  const features = {
    basic: [
      'Pet Health ID management for all enrolled pets',
      'Basic health tracking and logging',
      'Q&A access to vet community',
      'Monthly health reports',
      'Email support'
    ],
    premium: [
      'All Basic features',
      'Priority partner bookings (10% discount)',
      'Advanced health analytics',
      'Dedicated corporate dashboard',
      'Quarterly wellness workshops',
      'Phone support',
      'Custom health alerts'
    ],
    enterprise: [
      'All Premium features',
      'Dedicated account manager',
      'On-site wellness events',
      'Custom integrations with HR systems',
      'Advanced reporting and analytics',
      'Priority emergency consultations',
      '24/7 phone support',
      'Bulk health record management',
      'API access for custom applications'
    ]
  };

  return features[packageType as keyof typeof features] || [];
}