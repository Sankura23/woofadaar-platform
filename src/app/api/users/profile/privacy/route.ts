import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken';
import { getUserFromStorage, updateUserInStorage } from '@/lib/demo-storage';

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
    
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret) as any;
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    if (!decoded.userId || decoded.userType !== 'pet-parent') {
      return NextResponse.json(
        { message: 'Invalid user token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
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

    // Get current user data
    const currentUser = await getUserFromStorage(userId);
    if (!currentUser) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Prepare updated user data
    const updatedData = {
      ...currentUser,
      ...(profile_visibility && { profile_visibility }),
      ...(notification_prefs && { notification_prefs }),
      updated_at: new Date().toISOString()
    };

    // Update user in demo storage
    const success = await updateUserInStorage(userId, updatedData);
    
    if (!success) {
      return NextResponse.json(
        { message: 'Failed to update privacy settings' },
        { status: 500 }
      );
    }

    console.log(`Updated privacy settings for user ${userId}:`, {
      profileVisibility: updatedData.profile_visibility,
      hasNotificationPrefs: !!updatedData.notification_prefs
    });

    return NextResponse.json({
      message: 'Privacy settings updated successfully',
      settings: {
        profile_visibility: updatedData.profile_visibility,
        notification_prefs: updatedData.notification_prefs
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
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
    
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret) as any;
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    if (!decoded.userId || decoded.userType !== 'pet-parent') {
      return NextResponse.json(
        { message: 'Invalid user token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

    // Get user from demo storage
    const user = await getUserFromStorage(userId);

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Provide default privacy settings if not set
    const defaultSettings = {
      profile_visibility: 'public',
      notification_prefs: {
        email_notifications: true,
        push_notifications: true,
        community_updates: true,
        health_reminders: true,
        partner_requests: true
      }
    };

    const settings = {
      profile_visibility: user.profile_visibility || defaultSettings.profile_visibility,
      notification_prefs: user.notification_prefs || defaultSettings.notification_prefs
    };

    console.log(`Retrieved privacy settings for user ${userId}:`, {
      hasProfileVisibility: !!settings.profile_visibility,
      hasNotificationPrefs: !!settings.notification_prefs
    });

    return NextResponse.json({
      settings
    });

  } catch (error) {
    console.error('Privacy settings fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 