import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const expertise = searchParams.get('expertise');
    const status = searchParams.get('status') || 'verified';
    const isFeatured = searchParams.get('isFeatured');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    // Build where clause
    const where: any = { verification_status: status };
    
    if (expertise) where.expertise_areas = { hasSome: [expertise] };
    if (isFeatured === 'true') where.is_featured = true;
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { bio: { contains: search, mode: 'insensitive' } },
        { specializations: { hasSome: [search] } }
      ];
    }

    const experts = await prisma.communityExpert.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        },
        partner: {
          select: {
            id: true,
            name: true,
            business_name: true,
            partner_type: true,
            verified: true
          }
        }
      },
      orderBy: [
        { is_featured: 'desc' },
        { total_points: 'desc' },
        { answer_count: 'desc' }
      ],
      take: limit,
      skip: offset
    });

    const total = await prisma.communityExpert.count({ where });

    return NextResponse.json({
      success: true,
      data: {
        experts,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching community experts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch experts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      expertiseAreas, 
      bio, 
      yearsExperience, 
      certifications, 
      specializations, 
      partnerId 
    } = body;

    if (!expertiseAreas || expertiseAreas.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one expertise area is required' },
        { status: 400 }
      );
    }

    // Check if user already has an expert application
    const existingExpert = await prisma.communityExpert.findFirst({
      where: { user_id: 'userId' in user ? user.userId : user.partnerId }
    });

    if (existingExpert) {
      return NextResponse.json(
        { success: false, error: 'Expert application already exists' },
        { status: 400 }
      );
    }

    // Validate expertise areas
    const validExpertiseAreas = [
      'veterinary', 'training', 'nutrition', 'behavior', 
      'grooming', 'breeding', 'rescue', 'health'
    ];

    const invalidAreas = expertiseAreas.filter(
      (area: string) => !validExpertiseAreas.includes(area)
    );

    if (invalidAreas.length > 0) {
      return NextResponse.json(
        { success: false, error: `Invalid expertise areas: ${invalidAreas.join(', ')}` },
        { status: 400 }
      );
    }

    // Create expert application
    const expert = await prisma.communityExpert.create({
      data: {
        user_id: 'userId' in user ? user.userId : user.partnerId,
        partner_id: partnerId || null,
        expertise_areas: expertiseAreas,
        bio: bio || null,
        years_experience: yearsExperience || null,
        certifications: certifications || [],
        specializations: specializations || [],
        verification_status: 'pending'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        },
        partner: {
          select: {
            id: true,
            name: true,
            business_name: true,
            partner_type: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: { expert },
      message: 'Expert application submitted successfully. It will be reviewed by our team.'
    });
  } catch (error) {
    console.error('Error creating expert application:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit expert application' },
      { status: 500 }
    );
  }
} 