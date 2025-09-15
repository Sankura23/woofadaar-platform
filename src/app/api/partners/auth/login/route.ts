import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getPartnerByEmail } from '@/lib/demo-storage';

const prisma = new PrismaClient();

// Generate MFA code
function generateMFACode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Simple rate limiting (in production, use Redis)
const loginAttempts = new Map();

export async function POST(request: NextRequest) {
  try {
    const { email, password, mfaCode } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check rate limiting
    const attemptKey = `${clientIp}:${email}`;
    const attempts = loginAttempts.get(attemptKey) || { count: 0, lastAttempt: 0 };
    const now = Date.now();
    
    // Reset counter if last attempt was more than 15 minutes ago
    if (now - attempts.lastAttempt > 15 * 60 * 1000) {
      attempts.count = 0;
    }
    
    if (attempts.count >= 5) {
      await prisma.securityAuditLog.create({
        data: {
          action_type: 'login',
          resource_accessed: `partner:${email}`,
          success: false,
          failure_reason: 'Rate limit exceeded',
          ip_address: clientIp,
          user_agent: userAgent,
          risk_score: 80,
          flagged_for_review: true,
        }
      });
      
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Find partner - try demo storage first, then database
    let partner = await getPartnerByEmail(email.toLowerCase());
    
    if (!partner) {
      // Try database as fallback
      try {
        const dbPartner = await prisma.partner.findUnique({
          where: { email: email.toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            partner_type: true,
            status: true,
            verified: true,
            mfa_enabled: true,
            digital_certificate_hash: true,
            dog_id_access_level: true,
            emergency_access_enabled: true,
            compliance_status: true,
            last_active_at: true,
          }
        });
        if (dbPartner) {
          partner = dbPartner;
        }
      } catch (dbError) {
        console.warn('Database query failed, using demo storage only:', dbError);
      }
    }

    if (!partner) {
      attempts.count++;
      attempts.lastAttempt = now;
      loginAttempts.set(attemptKey, attempts);
      
      // Try to log to database, but don't fail if it's unavailable
      try {
        await prisma.securityAuditLog.create({
          data: {
            action_type: 'login',
            resource_accessed: `partner:${email}`,
            success: false,
            failure_reason: 'Partner not found',
            ip_address: clientIp,
            user_agent: userAgent,
            risk_score: 30,
          }
        });
      } catch (logError) {
        console.warn('Audit log failed:', logError);
      }
      
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check partner status
    if (partner.status !== 'approved' || !partner.verified) {
      // Try to log audit, but don't fail if database is unavailable
      try {
        await prisma.securityAuditLog.create({
          data: {
            partner_id: partner.id,
            action_type: 'login',
            resource_accessed: `partner:${email}`,
            success: false,
            failure_reason: 'Partner not approved or verified',
            ip_address: clientIp,
            user_agent: userAgent,
            risk_score: 20,
          }
        });
      } catch (logError) {
        console.warn('Audit log failed:', logError);
      }
      
      return NextResponse.json(
        { error: 'Partner account is not approved or verified' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = partner.password ? 
      await bcrypt.compare(password, partner.password) : 
      false;

    if (!isPasswordValid) {
      attempts.count++;
      attempts.lastAttempt = now;
      loginAttempts.set(attemptKey, attempts);
      
      await prisma.securityAuditLog.create({
        data: {
          partner_id: partner.id,
          action_type: 'login',
          resource_accessed: `partner:${email}`,
          success: false,
          failure_reason: 'Invalid password',
          ip_address: clientIp,
          user_agent: userAgent,
          risk_score: 40,
        }
      });
      
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Handle MFA if enabled (skip for demo storage partners)
    if (partner.mfa_enabled && partner.id.indexOf('partner-') !== 0) {
      if (!mfaCode) {
        // Generate and store MFA code (in production, use Redis or database)
        const code = generateMFACode();
        const mfaKey = `mfa:${partner.id}`;
        
        // Store MFA code with expiration (5 minutes)
        // In production, implement proper MFA code storage and sending
        console.log(`MFA Code for ${partner.email}: ${code}`); // For demo
        
        return NextResponse.json({
          requiresMFA: true,
          message: 'MFA code sent. Please provide the code to complete login.',
          partnerId: partner.id,
        }, { status: 200 });
      } else {
        // Verify MFA code
        // In production, implement proper MFA verification
        if (mfaCode !== '123456') { // Demo MFA code
          await prisma.securityAuditLog.create({
            data: {
              partner_id: partner.id,
              action_type: 'mfa_verification',
              resource_accessed: `partner:${email}`,
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
      }
    }

    // Generate JWT token
    const tokenPayload = {
      partnerId: partner.id,
      email: partner.email,
      name: partner.name,
      partnerType: partner.partner_type,
      accessLevel: partner.dog_id_access_level,
      emergencyAccess: partner.emergency_access_enabled,
      userType: 'partner',
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, {
      expiresIn: '8h', // Shorter expiry for partners
    });

    // Update last active time - try database, but don't fail if unavailable
    try {
      await prisma.partner.update({
        where: { id: partner.id },
        data: { last_active_at: new Date() }
      });
    } catch (updateError) {
      console.warn('Failed to update last active time:', updateError);
    }

    // Clear rate limiting on successful login
    loginAttempts.delete(attemptKey);

    // Log successful login - try database, but don't fail if unavailable
    try {
      await prisma.securityAuditLog.create({
        data: {
          partner_id: partner.id,
          action_type: 'login',
          resource_accessed: `partner:${email}`,
          success: true,
          ip_address: clientIp,
          user_agent: userAgent,
          risk_score: 0,
        }
      });
    } catch (logError) {
      console.warn('Audit log failed:', logError);
    }

    // Create notification for successful login - try database, but don't fail if unavailable
    try {
      await prisma.partnerNotification.create({
        data: {
          partner_id: partner.id,
          notification_type: 'security_alert',
          title: 'Successful Login',
          message: `You successfully logged in from ${clientIp}`,
          priority: 'low',
        }
      });
    } catch (notifyError) {
      console.warn('Notification creation failed:', notifyError);
    }

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
        complianceStatus: partner.compliance_status || 'compliant',
      },
      expiresIn: '8h',
      redirectTo: '/partner/dog-id-dashboard'
    });

  } catch (error) {
    console.error('Partner login error:', error);
    
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Log system error
    await prisma.securityAuditLog.create({
      data: {
        action_type: 'login',
        resource_accessed: 'partner_login_system',
        success: false,
        failure_reason: 'System error during login',
        ip_address: clientIp,
        user_agent: userAgent,
        risk_score: 15,
      }
    });

    return NextResponse.json(
      { error: 'Internal server error during authentication' },
      { status: 500 }
    );
  }
}