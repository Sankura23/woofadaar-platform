import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest, isPetParent } from '@/lib/auth'
import prisma from '@/lib/db'

export async function PUT(request: NextRequest) {
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
    const { profile_visibility, notification_prefs } = await request.json();

    // Validate profile visibility
    if (profile_visibility && !['public', 'private'].includes(profile_visibility)) {
      return NextResponse.json(
        { message: 'Invalid profile visibility setting' },
        { status: 400 }
      );
    }

    // Validate notification preferences
    if (notification_prefs && typeof notification_prefs !== 'object') {
      return NextResponse.json(
        { message: 'Invalid notification preferences format' },
        { status: 400 }
      );
    }

    // Update user privacy settings
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(profile_visibility && { profile_visibility }),
        ...(notification_prefs && { notification_prefs }),
        updated_at: new Date()
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action: 'privacy_settings_updated',
        details: {
          profile_visibility: updatedUser.profile_visibility,
          notification_prefs: updatedUser.notification_prefs
        }
      }
    });

    return NextResponse.json({
      message: 'Privacy settings updated successfully',
      settings: {
        profile_visibility: updatedUser.profile_visibility,
        notification_prefs: updatedUser.notification_prefs
      }
    });

  } catch (error) {
    console.error('Privacy settings update error:', error);
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        profile_visibility: true,
        notification_prefs: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      settings: {
        profile_visibility: user.profile_visibility,
        notification_prefs: user.notification_prefs
      }
    });

  } catch (error) {
    console.error('Privacy settings fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 