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
        created_at: true
      }
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
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
    const { name, location, experience_level, preferred_language } = body;

    // Validation
    if (!name) {
      return NextResponse.json(
        { message: 'Name is required' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        location: location || null,
        experience_level: experience_level || 'beginner',
        ...(preferred_language && { preferred_language })
      },
      select: {
        id: true,
        name: true,
        email: true,
        location: true,
        experience_level: true,
        barks_points: true,
        is_premium: true,
        preferred_language: true,
        created_at: true
      }
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 