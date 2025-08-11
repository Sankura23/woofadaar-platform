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

// Helper function to calculate commission based on partnership tier and type
function calculateCommission(baseAmount: number, partnershipTier: string, commissionType: string): { rate: number; amount: number } {
  let baseRate = 0.10; // 10% default
  
  // Tier-based rates
  switch (partnershipTier) {
    case 'premium':
      baseRate = 0.15; // 15%
      break;
    case 'enterprise':
      baseRate = 0.20; // 20%
      break;
    default:
      baseRate = 0.10; // 10% for basic
  }
  
  // Commission type modifiers
  const typeModifiers = {
    'appointment': 1.0,        // Standard rate
    'referral': 1.5,          // 50% bonus for referrals
    'subscription': 0.8,       // Reduced rate for recurring
    'corporate': 1.2,         // 20% bonus for corporate clients
    'health_verification': 0.5, // Lower rate for verification services
    'training_package': 1.3    // Bonus for training packages
  };
  
  const modifier = typeModifiers[commissionType as keyof typeof typeModifiers] || 1.0;
  const finalRate = baseRate * modifier;
  const commissionAmount = baseAmount * finalRate;
  
  return {
    rate: Math.round(finalRate * 100), // Return as percentage
    amount: Math.round(commissionAmount * 100) / 100 // Round to 2 decimal places
  };
}

// Helper function to generate commission for appointment
async function generateAppointmentCommission(appointment: any, partner: any) {
  if (!appointment.consultation_fee || appointment.consultation_fee <= 0) {
    return null;
  }
  
  const commission = calculateCommission(
    appointment.consultation_fee,
    partner.partnership_tier,
    'appointment'
  );
  
  return {
    partner_id: partner.id,
    user_id: appointment.user_id,
    appointment_id: appointment.id,
    commission_type: 'appointment',
    base_amount: appointment.consultation_fee,
    commission_rate: commission.rate / 100, // Store as decimal
    commission_amount: commission.amount,
    status: 'pending'
  };
}

// POST /api/revenue/commission-tracking - Create or update commission records
export async function POST(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized' 
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      action, 
      appointment_id, 
      referral_data, 
      manual_commission,
      bulk_processing 
    } = body;

    if (!action) {
      return NextResponse.json({
        success: false,
        message: 'Action is required'
      }, { status: 400 });
    }

    const validActions = ['generate_appointment_commission', 'create_referral_commission', 'manual_commission', 'bulk_process', 'approve_commission'];
    if (!validActions.includes(action)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid action'
      }, { status: 400 });
    }

    let result: any = {};

    switch (action) {
      case 'generate_appointment_commission':
        if (!appointment_id) {
          return NextResponse.json({
            success: false,
            message: 'Appointment ID is required'
          }, { status: 400 });
        }

        // Get appointment details
        const appointment = await prisma.appointment.findUnique({
          where: { id: appointment_id },
          include: {
            partner: {
              select: {
                id: true,
                name: true,
                partnership_tier: true,
                commission_rate: true
              }
            }
          }
        });

        if (!appointment) {
          return NextResponse.json({
            success: false,
            message: 'Appointment not found'
          }, { status: 404 });
        }

        // Check if commission already exists
        const existingCommission = await prisma.commissionEarning.findFirst({
          where: {
            appointment_id: appointment_id,
            commission_type: 'appointment'
          }
        });

        if (existingCommission) {
          return NextResponse.json({
            success: false,
            message: 'Commission already exists for this appointment'
          }, { status: 409 });
        }

        // Generate commission
        const commissionData = await generateAppointmentCommission(appointment, appointment.partner);
        
        if (!commissionData) {
          return NextResponse.json({
            success: false,
            message: 'No commission applicable for this appointment'
          }, { status: 400 });
        }

        const newCommission = await prisma.commissionEarning.create({
          data: commissionData,
          include: {
            partner: {
              select: { id: true, name: true, business_name: true }
            },
            appointment: {
              select: { 
                id: true, 
                appointment_date: true, 
                service_type: true,
                consultation_fee: true
              }
            }
          }
        });

        result = {
          commission: newCommission,
          message: `Commission of ₹${newCommission.commission_amount} created for appointment`
        };
        break;

      case 'create_referral_commission':
        if (!referral_data) {
          return NextResponse.json({
            success: false,
            message: 'Referral data is required'
          }, { status: 400 });
        }

        const { referrer_partner_id, referred_user_id, referral_value } = referral_data;

        if (!referrer_partner_id || !referred_user_id || !referral_value) {
          return NextResponse.json({
            success: false,
            message: 'Referrer partner ID, referred user ID, and referral value are required'
          }, { status: 400 });
        }

        // Get referrer partner
        const referrerPartner = await prisma.partner.findUnique({
          where: { id: referrer_partner_id },
          select: { id: true, name: true, partnership_tier: true }
        });

        if (!referrerPartner) {
          return NextResponse.json({
            success: false,
            message: 'Referrer partner not found'
          }, { status: 404 });
        }

        const referralCommission = calculateCommission(
          referral_value,
          referrerPartner.partnership_tier,
          'referral'
        );

        const referralCommissionRecord = await prisma.commissionEarning.create({
          data: {
            partner_id: referrer_partner_id,
            user_id: referred_user_id,
            commission_type: 'referral',
            base_amount: referral_value,
            commission_rate: referralCommission.rate / 100,
            commission_amount: referralCommission.amount,
            status: 'pending'
          },
          include: {
            partner: {
              select: { id: true, name: true, business_name: true }
            }
          }
        });

        result = {
          commission: referralCommissionRecord,
          message: `Referral commission of ₹${referralCommissionRecord.commission_amount} created`
        };
        break;

      case 'manual_commission':
        if (!auth.isAdmin) {
          return NextResponse.json({
            success: false,
            message: 'Admin privileges required for manual commission creation'
          }, { status: 403 });
        }

        if (!manual_commission) {
          return NextResponse.json({
            success: false,
            message: 'Manual commission data is required'
          }, { status: 400 });
        }

        const manualCommissionRecord = await prisma.commissionEarning.create({
          data: {
            partner_id: manual_commission.partner_id,
            user_id: manual_commission.user_id,
            commission_type: manual_commission.commission_type || 'manual',
            base_amount: manual_commission.base_amount,
            commission_rate: manual_commission.commission_rate,
            commission_amount: manual_commission.commission_amount,
            status: 'approved' // Manual commissions are pre-approved
          },
          include: {
            partner: {
              select: { id: true, name: true, business_name: true }
            }
          }
        });

        result = {
          commission: manualCommissionRecord,
          message: 'Manual commission created successfully'
        };
        break;

      case 'bulk_process':
        if (!auth.isAdmin) {
          return NextResponse.json({
            success: false,
            message: 'Admin privileges required for bulk processing'
          }, { status: 403 });
        }

        // Process completed appointments without commissions
        const unprocessedAppointments = await prisma.appointment.findMany({
          where: {
            status: 'completed',
            consultation_fee: { gt: 0 },
            commissions: { none: {} }
          },
          include: {
            partner: {
              select: {
                id: true,
                name: true,
                partnership_tier: true
              }
            }
          },
          take: 100 // Process in batches
        });

        const bulkCommissions = [];
        for (const appointment of unprocessedAppointments) {
          const commissionData = await generateAppointmentCommission(appointment, appointment.partner);
          if (commissionData) {
            bulkCommissions.push(commissionData);
          }
        }

        if (bulkCommissions.length > 0) {
          await prisma.commissionEarning.createMany({
            data: bulkCommissions
          });
        }

        result = {
          processed_count: bulkCommissions.length,
          total_commission_amount: bulkCommissions.reduce((sum, comm) => sum + comm.commission_amount, 0),
          message: `Bulk processed ${bulkCommissions.length} commission records`
        };
        break;

      case 'approve_commission':
        if (!auth.isAdmin) {
          return NextResponse.json({
            success: false,
            message: 'Admin privileges required for commission approval'
          }, { status: 403 });
        }

        const { commission_ids } = body;
        if (!commission_ids || !Array.isArray(commission_ids)) {
          return NextResponse.json({
            success: false,
            message: 'Commission IDs array is required'
          }, { status: 400 });
        }

        const approvedCommissions = await prisma.commissionEarning.updateMany({
          where: {
            id: { in: commission_ids },
            status: 'pending'
          },
          data: {
            status: 'approved',
            paid_at: new Date()
          }
        });

        result = {
          approved_count: approvedCommissions.count,
          message: `Approved ${approvedCommissions.count} commission records`
        };
        break;
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user_id: auth.userId || auth.partnerId || 'system',
        action: `commission_${action}`,
        details: {
          action,
          appointment_id,
          referral_data,
          manual_commission,
          result_summary: result,
          timestamp: new Date().toISOString()
        }
      }
    }).catch(err => {
      console.log('Audit log creation failed:', err);
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Commission tracking error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error during commission processing'
    }, { status: 500 });
  }
}

// GET /api/revenue/commission-tracking - Get commission records and analytics
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
    const status = searchParams.get('status');
    const commission_type = searchParams.get('commission_type');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    let whereClause: any = {};

    // Partner-specific access control
    if (auth.partnerId && !auth.isAdmin) {
      whereClause.partner_id = auth.partnerId;
    } else if (partner_id) {
      whereClause.partner_id = partner_id;
    }

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    // Filter by commission type
    if (commission_type) {
      whereClause.commission_type = commission_type;
    }

    // Date range filter
    if (start_date || end_date) {
      whereClause.created_at = {};
      if (start_date) {
        whereClause.created_at.gte = new Date(start_date);
      }
      if (end_date) {
        whereClause.created_at.lte = new Date(end_date);
      }
    }

    // Get commission records
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

    // Calculate commission analytics
    const analytics = await calculateCommissionAnalytics(whereClause);

    // Get commission summary by partner (admin only)
    let partnerSummary = null;
    if (auth.isAdmin) {
      partnerSummary = await prisma.commissionEarning.groupBy({
        by: ['partner_id', 'status'],
        where: whereClause,
        _sum: {
          commission_amount: true,
          base_amount: true
        },
        _count: {
          id: true
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        commissions: commissions.map(commission => ({
          id: commission.id,
          commission_type: commission.commission_type,
          base_amount: commission.base_amount,
          commission_rate: Math.round(commission.commission_rate * 100), // Convert to percentage
          commission_amount: commission.commission_amount,
          status: commission.status,
          created_at: commission.created_at,
          paid_at: commission.paid_at,
          partner: commission.partner,
          user: commission.user,
          appointment: commission.appointment
        })),
        analytics: analytics,
        partner_summary: partnerSummary,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      }
    });

  } catch (error) {
    console.error('Commission tracking fetch error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while fetching commission data'
    }, { status: 500 });
  }
}

// Helper function to calculate commission analytics
async function calculateCommissionAnalytics(whereClause: any) {
  const [statusSummary, typeSummary, monthlyTrends] = await Promise.all([
    prisma.commissionEarning.groupBy({
      by: ['status'],
      where: whereClause,
      _sum: {
        commission_amount: true,
        base_amount: true
      },
      _count: { id: true }
    }),
    prisma.commissionEarning.groupBy({
      by: ['commission_type'],
      where: whereClause,
      _sum: {
        commission_amount: true,
        base_amount: true
      },
      _count: { id: true }
    }),
    // Get monthly commission trends for the last 6 months
    prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as commission_count,
        SUM(commission_amount) as total_commission,
        SUM(base_amount) as total_base_amount
      FROM "CommissionEarning" 
      WHERE created_at >= NOW() - INTERVAL '6 months'
      ${Object.keys(whereClause).length > 0 ? prisma.Prisma.sql`AND partner_id = ${whereClause.partner_id || ''}` : prisma.Prisma.empty}
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `
  ]);

  // Calculate totals
  const totalCommissions = statusSummary.reduce((sum, item) => sum + (item._sum.commission_amount || 0), 0);
  const totalBaseAmount = statusSummary.reduce((sum, item) => sum + (item._sum.base_amount || 0), 0);
  const totalCount = statusSummary.reduce((sum, item) => sum + item._count.id, 0);
  
  // Calculate average commission rate
  const averageCommissionRate = totalBaseAmount > 0 ? (totalCommissions / totalBaseAmount) * 100 : 0;

  return {
    totals: {
      total_commissions: Math.round(totalCommissions * 100) / 100,
      total_base_amount: Math.round(totalBaseAmount * 100) / 100,
      total_count: totalCount,
      average_commission_rate: Math.round(averageCommissionRate * 100) / 100
    },
    by_status: statusSummary.reduce((acc, item) => {
      acc[item.status] = {
        count: item._count.id,
        commission_amount: Math.round((item._sum.commission_amount || 0) * 100) / 100,
        base_amount: Math.round((item._sum.base_amount || 0) * 100) / 100
      };
      return acc;
    }, {} as any),
    by_type: typeSummary.reduce((acc, item) => {
      acc[item.commission_type] = {
        count: item._count.id,
        commission_amount: Math.round((item._sum.commission_amount || 0) * 100) / 100,
        base_amount: Math.round((item._sum.base_amount || 0) * 100) / 100
      };
      return acc;
    }, {} as any),
    monthly_trends: (monthlyTrends as any[]).map(trend => ({
      month: trend.month,
      commission_count: parseInt(trend.commission_count),
      total_commission: Math.round(parseFloat(trend.total_commission || '0') * 100) / 100,
      total_base_amount: Math.round(parseFloat(trend.total_base_amount || '0') * 100) / 100
    }))
  };
}