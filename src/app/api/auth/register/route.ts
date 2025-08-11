import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, location, experience_level } = await request.json()

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'User already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const user = await prisma.user.create({
      data: {
        id: userId,
        name,
        email,
        password_hash: hashedPassword,
        location: location || null,
        experience_level: experience_level || 'beginner',
        updated_at: new Date()
      }
    })

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

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    return NextResponse.json({
      message: 'Registration successful! Welcome to Woofadaar!',
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email,
        location: user.location,
        experience_level: user.experience_level
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}