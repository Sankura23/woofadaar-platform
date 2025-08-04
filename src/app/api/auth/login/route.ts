import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { email, password, userType = 'pet-parent' } = await request.json()

    // Determine which model to query based on userType
    if (userType === 'partner') {
      // Partner login
      const partner = await prisma.partner.findUnique({
        where: { email }
      })

      if (!partner) {
        return NextResponse.json(
          { message: 'Invalid credentials' },
          { status: 401 }
        )
      }

      // For partners, we'll check if the partner exists and is approved
      // Note: Partners don't have password authentication yet - they're approved by admin
      if (partner.status !== 'approved') {
        return NextResponse.json(
          { message: 'Partner account is not approved yet. Please contact admin for approval.' },
          { status: 401 }
        )
      }

      // Generate JWT for partner
      const token = jwt.sign(
        { 
          partnerId: partner.id, 
          email: partner.email,
          userType: 'partner'
        },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      )

      return NextResponse.json({
        message: 'Login successful',
        token,
        userType: 'partner',
        user: { 
          id: partner.id, 
          name: partner.name, 
          email: partner.email,
          partner_type: partner.partner_type,
          business_name: partner.business_name,
          verified: partner.verified,
          status: partner.status
        }
      })

    } else {
      // Pet Parent login (default)
      const user = await prisma.user.findUnique({
        where: { email }
      })

      if (!user) {
        return NextResponse.json(
          { message: 'Invalid credentials' },
          { status: 401 }
        )
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password_hash)

      if (!isValidPassword) {
        return NextResponse.json(
          { message: 'Invalid credentials' },
          { status: 401 }
        )
      }

      // Generate JWT for pet parent
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          userType: 'pet-parent'
        },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      )

      return NextResponse.json({
        message: 'Login successful',
        token,
        userType: 'pet-parent',
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email,
          barks_points: user.barks_points,
          is_premium: user.is_premium
        }
      })
    }

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}