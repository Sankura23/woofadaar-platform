import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
import { RevenueCalculator } from '@/lib/revenue-utils';

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

// GET /api/revenue/transactions - List transactions with filtering
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
    const status = searchParams.get('status') || 'all';
    const transactionType = searchParams.get('transaction_type');
    const partnerId = searchParams.get('partner_id');
    const userId = searchParams.get('user_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    const offset = (page - 1) * limit;

    // Build where clause based on user permissions
    const where: any = {};

    // Apply user-specific filters
    if (!isAdmin(decoded.userType)) {
      if (isPartner(decoded.userType)) {
        // Partners can only see their own transactions
        where.partner_id = decoded.partnerId || decoded.userId;
      } else {
        // Regular users can only see their own transactions
        where.user_id = decoded.userId;
      }
    } else {
      // Admins can filter by specific partner/user if requested
      if (partnerId) where.partner_id = partnerId;
      if (userId) where.user_id = userId;
    }

    // Apply other filters
    if (status !== 'all') where.status = status;
    if (transactionType) where.transaction_type = transactionType;
    
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at.gte = new Date(dateFrom);
      if (dateTo) where.created_at.lte = new Date(dateTo);
    }

    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          revenue_stream: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          partner: {
            select: {
              id: true,
              name: true,
              email: true,
              business_name: true
            }
          },
          dog: {
            select: {
              id: true,
              name: true,
              health_id: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.transaction.count({ where })
    ]);

    // Calculate summary statistics for the current filter
    const summaryStats = await prisma.transaction.aggregate({
      where,
      _sum: {
        amount: true,
        commission_amount: true
      },
      _count: {
        _all: true
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalCount / limit),
          total_count: totalCount,
          per_page: limit
        },
        summary: {
          total_amount: summaryStats._sum.amount || 0,
          total_commission: summaryStats._sum.commission_amount || 0,
          transaction_count: summaryStats._count._all
        }
      }
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// POST /api/revenue/transactions - Create new transaction
export async function POST(request: NextRequest) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const body = await request.json();
    
    const {
      revenue_stream_id,
      user_id,
      partner_id,
      dog_id,
      transaction_type,
      amount,
      commission_amount,
      currency = 'INR',
      payment_method,
      external_id,
      metadata
    } = body;

    // Validate required fields
    if (!revenue_stream_id || !transaction_type || !amount) {
      return NextResponse.json({
        success: false,
        message: 'Revenue stream ID, transaction type, and amount are required'
      }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Amount must be greater than 0'
      }, { status: 400 });
    }

    // Verify revenue stream exists and is active
    const revenueStream = await prisma.revenueStream.findFirst({
      where: {
        id: revenue_stream_id,
        is_active: true
      }
    });

    if (!revenueStream) {
      return NextResponse.json({
        success: false,
        message: 'Invalid or inactive revenue stream'
      }, { status: 400 });
    }

    // Permission check: only admins or involved parties can create transactions
    if (!isAdmin(decoded.userType)) {
      const isInvolvedParty = (
        (user_id && user_id === decoded.userId) ||
        (partner_id && (partner_id === decoded.partnerId || partner_id === decoded.userId))
      );

      if (!isInvolvedParty) {
        return NextResponse.json({
          success: false,
          message: 'Permission denied: can only create transactions for yourself'
        }, { status: 403 });
      }
    }

    // Validate referenced entities exist
    if (user_id) {
      const user = await prisma.user.findUnique({ where: { id: user_id } });
      if (!user) {
        return NextResponse.json({
          success: false,
          message: 'Invalid user ID'
        }, { status: 400 });
      }
    }

    if (partner_id) {
      const partner = await prisma.partner.findUnique({ where: { id: partner_id } });
      if (!partner) {
        return NextResponse.json({
          success: false,
          message: 'Invalid partner ID'
        }, { status: 400 });
      }
    }

    if (dog_id) {
      const dog = await prisma.dog.findUnique({ where: { id: dog_id } });
      if (!dog) {
        return NextResponse.json({
          success: false,
          message: 'Invalid dog ID'
        }, { status: 400 });
      }
    }

    // Calculate commission if not provided and we have a partner
    let finalCommissionAmount = commission_amount;
    if (!finalCommissionAmount && partner_id && revenueStream.commission_rate) {
      finalCommissionAmount = amount * revenueStream.commission_rate;
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        revenue_stream_id,
        user_id: user_id || null,
        partner_id: partner_id || null,
        dog_id: dog_id || null,
        transaction_type,
        amount: parseFloat(amount),
        commission_amount: finalCommissionAmount ? parseFloat(finalCommissionAmount) : null,
        currency,
        status: 'pending',
        payment_method: payment_method || null,
        external_id: external_id || null,
        metadata: metadata || null
      },
      include: {
        revenue_stream: true,
        user: {
          select: { id: true, name: true, email: true }
        },
        partner: {
          select: { id: true, name: true, business_name: true }
        },
        dog: {
          select: { id: true, name: true, health_id: true }
        }
      }
    });

    console.log(`New transaction created: ${transaction.id} (${transaction_type}, ₹${amount})`);

    return NextResponse.json({
      success: true,
      message: 'Transaction created successfully',
      data: {
        transaction
      }
    });

  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// PUT /api/revenue/transactions - Update transaction status
export async function PUT(request: NextRequest) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const body = await request.json();
    
    const {
      transaction_id,
      status,
      external_id,
      processed_at,
      metadata
    } = body;

    if (!transaction_id) {
      return NextResponse.json({
        success: false,
        message: 'Transaction ID is required'
      }, { status: 400 });
    }

    // Find the transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transaction_id },
      include: {
        user: true,
        partner: true
      }
    });

    if (!transaction) {
      return NextResponse.json({
        success: false,
        message: 'Transaction not found'
      }, { status: 404 });
    }

    // Permission check: only admins or involved parties can update
    if (!isAdmin(decoded.userType)) {
      const isInvolvedParty = (
        (transaction.user_id && transaction.user_id === decoded.userId) ||
        (transaction.partner_id && transaction.partner_id === decoded.userId)
      );

      if (!isInvolvedParty) {
        return NextResponse.json({
          success: false,
          message: 'Permission denied: can only update your own transactions'
        }, { status: 403 });
      }
    }

    // Validate status transition
    const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid transaction status'
      }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (external_id !== undefined) updateData.external_id = external_id;
    if (processed_at !== undefined) updateData.processed_at = processed_at ? new Date(processed_at) : null;
    if (metadata !== undefined) updateData.metadata = metadata;

    // Auto-set processed_at if status is being changed to completed
    if (status === 'completed' && !processed_at) {
      updateData.processed_at = new Date();
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id: transaction_id },
      data: updateData,
      include: {
        revenue_stream: true,
        user: {
          select: { id: true, name: true, email: true }
        },
        partner: {
          select: { id: true, name: true, business_name: true }
        },
        dog: {
          select: { id: true, name: true, health_id: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Transaction updated successfully',
      data: {
        transaction: updatedTransaction
      }
    });

  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}