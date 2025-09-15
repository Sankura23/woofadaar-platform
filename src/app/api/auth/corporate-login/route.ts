import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

// POST /api/auth/corporate-login - Corporate admin authentication
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, company_domain } = body;

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        message: 'Email and password are required'
      }, { status: 400 });
    }

    // Extract email domain for company verification
    const emailDomain = email.split('@')[1];
    
    // If company_domain is provided, verify it matches email domain
    if (company_domain && emailDomain !== company_domain) {
      return NextResponse.json({
        success: false,
        message: 'Email domain does not match company domain'
      }, { status: 400 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        CorporateAdmins: {
          include: {
            company: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email or password'
      }, { status: 401 });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email or password'
      }, { status: 401 });
    }

    // Check if user is a corporate admin
    const corporateAdmin = user.CorporateAdmins.find(admin => 
      company_domain ? admin.company.email_domain === company_domain : true
    );

    if (!corporateAdmin) {
      return NextResponse.json({
        success: false,
        message: 'User is not a corporate administrator'
      }, { status: 403 });
    }

    // Check if company is active
    if (corporateAdmin.company.status !== 'active') {
      return NextResponse.json({
        success: false,
        message: 'Company account is not active'
      }, { status: 403 });
    }

    // Generate JWT token for corporate admin
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
    const token = jwt.sign({
      userId: user.id,
      email: user.email,
      userType: 'corporate-admin',
      corporateId: corporateAdmin.id,
      companyId: corporateAdmin.company_id,
      companyName: corporateAdmin.company.name,
      role: corporateAdmin.role,
      permissions: corporateAdmin.permissions
    }, jwtSecret, {
      expiresIn: '24h'
    });

    // Update last active timestamp if available
    await prisma.user.update({
      where: { id: user.id },
      data: { updated_at: new Date() }
    });

    console.log(`Corporate admin login successful: ${email} for company ${corporateAdmin.company.name}`);

    return NextResponse.json({
      success: true,
      message: 'Corporate admin login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profile_image_url: user.profile_image_url
        },
        company: {
          id: corporateAdmin.company.id,
          name: corporateAdmin.company.name,
          email_domain: corporateAdmin.company.email_domain,
          subscription_tier: corporateAdmin.company.subscription_tier,
          logo_url: corporateAdmin.company.logo_url
        },
        role: corporateAdmin.role,
        permissions: corporateAdmin.permissions
      }
    });

  } catch (error) {
    console.error('Corporate login error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}