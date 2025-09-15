import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

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

// Helper function to calculate subscription pricing
const calculateSubscriptionPrice = (tier: string, employeeCount: number, petCount: number, billingCycle: string) => {
  const basePrices = {
    basic: { monthly: 2500, annual: 25000 },     // ₹2,500/month or ₹25,000/year
    premium: { monthly: 8000, annual: 80000 },   // ₹8,000/month or ₹80,000/year  
    enterprise: { monthly: 15000, annual: 150000 } // ₹15,000/month or ₹150,000/year
  };

  const basePrice = basePrices[tier as keyof typeof basePrices]?.[billingCycle as keyof typeof basePrices.basic] || 2500;
  
  // Add per-employee scaling for larger companies
  let employeeMultiplier = 1;
  if (tier === 'basic' && employeeCount > 50) {
    employeeMultiplier = 1 + ((employeeCount - 50) * 0.01); // 1% per employee over 50
  } else if (tier === 'premium' && employeeCount > 200) {
    employeeMultiplier = 1 + ((employeeCount - 200) * 0.005); // 0.5% per employee over 200
  }

  // Add per-pet charges for high utilization
  let petMultiplier = 1;
  if (petCount > employeeCount * 0.8) { // More than 80% pet adoption rate
    const extraPets = petCount - Math.floor(employeeCount * 0.8);
    petMultiplier = 1 + (extraPets * 0.02); // 2% per extra pet
  }

  const finalPrice = basePrice * employeeMultiplier * petMultiplier;
  
  // Calculate taxes (18% GST in India)
  const taxRate = 0.18;
  const taxAmount = finalPrice * taxRate;
  
  return {
    base_amount: finalPrice,
    tax_amount: taxAmount,
    total_amount: finalPrice + taxAmount,
    employee_multiplier: employeeMultiplier,
    pet_multiplier: petMultiplier
  };
};

// GET /api/corporate/billing - Get billing history for company
export async function GET(request: NextRequest) {
  try {
    const authResult = verifyCorporateAdmin(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const { searchParams } = new URL(request.url);
    
    const companyId = searchParams.get('company_id') || decoded.companyId;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const status = searchParams.get('status') || 'all';
    const year = searchParams.get('year');

    // Check access
    if (decoded.role !== 'admin' && decoded.companyId !== companyId) {
      return NextResponse.json({
        success: false,
        message: 'Access denied to this company billing'
      }, { status: 403 });
    }

    const offset = (page - 1) * limit;
    
    const where: any = { company_id: companyId };
    if (status !== 'all') where.status = status;
    if (year) {
      where.billing_period_start = {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`)
      };
    }

    const [billingRecords, totalCount, company] = await Promise.all([
      prisma.corporateBilling.findMany({
        where,
        orderBy: { billing_period_start: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.corporateBilling.count({ where }),
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          subscription_tier: true,
          billing_cycle: true,
          employee_count: true,
          status: true
        }
      })
    ]);

    if (!company) {
      return NextResponse.json({
        success: false,
        message: 'Company not found'
      }, { status: 404 });
    }

    // Calculate billing statistics
    const totalPaid = billingRecords
      .filter(b => b.status === 'paid')
      .reduce((sum, b) => sum + b.total_amount, 0);
    
    const totalOutstanding = billingRecords
      .filter(b => ['pending', 'overdue'].includes(b.status))
      .reduce((sum, b) => sum + b.total_amount, 0);

    return NextResponse.json({
      success: true,
      data: {
        company,
        billing_records: billingRecords,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalCount / limit),
          total_count: totalCount,
          per_page: limit
        },
        statistics: {
          total_invoices: totalCount,
          total_paid: totalPaid,
          total_outstanding: totalOutstanding,
          paid_invoices: billingRecords.filter(b => b.status === 'paid').length,
          overdue_invoices: billingRecords.filter(b => b.status === 'overdue').length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching billing:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// POST /api/corporate/billing - Generate new invoice
export async function POST(request: NextRequest) {
  try {
    const authResult = verifyCorporateAdmin(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const body = await request.json();
    const { 
      company_id, 
      billing_period_start, 
      billing_period_end,
      custom_employee_count,
      custom_pet_count 
    } = body;

    const targetCompanyId = company_id || decoded.companyId;

    // Check access
    if (decoded.role !== 'admin' && decoded.companyId !== targetCompanyId) {
      return NextResponse.json({
        success: false,
        message: 'Access denied to create billing for this company'
      }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: targetCompanyId },
      include: {
        employee_enrollments: {
          where: { status: 'active' }
        },
        dogs: {
          where: { 
            is_corporate_pet: true,
            corporate_benefits_active: true
          }
        }
      }
    });

    if (!company) {
      return NextResponse.json({
        success: false,
        message: 'Company not found'
      }, { status: 404 });
    }

    // Get actual counts or use custom counts
    const employeeCount = custom_employee_count || company.employee_enrollments.length;
    const petCount = custom_pet_count || company.dogs.length;

    // Calculate pricing
    const pricing = calculateSubscriptionPrice(
      company.subscription_tier,
      employeeCount,
      petCount,
      company.billing_cycle
    );

    // Check for existing invoice in the same period
    const existingInvoice = await prisma.corporateBilling.findFirst({
      where: {
        company_id: targetCompanyId,
        billing_period_start: new Date(billing_period_start),
        billing_period_end: new Date(billing_period_end)
      }
    });

    if (existingInvoice) {
      return NextResponse.json({
        success: false,
        message: 'Invoice already exists for this billing period'
      }, { status: 409 });
    }

    // Create billing record
    const billingRecord = await prisma.corporateBilling.create({
      data: {
        company_id: targetCompanyId,
        billing_period_start: new Date(billing_period_start),
        billing_period_end: new Date(billing_period_end),
        employee_count: employeeCount,
        pet_count: petCount,
        base_amount: pricing.base_amount,
        tax_amount: pricing.tax_amount,
        total_amount: pricing.total_amount,
        currency: 'INR',
        status: 'pending'
      }
    });

    // Generate invoice URL (placeholder - implement actual invoice generation)
    const invoiceUrl = `${process.env.FRONTEND_URL}/corporate/invoices/${billingRecord.id}`;
    
    await prisma.corporateBilling.update({
      where: { id: billingRecord.id },
      data: { invoice_url: invoiceUrl }
    });

    return NextResponse.json({
      success: true,
      message: 'Invoice generated successfully',
      data: {
        billing_record: { ...billingRecord, invoice_url: invoiceUrl },
        pricing_breakdown: {
          subscription_tier: company.subscription_tier,
          billing_cycle: company.billing_cycle,
          base_price: pricing.base_amount,
          tax_rate: '18%',
          tax_amount: pricing.tax_amount,
          final_amount: pricing.total_amount,
          employee_count: employeeCount,
          pet_count: petCount
        }
      }
    });

  } catch (error) {
    console.error('Error generating invoice:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}