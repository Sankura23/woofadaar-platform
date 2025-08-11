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

// Helper function to calculate corporate package pricing
function calculateCorporatePackage(employeeCount: number, packageType: string) {
  const baseRates = {
    basic: { per_employee: 50, min_employees: 10, max_pets_per_employee: 1 },
    premium: { per_employee: 80, min_employees: 25, max_pets_per_employee: 2 },
    enterprise: { per_employee: 120, min_employees: 50, max_pets_per_employee: 3 }
  };

  const packageDetails = baseRates[packageType as keyof typeof baseRates];
  if (!packageDetails) {
    throw new Error('Invalid package type');
  }

  if (employeeCount < packageDetails.min_employees) {
    throw new Error(`Minimum ${packageDetails.min_employees} employees required for ${packageType} package`);
  }

  // Volume discounts
  let discount = 0;
  if (employeeCount >= 500) discount = 0.25; // 25% discount for 500+ employees
  else if (employeeCount >= 200) discount = 0.20; // 20% discount for 200+ employees
  else if (employeeCount >= 100) discount = 0.15; // 15% discount for 100+ employees
  else if (employeeCount >= 50) discount = 0.10; // 10% discount for 50+ employees

  const basePrice = employeeCount * packageDetails.per_employee;
  const discountAmount = basePrice * discount;
  const finalPriceMonthly = basePrice - discountAmount;

  return {
    package_type: packageType,
    employee_count: employeeCount,
    base_price_monthly: basePrice,
    discount_percentage: discount * 100,
    discount_amount: Math.round(discountAmount),
    final_price_monthly: Math.round(finalPriceMonthly),
    price_per_employee: Math.round(finalPriceMonthly / employeeCount),
    max_pets_per_employee: packageDetails.max_pets_per_employee,
    total_pet_capacity: employeeCount * packageDetails.max_pets_per_employee,
    features: getCorporateFeatures(packageType)
  };
}

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

// Helper function to generate employee invitation code
function generateInvitationCode(companyName: string, employeeEmail: string): string {
  const timestamp = Date.now().toString(36);
  const companyCode = companyName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
  const emailCode = employeeEmail.split('@')[0].substring(0, 3).toUpperCase();
  return `WOOF-${companyCode}-${emailCode}-${timestamp}`;
}

// Helper function to send corporate notifications
async function sendCorporateNotification(type: string, data: any) {
  const notifications = {
    enrollment_created: {
      subject: 'Corporate Enrollment Created - Woofadaar',
      template: 'corporate_enrollment',
      message: `Corporate enrollment for ${data.company_name} has been created successfully. ${data.employee_count} employees can now enroll their pets.`
    },
    employee_invitation: {
      subject: 'Pet Benefits Enrollment - Your Company Benefits',
      template: 'employee_invitation',
      message: `Your company has enrolled in Woofadaar pet benefits! Use invitation code ${data.invitation_code} to enroll your pet(s).`
    },
    enrollment_approved: {
      subject: 'Corporate Enrollment Approved - Welcome to Woofadaar!',
      template: 'enrollment_approved',
      message: `Your corporate enrollment has been approved. Employees can now access their pet benefits.`
    }
  };

  const notification = notifications[type as keyof typeof notifications];
  if (notification) {
    console.log(`Corporate notification queued:`, {
      type,
      subject: notification.subject,
      template: notification.template,
      data: { ...data, message: notification.message }
    });
  }
}

// POST /api/corporate/enroll - Create corporate enrollment
export async function POST(request: NextRequest) {
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
      industry,
      company_size_category,
      expected_pet_enrollment_percentage,
      additional_notes
    } = body;

    // Validation
    if (!company_name || !company_email || !contact_person || !contact_phone || !employee_count) {
      return NextResponse.json({
        success: false,
        message: 'Required fields: company_name, company_email, contact_person, contact_phone, employee_count'
      }, { status: 400 });
    }

    if (!['basic', 'premium', 'enterprise'].includes(package_type)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid package type. Must be: basic, premium, or enterprise'
      }, { status: 400 });
    }

    if (!['monthly', 'quarterly', 'annual'].includes(billing_cycle)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid billing cycle. Must be: monthly, quarterly, or annual'
      }, { status: 400 });
    }

    if (employee_count < 10) {
      return NextResponse.json({
        success: false,
        message: 'Minimum 10 employees required for corporate enrollment'
      }, { status: 400 });
    }

    // Check if company already exists
    const existingEnrollment = await prisma.corporateEnrollment.findFirst({
      where: {
        OR: [
          { company_email },
          { company_name }
        ]
      }
    });

    if (existingEnrollment) {
      return NextResponse.json({
        success: false,
        message: 'Company with this name or email already has an enrollment'
      }, { status: 409 });
    }

    // Calculate package pricing
    const packageDetails = calculateCorporatePackage(employee_count, package_type);

    // Adjust pricing for billing cycle
    let finalMonthlyFee = packageDetails.final_price_monthly;
    let billingCycleMultiplier = 1;
    let billingDiscount = 0;

    if (billing_cycle === 'quarterly') {
      billingCycleMultiplier = 3;
      billingDiscount = 0.05; // 5% discount for quarterly
    } else if (billing_cycle === 'annual') {
      billingCycleMultiplier = 12;
      billingDiscount = 0.15; // 15% discount for annual
    }

    const billingAmount = finalMonthlyFee * billingCycleMultiplier;
    const billingDiscountAmount = billingAmount * billingDiscount;
    const finalBillingAmount = billingAmount - billingDiscountAmount;

    // Calculate next billing date
    const nextBillingDate = new Date();
    if (billing_cycle === 'quarterly') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
    } else if (billing_cycle === 'annual') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    // Create corporate enrollment
    const enrollment = await prisma.corporateEnrollment.create({
      data: {
        company_name,
        company_email,
        contact_person,
        contact_phone,
        employee_count,
        package_type,
        monthly_fee: finalMonthlyFee,
        billing_cycle,
        next_billing_date: nextBillingDate,
        status: 'active' // Auto-approve for now, can add approval workflow later
      }
    });

    // Send notification
    await sendCorporateNotification('enrollment_created', {
      company_name,
      employee_count,
      package_type,
      enrollment_id: enrollment.id
    });

    return NextResponse.json({
      success: true,
      message: 'Corporate enrollment created successfully',
      data: {
        enrollment: {
          id: enrollment.id,
          company_name: enrollment.company_name,
          package_type: enrollment.package_type,
          employee_count: enrollment.employee_count,
          status: enrollment.status,
          created_at: enrollment.created_at
        },
        package_details: packageDetails,
        billing_details: {
          billing_cycle,
          monthly_fee: finalMonthlyFee,
          billing_cycle_multiplier: billingCycleMultiplier,
          billing_discount_percentage: billingDiscount * 100,
          billing_discount_amount: Math.round(billingDiscountAmount),
          total_billing_amount: Math.round(finalBillingAmount),
          next_billing_date: nextBillingDate.toISOString()
        }
      },
      next_steps: [
        'Corporate enrollment is now active',
        'Employees can register using company email domain',
        'You will receive onboarding materials via email',
        'Dashboard access will be provided within 24 hours',
        billing_cycle === 'annual' ? `Next billing: ${nextBillingDate.toLocaleDateString()} (15% annual discount applied)` :
        billing_cycle === 'quarterly' ? `Next billing: ${nextBillingDate.toLocaleDateString()} (5% quarterly discount applied)` :
        `Next billing: ${nextBillingDate.toLocaleDateString()}`
      ]
    });

  } catch (error) {
    console.error('Corporate enrollment error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error during corporate enrollment'
    }, { status: 500 });
  }
}

// GET /api/corporate/enroll - Get corporate enrollment information and pricing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company_email = searchParams.get('company_email');
    const enrollment_id = searchParams.get('enrollment_id');
    const employee_count = searchParams.get('employee_count');
    const package_type = searchParams.get('package_type') || 'basic';
    const action = searchParams.get('action') || 'info';

    // If requesting pricing information
    if (action === 'pricing' && employee_count) {
      const count = parseInt(employee_count);
      if (count < 10) {
        return NextResponse.json({
          success: false,
          message: 'Minimum 10 employees required for corporate enrollment'
        }, { status: 400 });
      }

      const packages = ['basic', 'premium', 'enterprise'].map(pkg => {
        try {
          return calculateCorporatePackage(count, pkg);
        } catch (error) {
          return null;
        }
      }).filter(Boolean);

      return NextResponse.json({
        success: true,
        data: {
          employee_count: count,
          available_packages: packages,
          billing_cycle_discounts: {
            monthly: { discount: 0, description: 'Standard monthly billing' },
            quarterly: { discount: 5, description: '5% discount for quarterly billing' },
            annual: { discount: 15, description: '15% discount for annual billing' }
          },
          corporate_benefits: [
            'Bulk employee pet enrollment',
            'Centralized health record management',
            'Corporate dashboard and reporting',
            'Volume-based pricing discounts',
            'Dedicated support and account management'
          ]
        }
      });
    }

    // If requesting specific enrollment details
    if (enrollment_id || company_email) {
      let whereClause: any = {};
      
      if (enrollment_id) {
        whereClause.id = enrollment_id;
      } else if (company_email) {
        whereClause.company_email = company_email;
      }

      const enrollment = await prisma.corporateEnrollment.findFirst({
        where: whereClause,
        include: {
          employees: {
            select: {
              id: true,
              employee_email: true,
              employee_name: true,
              pets_enrolled: true,
              enrollment_date: true,
              status: true
            },
            orderBy: { enrollment_date: 'desc' }
          }
        }
      });

      if (!enrollment) {
        return NextResponse.json({
          success: false,
          message: 'Corporate enrollment not found'
        }, { status: 404 });
      }

      // Calculate current utilization
      const activeEmployees = enrollment.employees.filter(emp => emp.status === 'active');
      const totalPetsEnrolled = enrollment.employees.reduce((sum, emp) => sum + emp.pets_enrolled, 0);
      const utilizationRate = enrollment.employee_count > 0 ? 
        Math.round((activeEmployees.length / enrollment.employee_count) * 100) : 0;

      // Calculate package details for current setup
      const packageDetails = calculateCorporatePackage(enrollment.employee_count, enrollment.package_type);

      return NextResponse.json({
        success: true,
        data: {
          enrollment: {
            id: enrollment.id,
            company_name: enrollment.company_name,
            company_email: enrollment.company_email,
            contact_person: enrollment.contact_person,
            contact_phone: enrollment.contact_phone,
            employee_count: enrollment.employee_count,
            enrolled_pets: enrollment.enrolled_pets,
            package_type: enrollment.package_type,
            monthly_fee: enrollment.monthly_fee,
            status: enrollment.status,
            billing_cycle: enrollment.billing_cycle,
            next_billing_date: enrollment.next_billing_date,
            created_at: enrollment.created_at,
            updated_at: enrollment.updated_at
          },
          package_details: packageDetails,
          utilization: {
            active_employees: activeEmployees.length,
            total_employees: enrollment.employee_count,
            utilization_rate: utilizationRate,
            total_pets_enrolled: totalPetsEnrolled,
            average_pets_per_employee: activeEmployees.length > 0 ? 
              Math.round((totalPetsEnrolled / activeEmployees.length) * 10) / 10 : 0
          },
          recent_employees: enrollment.employees.slice(0, 10)
        }
      });
    }

    // Default: return general corporate enrollment information
    return NextResponse.json({
      success: true,
      data: {
        corporate_enrollment_info: {
          minimum_employees: 10,
          available_packages: ['basic', 'premium', 'enterprise'],
          billing_cycles: ['monthly', 'quarterly', 'annual'],
          volume_discounts: {
            '50-99 employees': '10% discount',
            '100-199 employees': '15% discount', 
            '200-499 employees': '20% discount',
            '500+ employees': '25% discount'
          }
        },
        sample_pricing: [
          calculateCorporatePackage(50, 'basic'),
          calculateCorporatePackage(100, 'premium'),
          calculateCorporatePackage(250, 'enterprise')
        ],
        how_it_works: [
          'Company registers for corporate enrollment',
          'Employees receive invitation codes via company email',
          'Employees enroll their pets using the invitation code',
          'Company gets centralized dashboard and reporting',
          'Monthly/quarterly/annual billing based on enrolled employees'
        ]
      }
    });

  } catch (error) {
    console.error('Corporate enrollment info error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while fetching corporate enrollment information'
    }, { status: 500 });
  }
}