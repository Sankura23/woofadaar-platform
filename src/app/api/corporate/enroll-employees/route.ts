import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

interface DecodedToken {
  userId?: string;
  partnerId?: string;
  email: string;
  userType?: string;
}

async function verifyToken(request: NextRequest): Promise<{ userId?: string; partnerId?: string; isAdmin?: boolean } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    
    // Check if user is admin (you can modify this logic based on your admin system)
    const isAdmin = decoded.email === 'admin@woofadaar.com' || decoded.userType === 'admin';
    
    return {
      userId: decoded.userId,
      partnerId: decoded.partnerId,
      isAdmin
    };
  } catch (error) {
    return null;
  }
}

// Helper function to generate bulk Health IDs
async function generateBulkHealthIds(count: number, prefix: string = 'CORP'): Promise<string[]> {
  const healthIds: string[] = [];
  const timestamp = Date.now().toString().slice(-8);
  
  for (let i = 1; i <= count; i++) {
    const sequence = i.toString().padStart(4, '0');
    const healthId = `${prefix}${timestamp}${sequence}`;
    healthIds.push(healthId);
  }
  
  return healthIds;
}

// Helper function to calculate corporate package pricing
function calculateCorporatePackagePrice(packageType: string, employeeCount: number): number {
  const basePrices = {
    basic: 299,     // ₹299 per employee per month
    premium: 599,   // ₹599 per employee per month
    enterprise: 999 // ₹999 per employee per month
  };
  
  const basePrice = basePrices[packageType as keyof typeof basePrices] || basePrices.basic;
  let finalPrice = basePrice * employeeCount;
  
  // Volume discounts
  if (employeeCount >= 100) {
    finalPrice *= 0.85; // 15% discount for 100+ employees
  } else if (employeeCount >= 50) {
    finalPrice *= 0.90; // 10% discount for 50+ employees
  } else if (employeeCount >= 20) {
    finalPrice *= 0.95; // 5% discount for 20+ employees
  }
  
  return Math.round(finalPrice);
}

// POST /api/corporate/enroll-employees - Create corporate enrollment and bulk employee setup
export async function POST(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized' 
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      company_name,
      company_email,
      contact_person,
      contact_phone,
      employee_count,
      package_type = 'basic',
      billing_cycle = 'monthly',
      employees = []
    } = body;

    // Validation
    if (!company_name) {
      return NextResponse.json({
        success: false,
        message: 'Company name is required'
      }, { status: 400 });
    }

    if (!company_email) {
      return NextResponse.json({
        success: false,
        message: 'Company email is required'
      }, { status: 400 });
    }

    if (!contact_person) {
      return NextResponse.json({
        success: false,
        message: 'Contact person is required'
      }, { status: 400 });
    }

    if (!contact_phone) {
      return NextResponse.json({
        success: false,
        message: 'Contact phone is required'
      }, { status: 400 });
    }

    if (!employee_count || employee_count < 1) {
      return NextResponse.json({
        success: false,
        message: 'Valid employee count is required (minimum 1)'
      }, { status: 400 });
    }

    const validPackageTypes = ['basic', 'premium', 'enterprise'];
    if (!validPackageTypes.includes(package_type)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid package type'
      }, { status: 400 });
    }

    const validBillingCycles = ['monthly', 'quarterly', 'annual'];
    if (!validBillingCycles.includes(billing_cycle)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid billing cycle'
      }, { status: 400 });
    }

    // Check if company is already enrolled
    const existingEnrollment = await prisma.corporateEnrollment.findFirst({
      where: { company_email }
    });

    if (existingEnrollment) {
      return NextResponse.json({
        success: false,
        message: 'Company is already enrolled',
        data: { enrollment_id: existingEnrollment.id }
      }, { status: 409 });
    }

    // Calculate pricing
    const monthlyFee = calculateCorporatePackagePrice(package_type, employee_count);
    
    // Calculate next billing date
    const nextBillingDate = new Date();
    if (billing_cycle === 'monthly') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else if (billing_cycle === 'quarterly') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
    } else if (billing_cycle === 'annual') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    // Create corporate enrollment
    const corporateEnrollment = await prisma.corporateEnrollment.create({
      data: {
        company_name,
        company_email,
        contact_person,
        contact_phone,
        employee_count,
        package_type,
        monthly_fee: monthlyFee,
        billing_cycle,
        next_billing_date: nextBillingDate,
        status: 'active'
      }
    });

    // Process employee enrollments
    const enrolledEmployees = [];
    const errors = [];

    for (let i = 0; i < employees.length && i < employee_count; i++) {
      const employee = employees[i];
      
      try {
        // Validate employee data
        if (!employee.employee_email || !employee.employee_name) {
          errors.push({
            employee: employee,
            error: 'Employee email and name are required'
          });
          continue;
        }

        // Check if employee is already enrolled in this company
        const existingEmployee = await prisma.corporateEmployee.findUnique({
          where: {
            corporate_enrollment_id_employee_email: {
              corporate_enrollment_id: corporateEnrollment.id,
              employee_email: employee.employee_email
            }
          }
        });

        if (existingEmployee) {
          errors.push({
            employee: employee,
            error: 'Employee already enrolled in this company'
          });
          continue;
        }

        // Create employee enrollment
        const corporateEmployee = await prisma.corporateEmployee.create({
          data: {
            corporate_enrollment_id: corporateEnrollment.id,
            employee_email: employee.employee_email,
            employee_name: employee.employee_name,
            status: 'active'
          }
        });

        enrolledEmployees.push(corporateEmployee);

        // If employee provides pet information, create user account and Health IDs
        if (employee.pets && employee.pets.length > 0) {
          // Check if user already exists
          let user = await prisma.user.findUnique({
            where: { email: employee.employee_email }
          });

          // Create user if doesn't exist
          if (!user) {
            user = await prisma.user.create({
              data: {
                id: `corp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                email: employee.employee_email,
                name: employee.employee_name,
                password_hash: 'CORPORATE_SSO', // Corporate users use SSO
                location: company_name,
                experience_level: 'beginner',
                is_premium: package_type !== 'basic'
              }
            });

            // Update corporate employee with user_id
            await prisma.corporateEmployee.update({
              where: { id: corporateEmployee.id },
              data: { user_id: user.id }
            });
          }

          // Generate Health IDs for pets
          const healthIds = await generateBulkHealthIds(
            employee.pets.length, 
            `${company_name.substring(0, 3).toUpperCase()}`
          );

          // Create dogs with Health IDs
          const createdPets = [];
          for (let j = 0; j < employee.pets.length; j++) {
            const pet = employee.pets[j];
            
            const dog = await prisma.dog.create({
              data: {
                id: `dog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: pet.name || 'Corporate Pet',
                breed: pet.breed || 'Mixed',
                age_months: pet.age_months || 12,
                weight_kg: pet.weight_kg || 10,
                gender: pet.gender || 'unknown',
                vaccination_status: pet.vaccination_status || 'up_to_date',
                spayed_neutered: pet.spayed_neutered || false,
                health_id: healthIds[j],
                user_id: user.id,
                location: company_name
              }
            });

            createdPets.push({
              id: dog.id,
              name: dog.name,
              breed: dog.breed,
              health_id: dog.health_id
            });
          }

          // Update pets count
          await prisma.corporateEmployee.update({
            where: { id: corporateEmployee.id },
            data: { pets_enrolled: createdPets.length }
          });

          enrolledEmployees[enrolledEmployees.length - 1] = {
            ...corporateEmployee,
            pets: createdPets
          };
        }

      } catch (error) {
        console.error(`Employee enrollment error for ${employee.employee_email}:`, error);
        errors.push({
          employee: employee,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }

    // Update enrolled pets count
    await prisma.corporateEnrollment.update({
      where: { id: corporateEnrollment.id },
      data: {
        enrolled_pets: enrolledEmployees.reduce((sum, emp) => sum + (emp.pets?.length || 0), 0)
      }
    });

    // Send welcome notifications (mock - implement with your email service)
    const notifications = [
      {
        type: 'email',
        to: company_email,
        subject: 'Welcome to Woofadaar Corporate Program',
        template: 'corporate_welcome',
        data: {
          company_name,
          contact_person,
          enrollment_id: corporateEnrollment.id,
          package_type,
          monthly_fee: monthlyFee,
          enrolled_employees: enrolledEmployees.length
        }
      }
    ];

    // Send individual employee welcome emails
    enrolledEmployees.forEach(employee => {
      if (employee.pets && employee.pets.length > 0) {
        notifications.push({
          type: 'email',
          to: employee.employee_email,
          subject: 'Welcome to Woofadaar - Your Pet Health IDs',
          template: 'employee_welcome',
          data: {
            employee_name: employee.employee_name,
            company_name,
            pets: employee.pets,
            package_features: getPackageFeatures(package_type)
          }
        });
      }
    });

    console.log('Corporate enrollment notifications queued:', notifications.length);

    return NextResponse.json({
      success: true,
      message: `Corporate enrollment completed successfully for ${company_name}`,
      data: {
        enrollment: {
          id: corporateEnrollment.id,
          company_name,
          company_email,
          contact_person,
          employee_count,
          package_type,
          monthly_fee: monthlyFee,
          billing_cycle,
          next_billing_date: nextBillingDate,
          status: corporateEnrollment.status
        },
        enrolled_employees: enrolledEmployees.length,
        total_pets: enrolledEmployees.reduce((sum, emp) => sum + (emp.pets?.length || 0), 0),
        errors: errors.length > 0 ? errors : undefined
      },
      package_benefits: getPackageFeatures(package_type),
      next_steps: [
        'Employees will receive welcome emails with Health ID information',
        'Corporate dashboard access will be provided within 24 hours',
        'First billing cycle starts from next month',
        'Partner discounts are now active for all enrolled pets',
        errors.length > 0 ? `${errors.length} employee enrollments had issues - check errors array` : null
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('Corporate enrollment error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error during corporate enrollment'
    }, { status: 500 });
  }
}

// GET /api/corporate/enroll-employees - Get corporate enrollment information and employee list
export async function GET(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized' 
    }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const enrollment_id = searchParams.get('enrollment_id');
    const company_email = searchParams.get('company_email');
    const status = searchParams.get('status');
    const package_type = searchParams.get('package_type');

    let whereClause: any = {};

    if (enrollment_id) {
      whereClause.id = enrollment_id;
    }

    if (company_email) {
      whereClause.company_email = company_email;
    }

    if (status) {
      whereClause.status = status;
    }

    if (package_type) {
      whereClause.package_type = package_type;
    }

    const enrollments = await prisma.corporateEnrollment.findMany({
      where: whereClause,
      include: {
        employees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                is_premium: true,
                Dog: {
                  select: {
                    id: true,
                    name: true,
                    breed: true,
                    health_id: true,
                    created_at: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Calculate statistics
    const stats = {
      total_enrollments: enrollments.length,
      total_employees: enrollments.reduce((sum, e) => sum + e.employees.length, 0),
      total_pets: enrollments.reduce((sum, e) => 
        sum + e.employees.reduce((empSum, emp) => 
          empSum + (emp.user?.Dog?.length || 0), 0), 0),
      active_enrollments: enrollments.filter(e => e.status === 'active').length,
      monthly_revenue: enrollments
        .filter(e => e.status === 'active')
        .reduce((sum, e) => sum + e.monthly_fee, 0)
    };

    // Package distribution
    const packageDistribution = enrollments.reduce((acc, e) => {
      acc[e.package_type] = (acc[e.package_type] || 0) + 1;
      return acc;
    }, {} as any);

    return NextResponse.json({
      success: true,
      data: enrollments,
      statistics: stats,
      package_distribution: packageDistribution,
      available_packages: {
        basic: {
          name: 'Basic Corporate Package',
          price_per_employee: 299,
          features: getPackageFeatures('basic')
        },
        premium: {
          name: 'Premium Corporate Package',  
          price_per_employee: 599,
          features: getPackageFeatures('premium')
        },
        enterprise: {
          name: 'Enterprise Corporate Package',
          price_per_employee: 999,
          features: getPackageFeatures('enterprise')
        }
      }
    });

  } catch (error) {
    console.error('Corporate enrollment fetch error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper function to get package features
function getPackageFeatures(packageType: string): string[] {
  const features = {
    basic: [
      'Health ID generation for all employee pets',
      'Basic health tracking and records',
      'Partner directory access',
      'Monthly health reports',
      'Email support'
    ],
    premium: [
      'All Basic features included',
      'Priority partner appointments',
      '10% discount on all services',
      'Advanced health analytics',
      'Quarterly wellness webinars',
      'Dedicated account manager',
      'Phone support'
    ],
    enterprise: [
      'All Premium features included',
      'Custom health dashboard',
      '15% discount on all services',
      'On-site wellness programs',
      'Monthly health screenings',
      'Custom reporting and analytics',
      'Priority support (24/7)',
      'Custom integrations available'
    ]
  };
  
  return features[packageType as keyof typeof features] || features.basic;
}