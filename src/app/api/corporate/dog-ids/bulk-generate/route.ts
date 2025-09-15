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

// Helper function to generate corporate Dog ID
const generateCorporateDogId = (companyName: string, dogName: string, index: number = 0) => {
  const timestamp = Date.now().toString().slice(-6);
  const companyCode = companyName.replace(/[^A-Z0-9]/gi, '').substring(0, 3).toUpperCase();
  const dogCode = dogName.replace(/[^A-Z0-9]/gi, '').substring(0, 3).toUpperCase();
  const indexSuffix = index > 0 ? index.toString().padStart(2, '0') : '';
  return `CORP${companyCode}${dogCode}${timestamp}${indexSuffix}`;
};

// POST /api/corporate/dog-ids/bulk-generate - Bulk generate Dog IDs for corporate employees
export async function POST(request: NextRequest) {
  try {
    const authResult = verifyCorporateAdmin(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const body = await request.json();
    const { dogs, employee_enrollment_id, activate_benefits = true } = body;

    if (!Array.isArray(dogs) || dogs.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Dogs array is required and must not be empty'
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

    // Validate employee enrollment if provided
    let employeeEnrollment = null;
    if (employee_enrollment_id) {
      employeeEnrollment = await prisma.employeeEnrollment.findFirst({
        where: {
          id: employee_enrollment_id,
          company_id: decoded.companyId
        },
        include: {
          employee_user: true
        }
      });

      if (!employeeEnrollment) {
        return NextResponse.json({
          success: false,
          message: 'Employee enrollment not found or does not belong to your company'
        }, { status: 404 });
      }
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < dogs.length; i++) {
      try {
        const dogData = dogs[i];
        const {
          name,
          breed,
          age_months,
          weight_kg,
          gender = 'unknown',
          vaccination_status = 'unknown',
          spayed_neutered = false,
          emergency_contact,
          emergency_phone,
          medical_notes
        } = dogData;

        if (!name || !breed) {
          errors.push({
            dog: dogData,
            error: 'Dog name and breed are required'
          });
          continue;
        }

        // Generate unique corporate health ID
        let healthId = generateCorporateDogId(company.name, name, i);
        
        // Ensure uniqueness
        let counter = 1;
        while (await prisma.dog.findUnique({ where: { health_id: healthId } })) {
          healthId = generateCorporateDogId(company.name, name, i + counter);
          counter++;
        }

        // Create dog with corporate branding
        const newDog = await prisma.dog.create({
          data: {
            name,
            breed,
            age_months: age_months || 0,
            weight_kg: weight_kg || 0,
            gender,
            vaccination_status,
            spayed_neutered,
            emergency_contact: emergency_contact || company.contact_person,
            emergency_phone: emergency_phone || company.contact_phone,
            medical_notes,
            health_id: healthId,
            user_id: employeeEnrollment?.employee_user_id || decoded.userId,
            company_id: decoded.companyId,
            is_corporate_pet: true,
            corporate_benefits_active: activate_benefits,
            personality_traits: [],
            location: company.address
          }
        });

        // Create initial health log with corporate branding
        if (weight_kg) {
          await prisma.healthLog.create({
            data: {
              dog_id: newDog.id,
              user_id: employeeEnrollment?.employee_user_id || decoded.userId,
              log_date: new Date(),
              weight_kg,
              notes: `Initial corporate pet registration for ${company.name}`,
              mood_score: 5,
              energy_level: 5,
              appetite_level: 5
            }
          });
        }

        results.push({
          dog: newDog,
          corporate_health_id: healthId,
          company_branding: {
            company_name: company.name,
            subscription_tier: company.subscription_tier,
            logo_url: company.logo_url
          },
          employee_info: employeeEnrollment ? {
            enrollment_id: employeeEnrollment.id,
            employee_name: employeeEnrollment.employee_name,
            employee_email: employeeEnrollment.employee_email
          } : null
        });

      } catch (error) {
        errors.push({
          dog: dogs[i],
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Update company statistics
    if (results.length > 0) {
      await prisma.company.update({
        where: { id: decoded.companyId },
        data: {
          updated_at: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Bulk Dog ID generation completed. ${results.length} successful, ${errors.length} errors`,
      data: {
        successful: results,
        errors,
        summary: {
          total_processed: dogs.length,
          successful_count: results.length,
          error_count: errors.length,
          company_info: {
            name: company.name,
            subscription_tier: company.subscription_tier,
            total_corporate_pets: await prisma.dog.count({
              where: {
                company_id: decoded.companyId,
                is_corporate_pet: true
              }
            })
          }
        }
      }
    });

  } catch (error) {
    console.error('Bulk Dog ID generation error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}