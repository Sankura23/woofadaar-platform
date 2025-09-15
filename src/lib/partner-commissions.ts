import prisma from '@/lib/db';

export interface CommissionRate {
  partner_type: 'veterinarian' | 'corporate';
  service_type: string;
  rate_percentage: number;
  min_amount?: number;
  max_amount?: number;
}

export interface CommissionCalculation {
  base_amount: number;
  commission_rate: number;
  commission_amount: number;
  partner_earnings: number;
  platform_earnings: number;
}

export class PartnerCommissionService {
  
  // Commission rates configuration
  static COMMISSION_RATES: Record<string, CommissionRate> = {
    // Veterinarian commissions
    'vet_consultation': {
      partner_type: 'veterinarian',
      service_type: 'consultation',
      rate_percentage: 15, // 15% commission
      min_amount: 50 // Minimum ₹50 commission
    },
    'vet_health_analysis': {
      partner_type: 'veterinarian',
      service_type: 'health_analysis',
      rate_percentage: 12,
      min_amount: 30
    },
    'vet_subscription_referral': {
      partner_type: 'veterinarian',
      service_type: 'subscription_referral',
      rate_percentage: 20, // 20% of first month for referrals
      max_amount: 200 // Max ₹200 per referral
    },

    // Corporate partner commissions
    'corporate_employee_subscription': {
      partner_type: 'corporate',
      service_type: 'employee_subscription',
      rate_percentage: 10, // 10% of subscription revenue
      min_amount: 25
    },
    'corporate_wellness_program': {
      partner_type: 'corporate',
      service_type: 'wellness_program',
      rate_percentage: 8,
      min_amount: 100
    }
  };

  /**
   * Calculate commission for a transaction
   */
  static calculateCommission(
    amount: number, 
    serviceType: string,
    partnerType: 'veterinarian' | 'corporate'
  ): CommissionCalculation {
    const rateConfig = this.COMMISSION_RATES[serviceType];
    
    if (!rateConfig || rateConfig.partner_type !== partnerType) {
      return {
        base_amount: amount,
        commission_rate: 0,
        commission_amount: 0,
        partner_earnings: 0,
        platform_earnings: amount
      };
    }

    let commissionAmount = Math.round(amount * (rateConfig.rate_percentage / 100));
    
    // Apply minimum commission
    if (rateConfig.min_amount && commissionAmount < rateConfig.min_amount) {
      commissionAmount = rateConfig.min_amount;
    }
    
    // Apply maximum commission
    if (rateConfig.max_amount && commissionAmount > rateConfig.max_amount) {
      commissionAmount = rateConfig.max_amount;
    }

    return {
      base_amount: amount,
      commission_rate: rateConfig.rate_percentage,
      commission_amount: commissionAmount,
      partner_earnings: commissionAmount,
      platform_earnings: amount - commissionAmount
    };
  }

  /**
   * Record a commission transaction
   */
  static async recordCommission(
    partnerId: string,
    userId: string,
    amount: number,
    serviceType: string,
    referenceId: string, // e.g., consultation_id, subscription_id
    metadata?: Record<string, any>
  ): Promise<any> {
    try {
      // Get partner info to determine partner type
      const partner = await prisma.partner.findUnique({
        where: { id: partnerId }
      });

      if (!partner) {
        throw new Error('Partner not found');
      }

      const partnerType = 'veterinarian'; // For now, extend for corporate later
      const commission = this.calculateCommission(amount, serviceType, partnerType);

      // Create commission record
      const commissionRecord = await prisma.partnerCommission.create({
        data: {
          partner_id: partnerId,
          partner_type: partnerType,
          user_id: userId,
          service_type: serviceType,
          base_amount: commission.base_amount,
          commission_rate: commission.commission_rate,
          commission_amount: commission.commission_amount,
          status: 'pending',
          reference_id: referenceId,
          reference_type: this.getServiceReferenceType(serviceType),
          metadata: metadata ? JSON.stringify(metadata) : undefined,
          created_at: new Date()
        }
      });

      return commissionRecord;

    } catch (error) {
      console.error('Record commission error:', error);
      throw error;
    }
  }

  /**
   * Get partner commission summary
   */
  static async getPartnerCommissionSummary(
    partnerId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    try {
      const whereClause: any = { partner_id: partnerId };
      
      if (startDate || endDate) {
        whereClause.created_at = {};
        if (startDate) whereClause.created_at.gte = startDate;
        if (endDate) whereClause.created_at.lte = endDate;
      }

      const [
        totalEarnings,
        pendingEarnings,
        paidEarnings,
        totalTransactions,
        serviceBreakdown
      ] = await Promise.all([
        // Total earnings
        prisma.partnerCommission.aggregate({
          where: whereClause,
          _sum: { commission_amount: true }
        }),

        // Pending earnings
        prisma.partnerCommission.aggregate({
          where: { ...whereClause, status: 'pending' },
          _sum: { commission_amount: true }
        }),

        // Paid earnings
        prisma.partnerCommission.aggregate({
          where: { ...whereClause, status: 'paid' },
          _sum: { commission_amount: true }
        }),

        // Total transactions
        prisma.partnerCommission.count({ where: whereClause }),

        // Service type breakdown
        prisma.partnerCommission.groupBy({
          by: ['service_type'],
          where: whereClause,
          _sum: { commission_amount: true },
          _count: { id: true }
        })
      ]);

      return {
        summary: {
          total_earnings: (totalEarnings._sum.commission_amount || 0) / 100,
          pending_earnings: (pendingEarnings._sum.commission_amount || 0) / 100,
          paid_earnings: (paidEarnings._sum.commission_amount || 0) / 100,
          total_transactions: totalTransactions
        },
        service_breakdown: serviceBreakdown.map(service => ({
          service_type: service.service_type,
          earnings: (service._sum.commission_amount || 0) / 100,
          transaction_count: service._count
        }))
      };

    } catch (error) {
      console.error('Get commission summary error:', error);
      throw error;
    }
  }

  /**
   * Get commission transactions for partner
   */
  static async getPartnerCommissions(
    partnerId: string,
    page: number = 1,
    limit: number = 20,
    status?: string
  ) {
    try {
      const whereClause: any = { partner_id: partnerId };
      if (status) whereClause.status = status;

      const offset = (page - 1) * limit;

      const [commissions, totalCount] = await Promise.all([
        prisma.partnerCommission.findMany({
          where: whereClause,
          orderBy: { created_at: 'desc' },
          skip: offset,
          take: limit,
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }),

        prisma.partnerCommission.count({ where: whereClause })
      ]);

      return {
        commissions: commissions.map(commission => ({
          id: commission.id,
          service_type: commission.service_type,
          base_amount: commission.base_amount / 100,
          commission_rate: commission.commission_rate,
          commission_amount: commission.commission_amount / 100,
          status: commission.status,
          created_at: commission.created_at,
          user: commission.user,
          reference_id: commission.reference_id,
          metadata: commission.metadata ? JSON.parse(commission.metadata) : null
        })),
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalCount / limit),
          total_count: totalCount,
          has_next: page * limit < totalCount,
          has_prev: page > 1
        }
      };

    } catch (error) {
      console.error('Get partner commissions error:', error);
      throw error;
    }
  }

  /**
   * Process commission payouts
   */
  static async processCommissionPayout(
    partnerId: string,
    commissionIds: string[],
    payoutMethod: string = 'bank_transfer',
    metadata?: Record<string, any>
  ) {
    try {
      // Verify all commissions belong to partner and are pending
      const commissions = await prisma.partnerCommission.findMany({
        where: {
          id: { in: commissionIds },
          partner_id: partnerId,
          status: 'pending'
        }
      });

      if (commissions.length !== commissionIds.length) {
        throw new Error('Some commissions not found or already processed');
      }

      const totalAmount = commissions.reduce((sum, c) => sum + c.commission_amount, 0);

      // Create payout record
      const payout = await prisma.partnerPayout.create({
        data: {
          partner_id: partnerId,
          partner_type: commissions[0].partner_type,
          total_amount: totalAmount,
          payout_method: payoutMethod,
          status: 'processing',
          commission_ids: JSON.stringify(commissionIds),
          metadata: metadata ? JSON.stringify(metadata) : undefined,
          created_at: new Date()
        }
      });

      // Update commission statuses
      await prisma.partnerCommission.updateMany({
        where: { id: { in: commissionIds } },
        data: { 
          status: 'processing',
          payout_id: payout.id,
          updated_at: new Date()
        }
      });

      return {
        payout_id: payout.id,
        total_amount: totalAmount / 100,
        commission_count: commissions.length,
        status: 'processing'
      };

    } catch (error) {
      console.error('Process payout error:', error);
      throw error;
    }
  }

  private static getServiceReferenceType(serviceType: string): string {
    const typeMap: Record<string, string> = {
      'vet_consultation': 'consultation',
      'vet_health_analysis': 'health_analysis',
      'vet_subscription_referral': 'subscription',
      'corporate_employee_subscription': 'subscription',
      'corporate_wellness_program': 'wellness_program'
    };
    
    return typeMap[serviceType] || 'unknown';
  }
}