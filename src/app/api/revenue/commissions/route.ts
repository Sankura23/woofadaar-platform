import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

interface DecodedToken {
  userId?: string;
  partnerId?: string;
  email: string;
  userType?: string;
}

async function verifyToken(request: NextRequest): Promise<{ userId?: string; partnerId?: string; email?: string; isAdmin?: boolean } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    
    const isAdmin = decoded.email === 'admin@woofadaar.com' || decoded.userType === 'admin';
    
    return {
      userId: decoded.userId,
      partnerId: decoded.partnerId,
      email: decoded.email,
      isAdmin
    };
  } catch (error) {
    return null;
  }
}

// Helper function to calculate commission amount
function calculateCommission(baseAmount: number, commissionRate: number): number {
  return Math.round((baseAmount * commissionRate / 100) * 100) / 100;
}

// Helper function to determine commission type based on transaction
function determineCommissionType(transactionData: any): string {
  if (transactionData.appointment_id) return 'appointment';
  if (transactionData.referral_user_id) return 'referral';
  if (transactionData.subscription_related) return 'subscription';
  return 'other';
}

// Helper function to generate commission reference
function generateCommissionReference(partnerId: string, type: string): string {
  const timestamp = Date.now().toString(36);
  const partnerCode = partnerId.substring(0, 6).toUpperCase();
  const typeCode = type.substring(0, 3).toUpperCase();
  return `COM-${partnerCode}-${typeCode}-${timestamp}`;
}

// POST /api/revenue/commissions - Create commission earning record
export async function POST(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth || (!auth.isAdmin && !auth.partnerId)) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized - Admin or Partner authentication required' 
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      partner_id,
      user_id,
      appointment_id,
      commission_type,
      base_amount,
      commission_rate,
      description,
      reference_id,
      metadata = {}
    } = body;

    // Validation
    if (!partner_id || !user_id || !base_amount || !commission_rate) {
      return NextResponse.json({
        success: false,
        message: 'Required fields: partner_id, user_id, base_amount, commission_rate'
      }, { status: 400 });
    }

    if (base_amount <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Base amount must be greater than 0'
      }, { status: 400 });
    }

    if (commission_rate < 0 || commission_rate > 50) {
      return NextResponse.json({
        success: false,
        message: 'Commission rate must be between 0% and 50%'
      }, { status: 400 });
    }

    // Non-admin partners can only create commissions for themselves
    if (!auth.isAdmin && auth.partnerId !== partner_id) {
      return NextResponse.json({
        success: false,
        message: 'Partners can only create commissions for themselves'
      }, { status: 403 });
    }

    // Verify partner exists and is active
    const partner = await prisma.partner.findUnique({
      where: { id: partner_id },
      select: {
        id: true,
        name: true,
        business_name: true,
        status: true,
        verified: true,
        commission_rate: true,
        partnership_tier: true
      }
    });

    if (!partner) {
      return NextResponse.json({
        success: false,
        message: 'Partner not found'
      }, { status: 404 });
    }

    if (partner.status !== 'approved' || !partner.verified) {
      return NextResponse.json({
        success: false,
        message: 'Partner is not approved for commission earnings'
      }, { status: 400 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: user_id },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // If appointment_id provided, verify it exists and belongs to the partner
    if (appointment_id) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointment_id },
        select: {
          id: true,
          partner_id: true,
          user_id: true,
          consultation_fee: true,
          status: true
        }
      });

      if (!appointment) {
        return NextResponse.json({
          success: false,
          message: 'Appointment not found'
        }, { status: 404 });
      }

      if (appointment.partner_id !== partner_id) {
        return NextResponse.json({
          success: false,
          message: 'Appointment does not belong to the specified partner'
        }, { status: 400 });
      }

      if (appointment.user_id !== user_id) {
        return NextResponse.json({
          success: false,
          message: 'Appointment does not belong to the specified user'
        }, { status: 400 });
      }
    }

    // Calculate commission amount
    const commissionAmount = calculateCommission(base_amount, commission_rate);

    // Determine commission type if not provided
    const finalCommissionType = commission_type || determineCommissionType({
      appointment_id,
      referral_user_id: metadata.referral_user_id,
      subscription_related: metadata.subscription_related
    });

    // Generate reference if not provided
    const commissionReference = reference_id || generateCommissionReference(partner_id, finalCommissionType);

    // Create commission earning record
    const commissionEarning = await prisma.commissionEarning.create({
      data: {
        partner_id,
        user_id,
        appointment_id: appointment_id || null,
        commission_type: finalCommissionType,
        base_amount,
        commission_rate,
        commission_amount: commissionAmount,
        status: 'pending'
      }
    });

    // Update partner's monthly revenue (simplified - in production, calculate properly)
    await prisma.partner.update({
      where: { id: partner_id },
      data: {
        monthly_revenue: {
          increment: commissionAmount
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Commission earning created successfully',
      data: {
        commission: {
          id: commissionEarning.id,
          partner: {
            id: partner.id,
            name: partner.name,
            business_name: partner.business_name
          },
          user: {
            id: user.id,
            name: user.name,
            email: user.email
          },
          commission_type: finalCommissionType,
          base_amount: base_amount,
          commission_rate: commission_rate,
          commission_amount: commissionAmount,
          status: commissionEarning.status,
          reference: commissionReference,
          created_at: commissionEarning.created_at
        },
        calculation: {
          base_amount: base_amount,
          commission_rate: `${commission_rate}%`,
          commission_amount: commissionAmount,
          formula: `${base_amount} × ${commission_rate}% = ${commissionAmount}`
        }
      }
    });

  } catch (error) {
    console.error('Commission creation error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while creating commission'
    }, { status: 500 });
  }
}

// GET /api/revenue/commissions - Get commission earnings with analytics
export async function GET(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized' 
    }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const partner_id = searchParams.get('partner_id');
    const user_id = searchParams.get('user_id');
    const commission_type = searchParams.get('commission_type');
    const status = searchParams.get('status');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const view = searchParams.get('view') || 'list'; // list, analytics, summary

    // Build where clause
    let whereClause: any = {};

    // Access control
    if (!auth.isAdmin) {
      if (auth.partnerId) {
        // Partners can only see their own commissions
        whereClause.partner_id = auth.partnerId;
      } else if (auth.userId) {
        // Users can only see commissions related to them
        whereClause.user_id = auth.userId;
      } else {
        return NextResponse.json({
          success: false,
          message: 'Access denied'
        }, { status: 403 });
      }
    } else {
      // Admin can filter by partner_id or user_id
      if (partner_id) whereClause.partner_id = partner_id;
      if (user_id) whereClause.user_id = user_id;
    }

    // Additional filters
    if (commission_type) whereClause.commission_type = commission_type;
    if (status) whereClause.status = status;

    // Date range filter
    if (start_date || end_date) {
      whereClause.created_at = {};
      if (start_date) whereClause.created_at.gte = new Date(start_date);
      if (end_date) whereClause.created_at.lte = new Date(end_date);
    }

    if (view === 'analytics' || view === 'summary') {
      // Get analytics data
      const [commissions, totalStats] = await Promise.all([
        prisma.commissionEarning.findMany({
          where: whereClause,
          include: {
            partner: {
              select: {
                id: true,
                name: true,
                business_name: true,
                partner_type: true,
                partnership_tier: true
              }
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            appointment: {
              select: {
                id: true,
                appointment_date: true,
                service_type: true,
                consultation_fee: true
              }
            }
          },
          orderBy: { created_at: 'desc' }
        }),
        prisma.commissionEarning.aggregate({
          where: whereClause,
          _sum: {
            base_amount: true,
            commission_amount: true
          },
          _count: {
            id: true
          },
          _avg: {
            commission_rate: true,
            commission_amount: true
          }
        })
      ]);

      // Calculate analytics
      const analytics = {
        total_commissions: totalStats._count.id,
        total_base_amount: totalStats._sum.base_amount || 0,
        total_commission_amount: totalStats._sum.commission_amount || 0,
        average_commission_rate: Math.round((totalStats._avg.commission_rate || 0) * 10) / 10,
        average_commission_amount: Math.round((totalStats._avg.commission_amount || 0) * 100) / 100,

        // Group by commission type
        by_commission_type: commissions.reduce((acc, comm) => {
          if (!acc[comm.commission_type]) {
            acc[comm.commission_type] = {
              count: 0,
              total_amount: 0,
              avg_amount: 0
            };
          }
          acc[comm.commission_type].count += 1;
          acc[comm.commission_type].total_amount += comm.commission_amount;
          acc[comm.commission_type].avg_amount = 
            Math.round((acc[comm.commission_type].total_amount / acc[comm.commission_type].count) * 100) / 100;
          return acc;
        }, {} as any),

        // Group by status
        by_status: commissions.reduce((acc, comm) => {
          if (!acc[comm.status]) {
            acc[comm.status] = { count: 0, total_amount: 0 };
          }
          acc[comm.status].count += 1;
          acc[comm.status].total_amount += comm.commission_amount;
          return acc;
        }, {} as any),

        // Monthly trends (last 12 months)
        monthly_trends: [],

        // Top performers (if admin view)
        top_partners: auth.isAdmin ? commissions.reduce((acc, comm) => {
          const partnerId = comm.partner.id;
          if (!acc[partnerId]) {
            acc[partnerId] = {
              partner: comm.partner,
              total_commissions: 0,
              commission_count: 0
            };
          }
          acc[partnerId].total_commissions += comm.commission_amount;
          acc[partnerId].commission_count += 1;
          return acc;
        }, {} as any) : null
      };

      // Calculate monthly trends
      const monthlyData = commissions.reduce((acc, comm) => {
        const month = comm.created_at.toISOString().substring(0, 7); // YYYY-MM
        if (!acc[month]) {
          acc[month] = { count: 0, total_amount: 0 };
        }
        acc[month].count += 1;
        acc[month].total_amount += comm.commission_amount;
        return acc;
      }, {} as any);

      analytics.monthly_trends = Object.keys(monthlyData)
        .sort()
        .slice(-12) // Last 12 months
        .map(month => ({
          month,
          count: monthlyData[month].count,
          total_amount: Math.round(monthlyData[month].total_amount * 100) / 100,
          avg_amount: Math.round((monthlyData[month].total_amount / monthlyData[month].count) * 100) / 100
        }));

      if (view === 'summary') {
        return NextResponse.json({
          success: true,
          data: {
            summary: analytics,
            period: {
              start_date: start_date || 'all_time',
              end_date: end_date || 'present',
              total_records: commissions.length
            }
          }
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          analytics,
          recent_commissions: commissions.slice(0, 10).map(comm => ({
            id: comm.id,
            partner: comm.partner,
            user: comm.user,
            commission_type: comm.commission_type,
            base_amount: comm.base_amount,
            commission_rate: comm.commission_rate,
            commission_amount: comm.commission_amount,
            status: comm.status,
            created_at: comm.created_at,
            appointment: comm.appointment
          })),
          filters_applied: {
            partner_id,
            user_id,
            commission_type,
            status,
            start_date,
            end_date
          }
        }
      });
    }

    // Regular list view
    const [commissions, totalCount] = await Promise.all([
      prisma.commissionEarning.findMany({
        where: whereClause,
        include: {
          partner: {
            select: {
              id: true,
              name: true,
              business_name: true,
              partner_type: true,
              partnership_tier: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          appointment: {
            select: {
              id: true,
              appointment_date: true,
              service_type: true,
              consultation_fee: true,
              status: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.commissionEarning.count({ where: whereClause })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        commissions: commissions.map(comm => ({
          id: comm.id,
          partner: comm.partner,
          user: comm.user,
          commission_type: comm.commission_type,
          base_amount: comm.base_amount,
          commission_rate: comm.commission_rate,
          commission_amount: comm.commission_amount,
          status: comm.status,
          paid_at: comm.paid_at,
          created_at: comm.created_at,
          appointment: comm.appointment
        })),
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalCount / limit),
          total_count: totalCount,
          per_page: limit
        },
        filters: {
          partner_id,
          user_id,
          commission_type,
          status,
          start_date,
          end_date
        }
      }
    });

  } catch (error) {
    console.error('Commission fetch error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while fetching commissions'
    }, { status: 500 });
  }
}

// PUT /api/revenue/commissions - Update commission status (admin only)
export async function PUT(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth || !auth.isAdmin) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized - Admin access required' 
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { commission_ids, status, notes } = body;

    if (!commission_ids || !Array.isArray(commission_ids) || commission_ids.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'commission_ids array is required'
      }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({
        success: false,
        message: 'status is required'
      }, { status: 400 });
    }

    const validStatuses = ['pending', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({
        success: false,
        message: `Invalid status. Valid statuses: ${validStatuses.join(', ')}`
      }, { status: 400 });
    }

    // Update commission records
    const updateData: any = {
      status,
      updated_at: new Date()
    };

    if (status === 'paid') {
      updateData.paid_at = new Date();
    }

    const updatedCommissions = await prisma.commissionEarning.updateMany({
      where: {
        id: { in: commission_ids }
      },
      data: updateData
    });

    // Log the action
    console.log('Commission status update:', {
      admin_email: auth.email,
      commission_ids,
      old_status: 'various',
      new_status: status,
      notes,
      updated_count: updatedCommissions.count,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `${updatedCommissions.count} commission(s) updated to ${status} status`,
      data: {
        updated_count: updatedCommissions.count,
        commission_ids,
        new_status: status,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Commission update error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while updating commissions'
    }, { status: 500 });
  }
}