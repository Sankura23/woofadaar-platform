// Week 25 Phase 2: Billing API - Invoice Management
// Generate, retrieve, and manage invoices with GST compliance

import { NextRequest, NextResponse } from 'next/server';
import { billingService } from '@/lib/billing-service';
import jwt from 'jsonwebtoken';

// GET /api/billing/invoices - Get user invoices with filtering
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const filters: any = { limit, offset };
    
    if (status) filters.status = status;
    if (fromDate) filters.from_date = new Date(fromDate);
    if (toDate) filters.to_date = new Date(toDate);

    const result = await billingService.getUserInvoices(userId, filters);

    return NextResponse.json({
      success: true,
      data: {
        invoices: result.invoices,
        pagination: {
          total_count: result.total_count,
          limit,
          offset,
          has_more: result.total_count > offset + limit
        },
        summary: {
          total_amount_due: result.total_amount_due
        }
      }
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to get invoices' 
      },
      { status: 500 }
    );
  }
}

// POST /api/billing/invoices - Generate invoice for service
export async function POST(request: NextRequest) {
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
    let adminUserId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      adminUserId = decoded.userId;
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      invoice_type,
      user_id,
      subscription_id,
      service_type,
      service_details,
      billing_period_start,
      billing_period_end
    } = body;

    if (invoice_type === 'subscription') {
      if (!user_id || !subscription_id || !billing_period_start || !billing_period_end) {
        return NextResponse.json(
          { success: false, message: 'Missing required fields for subscription invoice' },
          { status: 400 }
        );
      }

      const result = await billingService.generateSubscriptionInvoice(
        user_id,
        subscription_id,
        new Date(billing_period_start),
        new Date(billing_period_end)
      );

      return NextResponse.json({
        success: result.success,
        message: result.message,
        data: result.invoice || null
      }, { status: result.success ? 201 : 400 });

    } else if (invoice_type === 'service') {
      if (!user_id || !service_type || !service_details) {
        return NextResponse.json(
          { success: false, message: 'Missing required fields for service invoice' },
          { status: 400 }
        );
      }

      const result = await billingService.generateServiceInvoice(
        user_id,
        service_type,
        service_details
      );

      return NextResponse.json({
        success: result.success,
        message: result.message,
        data: result.invoice || null
      }, { status: result.success ? 201 : 400 });

    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid invoice type. Use "subscription" or "service"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Generate invoice error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to generate invoice' 
      },
      { status: 500 }
    );
  }
}