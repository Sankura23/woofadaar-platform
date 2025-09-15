import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
import { REVENUE_STREAMS } from '@/lib/revenue-config';

const verifyAdminToken = (authHeader: string | null) => {
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Authentication required', status: 401 };
  }
  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    if (!decoded.userId || decoded.userType !== 'admin') {
      return { error: 'Admin access required', status: 403 };
    }
    return { decoded };
  } catch (error) {
    return { error: 'Invalid authentication token', status: 401 };
  }
};

// GET /api/revenue/streams - List all revenue streams
export async function GET(request: NextRequest) {
  try {
    const authResult = verifyAdminToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('active');
    const includeStats = searchParams.get('include_stats') === 'true';

    const where: any = {};
    if (isActive !== null) {
      where.is_active = isActive === 'true';
    }

    const revenueStreams = await prisma.revenueStream.findMany({
      where,
      include: {
        _count: includeStats ? {
          select: {
            transactions: true,
            revenue_records: true
          }
        } : false,
        transactions: includeStats ? {
          select: {
            amount: true,
            status: true
          },
          where: {
            status: 'completed',
            created_at: {
              gte: new Date(new Date().setDate(new Date().getDate() - 30))
            }
          }
        } : false
      },
      orderBy: { created_at: 'desc' }
    });

    // Calculate statistics if requested
    const streamsWithStats = includeStats ? revenueStreams.map(stream => {
      const completedTransactions = stream.transactions || [];
      const totalRevenue = completedTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      const avgTransaction = completedTransactions.length > 0 ? totalRevenue / completedTransactions.length : 0;

      return {
        ...stream,
        statistics: {
          total_transactions: stream._count?.transactions || 0,
          total_revenue: totalRevenue,
          avg_transaction_value: avgTransaction,
          revenue_records_count: stream._count?.revenue_records || 0
        },
        transactions: undefined, // Remove raw transactions from response
        _count: undefined
      };
    }) : revenueStreams;

    return NextResponse.json({
      success: true,
      data: {
        revenue_streams: streamsWithStats,
        total_count: revenueStreams.length
      }
    });

  } catch (error) {
    console.error('Error fetching revenue streams:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// POST /api/revenue/streams - Create new revenue stream
export async function POST(request: NextRequest) {
  try {
    const authResult = verifyAdminToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const {
      name,
      description,
      is_active = true,
      commission_rate,
      base_price,
      currency = 'INR'
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({
        success: false,
        message: 'Revenue stream name is required'
      }, { status: 400 });
    }

    // Check for duplicate name
    const existingStream = await prisma.revenueStream.findFirst({
      where: { name: name.toLowerCase() }
    });

    if (existingStream) {
      return NextResponse.json({
        success: false,
        message: 'Revenue stream with this name already exists'
      }, { status: 409 });
    }

    // Validate commission rate
    if (commission_rate !== null && commission_rate !== undefined) {
      if (commission_rate < 0 || commission_rate > 1) {
        return NextResponse.json({
          success: false,
          message: 'Commission rate must be between 0 and 1 (0-100%)'
        }, { status: 400 });
      }
    }

    const revenueStream = await prisma.revenueStream.create({
      data: {
        name: name.toLowerCase(),
        description: description?.trim() || null,
        is_active,
        commission_rate: commission_rate || null,
        base_price: base_price || null,
        currency
      }
    });

    console.log(`New revenue stream created: ${name} by admin ${authResult.decoded.userId}`);

    return NextResponse.json({
      success: true,
      message: 'Revenue stream created successfully',
      data: {
        revenue_stream: revenueStream
      }
    });

  } catch (error) {
    console.error('Error creating revenue stream:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// PUT /api/revenue/streams - Update revenue stream
export async function PUT(request: NextRequest) {
  try {
    const authResult = verifyAdminToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const {
      id,
      name,
      description,
      is_active,
      commission_rate,
      base_price,
      currency
    } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'Revenue stream ID is required'
      }, { status: 400 });
    }

    // Check if revenue stream exists
    const existingStream = await prisma.revenueStream.findUnique({
      where: { id }
    });

    if (!existingStream) {
      return NextResponse.json({
        success: false,
        message: 'Revenue stream not found'
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.toLowerCase();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (commission_rate !== undefined) updateData.commission_rate = commission_rate;
    if (base_price !== undefined) updateData.base_price = base_price;
    if (currency !== undefined) updateData.currency = currency;

    // Validate commission rate
    if (updateData.commission_rate !== undefined && updateData.commission_rate !== null) {
      if (updateData.commission_rate < 0 || updateData.commission_rate > 1) {
        return NextResponse.json({
          success: false,
          message: 'Commission rate must be between 0 and 1 (0-100%)'
        }, { status: 400 });
      }
    }

    const updatedStream = await prisma.revenueStream.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message: 'Revenue stream updated successfully',
      data: {
        revenue_stream: updatedStream
      }
    });

  } catch (error) {
    console.error('Error updating revenue stream:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}