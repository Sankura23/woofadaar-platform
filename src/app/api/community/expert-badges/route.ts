import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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

    // Only partners can create expert badges
    if (!('partnerId' in user) || user.userType !== 'partner') {
      return NextResponse.json(
        { success: false, error: 'Only verified partners can award expert badges' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      userId, 
      badgeType, 
      specialization 
    } = body;

    if (!userId || !badgeType) {
      return NextResponse.json(
        { success: false, error: 'User ID and badge type are required' },
        { status: 400 }
      );
    }

    const validBadgeTypes = ['vet', 'trainer', 'nutritionist', 'behaviorist', 'breeder'];
    if (!validBadgeTypes.includes(badgeType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid badge type' },
        { status: 400 }
      );
    }

    // Check if partner is verified and has appropriate type
    const partner = await prisma.partner.findUnique({
      where: { id: user.partnerId }
    });

    if (!partner || !partner.verified) {
      return NextResponse.json(
        { success: false, error: 'Only verified partners can award badges' },
        { status: 403 }
      );
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if badge already exists
    const existingBadge = await prisma.expertBadge.findUnique({
      where: {
        user_id_badge_type: {
          user_id: userId,
          badge_type: badgeType
        }
      }
    });

    if (existingBadge) {
      return NextResponse.json(
        { success: false, error: 'User already has this expert badge' },
        { status: 400 }
      );
    }

    // Create expert badge
    const badge = await prisma.expertBadge.create({
      data: {
        user_id: userId,
        partner_id: user.partnerId,
        badge_type: badgeType,
        specialization: specialization || null,
        verified_by: user.partnerId,
        verification_date: new Date(),
        is_active: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        },
        verified_by_partner: {
          select: {
            id: true,
            name: true,
            partner_type: true
          }
        }
      }
    });

    // Award points to user for getting expert badge
    await prisma.userEngagement.create({
      data: {
        user_id: userId,
        action_type: 'expert_badge_earned',
        points_earned: 100,
        description: `Earned ${badgeType} expert badge`,
        related_id: badge.id,
        related_type: 'expert_badge'
      }
    });

    return NextResponse.json({
      success: true,
      data: { badge }
    });
  } catch (error) {
    console.error('Error creating expert badge:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create expert badge' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const badgeType = searchParams.get('badgeType');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (userId) where.user_id = userId;
    if (badgeType) where.badge_type = badgeType;
    if (isActive !== null) where.is_active = isActive === 'true';

    const badges = await prisma.expertBadge.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        },
        verified_by_partner: {
          select: {
            id: true,
            name: true,
            partner_type: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: { badges }
    });
  } catch (error) {
    console.error('Error fetching expert badges:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expert badges' },
      { status: 500 }
    );
  }
}