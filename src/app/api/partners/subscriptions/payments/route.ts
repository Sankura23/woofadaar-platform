import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
import { getDateRange } from '@/lib/revenue-utils';

const verifyToken = (authHeader: string | null) => {
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Authentication required', status: 401 };
  }
  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    if (!decoded.userId) {
      return { error: 'Invalid authentication token', status: 401 };
    }
    return { decoded };
  } catch (error) {
    return { error: 'Invalid authentication token', status: 401 };
  }
};

const isAdmin = (userType: string) => userType === 'admin';
const isPartner = (userType: string) => userType === 'partner';

// GET /api/partners/subscriptions/payments - Get subscription payments with filtering
export async function GET(request: NextRequest) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const subscriptionId = searchParams.get('subscription_id');
    const partnerId = searchParams.get('partner_id');
    const status = searchParams.get('status');
    const period = (searchParams.get('period') || 'month') as 'today' | 'week' | 'month' | 'quarter' | 'year';
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Apply user-specific filters
    if (!isAdmin(decoded.userType)) {
      if (isPartner(decoded.userType)) {
        // Partners can only see their own subscription payments
        // First find their subscription
        const partnerSubscription = await prisma.partnerSubscription.findUnique({
          where: { partner_id: decoded.userId }
        });
        if (partnerSubscription) {
          where.subscription_id = partnerSubscription.id;
        } else {
          // Partner has no subscription, return empty results
          return NextResponse.json({
            success: true,
            data: {
              payments: [],
              pagination: { current_page: 1, total_pages: 0, total_count: 0, per_page: limit },
              analytics: { total_amount: 0, payment_count: 0 }
            }
          });
        }
      } else {
        return NextResponse.json({
          success: false,
          message: 'Access denied: Only partners and admins can view subscription payments'
        }, { status: 403 });
      }
    } else {
      // Admin filters
      if (subscriptionId) where.subscription_id = subscriptionId;
      if (partnerId) {
        const partnerSubscription = await prisma.partnerSubscription.findUnique({
          where: { partner_id: partnerId }
        });
        if (partnerSubscription) where.subscription_id = partnerSubscription.id;
      }
    }

    // Apply other filters
    if (status) where.status = status;

    // Apply date filtering
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at.gte = new Date(dateFrom);
      if (dateTo) where.created_at.lte = new Date(dateTo);
    } else if (period !== 'all') {
      const { startDate, endDate } = getDateRange(period);
      where.created_at = {
        gte: startDate,
        lte: endDate
      };
    }

    const [payments, totalCount] = await Promise.all([
      prisma.subscriptionPayment.findMany({
        where,
        include: {
          partner_subscription: {
            include: {
              partner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  business_name: true,
                  partner_type: true
                }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.subscriptionPayment.count({ where })
    ]);

    // Calculate summary statistics
    const summaryStats = await prisma.subscriptionPayment.aggregate({
      where,
      _sum: {
        amount: true
      },
      _count: {
        _all: true
      },
      _avg: {
        amount: true
      }
    });

    // Payment status breakdown
    const statusBreakdown = await prisma.subscriptionPayment.groupBy({
      by: ['status'],
      where,
      _sum: {
        amount: true
      },
      _count: {
        _all: true
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        payments,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalCount / limit),
          total_count: totalCount,
          per_page: limit
        },
        analytics: {
          total_amount: summaryStats._sum.amount || 0,
          payment_count: summaryStats._count._all,
          average_payment: summaryStats._avg.amount || 0,
          status_breakdown: statusBreakdown
        }
      }
    });

  } catch (error) {
    console.error('Error fetching subscription payments:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// POST /api/partners/subscriptions/payments - Record a subscription payment
export async function POST(request: NextRequest) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    
    // Only admins can manually record subscription payments
    if (!isAdmin(decoded.userType)) {
      return NextResponse.json({
        success: false,
        message: 'Admin access required to record subscription payments'
      }, { status: 403 });
    }

    const body = await request.json();
    
    const {
      subscription_id,
      amount,
      currency = 'INR',
      payment_method = 'manual',
      external_transaction_id,
      period_start,
      period_end,
      metadata = {},
      auto_process = true
    } = body;

    // Validate required fields
    if (!subscription_id || !amount || !period_start || !period_end) {
      return NextResponse.json({
        success: false,
        message: 'Subscription ID, amount, period start, and period end are required'
      }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Payment amount must be greater than 0'
      }, { status: 400 });
    }

    // Verify subscription exists
    const subscription = await prisma.partnerSubscription.findUnique({
      where: { id: subscription_id },
      include: {
        partner: {
          select: {
            name: true,
            business_name: true,
            email: true
          }
        }
      }
    });

    if (!subscription) {
      return NextResponse.json({
        success: false,
        message: 'Subscription not found'
      }, { status: 404 });
    }

    // Validate period dates
    const periodStartDate = new Date(period_start);
    const periodEndDate = new Date(period_end);

    if (periodStartDate >= periodEndDate) {
      return NextResponse.json({
        success: false,
        message: 'Period start must be before period end'
      }, { status: 400 });
    }

    // Check for duplicate payments for the same period
    const existingPayment = await prisma.subscriptionPayment.findFirst({
      where: {
        subscription_id,
        period_start: periodStartDate,
        period_end: periodEndDate
      }
    });

    if (existingPayment) {
      return NextResponse.json({
        success: false,
        message: 'Payment already recorded for this period',
        data: { existing_payment: existingPayment }
      }, { status: 409 });
    }

    // Create subscription payment record
    const payment = await prisma.subscriptionPayment.create({
      data: {
        subscription_id,
        payment_id: external_transaction_id || `manual_${Date.now()}`,
        amount: parseFloat(amount.toString()),
        currency,
        status: auto_process ? 'completed' : 'pending',
        payment_method,
        period_start: periodStartDate,
        period_end: periodEndDate,
        processed_at: auto_process ? new Date() : null,
        metadata: {
          recorded_by: decoded.userId,
          recording_method: 'manual',
          ...metadata
        }
      },
      include: {
        partner_subscription: {
          include: {
            partner: {
              select: {
                name: true,
                business_name: true,
                email: true
              }
            }
          }
        }
      }
    });

    // If auto-processing, update subscription period
    if (auto_process) {
      await prisma.partnerSubscription.update({
        where: { id: subscription_id },
        data: {
          current_period_start: periodStartDate,
          current_period_end: periodEndDate,
          status: 'active',
          updated_at: new Date()
        }
      });
    }

    console.log(`Subscription payment recorded: ${payment.id} (${subscription.partner.business_name || subscription.partner.name} - ₹${amount})`);

    return NextResponse.json({
      success: true,
      message: 'Subscription payment recorded successfully',
      data: {
        payment,
        subscription_updated: auto_process
      }
    });

  } catch (error) {
    console.error('Error recording subscription payment:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// PUT /api/partners/subscriptions/payments - Update payment status or details
export async function PUT(request: NextRequest) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    
    // Only admins can update subscription payments
    if (!isAdmin(decoded.userType)) {
      return NextResponse.json({
        success: false,
        message: 'Admin access required to update subscription payments'
      }, { status: 403 });
    }

    const body = await request.json();
    const { payment_id, status, external_transaction_id, metadata } = body;

    if (!payment_id) {
      return NextResponse.json({
        success: false,
        message: 'Payment ID is required'
      }, { status: 400 });
    }

    // Find payment
    const payment = await prisma.subscriptionPayment.findUnique({
      where: { id: payment_id },
      include: {
        partner_subscription: {
          include: {
            partner: {
              select: { name: true, business_name: true }
            }
          }
        }
      }
    });

    if (!payment) {
      return NextResponse.json({
        success: false,
        message: 'Payment not found'
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    if (status !== undefined) {
      const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({
          success: false,
          message: 'Invalid payment status'
        }, { status: 400 });
      }
      updateData.status = status;
      
      // Set processed_at if status is completed
      if (status === 'completed' && !payment.processed_at) {
        updateData.processed_at = new Date();
      }
    }
    
    if (external_transaction_id !== undefined) updateData.payment_id = external_transaction_id;
    if (metadata !== undefined) updateData.metadata = { ...payment.metadata, ...metadata };

    // Update payment
    const updatedPayment = await prisma.subscriptionPayment.update({
      where: { id: payment_id },
      data: updateData,
      include: {
        partner_subscription: {
          include: {
            partner: {
              select: { name: true, business_name: true }
            }
          }
        }
      }
    });

    console.log(`Subscription payment updated: ${payment_id} (${payment.partner_subscription.partner.business_name || payment.partner_subscription.partner.name})`);

    return NextResponse.json({
      success: true,
      message: 'Subscription payment updated successfully',
      data: {
        payment: updatedPayment
      }
    });

  } catch (error) {
    console.error('Error updating subscription payment:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}