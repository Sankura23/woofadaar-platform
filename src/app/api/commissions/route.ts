import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
import { RevenueCalculator, getDateRange } from '@/lib/revenue-utils';
import { COMMISSION_RATES } from '@/lib/revenue-config';

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

// GET /api/commissions - Get commission records with filtering and analytics
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
    const partnerId = searchParams.get('partner_id');
    const status = searchParams.get('status');
    const serviceType = searchParams.get('service_type');
    const period = (searchParams.get('period') || 'month') as 'today' | 'week' | 'month' | 'quarter' | 'year';
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const includeAnalytics = searchParams.get('include_analytics') !== 'false';

    const offset = (page - 1) * limit;

    // Build where clause based on user permissions
    const where: any = {};

    // Apply user-specific filters
    if (!isAdmin(decoded.userType)) {
      if (isPartner(decoded.userType)) {
        // Partners can only see their own commissions
        where.partner_id = decoded.partnerId || decoded.userId;
      } else {
        return NextResponse.json({
          success: false,
          message: 'Access denied: Only partners and admins can view commissions'
        }, { status: 403 });
      }
    } else {
      // Admin can filter by specific partner
      if (partnerId) where.partner_id = partnerId;
    }

    // Apply other filters
    if (status) where.status = status;
    if (serviceType) where.service_type = serviceType;

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

    const [commissions, totalCount] = await Promise.all([
      prisma.referralCommission.findMany({
        where,
        include: {
          partner: {
            select: {
              id: true,
              name: true,
              email: true,
              business_name: true,
              partner_type: true,
              rating_average: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          dog: {
            select: {
              id: true,
              name: true,
              health_id: true
            }
          },
          partner_subscription: {
            select: {
              subscription_tier: true,
              commission_rate: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.referralCommission.count({ where })
    ]);

    let analytics = {};
    if (includeAnalytics) {
      // Calculate comprehensive analytics
      const [summaryStats, statusBreakdown, serviceTypeBreakdown, partnerRankings] = await Promise.all([
        // Summary statistics
        prisma.referralCommission.aggregate({
          where,
          _sum: {
            commission_amount: true,
            referral_amount: true
          },
          _count: {
            _all: true
          },
          _avg: {
            commission_amount: true,
            commission_rate: true
          }
        }),

        // Status breakdown
        prisma.referralCommission.groupBy({
          by: ['status'],
          where,
          _sum: {
            commission_amount: true,
            referral_amount: true
          },
          _count: {
            _all: true
          }
        }),

        // Service type breakdown
        prisma.referralCommission.groupBy({
          by: ['service_type'],
          where,
          _sum: {
            commission_amount: true,
            referral_amount: true
          },
          _count: {
            _all: true
          },
          _avg: {
            commission_rate: true
          }
        }),

        // Top earning partners (admin only)
        isAdmin(decoded.userType) ? prisma.referralCommission.groupBy({
          by: ['partner_id'],
          where: {
            ...where,
            status: 'paid'
          },
          _sum: {
            commission_amount: true,
            referral_amount: true
          },
          _count: {
            _all: true
          },
          orderBy: {
            _sum: {
              commission_amount: 'desc'
            }
          },
          take: 10
        }) : []
      ]);

      // Enhance partner rankings with partner details
      let enhancedPartnerRankings: any[] = [];
      if (isAdmin(decoded.userType) && partnerRankings.length > 0) {
        enhancedPartnerRankings = await Promise.all(
          partnerRankings.map(async (ranking: any) => {
            const partner = await prisma.partner.findUnique({
              where: { id: ranking.partner_id },
              select: {
                name: true,
                business_name: true,
                partner_type: true,
                rating_average: true
              }
            });
            return {
              partner_id: ranking.partner_id,
              partner_name: partner?.name,
              business_name: partner?.business_name,
              partner_type: partner?.partner_type,
              rating_average: partner?.rating_average,
              total_commission_earned: ranking._sum.commission_amount || 0,
              total_referral_value: ranking._sum.referral_amount || 0,
              referral_count: ranking._count._all,
              average_referral_value: ranking._count._all > 0 ? (ranking._sum.referral_amount || 0) / ranking._count._all : 0
            };
          })
        );
      }

      analytics = {
        summary: {
          total_commission_amount: summaryStats._sum.commission_amount || 0,
          total_referral_value: summaryStats._sum.referral_amount || 0,
          commission_count: summaryStats._count._all,
          average_commission_amount: summaryStats._avg.commission_amount || 0,
          average_commission_rate: summaryStats._avg.commission_rate || 0,
          total_partners: new Set(commissions.map(c => c.partner_id)).size
        },
        status_breakdown: statusBreakdown,
        service_type_breakdown: serviceTypeBreakdown.map((item: any) => ({
          service_type: item.service_type,
          commission_amount: item._sum.commission_amount || 0,
          referral_value: item._sum.referral_amount || 0,
          referral_count: item._count._all,
          average_commission_rate: item._avg.commission_rate || 0,
          configured_rate: COMMISSION_RATES[item.service_type as keyof typeof COMMISSION_RATES]
        })),
        ...(isAdmin(decoded.userType) && {
          top_partners: enhancedPartnerRankings
        })
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        commissions,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalCount / limit),
          total_count: totalCount,
          per_page: limit
        },
        ...(includeAnalytics && { analytics })
      }
    });

  } catch (error) {
    console.error('Error fetching commissions:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// POST /api/commissions - Create new commission record
export async function POST(request: NextRequest) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const body = await request.json();
    
    const {
      partner_id,
      user_id,
      dog_id,
      service_type,
      referral_amount,
      commission_rate, // Optional - will be auto-calculated if not provided
      external_reference_id,
      description,
      metadata = {}
    } = body;

    // Validate required fields
    if (!partner_id || !service_type || !referral_amount) {
      return NextResponse.json({
        success: false,
        message: 'Partner ID, service type, and referral amount are required'
      }, { status: 400 });
    }

    if (referral_amount <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Referral amount must be greater than 0'
      }, { status: 400 });
    }

    // Validate service type
    const validServiceTypes = Object.keys(COMMISSION_RATES);
    if (!validServiceTypes.includes(service_type)) {
      return NextResponse.json({
        success: false,
        message: `Invalid service type. Valid options: ${validServiceTypes.join(', ')}`
      }, { status: 400 });
    }

    // Permission check: only admins or the partner themselves can create commissions
    if (!isAdmin(decoded.userType) && partner_id !== decoded.userId) {
      return NextResponse.json({
        success: false,
        message: 'Access denied: You can only create commissions for yourself'
      }, { status: 403 });
    }

    // Verify partner exists and has an active subscription
    const partner = await prisma.partner.findUnique({
      where: { id: partner_id },
      include: {
        partner_subscription: true
      }
    });

    if (!partner) {
      return NextResponse.json({
        success: false,
        message: 'Partner not found'
      }, { status: 404 });
    }

    if (!partner.is_active) {
      return NextResponse.json({
        success: false,
        message: 'Partner account is not active'
      }, { status: 400 });
    }

    // Verify user exists if provided
    if (user_id) {
      const user = await prisma.user.findUnique({ where: { id: user_id } });
      if (!user) {
        return NextResponse.json({
          success: false,
          message: 'User not found'
        }, { status: 404 });
      }
    }

    // Verify dog exists if provided
    if (dog_id) {
      const dog = await prisma.dog.findUnique({ where: { id: dog_id } });
      if (!dog) {
        return NextResponse.json({
          success: false,
          message: 'Dog not found'
        }, { status: 404 });
      }
    }

    // Calculate commission amount and rate
    let finalCommissionRate = commission_rate;
    let commissionAmount: number;

    if (!finalCommissionRate) {
      // Use partner's subscription tier rate or default service rate
      if (partner.partner_subscription && partner.partner_subscription.commission_rate) {
        finalCommissionRate = partner.partner_subscription.commission_rate;
      } else {
        finalCommissionRate = COMMISSION_RATES[service_type as keyof typeof COMMISSION_RATES];
      }
    }

    commissionAmount = RevenueCalculator.calculateReferralCommission(
      referral_amount,
      service_type,
      partner.partner_subscription?.subscription_tier || 'basic'
    );

    // Check referral limits for current period
    if (partner.partner_subscription?.max_monthly_referrals) {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const monthlyReferralCount = await prisma.referralCommission.count({
        where: {
          partner_id,
          created_at: {
            gte: currentMonth,
            lt: nextMonth
          }
        }
      });

      if (monthlyReferralCount >= partner.partner_subscription.max_monthly_referrals) {
        return NextResponse.json({
          success: false,
          message: `Monthly referral limit exceeded (${partner.partner_subscription.max_monthly_referrals} referrals)`
        }, { status: 400 });
      }
    }

    // Create commission record
    const commission = await prisma.referralCommission.create({
      data: {
        partner_id,
        user_id: user_id || null,
        dog_id: dog_id || null,
        service_type,
        referral_amount: parseFloat(referral_amount.toString()),
        commission_amount: commissionAmount,
        commission_rate: finalCommissionRate,
        status: 'pending',
        external_reference_id: external_reference_id || null,
        description: description || `${service_type} referral commission`,
        metadata: {
          created_by: decoded.userId,
          creation_method: isAdmin(decoded.userType) ? 'admin_manual' : 'partner_submission',
          partner_tier: partner.partner_subscription?.subscription_tier || 'basic',
          ...metadata
        }
      },
      include: {
        partner: {
          select: {
            name: true,
            business_name: true,
            email: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        },
        dog: {
          select: {
            name: true,
            health_id: true
          }
        }
      }
    });

    console.log(`Commission created: ${commission.id} (${partner.business_name || partner.name} - ₹${commissionAmount} for ${service_type})`);

    return NextResponse.json({
      success: true,
      message: 'Commission created successfully',
      data: {
        commission,
        calculation_details: {
          referral_amount: referral_amount,
          commission_rate: finalCommissionRate,
          commission_amount: commissionAmount,
          service_type,
          partner_tier: partner.partner_subscription?.subscription_tier || 'basic'
        }
      }
    });

  } catch (error) {
    console.error('Error creating commission:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}