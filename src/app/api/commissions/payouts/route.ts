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

// GET /api/commissions/payouts - Get commission payout summaries and pending payouts
export async function GET(request: NextRequest) {
  try {
    const authResult = verifyAdminToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'month') as 'today' | 'week' | 'month' | 'quarter' | 'year';
    const partnerId = searchParams.get('partner_id');
    const status = searchParams.get('status') || 'approved'; // approved commissions ready for payout
    const groupBy = searchParams.get('group_by') || 'partner'; // partner, service_type, date

    // Calculate date range
    const { startDate, endDate } = getDateRange(period);

    // Build where clause for pending payouts
    const where: any = {
      status: status,
      created_at: {
        gte: startDate,
        lte: endDate
      }
    };

    if (partnerId) where.partner_id = partnerId;

    // Get commission summaries grouped by partner
    const payoutSummaries = await prisma.referralCommission.groupBy({
      by: groupBy === 'partner' ? ['partner_id'] : 
          groupBy === 'service_type' ? ['service_type'] : 
          ['partner_id'], // default to partner
      where,
      _sum: {
        commission_amount: true,
        referral_amount: true
      },
      _count: {
        _all: true
      },
      _min: {
        created_at: true
      },
      _max: {
        created_at: true
      }
    });

    // Enhance with partner details and calculate payout info
    const enhancedSummaries = await Promise.all(
      payoutSummaries.map(async (summary: any) => {
        const partnerId = summary.partner_id;
        
        // Get partner details
        const partner = await prisma.partner.findUnique({
          where: { id: partnerId },
          select: {
            id: true,
            name: true,
            email: true,
            business_name: true,
            partner_type: true,
            rating_average: true,
            bank_account_number: true,
            bank_name: true,
            bank_ifsc: true,
            gst_number: true
          }
        });

        // Get detailed commission breakdown
        const commissionBreakdown = await prisma.referralCommission.groupBy({
          by: ['service_type'],
          where: {
            ...where,
            partner_id: partnerId
          },
          _sum: {
            commission_amount: true,
            referral_amount: true
          },
          _count: {
            _all: true
          }
        });

        // Calculate payout requirements
        const totalCommission = summary._sum.commission_amount || 0;
        const minimumPayout = 500; // ₹500 minimum payout
        const taxDeduction = totalCommission * 0.1; // 10% TDS
        const netPayout = totalCommission - taxDeduction;
        const isPayoutEligible = totalCommission >= minimumPayout;

        return {
          partner_id: partnerId,
          partner_details: partner,
          payout_summary: {
            total_commission: totalCommission,
            total_referral_value: summary._sum.referral_amount || 0,
            commission_count: summary._count._all,
            period_start: summary._min.created_at,
            period_end: summary._max.created_at,
            tax_deduction: taxDeduction,
            net_payout: netPayout,
            is_eligible: isPayoutEligible,
            eligibility_reason: !isPayoutEligible ? 
              `Minimum payout amount is ₹${minimumPayout}. Current: ₹${totalCommission}` : null
          },
          commission_breakdown: commissionBreakdown,
          banking_info_complete: !!(partner?.bank_account_number && partner?.bank_name && partner?.bank_ifsc),
          gst_registered: !!partner?.gst_number
        };
      })
    );

    // Calculate overall statistics
    const totalStats = await prisma.referralCommission.aggregate({
      where,
      _sum: {
        commission_amount: true,
        referral_amount: true
      },
      _count: {
        _all: true
      }
    });

    const eligiblePayouts = enhancedSummaries.filter(s => s.payout_summary.is_eligible);
    const totalEligibleAmount = eligiblePayouts.reduce((sum, payout) => sum + payout.payout_summary.total_commission, 0);
    const totalNetPayout = eligiblePayouts.reduce((sum, payout) => sum + payout.payout_summary.net_payout, 0);

    return NextResponse.json({
      success: true,
      data: {
        payout_summaries: enhancedSummaries,
        overview: {
          total_commission_amount: totalStats._sum.commission_amount || 0,
          total_referral_value: totalStats._sum.referral_amount || 0,
          total_commissions: totalStats._count._all,
          eligible_partners: eligiblePayouts.length,
          total_eligible_amount: totalEligibleAmount,
          total_net_payout: totalNetPayout,
          total_tax_deduction: totalEligibleAmount - totalNetPayout,
          incomplete_banking_info: enhancedSummaries.filter(s => !s.banking_info_complete).length
        },
        filter_info: {
          period,
          date_range: { start_date: startDate, end_date: endDate },
          status,
          partner_id: partnerId,
          group_by: groupBy
        }
      }
    });

  } catch (error) {
    console.error('Error fetching commission payouts:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// POST /api/commissions/payouts - Process commission payouts
export async function POST(request: NextRequest) {
  try {
    const authResult = verifyAdminToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const body = await request.json();

    const {
      partner_ids, // Array of partner IDs to process payouts for
      commission_ids, // Optional: specific commission IDs to pay out
      payment_method = 'bank_transfer',
      payment_reference,
      process_all_eligible = false,
      notes
    } = body;

    if (!partner_ids && !commission_ids && !process_all_eligible) {
      return NextResponse.json({
        success: false,
        message: 'Either partner_ids, commission_ids, or process_all_eligible must be specified'
      }, { status: 400 });
    }

    let whereClause: any = {
      status: 'approved'
    };

    if (commission_ids?.length > 0) {
      whereClause.id = { in: commission_ids };
    } else if (partner_ids?.length > 0) {
      whereClause.partner_id = { in: partner_ids };
    }
    // If process_all_eligible is true, whereClause remains as status: 'approved'

    // Find commissions to be paid out
    const commissionsToPayOut = await prisma.referralCommission.findMany({
      where: whereClause,
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
            business_name: true,
            bank_account_number: true,
            bank_name: true,
            bank_ifsc: true,
            gst_number: true
          }
        }
      }
    });

    if (commissionsToPayOut.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No eligible commissions found for payout'
      }, { status: 404 });
    }

    // Validate banking information for all partners
    const partnersWithMissingBankInfo = commissionsToPayOut
      .map(c => c.partner)
      .filter((partner, index, self) => 
        self.findIndex(p => p.id === partner.id) === index && // Unique partners only
        (!partner.bank_account_number || !partner.bank_name || !partner.bank_ifsc)
      );

    if (partnersWithMissingBankInfo.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Some partners have incomplete banking information',
        data: {
          partners_with_missing_info: partnersWithMissingBankInfo.map(p => ({
            id: p.id,
            name: p.business_name || p.name,
            missing_fields: [
              !p.bank_account_number ? 'bank_account_number' : null,
              !p.bank_name ? 'bank_name' : null,
              !p.bank_ifsc ? 'bank_ifsc' : null
            ].filter(Boolean)
          }))
        }
      }, { status: 400 });
    }

    // Group commissions by partner for batch processing
    const partnerCommissions = commissionsToPayOut.reduce((acc, commission) => {
      const partnerId = commission.partner_id;
      if (!acc[partnerId]) {
        acc[partnerId] = {
          partner: commission.partner,
          commissions: []
        };
      }
      acc[partnerId].commissions.push(commission);
      return acc;
    }, {} as any);

    const payoutResults: any[] = [];

    // Process payouts for each partner
    for (const [partnerId, data] of Object.entries(partnerCommissions)) {
      const { partner, commissions } = data as any;
      
      const totalAmount = commissions.reduce((sum: number, c: any) => sum + c.commission_amount, 0);
      const taxDeduction = totalAmount * 0.1; // 10% TDS
      const netAmount = totalAmount - taxDeduction;

      try {
        // Start transaction for this partner's payout
        await prisma.$transaction(async (tx) => {
          // Update all commissions to 'paid' status
          const commissionIds = commissions.map((c: any) => c.id);
          await tx.referralCommission.updateMany({
            where: { id: { in: commissionIds } },
            data: {
              status: 'paid',
              paid_at: new Date(),
              external_payment_id: payment_reference,
              metadata: {
                payout_processed_by: decoded.userId,
                payout_processed_at: new Date().toISOString(),
                payment_method,
                tax_deduction: taxDeduction,
                net_payout: netAmount,
                processing_notes: notes
              }
            }
          });

          // Create payout record for tracking
          const payoutRecord = await tx.paymentOrder.create({
            data: {
              order_id: `payout_${Date.now()}_${partnerId.substring(0, 8)}`,
              amount: netAmount,
              currency: 'INR',
              status: 'completed',
              user_id: null,
              partner_id: partnerId,
              payment_type: 'commission_payout',
              order_type: 'payout',
              metadata: {
                commission_count: commissions.length,
                gross_amount: totalAmount,
                tax_deducted: taxDeduction,
                commission_ids: commissionIds,
                payment_method,
                payment_reference,
                processed_by: decoded.userId,
                partner_bank_details: {
                  account_number: partner.bank_account_number,
                  bank_name: partner.bank_name,
                  ifsc: partner.bank_ifsc
                }
              },
              completed_at: new Date()
            }
          });

          payoutResults.push({
            partner_id: partnerId,
            partner_name: partner.business_name || partner.name,
            payout_record_id: payoutRecord.id,
            commissions_processed: commissions.length,
            gross_amount: totalAmount,
            tax_deducted: taxDeduction,
            net_amount: netAmount,
            status: 'success'
          });
        });

        console.log(`Commission payout processed: ${partnerId} (${partner.business_name || partner.name}) - ₹${netAmount} net`);

      } catch (error) {
        console.error(`Error processing payout for partner ${partnerId}:`, error);
        payoutResults.push({
          partner_id: partnerId,
          partner_name: partner.business_name || partner.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successfulPayouts = payoutResults.filter(r => r.status === 'success');
    const failedPayouts = payoutResults.filter(r => r.status === 'failed');

    return NextResponse.json({
      success: true,
      message: `Processed ${successfulPayouts.length} payouts successfully${failedPayouts.length > 0 ? `, ${failedPayouts.length} failed` : ''}`,
      data: {
        total_processed: payoutResults.length,
        successful_payouts: successfulPayouts.length,
        failed_payouts: failedPayouts.length,
        payout_results: payoutResults,
        summary: {
          total_gross_amount: successfulPayouts.reduce((sum, r) => sum + (r.gross_amount || 0), 0),
          total_tax_deducted: successfulPayouts.reduce((sum, r) => sum + (r.tax_deducted || 0), 0),
          total_net_amount: successfulPayouts.reduce((sum, r) => sum + (r.net_amount || 0), 0),
          total_commissions: successfulPayouts.reduce((sum, r) => sum + (r.commissions_processed || 0), 0)
        }
      }
    });

  } catch (error) {
    console.error('Error processing commission payouts:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}