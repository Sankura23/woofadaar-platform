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

// GET /api/corporate/dog-ids/company/[companyId] - Get all Dog IDs for a company
export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const authResult = verifyCorporateAdmin(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const companyId = params.companyId;
    const { searchParams } = new URL(request.url);

    // Check access - admin can see all companies, others only their own
    if (decoded.role !== 'admin' && decoded.companyId !== companyId) {
      return NextResponse.json({
        success: false,
        message: 'Access denied to this company'
      }, { status: 403 });
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status') || 'all'; // all, active, inactive
    const employee_email = searchParams.get('employee_email');
    const search = searchParams.get('search'); // search by dog name or health ID

    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {
      company_id: companyId,
      is_corporate_pet: true
    };

    if (status === 'active') {
      where.corporate_benefits_active = true;
    } else if (status === 'inactive') {
      where.corporate_benefits_active = false;
    }

    if (employee_email) {
      where.User = {
        email: employee_email
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { health_id: { contains: search, mode: 'insensitive' } },
        { breed: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [dogs, totalCount, company] = await Promise.all([
      prisma.dog.findMany({
        where,
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          company: {
            select: {
              id: true,
              name: true,
              subscription_tier: true,
              logo_url: true
            }
          },
          HealthLogs: {
            orderBy: { created_at: 'desc' },
            take: 1,
            select: {
              log_date: true,
              weight_kg: true,
              mood_score: true
            }
          },
          PetBenefitClaims: {
            select: {
              id: true,
              claim_type: true,
              claim_amount: true,
              approval_status: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.dog.count({ where }),
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          subscription_tier: true,
          logo_url: true,
          employee_count: true
        }
      })
    ]);

    if (!company) {
      return NextResponse.json({
        success: false,
        message: 'Company not found'
      }, { status: 404 });
    }

    // Calculate statistics
    const activeDogs = dogs.filter(dog => dog.corporate_benefits_active).length;
    const totalClaims = dogs.reduce((sum, dog) => sum + dog.PetBenefitClaims.length, 0);
    const averageAge = dogs.length > 0 ? 
      Math.round(dogs.reduce((sum, dog) => sum + dog.age_months, 0) / dogs.length) : 0;

    // Group by breed
    const breedStats = dogs.reduce((acc: any, dog) => {
      acc[dog.breed] = (acc[dog.breed] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        dogs: dogs.map(dog => ({
          id: dog.id,
          name: dog.name,
          breed: dog.breed,
          age_months: dog.age_months,
          health_id: dog.health_id,
          corporate_benefits_active: dog.corporate_benefits_active,
          owner: dog.User,
          latest_health_log: dog.HealthLogs[0] || null,
          claims_count: dog.PetBenefitClaims.length,
          pending_claims: dog.PetBenefitClaims.filter(claim => claim.approval_status === 'pending').length,
          created_at: dog.created_at
        })),
        company,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalCount / limit),
          total_count: totalCount,
          per_page: limit
        },
        statistics: {
          total_dogs: totalCount,
          active_dogs: activeDogs,
          inactive_dogs: totalCount - activeDogs,
          total_claims: totalClaims,
          average_age_months: averageAge,
          utilization_rate: company.employee_count > 0 ? 
            Math.round((totalCount / company.employee_count) * 100) : 0
        },
        analytics: {
          breed_distribution: Object.entries(breedStats).map(([breed, count]) => ({
            breed,
            count
          })).sort((a: any, b: any) => b.count - a.count),
          age_distribution: {
            puppies: dogs.filter(dog => dog.age_months <= 12).length,
            young_adults: dogs.filter(dog => dog.age_months > 12 && dog.age_months <= 36).length,
            adults: dogs.filter(dog => dog.age_months > 36 && dog.age_months <= 84).length,
            seniors: dogs.filter(dog => dog.age_months > 84).length
          }
        }
      }
    });

  } catch (error) {
    console.error('Error fetching company Dog IDs:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}