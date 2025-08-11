import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const { email, name, password } = await request.json();

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, name, and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate a unique user ID
    const userId = `user_${Date.now()}_${nanoid(9)}`;

    // Create the user
    const user = await prisma.user.create({
      data: {
        id: userId,
        email,
        name,
        password_hash: passwordHash,
        created_at: new Date(),
        updated_at: new Date(),
        experience_level: 'beginner',
        barks_points: 0,
        is_premium: false,
        preferred_language: 'en',
        profile_visibility: 'public',
        reputation: 0,
        is_deactivated: false
      }
    });

    // Create initial UserPoints record for gamification
    await prisma.userPoints.create({
      data: {
        user_id: userId,
        points_earned: 0,
        points_spent: 0,
        current_balance: 0,
        total_lifetime_points: 0,
        level: 1,
        experience_points: 0,
        streak_count: 0,
        achievements: [],
        badges: []
      }
    });

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}