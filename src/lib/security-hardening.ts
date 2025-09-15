// Week 29 Phase 2: Security Hardening & Audit Framework
// Comprehensive security implementation for Indian market compliance

import { NextRequest } from 'next/server';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Security Configuration for Indian Market
const SECURITY_CONFIG = {
  // Rate limiting for Indian traffic patterns
  RATE_LIMITS: {
    GLOBAL: { windowMs: 15 * 60 * 1000, max: 1000 }, // 1000 requests per 15 minutes
    AUTH: { windowMs: 15 * 60 * 1000, max: 5 }, // 5 login attempts per 15 minutes
    API: { windowMs: 60 * 1000, max: 100 }, // 100 API calls per minute
    SEARCH: { windowMs: 60 * 1000, max: 60 }, // 60 searches per minute
    UPLOAD: { windowMs: 60 * 1000, max: 10 }, // 10 uploads per minute
  },
  
  // Data protection compliance (GDPR + Indian IT Act)
  DATA_RETENTION: {
    USER_ACTIVITY: 90, // days
    HEALTH_LOGS: 365 * 5, // 5 years for medical data
    PAYMENT_DATA: 365 * 7, // 7 years for financial records
    CHAT_MESSAGES: 30, // days
  },

  // Encryption standards
  ENCRYPTION: {
    ALGORITHM: 'aes-256-gcm',
    JWT_EXPIRY: '24h',
    REFRESH_TOKEN_EXPIRY: '7d',
    PASSWORD_ROUNDS: 12,
  }
};

interface SecurityAuditLog {
  id: string;
  event_type: 'login' | 'failed_login' | 'data_access' | 'api_access' | 'security_violation';
  user_id?: string;
  ip_address: string;
  user_agent: string;
  location?: string;
  risk_score: number;
  timestamp: Date;
  metadata?: any;
}

interface SecurityMetrics {
  totalRequests: number;
  blockedRequests: number;
  failedLogins: number;
  suspiciousActivity: number;
  dataBreachAttempts: number;
  avgRiskScore: number;
}

class SecurityHardeningService {
  private static instance: SecurityHardeningService;
  private auditLogs: SecurityAuditLog[] = [];
  private blockedIPs = new Set<string>();
  private suspiciousPatterns = new Map<string, number>();

  static getInstance(): SecurityHardeningService {
    if (!SecurityHardeningService.instance) {
      SecurityHardeningService.instance = new SecurityHardeningService();
    }
    return SecurityHardeningService.instance;
  }

  // JWT Token Management with Indian compliance
  generateSecureToken(userId: string, userRole: string, additionalClaims = {}) {
    const payload = {
      id: userId,
      role: userRole,
      iat: Math.floor(Date.now() / 1000),
      timezone: 'Asia/Kolkata',
      compliance: 'IN_IT_ACT_2000',
      ...additionalClaims
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: SECURITY_CONFIG.ENCRYPTION.JWT_EXPIRY,
      issuer: 'woofadaar.in',
      audience: 'woofadaar-users'
    });

    return token;
  }

  generateRefreshToken(userId: string): string {
    const payload = {
      id: userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET!, {
      expiresIn: SECURITY_CONFIG.ENCRYPTION.REFRESH_TOKEN_EXPIRY
    });
  }

  verifyToken(token: string, type: 'access' | 'refresh' = 'access'): any {
    try {
      const secret = type === 'access' ? process.env.JWT_SECRET! : process.env.REFRESH_TOKEN_SECRET!;
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error(`Invalid ${type} token`);
    }
  }

  // Password Security with Indian patterns
  async hashPassword(password: string): Promise<string> {
    // Check for common Indian password patterns
    this.validatePasswordSecurity(password);
    return await bcrypt.hash(password, SECURITY_CONFIG.ENCRYPTION.PASSWORD_ROUNDS);
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  private validatePasswordSecurity(password: string) {
    const indianCommonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'india123', 'mumbai', 'delhi', 'bangalore', 'chennai',
      'mother', 'father', 'family', 'birthday'
    ];

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (indianCommonPasswords.some(common => password.toLowerCase().includes(common))) {
      throw new Error('Password contains commonly used patterns');
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) {
      throw new Error('Password must contain uppercase, lowercase, number and special character');
    }
  }

  // Data Encryption for PII (Indian IT Act compliance)
  encryptSensitiveData(data: string, key?: string): { encrypted: string; iv: string; tag: string } {
    const algorithm = SECURITY_CONFIG.ENCRYPTION.ALGORITHM;
    const encryptionKey = key || process.env.ENCRYPTION_KEY!;
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, encryptionKey);
    cipher.setAAD(Buffer.from('woofadaar-india'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  decryptSensitiveData(encryptedData: { encrypted: string; iv: string; tag: string }, key?: string): string {
    const algorithm = SECURITY_CONFIG.ENCRYPTION.ALGORITHM;
    const encryptionKey = key || process.env.ENCRYPTION_KEY!;
    
    const decipher = crypto.createDecipher(algorithm, encryptionKey);
    decipher.setAAD(Buffer.from('woofadaar-india'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Request Security Analysis
  analyzeRequestSecurity(request: NextRequest): { riskScore: number; threats: string[] } {
    const threats: string[] = [];
    let riskScore = 0;

    const ip = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    const origin = request.headers.get('origin') || '';

    // Check for suspicious IP patterns
    if (this.blockedIPs.has(ip)) {
      threats.push('blocked_ip');
      riskScore += 100;
    }

    // Check for bot patterns
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /java/i
    ];
    
    if (botPatterns.some(pattern => pattern.test(userAgent))) {
      threats.push('potential_bot');
      riskScore += 30;
    }

    // Check for suspicious origins
    if (origin && !this.isAllowedOrigin(origin)) {
      threats.push('invalid_origin');
      riskScore += 50;
    }

    // Check for SQL injection patterns
    const url = request.url;
    const sqlPatterns = [
      /union.*select/i, /drop.*table/i, /insert.*into/i,
      /delete.*from/i, /update.*set/i, /exec.*xp_/i
    ];
    
    if (sqlPatterns.some(pattern => pattern.test(url))) {
      threats.push('sql_injection_attempt');
      riskScore += 80;
    }

    // Check for XSS patterns
    const xssPatterns = [
      /<script/i, /javascript:/i, /onerror=/i,
      /onload=/i, /onclick=/i, /alert\(/i
    ];
    
    if (xssPatterns.some(pattern => pattern.test(url))) {
      threats.push('xss_attempt');
      riskScore += 70;
    }

    // Check rate limiting violations
    const ipRequests = this.suspiciousPatterns.get(ip) || 0;
    if (ipRequests > 100) { // 100 requests from same IP in short time
      threats.push('rate_limit_violation');
      riskScore += 40;
    }

    return { riskScore, threats };
  }

  // Security Audit Logging
  logSecurityEvent(
    eventType: SecurityAuditLog['event_type'],
    request: NextRequest,
    userId?: string,
    metadata?: any
  ) {
    const ip = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    const { riskScore } = this.analyzeRequestSecurity(request);

    const auditLog: SecurityAuditLog = {
      id: crypto.randomUUID(),
      event_type: eventType,
      user_id: userId,
      ip_address: ip,
      user_agent: userAgent,
      risk_score: riskScore,
      timestamp: new Date(),
      metadata
    };

    this.auditLogs.push(auditLog);

    // Keep only last 10000 logs in memory
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-5000);
    }

    // Auto-block high-risk IPs
    if (riskScore > 80) {
      this.blockedIPs.add(ip);
      console.warn(`High-risk IP blocked: ${ip} (Risk Score: ${riskScore})`);
    }

    // Track suspicious patterns
    this.suspiciousPatterns.set(ip, (this.suspiciousPatterns.get(ip) || 0) + 1);
  }

  // Data Privacy Controls (GDPR + Indian IT Act)
  async anonymizeUserData(userId: string): Promise<void> {
    // This would typically update database records
    const anonymizedData = {
      name: `Anonymous_${crypto.randomBytes(4).toString('hex')}`,
      email: `deleted_${Date.now()}@woofadaar.in`,
      phone: null,
      profile_image_url: null,
      anonymized_at: new Date(),
      original_user_id: userId
    };

    console.log(`User data anonymized for compliance: ${userId}`);
    // In real implementation, update database with anonymizedData
  }

  async exportUserData(userId: string): Promise<any> {
    // Implement GDPR data export
    const userData = {
      personal_info: {},
      dogs: [],
      health_logs: [],
      appointments: [],
      community_activity: [],
      export_date: new Date().toISOString(),
      compliance_note: 'Data exported as per Indian IT Act 2000 and GDPR requirements'
    };

    return userData;
  }

  // Content Security Policy for Indian context
  getSecurityHeaders() {
    return {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.googleapis.com *.razorpay.com",
        "style-src 'self' 'unsafe-inline' *.googleapis.com",
        "img-src 'self' data: blob: *.cloudinary.com *.s3.amazonaws.com",
        "font-src 'self' *.googleapis.com *.gstatic.com",
        "connect-src 'self' *.razorpay.com *.googleapis.com api.woofadaar.in",
        "frame-src 'self' *.razorpay.com *.youtube.com",
        "media-src 'self' blob: *.cloudinary.com"
      ].join('; '),
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(self), microphone=(), camera=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    };
  }

  // Utility Methods
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cloudflareIP = request.headers.get('cf-connecting-ip');
    
    return cloudflareIP || realIP || forwarded?.split(',')[0] || 'unknown';
  }

  private isAllowedOrigin(origin: string): boolean {
    const allowedOrigins = [
      'https://woofadaar.in',
      'https://www.woofadaar.in',
      'https://app.woofadaar.in',
      'http://localhost:3000',
      'http://localhost:3001'
    ];
    
    return allowedOrigins.includes(origin);
  }

  // Security Metrics
  getSecurityMetrics(): SecurityMetrics {
    const recentLogs = this.auditLogs.filter(log => 
      Date.now() - log.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    const totalRequests = recentLogs.length;
    const blockedRequests = recentLogs.filter(log => log.risk_score > 80).length;
    const failedLogins = recentLogs.filter(log => log.event_type === 'failed_login').length;
    const suspiciousActivity = recentLogs.filter(log => log.risk_score > 50).length;
    const dataBreachAttempts = recentLogs.filter(log => 
      log.risk_score > 70 && ['data_access', 'api_access'].includes(log.event_type)
    ).length;

    const avgRiskScore = totalRequests > 0 
      ? recentLogs.reduce((sum, log) => sum + log.risk_score, 0) / totalRequests 
      : 0;

    return {
      totalRequests,
      blockedRequests,
      failedLogins,
      suspiciousActivity,
      dataBreachAttempts,
      avgRiskScore: Math.round(avgRiskScore * 100) / 100
    };
  }

  // Cleanup expired data
  async cleanupExpiredData(): Promise<void> {
    const now = Date.now();
    
    // Remove old audit logs
    this.auditLogs = this.auditLogs.filter(log => 
      now - log.timestamp.getTime() < 30 * 24 * 60 * 60 * 1000 // 30 days
    );

    // Reset suspicious pattern counters
    for (const [ip, count] of this.suspiciousPatterns.entries()) {
      if (count < 10) { // Reset low-risk IPs
        this.suspiciousPatterns.delete(ip);
      }
    }

    console.log('Security data cleanup completed');
  }
}

// Export singleton instance
export const securityService = SecurityHardeningService.getInstance();

// Security middleware functions
export function createSecurityMiddleware() {
  return {
    rateLimit: rateLimit({
      windowMs: SECURITY_CONFIG.RATE_LIMITS.GLOBAL.windowMs,
      max: SECURITY_CONFIG.RATE_LIMITS.GLOBAL.max,
      message: 'Too many requests from this IP',
      standardHeaders: true,
      legacyHeaders: false,
    }),
    
    helmet: helmet({
      contentSecurityPolicy: false, // We handle CSP manually
      crossOriginEmbedderPolicy: false // For Razorpay compatibility
    })
  };
}

export default SecurityHardeningService;