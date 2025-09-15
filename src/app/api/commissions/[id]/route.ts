import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

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

// GET /api/commissions/[id] - Get specific commission details
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const commissionId = params.id;

    // Find commission with all related data
    const commission = await prisma.referralCommission.findUnique({
      where: { id: commissionId },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
            business_name: true,
            partner_type: true,
            rating_average: true,
            created_at: true
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
            health_id: true,
            breed: true,
            age: true
          }
        },
        partner_subscription: {
          select: {
            subscription_tier: true,
            commission_rate: true,
            status: true
          }
        }
      }
    });

    if (!commission) {
      return NextResponse.json({
        success: false,
        message: 'Commission not found'
      }, { status: 404 });
    }

    // Permission check
    if (!isAdmin(decoded.userType) && commission.partner_id !== decoded.userId) {
      return NextResponse.json({
        success: false,
        message: 'Access denied: You can only view your own commissions'
      }, { status: 403 });
    }

    // Calculate additional analytics
    const commissionHistory = await prisma.referralCommission.findMany({
      where: {
        partner_id: commission.partner_id,
        service_type: commission.service_type
      },
      select: {
        id: true,
        referral_amount: true,
        commission_amount: true,
        created_at: true,
        status: true
      },
      orderBy: { created_at: 'desc' },
      take: 10
    });

    const partnerStats = await prisma.referralCommission.aggregate({
      where: {
        partner_id: commission.partner_id,
        status: { in: ['paid', 'approved'] }
      },
      _sum: {
        commission_amount: true,
        referral_amount: true
      },
      _count: {
        _all: true
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        commission,
        related_data: {
          commission_history: commissionHistory,
          partner_statistics: {
            total_commissions_earned: partnerStats._sum.commission_amount || 0,
            total_referral_value: partnerStats._sum.referral_amount || 0,
            total_referrals: partnerStats._count._all,
            average_referral_value: partnerStats._count._all > 0 ? 
              (partnerStats._sum.referral_amount || 0) / partnerStats._count._all : 0
          }
        }
      }
    });

  } catch (error) {
    console.error('Error fetching commission details:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// PUT /api/commissions/[id] - Update commission status or details
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const commissionId = params.id;
    const body = await request.json();

    const {
      status,
      approval_notes,
      rejection_reason,
      paid_at,
      external_payment_id,
      metadata
    } = body;

    // Find existing commission
    const commission = await prisma.referralCommission.findUnique({
      where: { id: commissionId },
      include: {
        partner: {
          select: { name: true, business_name: true, email: true }
        }
      }
    });

    if (!commission) {
      return NextResponse.json({
        success: false,
        message: 'Commission not found'
      }, { status: 404 });
    }

    // Permission check
    const canUpdate = isAdmin(decoded.userType) || 
      (commission.partner_id === decoded.userId && ['pending', 'rejected'].includes(commission.status));

    if (!canUpdate) {
      return NextResponse.json({
        success: false,
        message: 'Access denied: Insufficient permissions to update this commission'
      }, { status: 403 });
    }

    // Validate status transitions
    if (status) {
      const validStatuses = ['pending', 'approved', 'paid', 'rejected', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({
          success: false,
          message: 'Invalid commission status'
        }, { status: 400 });
      }

      // Validate status transitions
      const validTransitions: { [key: string]: string[] } = {
        pending: ['approved', 'rejected', 'cancelled'],
        approved: ['paid', 'rejected', 'cancelled'],
        rejected: ['pending'], // Can be reconsidered
        cancelled: ['pending'], // Can be reactivated
        paid: [] // Final state
      };

      if (status !== commission.status && 
          !validTransitions[commission.status]?.includes(status)) {
        return NextResponse.json({
          success: false,
          message: `Invalid status transition from ${commission.status} to ${status}`
        }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    if (status !== undefined) {
      updateData.status = status;
      
      // Set timestamps based on status
      if (status === 'approved') {
        updateData.approved_at = new Date();
        updateData.approved_by = decoded.userId;
      } else if (status === 'paid') {
        updateData.paid_at = paid_at ? new Date(paid_at) : new Date();
        updateData.approved_at = commission.approved_at || new Date();
        updateData.approved_by = commission.approved_by || decoded.userId;
      } else if (status === 'rejected') {
        updateData.rejected_at = new Date();
        updateData.rejected_by = decoded.userId;
      }
    }

    if (approval_notes !== undefined) updateData.approval_notes = approval_notes;
    if (rejection_reason !== undefined) updateData.rejection_reason = rejection_reason;
    if (external_payment_id !== undefined) updateData.external_payment_id = external_payment_id;
    
    if (metadata !== undefined) {
      updateData.metadata = {
        ...commission.metadata,
        ...metadata,
        last_updated_by: decoded.userId,
        last_updated_at: new Date().toISOString()
      };
    }

    // Update commission
    const updatedCommission = await prisma.referralCommission.update({
      where: { id: commissionId },
      data: updateData,
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
        }
      }
    });

    console.log(`Commission ${status ? `status changed to ${status}` : 'updated'}: ${commissionId} (${commission.partner.business_name || commission.partner.name})`);

    return NextResponse.json({
      success: true,
      message: `Commission ${status ? `status updated to ${status}` : 'updated'} successfully`,
      data: {
        commission: updatedCommission,
        changes_applied: updateData
      }
    });

  } catch (error) {
    console.error('Error updating commission:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// DELETE /api/commissions/[id] - Delete commission (admin only)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    
    if (!isAdmin(decoded.userType)) {
      return NextResponse.json({
        success: false,
        message: 'Admin access required for commission deletion'
      }, { status: 403 });
    }

    const commissionId = params.id;

    // Find commission
    const commission = await prisma.referralCommission.findUnique({
      where: { id: commissionId },
      include: {
        partner: {
          select: { name: true, business_name: true }
        }
      }
    });

    if (!commission) {
      return NextResponse.json({
        success: false,
        message: 'Commission not found'
      }, { status: 404 });
    }

    // Prevent deletion of paid commissions
    if (commission.status === 'paid') {
      return NextResponse.json({
        success: false,
        message: 'Cannot delete paid commissions. Use cancellation instead.'
      }, { status: 400 });
    }

    // Delete commission
    await prisma.referralCommission.delete({
      where: { id: commissionId }
    });

    console.log(`Commission deleted: ${commissionId} (${commission.partner.business_name || commission.partner.name})`);

    return NextResponse.json({
      success: true,
      message: 'Commission deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting commission:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}