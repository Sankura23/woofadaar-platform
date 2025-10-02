import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

interface DecodedToken {
  userId: string;
  email: string;
}

async function verifyToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

// GET /api/user - Get current user profile
export async function GET(request: NextRequest) {
  const userId = await verifyToken(request);
  
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        location: true,
        experience_level: true,
        barks_points: true,
        is_premium: true,
        preferred_language: true,
        profile_image_url: true,
        profile_visibility: true,
        reputation: true,
        created_at: true
      }
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Transform the response to match mobile app expectations
    const transformedUser = {
      ...user,
      userType: 'pet-parent' as const,
      createdAt: user.created_at
    };

    return NextResponse.json({ user: transformedUser });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/user - Update current user profile
export async function PUT(request: NextRequest) {
  const userId = await verifyToken(request);
  
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, email, location, experience_level, preferred_language, profile_image_url } = body;

    // Validation
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { message: 'Name must be at least 2 characters long' },
        { status: 400 }
      );
    }

    if (location && location.trim().length === 0) {
      return NextResponse.json(
        { message: 'Location cannot be empty' },
        { status: 400 }
      );
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { message: 'Invalid email format' },
          { status: 400 }
        );
      }

      // Check if email is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          email: email,
          id: { not: userId }
        }
      });

      if (existingUser) {
        return NextResponse.json(
          { message: 'Email is already taken by another user' },
          { status: 409 }
        );
      }
    }

    // Validate experience level
    const validExperienceLevels = ['beginner', 'intermediate', 'experienced', 'expert'];
    if (experience_level && !validExperienceLevels.includes(experience_level)) {
      return NextResponse.json(
        { message: 'Invalid experience level' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {
      name: name.trim(),
      location: location ? location.trim() : null,
      experience_level: experience_level || 'beginner',
      profile_image_url: profile_image_url || null,
      ...(preferred_language && { preferred_language })
    };

    // Add email to update if provided
    if (email) {
      updateData.email = email.trim();
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        location: true,
        experience_level: true,
        barks_points: true,
        is_premium: true,
        preferred_language: true,
        profile_image_url: true,
        profile_visibility: true,
        reputation: true,
        created_at: true
      }
    });

    // Transform the response to match mobile app expectations
    const transformedUpdatedUser = {
      ...updatedUser,
      userType: 'pet-parent' as const,
      createdAt: updatedUser.created_at
    };

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: transformedUpdatedUser
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { message: 'Failed to update profile. Please try again.' },
      { status: 500 }
    );
  }
} 