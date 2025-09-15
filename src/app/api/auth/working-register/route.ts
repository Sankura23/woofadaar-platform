import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { registerNewUser, getUserByEmail } from '@/lib/demo-storage';

// SIMPLE WORKING REGISTRATION - NO DATABASE DEPENDENCIES
export async function POST(request: NextRequest) {
  try {
    const { name, email, password, location, experience_level } = await request.json();

    console.log('Working registration attempt:', { name, email, location });

    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Please enter a valid email address (e.g., user@example.com)' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if email already exists using the new function
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { message: 'User already exists with this email' },
        { status: 400 }
      );
    }

    // Check admin emails
    const reservedEmails = ['admin@woofadaar.com'];
    if (reservedEmails.includes(email)) {
      return NextResponse.json(
        { message: 'This email is reserved' },
        { status: 400 }
      );
    }

    // Use the new registerNewUser function
    const user = await registerNewUser(email, password, name);

    // Create JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
    const token = jwt.sign(
      { userId: user.id, email: user.email, userType: 'pet-parent' },
      jwtSecret,
      { expiresIn: '7d' }
    );

    console.log(`✅ Registration successful for ${email}`);

    return NextResponse.json({
      message: 'Registration successful! Welcome to Woofadaar!',
      token,
      userType: 'pet-parent',
      user
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}