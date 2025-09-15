import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// In production, use Redis or database for MFA code storage
const mfaCodes = new Map();

export async function POST(request: NextRequest) {
  try {
    const { partnerId, mfaCode } = await request.json();
    
    if (!partnerId || !mfaCode) {
      return NextResponse.json(
        { error: 'Partner ID and MFA code are required' },
        { status: 400 }
      );
    }

    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Find partner
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        email: true,
        name: true,
        partner_type: true,
        status: true,
        verified: true,
        mfa_enabled: true,
        dog_id_access_level: true,
        emergency_access_enabled: true,
        compliance_status: true,
      }
    });

    if (!partner) {
      await prisma.securityAuditLog.create({
        data: {
          action_type: 'mfa_verification',
          resource_accessed: `partner:${partnerId}`,
          success: false,
          failure_reason: 'Partner not found',
          ip_address: clientIp,
          user_agent: userAgent,
          risk_score: 50,
          flagged_for_review: true,
        }
      });
      
      return NextResponse.json(
        { error: 'Invalid partner' },
        { status: 404 }
      );
    }

    if (!partner.mfa_enabled) {
      return NextResponse.json(
        { error: 'MFA is not enabled for this partner' },
        { status: 400 }
      );
    }

    // Verify MFA code
    const storedCode = mfaCodes.get(`mfa:${partnerId}`);
    
    if (!storedCode) {
      await prisma.securityAuditLog.create({
        data: {
          partner_id: partner.id,
          action_type: 'mfa_verification',
          resource_accessed: `partner:${partner.email}`,
          success: false,
          failure_reason: 'No MFA code found or expired',
          ip_address: clientIp,
          user_agent: userAgent,
          risk_score: 40,
        }
      });
      
      return NextResponse.json(
        { error: 'MFA code not found or expired. Please request a new code.' },
        { status: 400 }
      );
    }

    // Check if code has expired (5 minutes)
    if (Date.now() - storedCode.timestamp > 5 * 60 * 1000) {
      mfaCodes.delete(`mfa:${partnerId}`);
      
      await prisma.securityAuditLog.create({
        data: {
          partner_id: partner.id,
          action_type: 'mfa_verification',
          resource_accessed: `partner:${partner.email}`,
          success: false,
          failure_reason: 'MFA code expired',
          ip_address: clientIp,
          user_agent: userAgent,
          risk_score: 30,
        }
      });
      
      return NextResponse.json(
        { error: 'MFA code has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    // Verify the code
    if (storedCode.code !== mfaCode) {
      await prisma.securityAuditLog.create({
        data: {
          partner_id: partner.id,
          action_type: 'mfa_verification',
          resource_accessed: `partner:${partner.email}`,
          success: false,
          failure_reason: 'Invalid MFA code',
          ip_address: clientIp,
          user_agent: userAgent,
          risk_score: 60,
          flagged_for_review: true,
        }
      });
      
      return NextResponse.json(
        { error: 'Invalid MFA code' },
        { status: 401 }
      );
    }

    // MFA verified successfully, remove the code
    mfaCodes.delete(`mfa:${partnerId}`);

    // Generate JWT token
    const tokenPayload = {
      partnerId: partner.id,
      email: partner.email,
      name: partner.name,
      partnerType: partner.partner_type,
      accessLevel: partner.dog_id_access_level,
      emergencyAccess: partner.emergency_access_enabled,
      userType: 'partner',
      mfaVerified: true,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, {
      expiresIn: '8h',
    });

    // Update last active time
    await prisma.partner.update({
      where: { id: partner.id },
      data: { last_active_at: new Date() }
    });

    // Log successful MFA verification
    await prisma.securityAuditLog.create({
      data: {
        partner_id: partner.id,
        action_type: 'mfa_verification',
        resource_accessed: `partner:${partner.email}`,
        success: true,
        ip_address: clientIp,
        user_agent: userAgent,
        risk_score: 0,
      }
    });

    // Create notification for successful MFA login
    await prisma.partnerNotification.create({
      data: {
        partner_id: partner.id,
        notification_type: 'security_alert',
        title: 'MFA Login Successful',
        message: `You successfully completed MFA verification from ${clientIp}`,
        priority: 'normal',
      }
    });

    return NextResponse.json({
      success: true,
      token,
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        partnerType: partner.partner_type,
        accessLevel: partner.dog_id_access_level,
        emergencyAccess: partner.emergency_access_enabled,
        complianceStatus: partner.compliance_status,
      },
      expiresIn: '8h',
    });

  } catch (error) {
    console.error('MFA verification error:', error);
    
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Log system error
    await prisma.securityAuditLog.create({
      data: {
        action_type: 'mfa_verification',
        resource_accessed: 'mfa_verification_system',
        success: false,
        failure_reason: 'System error during MFA verification',
        ip_address: clientIp,
        user_agent: userAgent,
        risk_score: 25,
      }
    });

    return NextResponse.json(
      { error: 'Internal server error during MFA verification' },
      { status: 500 }
    );
  }
}

// Generate and send MFA code
export async function PUT(request: NextRequest) {
  try {
    const { partnerId } = await request.json();
    
    if (!partnerId) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      );
    }

    // Find partner
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        email: true,
        name: true,
        mfa_enabled: true,
        phone: true,
      }
    });

    if (!partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    if (!partner.mfa_enabled) {
      return NextResponse.json(
        { error: 'MFA is not enabled for this partner' },
        { status: 400 }
      );
    }

    // Generate new MFA code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store the code with timestamp
    mfaCodes.set(`mfa:${partnerId}`, {
      code,
      timestamp: Date.now(),
    });

    // In production, send SMS or email with the MFA code
    console.log(`MFA Code for ${partner.email}: ${code}`);

    // Create notification
    await prisma.partnerNotification.create({
      data: {
        partner_id: partner.id,
        notification_type: 'security_alert',
        title: 'New MFA Code Generated',
        message: `A new MFA code was generated for your account`,
        priority: 'normal',
      }
    });

    return NextResponse.json({
      success: true,
      message: 'MFA code sent successfully',
      expiresIn: '5 minutes',
    });

  } catch (error) {
    console.error('MFA code generation error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error during MFA code generation' },
      { status: 500 }
    );
  }
}