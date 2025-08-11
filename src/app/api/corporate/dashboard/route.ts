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

// Helper function to validate corporate access
async function validateCorporateAccess(email: string, enrollmentId?: string) {
  if (enrollmentId) {
    const enrollment = await prisma.corporateEnrollment.findUnique({
      where: { id: enrollmentId }
    });
    
    if (!enrollment) {
      return { hasAccess: false, message: 'Corporate enrollment not found' };
    }

    // Check if user is the contact person or from same company domain
    const emailDomain = email.split('@')[1];
    const companyDomain = enrollment.company_email.split('@')[1];
    
    if (email === enrollment.company_email || emailDomain === companyDomain) {
      return { hasAccess: true, enrollment };
    }

    return { hasAccess: false, message: 'Access denied - not authorized for this corporate enrollment' };
  }

  // Find enrollment by email domain
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
    return { hasAccess: false, message: 'No corporate enrollment found for your domain' };
  }

  return { hasAccess: true, enrollment };
}

// Helper function to calculate health insights
async function calculateHealthInsights(employees: any[]) {
  const userIds = employees
    .filter(emp => emp.user_id)
    .map(emp => emp.user_id);

  if (userIds.length === 0) {
    return {
      total_health_logs: 0,
      health_score_average: 0,
      common_health_concerns: [],
      vaccination_compliance: 0
    };
  }

  // Get all dogs for these users
  const dogs = await prisma.dog.findMany({
    where: {
      user_id: { in: userIds }
    },
    include: {
      HealthLog: {
        where: {
          created_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }
    }
  });

  const totalHealthLogs = dogs.reduce((sum, dog) => sum + dog.HealthLog.length, 0);
  const vaccinatedDogs = dogs.filter(dog => dog.vaccination_status === 'up_to_date').length;
  const vaccinationCompliance = dogs.length > 0 ? Math.round((vaccinatedDogs / dogs.length) * 100) : 0;

  // Analyze common health concerns from recent health logs
  const healthConcerns: { [key: string]: number } = {};
  dogs.forEach(dog => {
    dog.HealthLog.forEach(log => {
      if (log.notes) {
        const notes = log.notes.toLowerCase();
        const concerns = ['eating', 'sleeping', 'energy', 'bathroom', 'behavior', 'coughing', 'vomiting'];
        concerns.forEach(concern => {
          if (notes.includes(concern)) {
            healthConcerns[concern] = (healthConcerns[concern] || 0) + 1;
          }
        });
      }
    });
  });

  const commonHealthConcerns = Object.entries(healthConcerns)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([concern, count]) => ({ concern, frequency: count }));

  return {
    total_health_logs: totalHealthLogs,
    health_score_average: 85, // Mock calculation - in production, implement proper health scoring
    common_health_concerns: commonHealthConcerns,
    vaccination_compliance: vaccinationCompliance,
    total_dogs: dogs.length
  };
}

// GET /api/corporate/dashboard - Corporate dashboard with analytics
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
    const time_period = searchParams.get('time_period') || '30_days';

    // Validate corporate access
    const access = await validateCorporateAccess(auth.email!, enrollment_id || undefined);
    
    if (!access.hasAccess) {
      return NextResponse.json({
        success: false,
        message: access.message
      }, { status: 403 });
    }

    const enrollment = access.enrollment!;

    // Calculate date range based on time period
    const now = new Date();
    let startDate: Date;
    
    switch (time_period) {
      case '7_days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90_days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1_year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get employees and their data
    const employees = await prisma.corporateEmployee.findMany({
      where: { 
        corporate_enrollment_id: enrollment.id,
        enrollment_date: { gte: startDate }
      },
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
                age_months: true,
                health_id: true,
                vaccination_status: true,
                created_at: true
              }
            }
          }
        }
      },
      orderBy: { enrollment_date: 'desc' }
    });

    // Get all employees (not just recent ones) for overall stats
    const allEmployees = await prisma.corporateEmployee.findMany({
      where: { corporate_enrollment_id: enrollment.id },
      include: {
        user: {
          select: {
            id: true,
            Dog: {
              select: {
                id: true,
                breed: true,
                age_months: true,
                vaccination_status: true
              }
            }
          }
        }
      }
    });

    // Calculate key metrics
    const activeEmployees = allEmployees.filter(emp => emp.status === 'active');
    const registeredEmployees = allEmployees.filter(emp => emp.user);
    const totalPets = allEmployees.reduce((sum, emp) => sum + (emp.user?.Dog?.length || 0), 0);
    const utilizationRate = enrollment.employee_count > 0 ? 
      Math.round((activeEmployees.length / enrollment.employee_count) * 100) : 0;
    const registrationRate = activeEmployees.length > 0 ? 
      Math.round((registeredEmployees.length / activeEmployees.length) * 100) : 0;

    // Enrollment trends (monthly data for the past year)
    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      
      const monthEmployees = await prisma.corporateEmployee.count({
        where: {
          corporate_enrollment_id: enrollment.id,
          enrollment_date: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      });

      const monthPets = await prisma.corporateEmployee.findMany({
        where: {
          corporate_enrollment_id: enrollment.id,
          enrollment_date: { lte: monthEnd }
        },
        include: {
          user: {
            select: {
              Dog: {
                where: {
                  created_at: {
                    gte: monthStart,
                    lte: monthEnd
                  }
                },
                select: { id: true }
              }
            }
          }
        }
      });

      const monthPetCount = monthPets.reduce((sum, emp) => sum + (emp.user?.Dog?.length || 0), 0);

      monthlyData.push({
        month: monthStart.toISOString().substring(0, 7), // YYYY-MM format
        employees_enrolled: monthEmployees,
        pets_enrolled: monthPetCount,
        cumulative_employees: await prisma.corporateEmployee.count({
          where: {
            corporate_enrollment_id: enrollment.id,
            enrollment_date: { lte: monthEnd }
          }
        })
      });
    }

    // Pet demographics
    const allPets = allEmployees.flatMap(emp => emp.user?.Dog || []);
    const breedDistribution = allPets.reduce((acc, pet) => {
      acc[pet.breed] = (acc[pet.breed] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const topBreeds = Object.entries(breedDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([breed, count]) => ({ breed, count }));

    // Age distribution
    const ageDistribution = allPets.reduce((acc, pet) => {
      const ageGroup = pet.age_months < 12 ? 'puppy' :
                     pet.age_months < 84 ? 'adult' : 'senior';
      acc[ageGroup] = (acc[ageGroup] || 0) + 1;
      return acc;
    }, { puppy: 0, adult: 0, senior: 0 });

    // Health insights
    const healthInsights = await calculateHealthInsights(allEmployees);

    // Recent activity (appointments, health logs, etc.)
    const recentActivity = await getRecentCorporateActivity(enrollment.id, startDate);

    return NextResponse.json({
      success: true,
      data: {
        corporate_enrollment: {
          id: enrollment.id,
          company_name: enrollment.company_name,
          package_type: enrollment.package_type,
          employee_count: enrollment.employee_count,
          monthly_fee: enrollment.monthly_fee,
          status: enrollment.status,
          next_billing_date: enrollment.next_billing_date
        },
        overview: {
          total_employees: allEmployees.length,
          active_employees: activeEmployees.length,
          registered_employees: registeredEmployees.length,
          total_pets_enrolled: totalPets,
          utilization_rate: utilizationRate,
          registration_rate: registrationRate,
          average_pets_per_employee: activeEmployees.length > 0 ? 
            Math.round((totalPets / activeEmployees.length) * 10) / 10 : 0
        },
        enrollment_trends: {
          monthly_data: monthlyData,
          period_summary: {
            new_employees: employees.length,
            new_pets: employees.reduce((sum, emp) => sum + (emp.user?.Dog?.length || 0), 0),
            growth_rate: monthlyData.length > 1 ? 
              Math.round(((monthlyData[monthlyData.length - 1].cumulative_employees - 
                          monthlyData[monthlyData.length - 2].cumulative_employees) / 
                          monthlyData[monthlyData.length - 2].cumulative_employees) * 100) : 0
          }
        },
        pet_demographics: {
          total_pets: allPets.length,
          breed_distribution: topBreeds,
          age_distribution: ageDistribution,
          vaccination_status: {
            up_to_date: allPets.filter(pet => pet.vaccination_status === 'up_to_date').length,
            overdue: allPets.filter(pet => pet.vaccination_status === 'overdue').length,
            unknown: allPets.filter(pet => !pet.vaccination_status || pet.vaccination_status === 'unknown').length
          }
        },
        health_insights: healthInsights,
        recent_activity: recentActivity,
        package_utilization: {
          max_pets_per_employee: enrollment.package_type === 'enterprise' ? 3 : 
                                 enrollment.package_type === 'premium' ? 2 : 1,
          current_usage_rate: totalPets > 0 && activeEmployees.length > 0 ? 
            Math.round((totalPets / (activeEmployees.length * 
              (enrollment.package_type === 'enterprise' ? 3 : 
               enrollment.package_type === 'premium' ? 2 : 1))) * 100) : 0
        }
      },
      time_period,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Corporate dashboard error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while generating corporate dashboard'
    }, { status: 500 });
  }
}

// Helper function to get recent corporate activity
async function getRecentCorporateActivity(enrollmentId: string, startDate: Date) {
  // Get recent employee enrollments
  const recentEmployees = await prisma.corporateEmployee.findMany({
    where: {
      corporate_enrollment_id: enrollmentId,
      enrollment_date: { gte: startDate }
    },
    orderBy: { enrollment_date: 'desc' },
    take: 10,
    select: {
      employee_name: true,
      employee_email: true,
      enrollment_date: true,
      pets_enrolled: true
    }
  });

  // Get recent pet registrations from corporate employees
  const corporateEmployees = await prisma.corporateEmployee.findMany({
    where: { corporate_enrollment_id: enrollmentId },
    select: { user_id: true }
  });

  const userIds = corporateEmployees
    .filter(emp => emp.user_id)
    .map(emp => emp.user_id!);

  const recentPets = await prisma.dog.findMany({
    where: {
      user_id: { in: userIds },
      created_at: { gte: startDate }
    },
    orderBy: { created_at: 'desc' },
    take: 10,
    include: {
      User: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  // Get recent health logs
  const recentHealthLogs = await prisma.healthLog.findMany({
    where: {
      user_id: { in: userIds },
      created_at: { gte: startDate }
    },
    orderBy: { created_at: 'desc' },
    take: 5,
    include: {
      User: {
        select: {
          name: true,
          email: true
        }
      },
      Dog: {
        select: {
          name: true,
          breed: true
        }
      }
    }
  });

  return {
    recent_employee_enrollments: recentEmployees,
    recent_pet_registrations: recentPets.map(pet => ({
      pet_name: pet.name,
      breed: pet.breed,
      owner_name: pet.User.name,
      owner_email: pet.User.email,
      registered_at: pet.created_at
    })),
    recent_health_activity: recentHealthLogs.map(log => ({
      user_name: log.User.name,
      pet_name: log.Dog.name,
      pet_breed: log.Dog.breed,
      log_date: log.log_date,
      notes: log.notes ? log.notes.substring(0, 100) : null
    }))
  };
}