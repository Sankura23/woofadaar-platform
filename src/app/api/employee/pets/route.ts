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

// Helper function to generate corporate Dog ID
const generateCorporateDogId = (companyName: string, dogName: string, index: number = 0) => {
  const timestamp = Date.now().toString().slice(-6);
  const companyCode = companyName.replace(/[^A-Z0-9]/gi, '').substring(0, 3).toUpperCase();
  const dogCode = dogName.replace(/[^A-Z0-9]/gi, '').substring(0, 3).toUpperCase();
  const indexSuffix = index > 0 ? index.toString().padStart(2, '0') : '';
  return `CORP${companyCode}${dogCode}${timestamp}${indexSuffix}`;
};

// GET /api/employee/pets - Get employee's pets
export async function GET(request: NextRequest) {
  try {
    const authResult = verifyEmployeeToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;

    // Get employee enrollment to verify active status
    const enrollment = await prisma.employeeEnrollment.findFirst({
      where: { 
        employee_user_id: decoded.userId,
        status: 'active'
      },
      select: {
        id: true,
        company_id: true,
        company: {
          select: { name: true, subscription_tier: true }
        }
      }
    });

    if (!enrollment) {
      return NextResponse.json({
        success: false,
        message: 'Active employee enrollment not found'
      }, { status: 403 });
    }

    // Get employee's pets
    const pets = await prisma.dog.findMany({
      where: { user_id: decoded.userId },
      include: {
        HealthLogs: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            weight_kg: true,
            mood_score: true,
            log_date: true
          }
        },
        PetBenefitClaims: {
          select: {
            id: true,
            claim_amount: true,
            approved_amount: true,
            approval_status: true,
            claim_date: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Calculate pet statistics
    const corporatePets = pets.filter(p => p.is_corporate_pet);
    const activeBenefitPets = pets.filter(p => p.is_corporate_pet && p.corporate_benefits_active);
    
    return NextResponse.json({
      success: true,
      data: {
        pets,
        statistics: {
          total_pets: pets.length,
          corporate_pets: corporatePets.length,
          active_benefit_pets: activeBenefitPets.length,
          average_age_months: pets.length > 0 ? Math.round(pets.reduce((sum, p) => sum + p.age_months, 0) / pets.length) : 0
        },
        company_info: enrollment.company
      }
    });

  } catch (error) {
    console.error('Error fetching employee pets:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// POST /api/employee/pets - Add new pet for employee
export async function POST(request: NextRequest) {
  try {
    const authResult = verifyEmployeeToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const body = await request.json();
    
    const {
      name,
      breed,
      age_months,
      weight_kg,
      gender,
      vaccination_status = 'up_to_date',
      spayed_neutered = false,
      emergency_contact,
      profile_image_url
    } = body;

    // Validate required fields
    if (!name || !breed || !age_months) {
      return NextResponse.json({
        success: false,
        message: 'Pet name, breed, and age are required'
      }, { status: 400 });
    }

    // Get employee enrollment
    const enrollment = await prisma.employeeEnrollment.findFirst({
      where: { 
        employee_user_id: decoded.userId,
        status: 'active'
      },
      include: {
        company: {
          select: { id: true, name: true, subscription_tier: true }
        }
      }
    });

    if (!enrollment) {
      return NextResponse.json({
        success: false,
        message: 'Active employee enrollment not found'
      }, { status: 403 });
    }

    // Check if employee already has maximum pets (company policy)
    const existingPets = await prisma.dog.count({
      where: { 
        user_id: decoded.userId,
        is_corporate_pet: true,
        corporate_benefits_active: true
      }
    });

    // Set limits based on subscription tier
    const petLimits = {
      basic: 2,
      premium: 5,
      enterprise: 10
    };

    const maxPets = petLimits[enrollment.company.subscription_tier as keyof typeof petLimits] || 2;

    if (existingPets >= maxPets) {
      return NextResponse.json({
        success: false,
        message: `Maximum ${maxPets} corporate pets allowed for ${enrollment.company.subscription_tier} tier`
      }, { status: 400 });
    }

    // Generate corporate Dog ID
    let healthId = generateCorporateDogId(enrollment.company.name, name);
    
    // Ensure unique health ID
    let attempt = 0;
    while (await prisma.dog.findUnique({ where: { health_id: healthId } })) {
      attempt++;
      healthId = generateCorporateDogId(enrollment.company.name, name, attempt);
      if (attempt > 10) {
        throw new Error('Could not generate unique health ID');
      }
    }

    // Create pet with corporate benefits
    const newPet = await prisma.dog.create({
      data: {
        user_id: decoded.userId,
        name: name.trim(),
        breed: breed.trim(),
        age_months: parseInt(age_months),
        weight_kg: weight_kg ? parseFloat(weight_kg) : null,
        gender,
        vaccination_status,
        spayed_neutered: Boolean(spayed_neutered),
        emergency_contact: emergency_contact?.trim() || null,
        profile_image_url: profile_image_url?.trim() || null,
        health_id: healthId,
        is_corporate_pet: true,
        corporate_benefits_active: true,
        company_id: enrollment.company_id
      },
      include: {
        User: {
          select: { name: true, email: true }
        },
        company: {
          select: { name: true, subscription_tier: true }
        }
      }
    });

    // Log corporate pet creation
    console.log(`New corporate pet registered: ${name} (${healthId}) for ${enrollment.company.name}`);

    return NextResponse.json({
      success: true,
      message: 'Pet registered successfully with corporate benefits',
      data: {
        pet: newPet,
        corporate_benefits: {
          active: true,
          health_id: healthId,
          company: enrollment.company.name,
          tier: enrollment.company.subscription_tier
        }
      }
    });

  } catch (error) {
    console.error('Error creating employee pet:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}