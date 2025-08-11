import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

interface DecodedToken {
  userId?: string;
  partnerId?: string;
  email: string;
  userType?: string;
}

async function verifyToken(request: NextRequest): Promise<{ userId?: string; partnerId?: string; isAdmin?: boolean } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    
    // Check if user is admin (you can modify this logic based on your admin system)
    const isAdmin = decoded.email === 'admin@woofadaar.com' || decoded.userType === 'admin';
    
    return {
      userId: decoded.userId,
      partnerId: decoded.partnerId,
      isAdmin
    };
  } catch (error) {
    return null;
  }
}

// Verification workflow logic
async function processPartnerVerification(partnerId: string, action: string, admin_notes?: string) {
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId }
  });

  if (!partner) {
    throw new Error('Partner not found');
  }

  let updateData: any = {
    updated_at: new Date(),
    admin_notes: admin_notes || partner.admin_notes
  };

  switch (action) {
    case 'approve':
      if (partner.status === 'approved') {
        throw new Error('Partner is already approved');
      }
      updateData = {
        ...updateData,
        status: 'approved',
        verified: true,
        verification_date: new Date(),
        health_id_access: true, // Approved partners get Health ID access
        partnership_tier: partner.partnership_tier || 'basic'
      };
      break;

    case 'reject':
      if (partner.status === 'rejected') {
        throw new Error('Partner is already rejected');
      }
      updateData = {
        ...updateData,
        status: 'rejected',
        verified: false,
        health_id_access: false
      };
      break;

    case 'suspend':
      if (partner.status === 'suspended') {
        throw new Error('Partner is already suspended');
      }
      updateData = {
        ...updateData,
        status: 'suspended',
        health_id_access: false,
        subscription_status: 'suspended'
      };
      break;

    case 'reactivate':
      if (partner.status === 'approved') {
        throw new Error('Partner is already active');
      }
      updateData = {
        ...updateData,
        status: 'approved',
        verified: true,
        health_id_access: true,
        subscription_status: 'active'
      };
      break;

    case 'upgrade_tier':
      const nextTier = partner.partnership_tier === 'basic' ? 'premium' : 
                      partner.partnership_tier === 'premium' ? 'enterprise' : 'enterprise';
      updateData = {
        ...updateData,
        partnership_tier: nextTier,
        commission_rate: nextTier === 'premium' ? 0.15 : nextTier === 'enterprise' ? 0.20 : 0.10
      };
      break;

    case 'downgrade_tier':
      const prevTier = partner.partnership_tier === 'enterprise' ? 'premium' : 
                      partner.partnership_tier === 'premium' ? 'basic' : 'basic';
      updateData = {
        ...updateData,
        partnership_tier: prevTier,
        commission_rate: prevTier === 'premium' ? 0.15 : prevTier === 'basic' ? 0.10 : 0.20
      };
      break;

    default:
      throw new Error('Invalid verification action');
  }

  return await prisma.partner.update({
    where: { id: partnerId },
    data: updateData
  });
}

// POST /api/partners/verify - Partner verification workflow
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
    const { partner_id, action, admin_notes, tier_change } = body;

    // Validate required fields
    if (!partner_id) {
      return NextResponse.json({
        success: false,
        message: 'Partner ID is required'
      }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({
        success: false,
        message: 'Action is required'
      }, { status: 400 });
    }

    // Check if user has permission (admin or the partner themselves for certain actions)
    const allowedActions = ['approve', 'reject', 'suspend', 'reactivate', 'upgrade_tier', 'downgrade_tier'];
    if (!allowedActions.includes(action)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid action'
      }, { status: 400 });
    }

    // Admin-only actions
    const adminOnlyActions = ['approve', 'reject', 'suspend', 'upgrade_tier', 'downgrade_tier'];
    if (adminOnlyActions.includes(action) && !auth.isAdmin) {
      return NextResponse.json({
        success: false,
        message: 'Admin privileges required for this action'
      }, { status: 403 });
    }

    // Partner can only reactivate their own account
    if (action === 'reactivate' && !auth.isAdmin && auth.partnerId !== partner_id) {
      return NextResponse.json({
        success: false,
        message: 'You can only reactivate your own account'
      }, { status: 403 });
    }

    // Process the verification
    const updatedPartner = await processPartnerVerification(partner_id, action, admin_notes);

    // Send notification email (mock - implement with your email service)
    const emailNotification = {
      to: updatedPartner.email,
      subject: `Woofadaar Partnership Status Update`,
      template: getEmailTemplate(action, updatedPartner),
      priority: 'high'
    };

    console.log('Email notification queued:', emailNotification);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user_id: auth.userId || 'admin',
        action: `partner_${action}`,
        details: {
          partner_id,
          partner_name: updatedPartner.name,
          partner_email: updatedPartner.email,
          old_status: body.old_status,
          new_status: updatedPartner.status,
          admin_notes: admin_notes,
          timestamp: new Date().toISOString()
        }
      }
    }).catch(err => {
      console.log('Audit log creation failed:', err);
    });

    return NextResponse.json({
      success: true,
      message: getSuccessMessage(action, updatedPartner),
      data: {
        partner: {
          id: updatedPartner.id,
          name: updatedPartner.name,
          email: updatedPartner.email,
          status: updatedPartner.status,
          verified: updatedPartner.verified,
          partnership_tier: updatedPartner.partnership_tier,
          verification_date: updatedPartner.verification_date,
          health_id_access: updatedPartner.health_id_access,
          commission_rate: updatedPartner.commission_rate
        }
      },
      next_steps: getNextSteps(action, updatedPartner)
    });

  } catch (error) {
    console.error('Partner verification error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

// GET /api/partners/verify - Get verification queue and partner verification details
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
    const tier = searchParams.get('tier');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    let whereClause: any = {};

    // If specific partner requested
    if (partner_id) {
      whereClause.id = partner_id;
    }

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    // Filter by tier
    if (tier) {
      whereClause.partnership_tier = tier;
    }

    // Non-admin users can only see their own verification status
    if (!auth.isAdmin && auth.partnerId) {
      whereClause.id = auth.partnerId;
    }

    const [partners, totalCount] = await Promise.all([
      prisma.partner.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          partner_type: true,
          business_name: true,
          location: true,
          status: true,
          verified: true,
          partnership_tier: true,
          kci_verified: true,
          rating_average: true,
          rating_count: true,
          commission_rate: true,
          verification_date: true,
          health_id_access: true,
          admin_notes: true,
          created_at: true,
          updated_at: true,
          total_appointments: true,
          monthly_revenue: true
        }
      }),
      prisma.partner.count({ where: whereClause })
    ]);

    // Get verification statistics (admin only)
    let stats = null;
    if (auth.isAdmin) {
      stats = await prisma.partner.groupBy({
        by: ['status'],
        _count: { id: true }
      });
    }

    return NextResponse.json({
      success: true,
      data: partners,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      statistics: stats,
      verification_workflow: {
        pending_review: partners.filter(p => p.status === 'pending').length,
        approved: partners.filter(p => p.status === 'approved').length,
        rejected: partners.filter(p => p.status === 'rejected').length,
        suspended: partners.filter(p => p.status === 'suspended').length
      }
    });

  } catch (error) {
    console.error('Partner verification fetch error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper functions
function getEmailTemplate(action: string, partner: any) {
  const templates = {
    approve: `Congratulations! Your Woofadaar partnership application has been approved. You now have access to Health ID verification and can start booking appointments.`,
    reject: `We regret to inform you that your Woofadaar partnership application has been rejected. Please contact support for more information.`,
    suspend: `Your Woofadaar partnership has been temporarily suspended. Please contact support to resolve any issues.`,
    reactivate: `Great news! Your Woofadaar partnership has been reactivated. You can now resume using all partner features.`,
    upgrade_tier: `Your partnership tier has been upgraded to ${partner.partnership_tier}. Enjoy enhanced features and higher commission rates!`,
    downgrade_tier: `Your partnership tier has been changed to ${partner.partnership_tier}. Contact support if you have questions.`
  };
  
  return templates[action as keyof typeof templates] || 'Your partnership status has been updated.';
}

function getSuccessMessage(action: string, partner: any) {
  const messages = {
    approve: `Partner ${partner.name} has been approved successfully`,
    reject: `Partner ${partner.name} has been rejected`,
    suspend: `Partner ${partner.name} has been suspended`,
    reactivate: `Partner ${partner.name} has been reactivated`,
    upgrade_tier: `Partner ${partner.name} has been upgraded to ${partner.partnership_tier} tier`,
    downgrade_tier: `Partner ${partner.name} has been changed to ${partner.partnership_tier} tier`
  };
  
  return messages[action as keyof typeof messages] || 'Partner verification action completed';
}

function getNextSteps(action: string, partner: any) {
  const nextSteps = {
    approve: [
      'Partner can now access Health ID verification',
      'Partner can start booking appointments',
      'Partner profile will be visible in directory',
      'Commission tracking is now active'
    ],
    reject: [
      'Partner will receive rejection notification',
      'Partner can reapply after addressing concerns',
      'Admin notes have been recorded for future reference'
    ],
    suspend: [
      'All partner activities are temporarily disabled',
      'Partner will receive suspension notification',
      'Partner can contact support for resolution'
    ],
    reactivate: [
      'All partner features are now restored',
      'Partner can resume normal activities',
      'Appointment booking is re-enabled'
    ],
    upgrade_tier: [
      'Higher commission rates are now active',
      'Enhanced features are available',
      'Partner dashboard updated with new tier benefits'
    ],
    downgrade_tier: [
      'Commission rates adjusted to new tier',
      'Some premium features may be restricted',
      'Partner can work towards tier upgrade'
    ]
  };
  
  return nextSteps[action as keyof typeof nextSteps] || [];
}