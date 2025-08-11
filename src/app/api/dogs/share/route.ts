import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest, isPetParent } from '@/lib/auth'
import prisma from '@/lib/db'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const payload = token ? verifyToken(token) : null;
  const userId = payload && isPetParent(payload) ? payload.userId : null;
  
  if (!userId) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { dogId, shareType, expiresIn } = await request.json();

    // Validate dog ownership
    const dog = await prisma.dog.findFirst({
      where: { 
        id: dogId,
        user_id: userId
      }
    });

    if (!dog) {
      return NextResponse.json(
        { message: 'Dog not found or access denied' },
        { status: 404 }
      );
    }

    // Generate unique share token
    const shareToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    // Create share record
    const shareRecord = await prisma.dogShare.create({
      data: {
        dog_id: dogId,
        share_token: shareToken,
        share_type: shareType || 'public',
        expires_at: expiresAt,
        created_by: userId
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action: 'dog_profile_shared',
        details: {
          dog_id: dogId,
          dog_name: dog.name,
          share_type: shareType,
          share_token: shareToken
        }
      }
    });

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dogs/share/${shareToken}`;

    return NextResponse.json({
      message: 'Dog profile shared successfully',
      share: {
        id: shareRecord.id,
        share_token: shareToken,
        share_url: shareUrl,
        expires_at: expiresAt,
        share_type: shareType
      }
    });

  } catch (error) {
    console.error('Dog share error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const payload = token ? verifyToken(token) : null;
  const userId = payload && isPetParent(payload) ? payload.userId : null;
  
  if (!userId) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Get user's shared dog profiles
    const sharedDogs = await prisma.dogShare.findMany({
      where: {
        Dog: {
          user_id: userId
        }
      },
      include: {
        Dog: {
          select: {
            id: true,
            name: true,
            breed: true,
            photo_url: true,
            health_id: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return NextResponse.json({
      shared_profiles: sharedDogs.map(share => ({
        id: share.id,
        share_token: share.share_token,
        share_type: share.share_type,
        expires_at: share.expires_at,
        created_at: share.created_at,
        dog: share.Dog
      }))
    });

  } catch (error) {
    console.error('Get shared dogs error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 