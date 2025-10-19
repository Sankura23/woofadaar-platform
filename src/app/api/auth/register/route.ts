import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/db'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, location, experience_level } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email and password are required' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    try {
      // Try to create user in database
      const user = await prisma.user.create({
        data: {
          id: randomUUID(),
          name,
          email,
          password_hash: hashedPassword,
          location: location || null,
          experience_level: experience_level || 'beginner',
          updated_at: new Date()
        }
      })

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email, userType: 'pet-parent' },
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

    } catch (dbError: any) {
      console.error('Database error during registration:', dbError)

      if (dbError.code === 'P2002') {
        return NextResponse.json(
          { message: 'Email already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { message: 'Registration failed. Please check your connection and try again.' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}