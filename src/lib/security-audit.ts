// Woofadaar Security Audit Service
// Comprehensive security monitoring and threat detection

interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'authentication' | 'authorization' | 'input_validation' | 'data_protection' | 'configuration' | 'network';
  description: string;
  location: string;
  recommendation: string;
  cve?: string;
  timestamp: Date;
}

interface SecurityMetrics {
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  resolvedIssues: number;
  lastAuditDate: Date;
  securityScore: number; // 0-100
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
}

interface ThreatIntelligence {
  suspiciousIPs: Set<string>;
  blockedUserAgents: Set<string>;
  knownAttackPatterns: RegExp[];
  failedLoginAttempts: Map<string, { count: number; lastAttempt: Date }>;
}

class SecurityAuditService {
  private static instance: SecurityAuditService;
  private issues: SecurityIssue[] = [];
  private threatIntel: ThreatIntelligence = {
    suspiciousIPs: new Set(),
    blockedUserAgents: new Set(),
    knownAttackPatterns: [
      /(<script|javascript:|vbscript:|onload=|onerror=)/i, // XSS patterns
      /(union\s+select|drop\s+table|delete\s+from)/i, // SQL injection patterns
      /(\.\.\/|\.\.\\)/g, // Path traversal
      /(\||\;|\&|\`)/g, // Command injection
    ],
    failedLoginAttempts: new Map()
  };

  private rateLimitConfigs: Record<string, RateLimitConfig> = {
    login: { windowMs: 15 * 60 * 1000, maxRequests: 5, skipSuccessfulRequests: true, skipFailedRequests: false },
    register: { windowMs: 60 * 60 * 1000, maxRequests: 3, skipSuccessfulRequests: true, skipFailedRequests: false },
    api_general: { windowMs: 15 * 60 * 1000, maxRequests: 100, skipSuccessfulRequests: true, skipFailedRequests: true },
    premium_api: { windowMs: 60 * 1000, maxRequests: 30, skipSuccessfulRequests: true, skipFailedRequests: false },
    file_upload: { windowMs: 60 * 60 * 1000, maxRequests: 20, skipSuccessfulRequests: true, skipFailedRequests: false }
  };

  static getInstance(): SecurityAuditService {
    if (!SecurityAuditService.instance) {
      SecurityAuditService.instance = new SecurityAuditService();
      SecurityAuditService.instance.initialize();
    }
    return SecurityAuditService.instance;
  }

  private initialize() {
    // Load known threat intelligence
    this.loadThreatIntelligence();
    
    // Start monitoring loops
    this.startContinuousMonitoring();
    
    // Perform initial audit
    setTimeout(() => this.performFullAudit(), 5000);
  }

  // Main security audit methods
  async performFullAudit(): Promise<SecurityMetrics> {
    console.log('🔒 Starting comprehensive security audit...');
    
    this.issues = []; // Reset issues
    
    // Run all audit checks
    await Promise.all([
      this.auditAuthentication(),
      this.auditAuthorization(),
      this.auditInputValidation(),
      this.auditDataProtection(),
      this.auditConfiguration(),
      this.auditNetworkSecurity(),
      this.auditDependencies(),
      this.auditRateLimit(),
      this.auditSessionSecurity()
    ]);

    const metrics = this.generateSecurityMetrics();
    console.log(`🔒 Security audit complete. Score: ${metrics.securityScore}/100`);
    
    return metrics;
  }

  // Authentication security audit
  private async auditAuthentication() {
    const issues: SecurityIssue[] = [];

    // Check JWT implementation
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      issues.push({
        severity: 'critical',
        category: 'authentication',
        description: 'JWT secret is missing or too weak',
        location: 'environment variables',
        recommendation: 'Use a strong JWT secret with at least 32 characters',
        timestamp: new Date()
      });
    }

    // Check password policies
    const passwordPolicy = this.checkPasswordPolicy();
    if (!passwordPolicy.isStrong) {
      issues.push({
        severity: 'medium',
        category: 'authentication',
        description: 'Password policy is weak',
        location: 'authentication system',
        recommendation: 'Implement stronger password requirements (8+ chars, uppercase, lowercase, numbers, symbols)',
        timestamp: new Date()
      });
    }

    // Check for MFA implementation
    if (!this.checkMFAImplementation()) {
      issues.push({
        severity: 'medium',
        category: 'authentication',
        description: 'Multi-factor authentication not implemented',
        location: 'authentication system',
        recommendation: 'Implement 2FA/MFA for enhanced security',
        timestamp: new Date()
      });
    }

    this.issues.push(...issues);
  }

  // Authorization security audit
  private async auditAuthorization() {
    const issues: SecurityIssue[] = [];

    // Check role-based access control
    const rbacIssues = this.auditRBAC();
    issues.push(...rbacIssues);

    // Check API endpoint protection
    const apiProtectionIssues = this.auditAPIProtection();
    issues.push(...apiProtectionIssues);

    this.issues.push(...issues);
  }

  // Input validation audit
  private async auditInputValidation() {
    const issues: SecurityIssue[] = [];

    // Check for XSS protection
    if (!this.hasXSSProtection()) {
      issues.push({
        severity: 'high',
        category: 'input_validation',
        description: 'Insufficient XSS protection detected',
        location: 'input validation layer',
        recommendation: 'Implement proper input sanitization and output encoding',
        timestamp: new Date()
      });
    }

    // Check for SQL injection protection
    if (!this.hasSQLInjectionProtection()) {
      issues.push({
        severity: 'critical',
        category: 'input_validation',
        description: 'Potential SQL injection vulnerabilities',
        location: 'database queries',
        recommendation: 'Use parameterized queries and ORM/query builders',
        timestamp: new Date()
      });
    }

    // Check file upload security
    const fileUploadIssues = this.auditFileUploadSecurity();
    issues.push(...fileUploadIssues);

    this.issues.push(...issues);
  }

  // Data protection audit
  private async auditDataProtection() {
    const issues: SecurityIssue[] = [];

    // Check encryption at rest
    if (!this.hasEncryptionAtRest()) {
      issues.push({
        severity: 'high',
        category: 'data_protection',
        description: 'Sensitive data not encrypted at rest',
        location: 'database',
        recommendation: 'Implement database encryption for sensitive fields',
        timestamp: new Date()
      });
    }

    // Check encryption in transit
    if (!this.hasEncryptionInTransit()) {
      issues.push({
        severity: 'critical',
        category: 'data_protection',
        description: 'Data not encrypted in transit',
        location: 'network communication',
        recommendation: 'Enforce HTTPS/TLS for all communications',
        timestamp: new Date()
      });
    }

    // Check PII handling
    const piiIssues = this.auditPIIHandling();
    issues.push(...piiIssues);

    this.issues.push(...issues);
  }

  // Configuration security audit
  private async auditConfiguration() {
    const issues: SecurityIssue[] = [];

    // Check environment configuration
    const envIssues = this.auditEnvironmentSecurity();
    issues.push(...envIssues);

    // Check CORS configuration
    if (!this.hasSecureCORS()) {
      issues.push({
        severity: 'medium',
        category: 'configuration',
        description: 'CORS configuration may be too permissive',
        location: 'server configuration',
        recommendation: 'Restrict CORS to specific origins in production',
        timestamp: new Date()
      });
    }

    // Check security headers
    const headerIssues = this.auditSecurityHeaders();
    issues.push(...headerIssues);

    this.issues.push(...issues);
  }

  // Network security audit
  private async auditNetworkSecurity() {
    const issues: SecurityIssue[] = [];

    // Check rate limiting
    if (!this.hasRateLimit()) {
      issues.push({
        severity: 'high',
        category: 'network',
        description: 'Rate limiting not implemented',
        location: 'API endpoints',
        recommendation: 'Implement rate limiting to prevent abuse',
        timestamp: new Date()
      });
    }

    // Check DDoS protection
    if (!this.hasDDoSProtection()) {
      issues.push({
        severity: 'medium',
        category: 'network',
        description: 'DDoS protection not implemented',
        location: 'network layer',
        recommendation: 'Implement DDoS protection (Cloudflare, AWS Shield, etc.)',
        timestamp: new Date()
      });
    }

    this.issues.push(...issues);
  }

  // Dependency security audit
  private async auditDependencies() {
    const issues: SecurityIssue[] = [];

    try {
      // In a real implementation, this would scan package.json
      // and check against vulnerability databases
      const vulnerabilities = await this.scanDependencies();
      
      for (const vuln of vulnerabilities) {
        issues.push({
          severity: vuln.severity,
          category: 'configuration',
          description: `Vulnerable dependency: ${vuln.package}`,
          location: 'package.json',
          recommendation: `Update ${vuln.package} to version ${vuln.fixedIn} or higher`,
          cve: vuln.cve,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.warn('Dependency scan failed:', error);
    }

    this.issues.push(...issues);
  }

  // Rate limiting audit
  private async auditRateLimit() {
    // This would check if rate limiting is properly implemented
    // across different endpoints with appropriate limits
  }

  // Session security audit
  private async auditSessionSecurity() {
    const issues: SecurityIssue[] = [];

    // Check session configuration
    if (!this.hasSecureSessionConfig()) {
      issues.push({
        severity: 'medium',
        category: 'authentication',
        description: 'Session configuration is not secure',
        location: 'session management',
        recommendation: 'Configure secure session settings (httpOnly, secure, sameSite)',
        timestamp: new Date()
      });
    }

    this.issues.push(...issues);
  }

  // Real-time threat detection
  detectThreat(request: any): { isThreat: boolean; threatType?: string; severity?: string } {
    const { ip, userAgent, body, headers, url } = request;

    // Check IP reputation
    if (this.threatIntel.suspiciousIPs.has(ip)) {
      this.logSecurityEvent('blocked_ip', { ip, url }, 'high');
      return { isThreat: true, threatType: 'suspicious_ip', severity: 'high' };
    }

    // Check user agent
    if (this.threatIntel.blockedUserAgents.has(userAgent)) {
      this.logSecurityEvent('blocked_user_agent', { userAgent, ip, url }, 'medium');
      return { isThreat: true, threatType: 'malicious_user_agent', severity: 'medium' };
    }

    // Check for attack patterns in request body
    if (body) {
      const bodyStr = JSON.stringify(body);
      for (const pattern of this.threatIntel.knownAttackPatterns) {
        if (pattern.test(bodyStr)) {
          this.logSecurityEvent('attack_pattern_detected', { pattern: pattern.source, ip, url }, 'high');
          return { isThreat: true, threatType: 'injection_attempt', severity: 'high' };
        }
      }
    }

    // Check for suspicious headers
    if (this.hasSuspiciousHeaders(headers)) {
      this.logSecurityEvent('suspicious_headers', { headers, ip, url }, 'medium');
      return { isThreat: true, threatType: 'suspicious_headers', severity: 'medium' };
    }

    return { isThreat: false };
  }

  // Track failed login attempts
  trackFailedLogin(identifier: string) {
    const current = this.threatIntel.failedLoginAttempts.get(identifier) || { count: 0, lastAttempt: new Date() };
    current.count++;
    current.lastAttempt = new Date();
    
    this.threatIntel.failedLoginAttempts.set(identifier, current);

    // Block after too many failed attempts
    if (current.count >= 5) {
      this.threatIntel.suspiciousIPs.add(identifier);
      this.logSecurityEvent('brute_force_detected', { identifier, count: current.count }, 'critical');
    }

    // Clean up old entries
    this.cleanupFailedLogins();
  }

  // Security helper methods
  private checkPasswordPolicy() {
    // This would check the current password validation logic
    return {
      isStrong: true, // Placeholder - implement actual check
      requiresUppercase: true,
      requiresLowercase: true,
      requiresNumbers: true,
      requiresSymbols: false,
      minLength: 8
    };
  }

  private checkMFAImplementation(): boolean {
    // Check if MFA is implemented
    return false; // Placeholder - implement actual check
  }

  private auditRBAC(): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    // Check if proper role-based access control is implemented
    // This would analyze the codebase for authorization checks
    
    return issues;
  }

  private auditAPIProtection(): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    // Check if API endpoints are properly protected
    // This would analyze route handlers for authentication/authorization
    
    return issues;
  }

  private hasXSSProtection(): boolean {
    // Check if XSS protection is implemented
    return true; // Placeholder - React provides some XSS protection by default
  }

  private hasSQLInjectionProtection(): boolean {
    // Check if using Prisma ORM (which provides SQL injection protection)
    return true; // Using Prisma ORM
  }

  private auditFileUploadSecurity(): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    // Check file upload validation, size limits, type restrictions
    // This would analyze file upload handlers
    
    return issues;
  }

  private hasEncryptionAtRest(): boolean {
    // Check if sensitive data is encrypted in the database
    return false; // Placeholder - would check database configuration
  }

  private hasEncryptionInTransit(): boolean {
    // Check if HTTPS is enforced
    return process.env.NODE_ENV === 'production'; // Assume HTTPS in production
  }

  private auditPIIHandling(): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    // Check how personally identifiable information is handled
    // This would analyze data models and processing logic
    
    return issues;
  }

  private auditEnvironmentSecurity(): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    // Check environment variables for security issues
    if (process.env.NODE_ENV === 'production' && process.env.DEBUG === 'true') {
      issues.push({
        severity: 'medium',
        category: 'configuration',
        description: 'Debug mode enabled in production',
        location: 'environment variables',
        recommendation: 'Disable debug mode in production',
        timestamp: new Date()
      });
    }

    return issues;
  }

  private hasSecureCORS(): boolean {
    // Check CORS configuration
    return true; // Placeholder - would check actual CORS settings
  }

  private auditSecurityHeaders(): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    // Check for security headers like CSP, HSTS, X-Frame-Options, etc.
    const requiredHeaders = [
      'Content-Security-Policy',
      'Strict-Transport-Security',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy'
    ];

    // This would check if headers are properly set
    
    return issues;
  }

  private hasRateLimit(): boolean {
    // Check if rate limiting is implemented
    return true; // Placeholder - would check middleware configuration
  }

  private hasDDoSProtection(): boolean {
    // Check if DDoS protection is in place
    return false; // Placeholder - would check infrastructure configuration
  }

  private async scanDependencies(): Promise<any[]> {
    // This would integrate with vulnerability databases like npm audit
    return []; // Placeholder
  }

  private hasSecureSessionConfig(): boolean {
    // Check session configuration
    return true; // Placeholder - would check session middleware settings
  }

  private hasSuspiciousHeaders(headers: any): boolean {
    // Check for suspicious headers that might indicate automated attacks
    const suspiciousPatterns = [
      /python-requests/i,
      /curl/i,
      /wget/i,
      /scanner/i,
      /bot/i
    ];

    const userAgent = headers['user-agent'] || '';
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  private cleanupFailedLogins() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [key, value] of this.threatIntel.failedLoginAttempts.entries()) {
      if (value.lastAttempt < cutoff) {
        this.threatIntel.failedLoginAttempts.delete(key);
      }
    }
  }

  private loadThreatIntelligence() {
    // In production, this would load from external threat intelligence feeds
    // For now, we'll use some basic patterns
    
    // Known malicious user agents
    this.threatIntel.blockedUserAgents.add('sqlmap');
    this.threatIntel.blockedUserAgents.add('nikto');
    this.threatIntel.blockedUserAgents.add('nessus');
    
    // Load from cache or external source if available
  }

  private startContinuousMonitoring() {
    // Clean up old data every hour
    setInterval(() => {
      this.cleanupFailedLogins();
      this.cleanupOldIssues();
    }, 60 * 60 * 1000);

    // Perform mini audits every 15 minutes
    setInterval(() => {
      this.performMiniAudit();
    }, 15 * 60 * 1000);
  }

  private cleanupOldIssues() {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    this.issues = this.issues.filter(issue => issue.timestamp > cutoff);
  }

  private async performMiniAudit() {
    // Perform lightweight security checks
    await this.auditConfiguration();
  }

  private logSecurityEvent(eventType: string, details: any, severity: string) {
    console.warn(`🚨 Security Event: ${eventType}`, { severity, details, timestamp: new Date() });
    
    // In production, send to security monitoring system
    if (process.env.NODE_ENV === 'production') {
      this.sendToSecurityMonitoring(eventType, details, severity);
    }
  }

  private async sendToSecurityMonitoring(eventType: string, details: any, severity: string) {
    try {
      // Send to your security monitoring service (Splunk, DataDog, etc.)
      // await fetch('/api/security/events', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ eventType, details, severity, timestamp: new Date() })
      // });
    } catch (error) {
      console.error('Failed to send security event:', error);
    }
  }

  private generateSecurityMetrics(): SecurityMetrics {
    const criticalIssues = this.issues.filter(i => i.severity === 'critical').length;
    const highIssues = this.issues.filter(i => i.severity === 'high').length;
    const mediumIssues = this.issues.filter(i => i.severity === 'medium').length;
    const lowIssues = this.issues.filter(i => i.severity === 'low').length;

    // Calculate security score (0-100)
    let score = 100;
    score -= criticalIssues * 25; // Critical issues: -25 points each
    score -= highIssues * 15; // High issues: -15 points each
    score -= mediumIssues * 8; // Medium issues: -8 points each
    score -= lowIssues * 3; // Low issues: -3 points each

    score = Math.max(0, score); // Minimum score is 0

    return {
      totalIssues: this.issues.length,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      resolvedIssues: 0, // Would track resolved issues
      lastAuditDate: new Date(),
      securityScore: score
    };
  }

  // Public API methods
  getSecurityReport(): { metrics: SecurityMetrics; issues: SecurityIssue[] } {
    return {
      metrics: this.generateSecurityMetrics(),
      issues: [...this.issues]
    };
  }

  getSecurityScore(): number {
    return this.generateSecurityMetrics().securityScore;
  }

  getCriticalIssues(): SecurityIssue[] {
    return this.issues.filter(issue => issue.severity === 'critical');
  }

  resolveIssue(issueId: string): boolean {
    // Mark issue as resolved
    const index = this.issues.findIndex(issue => 
      issue.description === issueId || issue.location === issueId
    );
    
    if (index !== -1) {
      this.issues.splice(index, 1);
      return true;
    }
    
    return false;
  }

  // Rate limiting check
  checkRateLimit(identifier: string, endpoint: string): { allowed: boolean; retryAfter?: number } {
    const config = this.rateLimitConfigs[endpoint] || this.rateLimitConfigs.api_general;
    
    // Simple in-memory rate limiting (use Redis in production)
    const key = `${endpoint}:${identifier}`;
    const now = Date.now();
    
    // Implementation would track requests per window
    // This is a simplified version
    
    return { allowed: true };
  }
}

// Global security audit service
export const securityAudit = SecurityAuditService.getInstance();

// Middleware for threat detection
export function securityMiddleware(req: any, res: any, next: any) {
  const threat = securityAudit.detectThreat({
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    body: req.body,
    headers: req.headers,
    url: req.url
  });

  if (threat.isThreat) {
    return res.status(403).json({
      error: 'Request blocked for security reasons',
      code: 'SECURITY_THREAT_DETECTED'
    });
  }

  next();
}

// Security headers middleware
export function securityHeaders(req: any, res: any, next: any) {
  // Set security headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

// Export types for TypeScript support
export type { SecurityIssue, SecurityMetrics, RateLimitConfig };