// Week 25 Phase 2: Individual Invoice Management API
// Get, update, and mark invoices as paid

import { NextRequest, NextResponse } from 'next/server';
import { billingService } from '@/lib/billing-service';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

// GET /api/billing/invoices/[id] - Get specific invoice
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const invoiceId = params.id;

    // Get invoice
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        user_id: userId // Ensure user can only access their own invoices
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: 'Invoice not found' },
        { status: 404 }
      );
    }

    const invoiceData = {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      user_id: invoice.user_id,
      subscription_id: invoice.subscription_id || undefined,
      status: invoice.status,
      subtotal: invoice.subtotal,
      gst_amount: invoice.gst_amount,
      total_amount: invoice.total_amount,
      currency: invoice.currency,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      paid_date: invoice.paid_date || undefined,
      line_items: JSON.parse(invoice.line_items),
      gst_details: JSON.parse(invoice.gst_details),
      payment_terms: invoice.payment_terms,
      notes: invoice.notes || undefined,
      metadata: JSON.parse(invoice.metadata || '{}')
    };

    return NextResponse.json({
      success: true,
      data: invoiceData
    });

  } catch (error) {
    console.error('Get invoice error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to get invoice' 
      },
      { status: 500 }
    );
  }
}

// PUT /api/billing/invoices/[id] - Update invoice status
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin authentication (billing team only)
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // In production, verify admin/staff role here
    try {
      jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const invoiceId = params.id;
    const body = await request.json();
    const { action, payment_id, paid_amount } = body;

    switch (action) {
      case 'mark_paid':
        if (!payment_id) {
          return NextResponse.json(
            { success: false, message: 'payment_id is required' },
            { status: 400 }
          );
        }

        const result = await billingService.markInvoicePaid(
          invoiceId,
          payment_id,
          paid_amount
        );

        return NextResponse.json({
          success: result.success,
          message: result.message
        }, { status: result.success ? 200 : 400 });

      case 'cancel':
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: 'cancelled',
            metadata: JSON.stringify({
              cancelled_at: new Date().toISOString(),
              cancelled_by: 'admin'
            }),
            updated_at: new Date()
          }
        });

        return NextResponse.json({
          success: true,
          message: 'Invoice cancelled successfully'
        });

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action. Use "mark_paid" or "cancel"' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Update invoice error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to update invoice' 
      },
      { status: 500 }
    );
  }
}