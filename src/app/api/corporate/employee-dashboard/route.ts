import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

interface DecodedToken {
  userId?: string;
  partnerId?: string;
  email: string;
  userType?: string;
}

async function verifyToken(request: NextRequest): Promise<{ userId?: string; partnerId?: string; email?: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    return {
      userId: decoded.userId,
      partnerId: decoded.partnerId,
      email: decoded.email
    };
  } catch (error) {
    return null;
  }
}

// GET /api/corporate/employee-dashboard - Get employee's corporate dashboard data
export async function GET(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth || !auth.userId) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized - User authentication required' 
    }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'overview'; // overview, pets, appointments, benefits

    // Get user's corporate employee records
    const corporateEmployees = await prisma.corporateEmployee.findMany({
      where: { 
        user_id: auth.userId,
        status: 'active'
      },
      include: {
        corporate_enrollment: {
          select: {
            id: true,
            company_name: true,
            package_type: true,
            status: true,
            created_at: true,
            monthly_fee: true,
            next_billing_date: true
          }
        }
      }
    });

    if (corporateEmployees.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No active corporate enrollment found for this user'
      }, { status: 404 });
    }

    // Get user details with pets
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        name: true,
        email: true,
        is_premium: true,
        created_at: true,
        Dog: {
          select: {
            id: true,
            name: true,
            breed: true,
            age_months: true,
            weight_kg: true,
            health_id: true,
            vaccination_status: true,
            created_at: true,
            photo_url: true
          },
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    const primaryEnrollment = corporateEmployees[0].corporate_enrollment;
    const packageType = primaryEnrollment.package_type;

    // Get appointments for user's pets
    const appointments = await prisma.appointment.findMany({
      where: {
        user_id: auth.userId,
        dog_id: { in: user.Dog.map(dog => dog.id) }
      },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            business_name: true,
            partner_type: true,
            location: true
          }
        },
        dog: {
          select: {
            id: true,
            name: true,
            breed: true,
            health_id: true
          }
        }
      },
      orderBy: { appointment_date: 'desc' },
      take: 10
    });

    // Get recent Health ID verifications
    const recentVerifications = await prisma.healthIdVerification.findMany({
      where: {
        dog_id: { in: user.Dog.map(dog => dog.id) }
      },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            business_name: true,
            partner_type: true
          }
        },
        dog: {
          select: {
            id: true,
            name: true,
            health_id: true
          }
        }
      },
      orderBy: { verification_date: 'desc' },
      take: 5
    });

    // Calculate statistics
    const stats = {
      total_pets: user.Dog.length,
      health_ids_issued: user.Dog.filter(dog => dog.health_id).length,
      total_appointments: appointments.length,
      upcoming_appointments: appointments.filter(apt => 
        new Date(apt.appointment_date) > new Date() && 
        apt.status === 'scheduled'
      ).length,
      completed_appointments: appointments.filter(apt => apt.status === 'completed').length,
      health_verifications: recentVerifications.length
    };

    // Get package benefits
    const packageBenefits = getPackageBenefits(packageType);

    // Calculate savings (mock calculation)
    const potentialSavings = calculatePotentialSavings(packageType, appointments.length, user.Dog.length);

    let responseData: any = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_premium: user.is_premium,
        member_since: user.created_at
      },
      corporate_info: {
        company_name: primaryEnrollment.company_name,
        package_type: packageType,
        enrollment_status: primaryEnrollment.status,
        enrollment_date: primaryEnrollment.created_at,
        next_billing: primaryEnrollment.next_billing_date
      },
      statistics: stats,
      package_benefits: packageBenefits,
      savings_summary: potentialSavings
    };

    // Add view-specific data
    switch (view) {
      case 'overview':
        responseData.quick_stats = {
          pets_enrolled: user.Dog.length,
          active_health_ids: user.Dog.filter(dog => dog.health_id).length,
          this_month_appointments: appointments.filter(apt => {
            const aptDate = new Date(apt.appointment_date);
            const now = new Date();
            return aptDate.getMonth() === now.getMonth() && 
                   aptDate.getFullYear() === now.getFullYear();
          }).length,
          recent_verifications: recentVerifications.slice(0, 3)
        };
        break;

      case 'pets':
        responseData.pets = user.Dog.map(dog => ({
          ...dog,
          age_display: `${Math.floor(dog.age_months / 12)} years ${dog.age_months % 12} months`,
          health_status: dog.vaccination_status === 'up_to_date' ? 'Good' : 'Needs Attention',
          recent_appointments: appointments.filter(apt => apt.dog_id === dog.id).slice(0, 3),
          health_verifications: recentVerifications.filter(ver => ver.dog_id === dog.id).slice(0, 3)
        }));
        break;

      case 'appointments':
        responseData.appointments = {
          upcoming: appointments.filter(apt => 
            new Date(apt.appointment_date) > new Date()
          ).slice(0, 5),
          past: appointments.filter(apt => 
            new Date(apt.appointment_date) <= new Date()
          ).slice(0, 10),
          summary: {
            total: appointments.length,
            completed: appointments.filter(apt => apt.status === 'completed').length,
            cancelled: appointments.filter(apt => apt.status === 'cancelled').length,
            upcoming: appointments.filter(apt => 
              new Date(apt.appointment_date) > new Date()
            ).length
          }
        };
        break;

      case 'benefits':
        responseData.benefits = {
          package_features: packageBenefits,
          discounts_applied: packageType === 'premium' ? '10%' : packageType === 'enterprise' ? '15%' : '0%',
          exclusive_access: getExclusiveAccess(packageType),
          usage_analytics: {
            appointments_this_month: appointments.filter(apt => {
              const aptDate = new Date(apt.appointment_date);
              const now = new Date();
              return aptDate.getMonth() === now.getMonth() && 
                     aptDate.getFullYear() === now.getFullYear();
            }).length,
            health_verifications_this_month: recentVerifications.filter(ver => {
              const verDate = new Date(ver.verification_date);
              const now = new Date();
              return verDate.getMonth() === now.getMonth() && 
                     verDate.getFullYear() === now.getFullYear();
            }).length,
            estimated_monthly_savings: potentialSavings.monthly_savings
          }
        };
        break;
    }

    // Get wellness tips and company announcements
    responseData.wellness_tips = getWellnessTips(user.Dog);
    responseData.company_announcements = [
      {
        id: 1,
        title: 'New Partnership with Premium Veterinary Clinics',
        message: 'We\'ve added 15 new premium vet clinics to our network with exclusive discounts for corporate members.',
        date: new Date().toISOString(),
        type: 'partnership'
      },
      {
        id: 2,
        title: 'Monthly Wellness Webinar - Pet Nutrition',
        message: 'Join our expert veterinarian for a free webinar on optimal pet nutrition this Friday at 6 PM.',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'event'
      }
    ];

    return NextResponse.json({
      success: true,
      data: responseData,
      view_requested: view
    });

  } catch (error) {
    console.error('Employee dashboard error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while fetching dashboard data'
    }, { status: 500 });
  }
}

// POST /api/corporate/employee-dashboard - Add new pet or update employee information
export async function POST(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth || !auth.userId) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized - User authentication required' 
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, pet_data, employee_updates } = body;

    if (!action) {
      return NextResponse.json({
        success: false,
        message: 'Action is required'
      }, { status: 400 });
    }

    // Verify user has active corporate enrollment
    const corporateEmployee = await prisma.corporateEmployee.findFirst({
      where: { 
        user_id: auth.userId,
        status: 'active'
      },
      include: {
        corporate_enrollment: {
          select: {
            id: true,
            company_name: true,
            package_type: true
          }
        }
      }
    });

    if (!corporateEmployee) {
      return NextResponse.json({
        success: false,
        message: 'No active corporate enrollment found'
      }, { status: 403 });
    }

    let result: any = {};

    switch (action) {
      case 'add_pet':
        if (!pet_data) {
          return NextResponse.json({
            success: false,
            message: 'Pet data is required'
          }, { status: 400 });
        }

        // Generate Health ID
        const timestamp = Date.now().toString().slice(-8);
        const sequence = Math.random().toString(36).substr(2, 4).toUpperCase();
        const companyPrefix = corporateEmployee.corporate_enrollment.company_name
          .substring(0, 3).toUpperCase();
        const healthId = `${companyPrefix}${timestamp}${sequence}`;

        const newPet = await prisma.dog.create({
          data: {
            id: `dog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: pet_data.name,
            breed: pet_data.breed,
            age_months: pet_data.age_months || 12,
            weight_kg: pet_data.weight_kg || 10,
            gender: pet_data.gender || 'unknown',
            vaccination_status: pet_data.vaccination_status || 'up_to_date',
            spayed_neutered: pet_data.spayed_neutered || false,
            health_id: healthId,
            user_id: auth.userId,
            location: corporateEmployee.corporate_enrollment.company_name,
            medical_notes: pet_data.medical_notes,
            personality_traits: pet_data.personality_traits || []
          }
        });

        // Update employee pets count
        await prisma.corporateEmployee.update({
          where: { id: corporateEmployee.id },
          data: { pets_enrolled: { increment: 1 } }
        });

        // Update corporate enrollment pets count
        await prisma.corporateEnrollment.update({
          where: { id: corporateEmployee.corporate_enrollment.id },
          data: { enrolled_pets: { increment: 1 } }
        });

        result = {
          pet: {
            id: newPet.id,
            name: newPet.name,
            breed: newPet.breed,
            health_id: newPet.health_id,
            created_at: newPet.created_at
          },
          message: `Pet ${newPet.name} added successfully with Health ID: ${healthId}`
        };
        break;

      case 'update_profile':
        if (!employee_updates) {
          return NextResponse.json({
            success: false,
            message: 'Employee updates data is required'
          }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
          where: { id: auth.userId },
          data: {
            name: employee_updates.name || undefined,
            location: employee_updates.location || undefined,
            preferred_language: employee_updates.preferred_language || undefined,
            profile_image_url: employee_updates.profile_image_url || undefined
          }
        });

        result = {
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            location: updatedUser.location,
            preferred_language: updatedUser.preferred_language
          },
          message: 'Profile updated successfully'
        };
        break;

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
      company: corporateEmployee.corporate_enrollment.company_name
    });

  } catch (error) {
    console.error('Employee dashboard action error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error during dashboard action'
    }, { status: 500 });
  }
}

// Helper functions
function getPackageBenefits(packageType: string): string[] {
  const benefits = {
    basic: [
      'Health ID for all pets',
      'Basic health tracking',
      'Partner directory access',
      'Monthly health reports',
      'Email support'
    ],
    premium: [
      'All Basic features',
      'Priority appointments',
      '10% service discounts',
      'Advanced analytics',
      'Quarterly webinars',
      'Phone support'
    ],
    enterprise: [
      'All Premium features',
      'Custom dashboard',
      '15% service discounts',
      'On-site programs',
      'Monthly screenings',
      '24/7 priority support'
    ]
  };
  
  return benefits[packageType as keyof typeof benefits] || benefits.basic;
}

function getExclusiveAccess(packageType: string): string[] {
  const access = {
    basic: [
      'Standard partner network',
      'Basic health resources'
    ],
    premium: [
      'Premium partner network',
      'Exclusive wellness content',
      'Priority customer support'
    ],
    enterprise: [
      'VIP partner network',
      'Custom health programs',
      'Dedicated account manager',  
      'Custom reporting'
    ]
  };
  
  return access[packageType as keyof typeof access] || access.basic;
}

function calculatePotentialSavings(packageType: string, appointmentCount: number, petCount: number) {
  const discountRate = packageType === 'premium' ? 0.10 : packageType === 'enterprise' ? 0.15 : 0;
  const avgAppointmentCost = 800; // ₹800 average
  const avgMonthlyCost = petCount * 300; // ₹300 per pet monthly care
  
  const monthlySavings = Math.round((avgMonthlyCost * discountRate));
  const appointmentSavings = Math.round((appointmentCount * avgAppointmentCost * discountRate));
  
  return {
    monthly_savings: monthlySavings,
    appointment_savings: appointmentSavings,
    annual_projection: monthlySavings * 12,
    discount_rate: `${discountRate * 100}%`
  };
}

function getWellnessTips(pets: any[]): any[] {
  const tips = [
    {
      category: 'Nutrition',
      tip: 'Ensure your pet gets age-appropriate nutrition. Puppies need different nutrients than senior dogs.',
      relevance: pets.some(pet => pet.age_months < 12) ? 'high' : 'medium'
    },
    {
      category: 'Exercise',
      tip: 'Regular exercise is crucial for maintaining your pet\'s physical and mental health.',
      relevance: 'high'
    },
    {
      category: 'Preventive Care',
      tip: 'Keep up with regular vaccinations and health check-ups to prevent serious health issues.',
      relevance: pets.some(pet => pet.vaccination_status !== 'up_to_date') ? 'high' : 'medium'
    }
  ];
  
  return tips;
}