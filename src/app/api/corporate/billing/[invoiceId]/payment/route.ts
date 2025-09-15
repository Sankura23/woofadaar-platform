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

// PUT /api/corporate/billing/[invoiceId]/payment - Mark invoice as paid
export async function PUT(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const authResult = verifyCorporateAdmin(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const invoiceId = params.invoiceId;
    const body = await request.json();
    
    const { 
      payment_method = 'manual',
      transaction_id,
      payment_notes,
      payment_date 
    } = body;

    const invoice = await prisma.corporateBilling.findUnique({
      where: { id: invoiceId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            contact_email: true
          }
        }
      }
    });

    if (!invoice) {
      return NextResponse.json({
        success: false,
        message: 'Invoice not found'
      }, { status: 404 });
    }

    // Check access
    if (decoded.role !== 'admin' && decoded.companyId !== invoice.company_id) {
      return NextResponse.json({
        success: false,
        message: 'Access denied to this invoice'
      }, { status: 403 });
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({
        success: false,
        message: 'Invoice is already marked as paid'
      }, { status: 400 });
    }

    // Update invoice status
    const updatedInvoice = await prisma.corporateBilling.update({
      where: { id: invoiceId },
      data: {
        status: 'paid',
        payment_date: payment_date ? new Date(payment_date) : new Date(),
        // Store payment metadata in a JSON field if available
        // payment_metadata: {
        //   method: payment_method,
        //   transaction_id,
        //   notes: payment_notes,
        //   processed_by: decoded.email,
        //   processed_at: new Date().toISOString()
        // }
      }
    });

    // Log payment confirmation
    console.log(`Invoice ${invoiceId} marked as paid for ${invoice.company.name}`, {
      amount: invoice.total_amount,
      payment_method,
      transaction_id,
      processed_by: decoded.email
    });

    // Send payment confirmation (implement email service)
    if (invoice.company.contact_email) {
      console.log(`Payment confirmation email queued for ${invoice.company.contact_email}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice marked as paid successfully',
      data: {
        invoice: updatedInvoice,
        payment_info: {
          method: payment_method,
          transaction_id,
          payment_date: updatedInvoice.payment_date,
          amount_paid: invoice.total_amount,
          currency: invoice.currency
        }
      }
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// GET /api/corporate/billing/[invoiceId]/payment - Get payment status
export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const authResult = verifyCorporateAdmin(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const invoiceId = params.invoiceId;

    const invoice = await prisma.corporateBilling.findUnique({
      where: { id: invoiceId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            subscription_tier: true,
            billing_cycle: true
          }
        }
      }
    });

    if (!invoice) {
      return NextResponse.json({
        success: false,
        message: 'Invoice not found'
      }, { status: 404 });
    }

    // Check access
    if (decoded.role !== 'admin' && decoded.companyId !== invoice.company_id) {
      return NextResponse.json({
        success: false,
        message: 'Access denied to this invoice'
      }, { status: 403 });
    }

    // Calculate days overdue if applicable
    const today = new Date();
    const billingEndDate = new Date(invoice.billing_period_end);
    const daysOverdue = invoice.status === 'overdue' ? 
      Math.floor((today.getTime() - billingEndDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return NextResponse.json({
      success: true,
      data: {
        invoice,
        payment_status: {
          status: invoice.status,
          is_paid: invoice.status === 'paid',
          is_overdue: invoice.status === 'overdue',
          payment_date: invoice.payment_date,
          days_overdue: daysOverdue,
          amount_due: invoice.status === 'paid' ? 0 : invoice.total_amount
        },
        billing_info: {
          period_start: invoice.billing_period_start,
          period_end: invoice.billing_period_end,
          employee_count: invoice.employee_count,
          pet_count: invoice.pet_count,
          base_amount: invoice.base_amount,
          tax_amount: invoice.tax_amount,
          total_amount: invoice.total_amount,
          currency: invoice.currency
        }
      }
    });

  } catch (error) {
    console.error('Error fetching payment status:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}