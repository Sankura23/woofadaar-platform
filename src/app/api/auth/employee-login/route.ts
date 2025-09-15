import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

// POST /api/auth/employee-login - Employee login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, company_domain } = body;

    // Validate required fields
    if (!email || !password || !company_domain) {
      return NextResponse.json({
        success: false,
        message: 'Email, password, and company domain are required'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        message: 'Please enter a valid email address'
      }, { status: 400 });
    }

    // Extract domain from email and validate
    const emailDomain = email.split('@')[1];
    if (emailDomain.toLowerCase() !== company_domain.toLowerCase()) {
      return NextResponse.json({
        success: false,
        message: 'Email domain does not match company domain'
      }, { status: 400 });
    }

    // Find company by email domain
    const company = await prisma.company.findUnique({
      where: { 
        email_domain: emailDomain.toLowerCase(),
        status: 'active'
      },
      select: {
        id: true,
        name: true,
        email_domain: true,
        subscription_tier: true,
        status: true
      }
    });

    if (!company) {
      return NextResponse.json({
        success: false,
        message: 'Company not found or inactive. Please contact your HR department.'
      }, { status: 404 });
    }

    // Find user account
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        user_type: true,
        profile_image_url: true
      }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'Account not found. Please register first or contact your HR department.'
      }, { status: 404 });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({
        success: false,
        message: 'Invalid password'
      }, { status: 401 });
    }

    // Find employee enrollment
    const enrollment = await prisma.employeeEnrollment.findFirst({
      where: {
        employee_email: email.toLowerCase(),
        company_id: company.id,
        status: { in: ['active', 'pending'] }
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            subscription_tier: true,
            logo_url: true
          }
        }
      }
    });

    if (!enrollment) {
      return NextResponse.json({
        success: false,
        message: 'Employee enrollment not found. Please contact your HR department.'
      }, { status: 404 });
    }

    // Check enrollment status
    if (enrollment.status === 'pending') {
      return NextResponse.json({
        success: false,
        message: 'Your enrollment is pending approval. Please wait for HR to activate your account.'
      }, { status: 403 });
    }

    if (enrollment.status !== 'active') {
      return NextResponse.json({
        success: false,
        message: 'Your employee account is not active. Please contact your HR department.'
      }, { status: 403 });
    }

    // Update employee enrollment with user ID if not linked
    if (!enrollment.employee_user_id) {
      await prisma.employeeEnrollment.update({
        where: { id: enrollment.id },
        data: { employee_user_id: user.id }
      });
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
    const token = jwt.sign({
      userId: user.id,
      email: user.email,
      userType: 'employee',
      enrollmentId: enrollment.id,
      companyId: company.id,
      companyName: company.name,
      department: enrollment.department
    }, jwtSecret, { expiresIn: '24h' });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() }
    });

    // Log successful login
    console.log(`Employee login successful: ${user.email} from ${company.name}`);

    // Prepare response data
    const responseData = {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile_image_url: user.profile_image_url,
        user_type: 'employee'
      },
      employee: {
        id: enrollment.id,
        employee_name: enrollment.employee_name,
        department: enrollment.department,
        enrollment_date: enrollment.enrollment_date,
        status: enrollment.status,
        pet_allowance_limit: enrollment.pet_allowance_limit
      },
      company: enrollment.company
    };

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: responseData
    });

  } catch (error) {
    console.error('Employee login error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}