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

// GET /api/employee/claims - Get employee's benefit claims
export async function GET(request: NextRequest) {
  try {
    const authResult = verifyEmployeeToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get employee enrollment
    const enrollment = await prisma.employeeEnrollment.findFirst({
      where: { 
        employee_user_id: decoded.userId,
        status: 'active'
      },
      select: {
        id: true,
        employee_name: true,
        pet_allowance_limit: true,
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

    const offset = (page - 1) * limit;
    
    // Build where clause
    const where: any = { employee_enrollment_id: enrollment.id };
    if (status !== 'all') {
      where.approval_status = status;
    }

    // Get claims with pet information
    const [claims, totalCount] = await Promise.all([
      prisma.petBenefitClaim.findMany({
        where,
        include: {
          dog: {
            select: {
              id: true,
              name: true,
              breed: true,
              health_id: true,
              profile_image_url: true
            }
          },
          employee_enrollment: {
            select: {
              employee_name: true,
              company: {
                select: { name: true }
              }
            }
          }
        },
        orderBy: { claim_date: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.petBenefitClaim.count({ where })
    ]);

    // Calculate claim statistics
    const approvedClaims = claims.filter(c => c.approval_status === 'approved');
    const totalApproved = approvedClaims.reduce((sum, c) => sum + (c.approved_amount || 0), 0);
    const totalClaimed = claims.reduce((sum, c) => sum + c.claim_amount, 0);

    return NextResponse.json({
      success: true,
      data: {
        claims,
        employee: {
          name: enrollment.employee_name,
          company: enrollment.company.name,
          allowance_limit: enrollment.pet_allowance_limit
        },
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalCount / limit),
          total_count: totalCount,
          per_page: limit
        },
        statistics: {
          total_claims: totalCount,
          approved_count: approvedClaims.length,
          pending_count: claims.filter(c => c.approval_status === 'pending').length,
          rejected_count: claims.filter(c => c.approval_status === 'rejected').length,
          total_claimed_amount: totalClaimed,
          total_approved_amount: totalApproved,
          remaining_allowance: enrollment.pet_allowance_limit - totalApproved
        }
      }
    });

  } catch (error) {
    console.error('Error fetching employee claims:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// POST /api/employee/claims - Submit new benefit claim
export async function POST(request: NextRequest) {
  try {
    const authResult = verifyEmployeeToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const body = await request.json();
    
    const {
      pet_id,
      claim_type,
      claim_amount,
      claim_description,
      receipt_url,
      veterinarian_name,
      treatment_date
    } = body;

    // Validate required fields
    if (!pet_id || !claim_type || !claim_amount || !claim_description) {
      return NextResponse.json({
        success: false,
        message: 'Pet, claim type, amount, and description are required'
      }, { status: 400 });
    }

    if (claim_amount <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Claim amount must be greater than 0'
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

    // Verify pet belongs to employee and has corporate benefits
    const pet = await prisma.dog.findFirst({
      where: {
        id: pet_id,
        user_id: decoded.userId,
        is_corporate_pet: true,
        corporate_benefits_active: true
      },
      select: {
        id: true,
        name: true,
        breed: true,
        health_id: true
      }
    });

    if (!pet) {
      return NextResponse.json({
        success: false,
        message: 'Pet not found or not eligible for corporate benefits'
      }, { status: 404 });
    }

    // Check remaining allowance
    const existingApprovedClaims = await prisma.petBenefitClaim.findMany({
      where: {
        employee_enrollment_id: enrollment.id,
        approval_status: 'approved'
      },
      select: { approved_amount: true }
    });

    const totalUsed = existingApprovedClaims.reduce((sum, c) => sum + (c.approved_amount || 0), 0);
    const remainingAllowance = enrollment.pet_allowance_limit - totalUsed;

    if (claim_amount > remainingAllowance) {
      return NextResponse.json({
        success: false,
        message: `Claim amount (₹${claim_amount.toLocaleString()}) exceeds remaining allowance (₹${remainingAllowance.toLocaleString()})`
      }, { status: 400 });
    }

    // Validate claim type
    const validClaimTypes = ['veterinary', 'medication', 'emergency', 'preventive', 'grooming', 'training', 'boarding'];
    if (!validClaimTypes.includes(claim_type)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid claim type'
      }, { status: 400 });
    }

    // Create benefit claim
    const claim = await prisma.petBenefitClaim.create({
      data: {
        employee_enrollment_id: enrollment.id,
        dog_id: pet.id,
        claim_type,
        claim_amount: parseFloat(claim_amount),
        claim_description: claim_description.trim(),
        receipt_url: receipt_url?.trim() || null,
        veterinarian_name: veterinarian_name?.trim() || null,
        treatment_date: treatment_date ? new Date(treatment_date) : null,
        claim_date: new Date(),
        approval_status: 'pending'
      },
      include: {
        dog: {
          select: {
            name: true,
            breed: true,
            health_id: true
          }
        },
        employee_enrollment: {
          select: {
            employee_name: true,
            company: {
              select: { name: true }
            }
          }
        }
      }
    });

    // Log claim submission
    console.log(`New benefit claim submitted: ${claim.id} for ${pet.name} (${claim_type}, ₹${claim_amount}) by ${enrollment.employee_name}`);

    return NextResponse.json({
      success: true,
      message: 'Benefit claim submitted successfully',
      data: {
        claim,
        allowance_info: {
          used_before_claim: totalUsed,
          claim_amount: claim_amount,
          remaining_after_claim: remainingAllowance - claim_amount,
          total_limit: enrollment.pet_allowance_limit
        }
      }
    });

  } catch (error) {
    console.error('Error creating benefit claim:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}