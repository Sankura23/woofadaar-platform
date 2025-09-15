import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getUserFromStorage, getUserByEmail, demoUsersStorage } from '@/lib/demo-storage';
import { getPartnerByEmail } from '@/lib/demo-storage';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// SIMPLE WORKING LOGIN - NO DATABASE DEPENDENCIES
export async function POST(request: NextRequest) {
  try {
    const { email, password, userType = 'pet-parent' } = await request.json();

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Please enter a valid email address (e.g., user@example.com)' },
        { status: 400 }
      );
    }

    console.log('Working login attempt:', { email, userType });

    // Only keep essential admin accounts for testing
    const workingCredentials = {
      // Admin only - for system administration
      'admin@woofadaar.com': { password: 'admin123', userType: 'admin', name: 'Admin User', id: 'admin-123' }
    };

    const credential = workingCredentials[email as keyof typeof workingCredentials];
    
    // Check database first, then fallback to demo storage
    let registeredUser: any = null;

    if (!credential) {
      if (userType === 'pet-parent') {
        // Try database first
        try {
          const user = await prisma.user.findUnique({
            where: { email }
          });
          if (user) {
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (isValidPassword) {
              registeredUser = { 
                password: user.password_hash,
                userType: 'pet-parent', 
                name: user.name, 
                id: user.id 
              };
            }
          }
        } catch (dbError) {
          console.warn('Database user lookup failed, trying demo storage:', dbError);
        }

        // Fallback to demo storage
        if (!registeredUser) {
          const user = await getUserByEmail(email);
          if (user) {
            registeredUser = { 
              password: user.password,
              userType: 'pet-parent', 
              name: user.name, 
              id: user.id 
            };
          }
        }
      } else if (userType === 'partner') {
        // Try database first
        try {
          const partner = await prisma.partner.findUnique({
            where: { email }
          });
          if (partner) {
            if (partner.status !== 'approved') {
              return NextResponse.json(
                { message: 'Your application is not approved yet. Please wait for admin approval.' },
                { status: 403 }
              );
            }

            if (!partner.password) {
              return NextResponse.json(
                { message: 'Password not set for this partner account. Please reset your password.' },
                { status: 400 }
              );
            }

            const isValidPassword = await bcrypt.compare(password, partner.password);
            if (isValidPassword) {
              registeredUser = {
                password: partner.password,
                userType: 'partner',
                name: partner.name,
                id: partner.id
              };
            }
          }
        } catch (dbError) {
          console.warn('Database partner lookup failed, trying demo storage:', dbError);
        }

        // Fallback to demo storage
        if (!registeredUser) {
          const partner = await getPartnerByEmail(email);
          if (partner) {
            if (partner.status !== 'approved') {
              return NextResponse.json(
                { message: 'Your application is not approved yet. Please wait for admin approval.' },
                { status: 403 }
              );
            }

            const storedHash = partner.password as string | undefined;
            if (!storedHash) {
              return NextResponse.json(
                { message: 'Password not set for this partner account. Please reset your password.' },
                { status: 400 }
              );
            }
            const isValid = await bcrypt.compare(password, storedHash);
            if (isValid) {
              registeredUser = {
                password: storedHash,
                userType: 'partner',
                name: partner.name,
                id: partner.id
              };
            }
          }
        }

        if (!registeredUser) {
          return NextResponse.json(
            { message: 'Invalid email or password. Please check your credentials or register a new account.' },
            { status: 401 }
          );
        }
      }
    }

    const validCredential = credential || registeredUser;

    if (!validCredential) {
      return NextResponse.json(
        { 
          message: 'Invalid email or password. Please check your credentials or register a new account.'
        },
        { status: 401 }
      );
    }

    // Create JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
    
    const tokenPayload = validCredential.userType === 'partner' 
      ? { partnerId: validCredential.id, email, userType: validCredential.userType }
      : { userId: validCredential.id, email, userType: validCredential.userType };

    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '7d' });

    const user = {
      id: validCredential.id,
      name: validCredential.name,
      email: email,
      ...(validCredential.userType === 'partner' && {
        partner_type: 'vet',
        business_name: 'Demo Vet Clinic',
        verified: true,
        status: 'approved'
      })
    };

    console.log(`✅ Login successful for ${email} as ${validCredential.userType}`);

    return NextResponse.json({
      message: 'Login successful',
      token,
      userType: validCredential.userType,
      user
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}