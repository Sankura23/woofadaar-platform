import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
import { getDateRange } from '@/lib/revenue-utils';

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

// GET /api/revenue/records - Get revenue records with analytics
export async function GET(request: NextRequest) {
  try {
    const authResult = verifyAdminToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const revenueStreamId = searchParams.get('revenue_stream_id');
    const period = (searchParams.get('period') || 'month') as 'today' | 'week' | 'month' | 'quarter' | 'year';
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (revenueStreamId) where.revenue_stream_id = revenueStreamId;

    // Apply date filtering
    if (dateFrom || dateTo) {
      where.record_date = {};
      if (dateFrom) where.record_date.gte = new Date(dateFrom);
      if (dateTo) where.record_date.lte = new Date(dateTo);
    } else {
      // Use period-based filtering if no specific dates provided
      const { startDate, endDate } = getDateRange(period);
      where.record_date = {
        gte: startDate,
        lte: endDate
      };
    }

    const [revenueRecords, totalCount] = await Promise.all([
      prisma.revenueRecord.findMany({
        where,
        include: {
          revenue_stream: {
            select: {
              id: true,
              name: true,
              description: true,
              is_active: true
            }
          }
        },
        orderBy: { record_date: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.revenueRecord.count({ where })
    ]);

    // Calculate aggregate statistics
    const aggregateStats = await prisma.revenueRecord.aggregate({
      where,
      _sum: {
        total_revenue: true,
        total_transactions: true,
        commission_paid: true
      },
      _avg: {
        average_transaction_value: true,
        profit_margin: true
      }
    });

    // Get revenue stream breakdown
    const revenueStreamBreakdown = await prisma.revenueRecord.groupBy({
      by: ['revenue_stream_id'],
      where,
      _sum: {
        total_revenue: true,
        total_transactions: true
      },
      _avg: {
        average_transaction_value: true
      }
    });

    // Enhance breakdown with stream names
    const enhancedBreakdown = await Promise.all(
      revenueStreamBreakdown.map(async (item) => {
        const stream = await prisma.revenueStream.findUnique({
          where: { id: item.revenue_stream_id },
          select: { name: true, description: true }
        });
        return {
          revenue_stream_id: item.revenue_stream_id,
          revenue_stream_name: stream?.name || 'Unknown',
          revenue_stream_description: stream?.description,
          total_revenue: item._sum.total_revenue || 0,
          total_transactions: item._sum.total_transactions || 0,
          avg_transaction_value: item._avg.average_transaction_value || 0
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        revenue_records: revenueRecords,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalCount / limit),
          total_count: totalCount,
          per_page: limit
        },
        analytics: {
          summary: {
            total_revenue: aggregateStats._sum.total_revenue || 0,
            total_transactions: aggregateStats._sum.total_transactions || 0,
            total_commission_paid: aggregateStats._sum.commission_paid || 0,
            avg_transaction_value: aggregateStats._avg.average_transaction_value || 0,
            avg_profit_margin: aggregateStats._avg.profit_margin || 0
          },
          revenue_stream_breakdown: enhancedBreakdown,
          period_analyzed: {
            period,
            date_from: dateFrom,
            date_to: dateTo
          }
        }
      }
    });

  } catch (error) {
    console.error('Error fetching revenue records:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// POST /api/revenue/records - Generate revenue record for a period
export async function POST(request: NextRequest) {
  try {
    const authResult = verifyAdminToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const body = await request.json();
    
    const {
      revenue_stream_id,
      period_start,
      period_end,
      force_regenerate = false
    } = body;

    // Validate required fields
    if (!revenue_stream_id || !period_start || !period_end) {
      return NextResponse.json({
        success: false,
        message: 'Revenue stream ID, period start, and period end are required'
      }, { status: 400 });
    }

    const periodStartDate = new Date(period_start);
    const periodEndDate = new Date(period_end);

    if (periodStartDate >= periodEndDate) {
      return NextResponse.json({
        success: false,
        message: 'Period start must be before period end'
      }, { status: 400 });
    }

    // Check if revenue stream exists
    const revenueStream = await prisma.revenueStream.findUnique({
      where: { id: revenue_stream_id }
    });

    if (!revenueStream) {
      return NextResponse.json({
        success: false,
        message: 'Revenue stream not found'
      }, { status: 404 });
    }

    // Check if record already exists for this period
    const existingRecord = await prisma.revenueRecord.findFirst({
      where: {
        revenue_stream_id,
        period_start: periodStartDate,
        period_end: periodEndDate
      }
    });

    if (existingRecord && !force_regenerate) {
      return NextResponse.json({
        success: false,
        message: 'Revenue record already exists for this period. Use force_regenerate=true to recreate.'
      }, { status: 409 });
    }

    // Calculate revenue metrics for the period
    const transactions = await prisma.transaction.findMany({
      where: {
        revenue_stream_id,
        status: 'completed',
        processed_at: {
          gte: periodStartDate,
          lte: periodEndDate
        }
      }
    });

    const totalRevenue = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalTransactions = transactions.length;
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const commissionPaid = transactions.reduce((sum, tx) => sum + (tx.commission_amount || 0), 0);
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - commissionPaid) / totalRevenue) : 0;

    const recordData = {
      revenue_stream_id,
      period_start: periodStartDate,
      period_end: periodEndDate,
      total_revenue: totalRevenue,
      total_transactions: totalTransactions,
      average_transaction_value: averageTransactionValue,
      commission_paid: commissionPaid,
      profit_margin: profitMargin,
      currency: 'INR',
      metadata: {
        generated_by: decoded.userId,
        generation_method: 'api_request',
        transaction_ids: transactions.map(tx => tx.id),
        calculation_timestamp: new Date().toISOString()
      }
    };

    let revenueRecord;

    if (existingRecord && force_regenerate) {
      // Update existing record
      revenueRecord = await prisma.revenueRecord.update({
        where: { id: existingRecord.id },
        data: recordData,
        include: {
          revenue_stream: {
            select: {
              name: true,
              description: true
            }
          }
        }
      });
    } else {
      // Create new record
      revenueRecord = await prisma.revenueRecord.create({
        data: recordData,
        include: {
          revenue_stream: {
            select: {
              name: true,
              description: true
            }
          }
        }
      });
    }

    console.log(`Revenue record ${existingRecord ? 'updated' : 'created'}: ${revenueRecord.id} for ${revenueStream.name} (₹${totalRevenue}, ${totalTransactions} transactions)`);

    return NextResponse.json({
      success: true,
      message: `Revenue record ${existingRecord ? 'updated' : 'created'} successfully`,
      data: {
        revenue_record: revenueRecord,
        calculation_summary: {
          period: `${periodStartDate.toISOString()} to ${periodEndDate.toISOString()}`,
          transactions_analyzed: totalTransactions,
          total_revenue: totalRevenue,
          commission_paid: commissionPaid,
          profit_margin_percentage: Math.round(profitMargin * 100)
        }
      }
    });

  } catch (error) {
    console.error('Error generating revenue record:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// DELETE /api/revenue/records - Delete revenue record
export async function DELETE(request: NextRequest) {
  try {
    const authResult = verifyAdminToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('record_id');

    if (!recordId) {
      return NextResponse.json({
        success: false,
        message: 'Revenue record ID is required'
      }, { status: 400 });
    }

    // Check if record exists
    const revenueRecord = await prisma.revenueRecord.findUnique({
      where: { id: recordId },
      include: {
        revenue_stream: {
          select: { name: true }
        }
      }
    });

    if (!revenueRecord) {
      return NextResponse.json({
        success: false,
        message: 'Revenue record not found'
      }, { status: 404 });
    }

    await prisma.revenueRecord.delete({
      where: { id: recordId }
    });

    console.log(`Revenue record deleted: ${recordId} for ${revenueRecord.revenue_stream.name}`);

    return NextResponse.json({
      success: true,
      message: 'Revenue record deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting revenue record:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}