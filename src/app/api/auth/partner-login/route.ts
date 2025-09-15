import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        message: 'Email and password are required'
      }, { status: 400 });
    }

    try {
      // Find partner by email in database
      const partner = await prisma.partner.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          status: true,
          verified: true,
          partner_type: true,
          business_name: true
        }
      });

      if (!partner) {
        return NextResponse.json({
          success: false,
          message: 'Invalid email or partner not found'
        }, { status: 401 });
      }

      // Check if partner account is approved
      if (partner.status !== 'approved') {
        return NextResponse.json({
          success: false,
          message: `Your partner application is currently ${partner.status}. Please wait for admin approval.`
        }, { status: 403 });
      }

      // Check password
      const isValidPassword = partner.password ? 
        await bcrypt.compare(password, partner.password) : 
        password === 'demo123'; // Default demo password

      if (!isValidPassword) {
        return NextResponse.json({
          success: false,
          message: 'Invalid password'
        }, { status: 401 });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          partnerId: partner.id,
          userId: partner.id, // For backward compatibility 
          email: partner.email,
          type: 'partner',
          userType: 'partner' // For partner-me API compatibility
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Return success with token
      const response = NextResponse.json({
        success: true,
        message: 'Login successful',
        token: token, // Include token in response for localStorage storage
        partner: {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          partner_type: partner.partner_type,
          business_name: partner.business_name,
          verified: partner.verified
        }
      });

      // Set HTTP-only cookie with token
      response.cookies.set('partner-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      });

      return response;

    } catch (dbError) {
      console.error('Database error in partner login:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Login failed. Please try again later.'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Partner login error:', error);
    return NextResponse.json({
      success: false,
      message: 'Invalid request format'
    }, { status: 400 });
  }
}