import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { email, password, userType = 'pet-parent' } = await request.json()

    // Admin login
    if (userType === 'admin') {
      // Demo admin authentication for development
      if (email === 'admin@woofadaar.com' && password === 'admin123') {
        const demoAdmin = {
          id: 'admin-123',
          name: 'Admin User',
          email: 'admin@woofadaar.com',
          role: 'admin'
        };

        const token = jwt.sign(
          { 
            userId: demoAdmin.id, 
            email: demoAdmin.email,
            userType: 'admin',
            role: 'admin'
          },
          process.env.JWT_SECRET!,
          { expiresIn: '7d' }
        );

        return NextResponse.json({
          message: 'Admin login successful (Demo Mode)',
          token,
          userType: 'admin',
          user: demoAdmin
        });
      }

      return NextResponse.json(
        { message: 'Invalid admin credentials' },
        { status: 401 }
      )
    }

    // Determine which model to query based on userType
    if (userType === 'partner') {
      // Partner login
      let partner = null;
      try {
        partner = await prisma.partner.findUnique({
          where: { email }
        });
      } catch (dbError) {
        console.warn('Database error during partner login, using demo auth:', dbError);
      }

      if (!partner) {
        // Demo partner authentication for development
        if (email === 'demo@vet.com' && password === 'demo123') {
          const demoPartner = {
            id: 'demo-partner-123',
            name: 'Dr. Demo Veterinarian',
            email: 'demo@vet.com',
            partner_type: 'vet',
            business_name: 'Demo Vet Clinic',
            verified: true,
            status: 'approved'
          };

          const token = jwt.sign(
            { 
              partnerId: demoPartner.id, 
              email: demoPartner.email,
              userType: 'partner'
            },
            process.env.JWT_SECRET!,
            { expiresIn: '7d' }
          );

          return NextResponse.json({
            message: 'Login successful (Demo Mode)',
            token,
            userType: 'partner',
            user: demoPartner
          });
        }

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
      let user = null;
      try {
        user = await prisma.user.findUnique({
          where: { email }
        });
      } catch (dbError) {
        console.warn('Database error during user login, using demo auth:', dbError);
      }

      if (!user) {
        // Demo user authentication for development
        if (email === 'demo@user.com' && password === 'demo123') {
          const demoUser = {
            id: 'demo-user-123',
            name: 'Demo User',
            email: 'demo@user.com',
            barks_points: 100,
            is_premium: false
          };

          const token = jwt.sign(
            { 
              userId: demoUser.id, 
              email: demoUser.email,
              userType: 'pet-parent'
            },
            process.env.JWT_SECRET!,
            { expiresIn: '7d' }
          );

          return NextResponse.json({
            message: 'Login successful (Demo Mode)',
            token,
            userType: 'pet-parent',
            user: demoUser
          });
        }

        return NextResponse.json(
          { message: 'Invalid credentials' },
          { status: 401 }
        )
      }

      // Check password
      let isValidPassword = false;
      try {
        isValidPassword = await bcrypt.compare(password, user.password_hash);
      } catch (hashError) {
        console.warn('Password comparison error:', hashError);
      }

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