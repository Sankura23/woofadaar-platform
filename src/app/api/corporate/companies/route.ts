import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

// Helper function to verify corporate admin token
const verifyCorporateAdmin = (authHeader: string | null) => {
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Authentication required', status: 401 };
  }

  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
  
  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    if (!decoded.userId || decoded.userType !== 'corporate-admin') {
      return { error: 'Invalid corporate admin token', status: 401 };
    }
    return { decoded };
  } catch (error) {
    return { error: 'Invalid authentication token', status: 401 };
  }
};

// GET /api/corporate/companies - Get companies (admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = verifyCorporateAdmin(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({
        success: false,
        message: authResult.error
      }, { status: authResult.status });
    }

    const { decoded } = authResult;

    // Check if user has admin permissions for viewing all companies
    if (decoded.role !== 'admin') {
      // Regular corporate admin can only see their own company
      const company = await prisma.company.findUnique({
        where: { id: decoded.companyId },
        include: {
          employee_enrollments: {
            select: { id: true, status: true }
          },
          dogs: {
            where: { is_corporate_pet: true },
            select: { id: true, name: true }
          }
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          companies: company ? [company] : [],
          total: company ? 1 : 0
        }
      });
    }

    // Admin can see all companies
    const companies = await prisma.company.findMany({
      include: {
        employee_enrollments: {
          select: { id: true, status: true }
        },
        dogs: {
          where: { is_corporate_pet: true },
          select: { id: true, name: true }
        },
        _count: {
          select: {
            employee_enrollments: true,
            dogs: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: {
        companies,
        total: companies.length
      }
    });

  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// POST /api/corporate/companies - Create new company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email_domain,
      industry,
      employee_count,
      address,
      billing_address,
      contact_person,
      contact_email,
      contact_phone,
      subscription_tier = 'basic',
      billing_cycle = 'monthly'
    } = body;

    // Validate required fields
    if (!name || !email_domain || !contact_person || !contact_email) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: name, email_domain, contact_person, contact_email'
      }, { status: 400 });
    }

    // Validate email domain format
    if (!email_domain.includes('.') || email_domain.includes('@')) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email domain format. Use format like: company.com'
      }, { status: 400 });
    }

    // Check if email domain already exists
    const existingCompany = await prisma.company.findUnique({
      where: { email_domain }
    });

    if (existingCompany) {
      return NextResponse.json({
        success: false,
        message: 'A company with this email domain already exists'
      }, { status: 409 });
    }

    // Create company
    const company = await prisma.company.create({
      data: {
        name,
        email_domain,
        industry,
        employee_count,
        address,
        billing_address,
        contact_person,
        contact_email,
        contact_phone,
        subscription_tier,
        billing_cycle
      }
    });

    console.log(`New company created: ${name} (${email_domain})`);

    return NextResponse.json({
      success: true,
      message: 'Company created successfully',
      data: { company }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}