import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
import { getUserFromStorage } from '@/lib/demo-storage';

// SIMPLE WORKING USER API - NO DATABASE DEPENDENCIES
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
    
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret) as any;
    } catch (error) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    // Check if it's a pet parent token
    if (!decoded.userId || decoded.userType !== 'pet-parent') {
      return NextResponse.json({ message: 'Invalid user token' }, { status: 401 });
    }

    const userId = decoded.userId;

    // Try database first, then fallback to demo storage
    let user = null;
    
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          location: true,
          experience_level: true,
          barks_points: true,
          is_premium: true,
          profile_image_url: true,
          profile_visibility: true,
          reputation: true,
          preferred_language: true,
          created_at: true,
          updated_at: true
        }
      });

      if (user) {
        return NextResponse.json({ user });
      }
    } catch (dbError) {
      console.warn('Database error fetching user, trying demo storage:', dbError);
    }

    // Fallback to demo storage
    try {
      const demoUser = await getUserFromStorage(userId);
      if (demoUser) {
        // Map demo storage user to expected format
        const user = {
          id: demoUser.id,
          name: demoUser.name,
          email: demoUser.email,
          location: demoUser.location || null,
          experience_level: demoUser.experience_level || 'beginner',
          barks_points: demoUser.barkPoints || 0,
          is_premium: demoUser.is_premium || false,
          profile_image_url: demoUser.profile_image_url || null,
          profile_visibility: demoUser.profile_visibility || 'public',
          reputation: demoUser.reputation || 0,
          preferred_language: demoUser.preferred_language || 'en',
          created_at: demoUser.createdAt || new Date().toISOString(),
          updated_at: demoUser.updated_at || new Date().toISOString()
        };
        
        return NextResponse.json({ user });
      }
    } catch (demoError) {
      console.error('Demo storage error fetching user:', demoError);
    }

    return NextResponse.json({ message: 'User not found' }, { status: 404 });

  } catch (error) {
    console.error('User API error:', error);
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update user profile (simplified, just returns success)
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
    
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret) as any;
    } catch (error) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    if (!decoded.userId || decoded.userType !== 'pet-parent') {
      return NextResponse.json({ message: 'Invalid user token' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, location, experience_level, profile_visibility, preferred_language, profile_image_url } = body;

    // Update user in database
    try {
      const updatedUser = await prisma.user.update({
        where: { id: decoded.userId },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(location && { location }),
          ...(experience_level && { experience_level }),
          ...(profile_visibility && { profile_visibility }),
          ...(preferred_language && { preferred_language }),
          ...(profile_image_url && { profile_image_url }),
          updated_at: new Date()
        },
        select: {
          id: true,
          name: true,
          email: true,
          location: true,
          experience_level: true,
          barks_points: true,
          is_premium: true,
          profile_image_url: true,
          profile_visibility: true,
          reputation: true,
          preferred_language: true,
          created_at: true,
          updated_at: true
        }
      });

      console.log(`Updated user profile for ${decoded.userId}:`, {
        name: updatedUser.name,
        email: updatedUser.email,
        location: updatedUser.location
      });

      return NextResponse.json({
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (dbError) {
      console.error('Database error updating user:', dbError);
      return NextResponse.json({ message: 'Failed to update user' }, { status: 500 });
    }

  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to update profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}