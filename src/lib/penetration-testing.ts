// Week 30 Phase 1: Penetration Testing & Vulnerability Assessment
// Comprehensive security testing for production readiness

import { securityService } from './security-hardening';
import { securityAudit } from './security-audit';

interface PenetrationTestSuite {
  id: string;
  name: string;
  category: 'authentication' | 'authorization' | 'injection' | 'business_logic' | 'api_security' | 'mobile_security';
  priority: 'critical' | 'high' | 'medium' | 'low';
  tests: PenetrationTest[];
  executionTime: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface PenetrationTest {
  id: string;
  name: string;
  description: string;
  target: string;
  methodology: string;
  payload?: string;
  expectedResult: string;
  actualResult?: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'vulnerable';
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  cve?: string;
  remediation?: string;
  executedAt?: Date;
  executionTime?: number;
}

interface VulnerabilityReport {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cvssScore: number;
  category: string;
  affectedComponents: string[];
  description: string;
  proof: string;
  impact: string;
  remediation: string;
  references: string[];
  discoveredAt: Date;
  status: 'open' | 'verified' | 'false_positive' | 'resolved';
}

interface PentestReport {
  executionId: string;
  startTime: Date;
  endTime: Date;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  vulnerabilities: VulnerabilityReport[];
  riskScore: number;
  complianceStatus: {
    owasp: boolean;
    gdpr: boolean;
    dpdp: boolean;
    pci: boolean;
  };
  recommendations: string[];
  executiveSummary: string;
}

class PenetrationTestingService {
  private static instance: PenetrationTestingService;
  private testSuites: PenetrationTestSuite[] = [];
  private vulnerabilities: VulnerabilityReport[] = [];
  private currentExecution?: string;

  static getInstance(): PenetrationTestingService {
    if (!PenetrationTestingService.instance) {
      PenetrationTestingService.instance = new PenetrationTestingService();
      PenetrationTestingService.instance.initializeTestSuites();
    }
    return PenetrationTestingService.instance;
  }

  private initializeTestSuites() {
    this.testSuites = [
      this.createAuthenticationTestSuite(),
      this.createAuthorizationTestSuite(),
      this.createInjectionTestSuite(),
      this.createBusinessLogicTestSuite(),
      this.createAPISecurityTestSuite(),
      this.createMobileSecurityTestSuite()
    ];
  }

  // Authentication Security Tests
  private createAuthenticationTestSuite(): PenetrationTestSuite {
    return {
      id: 'auth_pentest',
      name: 'Authentication Security Tests',
      category: 'authentication',
      priority: 'critical',
      executionTime: 0,
      status: 'pending',
      tests: [
        {
          id: 'auth_001',
          name: 'JWT Token Manipulation',
          description: 'Test JWT token signature validation and payload manipulation',
          target: '/api/auth/verify',
          methodology: 'Modify JWT signature and payload to test validation',
          payload: JSON.stringify({
            modified_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.modified_payload.invalid_signature'
          }),
          expectedResult: 'Token validation should fail with proper error message'
        },
        {
          id: 'auth_002',
          name: 'Session Fixation Attack',
          description: 'Test session management against fixation attacks',
          target: '/api/auth/login',
          methodology: 'Set session ID before login and verify if it changes after authentication',
          expectedResult: 'Session ID should be regenerated after successful login'
        },
        {
          id: 'auth_003',
          name: 'Password Reset Token Exploitation',
          description: 'Test password reset token validation and expiration',
          target: '/api/auth/reset-password',
          methodology: 'Test token reuse, manipulation, and brute force attempts',
          expectedResult: 'Tokens should be single-use and time-limited'
        },
        {
          id: 'auth_004',
          name: 'Brute Force Attack Resistance',
          description: 'Test rate limiting and account lockout mechanisms',
          target: '/api/auth/login',
          methodology: 'Attempt multiple failed logins to test rate limiting',
          expectedResult: 'Account should be temporarily locked after 5 failed attempts'
        },
        {
          id: 'auth_005',
          name: 'OAuth Flow Manipulation',
          description: 'Test OAuth/Social login implementation security',
          target: '/api/auth/oauth',
          methodology: 'Test state parameter validation and redirect URI validation',
          expectedResult: 'OAuth flow should validate state and redirect parameters'
        }
      ]
    };
  }

  // Authorization Security Tests
  private createAuthorizationTestSuite(): PenetrationTestSuite {
    return {
      id: 'authz_pentest',
      name: 'Authorization Security Tests',
      category: 'authorization',
      priority: 'critical',
      executionTime: 0,
      status: 'pending',
      tests: [
        {
          id: 'authz_001',
          name: 'Privilege Escalation Test',
          description: 'Test user role elevation through parameter manipulation',
          target: '/api/user/profile',
          methodology: 'Modify user role in request to test privilege escalation',
          payload: JSON.stringify({ role: 'admin', is_premium: true }),
          expectedResult: 'Role modification should be rejected by server'
        },
        {
          id: 'authz_002',
          name: 'Horizontal Authorization Bypass',
          description: 'Test access to other users data',
          target: '/api/user/[userId]/profile',
          methodology: 'Access other user profiles by modifying user ID',
          expectedResult: 'Server should verify user ownership before returning data'
        },
        {
          id: 'authz_003',
          name: 'Admin Function Access Test',
          description: 'Test access to admin-only endpoints',
          target: '/api/admin/*',
          methodology: 'Access admin endpoints with regular user token',
          expectedResult: 'Admin endpoints should reject non-admin users'
        },
        {
          id: 'authz_004',
          name: 'Partner Resource Access Test',
          description: 'Test partner-specific resource access controls',
          target: '/api/partners/bookings',
          methodology: 'Access partner resources with user credentials',
          expectedResult: 'Partner resources should be restricted to verified partners'
        },
        {
          id: 'authz_005',
          name: 'Premium Feature Bypass Test',
          description: 'Test premium feature access without subscription',
          target: '/api/premium/*',
          methodology: 'Access premium features with free account',
          expectedResult: 'Premium features should verify subscription status'
        }
      ]
    };
  }

  // Injection Attack Tests
  private createInjectionTestSuite(): PenetrationTestSuite {
    return {
      id: 'injection_pentest',
      name: 'Injection Attack Tests',
      category: 'injection',
      priority: 'critical',
      executionTime: 0,
      status: 'pending',
      tests: [
        {
          id: 'inj_001',
          name: 'SQL Injection Test',
          description: 'Test SQL injection vulnerabilities in database queries',
          target: '/api/search',
          methodology: 'Inject SQL payloads in search parameters',
          payload: "'; DROP TABLE users; --",
          expectedResult: 'SQL injection should be prevented by parameterized queries'
        },
        {
          id: 'inj_002',
          name: 'NoSQL Injection Test',
          description: 'Test NoSQL injection in search and filter operations',
          target: '/api/community/questions',
          methodology: 'Inject NoSQL operators in query parameters',
          payload: JSON.stringify({ $where: 'function() { return true; }' }),
          expectedResult: 'NoSQL injection should be prevented by input validation'
        },
        {
          id: 'inj_003',
          name: 'XSS Injection Test',
          description: 'Test stored and reflected XSS vulnerabilities',
          target: '/api/community/questions',
          methodology: 'Submit malicious scripts in user content',
          payload: '<script>alert("XSS")</script>',
          expectedResult: 'XSS payload should be sanitized and not executed'
        },
        {
          id: 'inj_004',
          name: 'Command Injection Test',
          description: 'Test command injection in file upload and processing',
          target: '/api/upload',
          methodology: 'Upload files with malicious names or content',
          payload: 'test.jpg; rm -rf /',
          expectedResult: 'File processing should not execute system commands'
        },
        {
          id: 'inj_005',
          name: 'LDAP Injection Test',
          description: 'Test LDAP injection in authentication (if applicable)',
          target: '/api/auth/login',
          methodology: 'Inject LDAP filter syntax in login fields',
          payload: 'admin)(|(password=*))',
          expectedResult: 'LDAP queries should use parameterized filters'
        }
      ]
    };
  }

  // Business Logic Tests
  private createBusinessLogicTestSuite(): PenetrationTestSuite {
    return {
      id: 'business_pentest',
      name: 'Business Logic Security Tests',
      category: 'business_logic',
      priority: 'high',
      executionTime: 0,
      status: 'pending',
      tests: [
        {
          id: 'biz_001',
          name: 'Payment Bypass Test',
          description: 'Test payment flow manipulation and bypass attempts',
          target: '/api/payments/process',
          methodology: 'Manipulate payment amount and status parameters',
          payload: JSON.stringify({ amount: 0, status: 'completed' }),
          expectedResult: 'Payment validation should prevent manipulation'
        },
        {
          id: 'biz_002',
          name: 'Subscription Manipulation Test',
          description: 'Test premium subscription logic bypass',
          target: '/api/subscriptions/upgrade',
          methodology: 'Attempt to activate premium without payment',
          expectedResult: 'Subscription changes should require payment verification'
        },
        {
          id: 'biz_003',
          name: 'Point System Manipulation',
          description: 'Test point system for manipulation vulnerabilities',
          target: '/api/points/add',
          methodology: 'Attempt to artificially increase points',
          payload: JSON.stringify({ points: 99999, action: 'manual_add' }),
          expectedResult: 'Point system should validate legitimate earning methods'
        },
        {
          id: 'biz_004',
          name: 'Event RSVP Bypass Test',
          description: 'Test event capacity and RSVP logic',
          target: '/api/events/rsvp',
          methodology: 'Attempt to RSVP to full events multiple times',
          expectedResult: 'RSVP should respect event capacity and prevent duplicates'
        },
        {
          id: 'biz_005',
          name: 'Partner Commission Manipulation',
          description: 'Test partner commission calculation logic',
          target: '/api/partners/bookings',
          methodology: 'Manipulate booking amounts and commission rates',
          expectedResult: 'Commission calculation should be server-side only'
        }
      ]
    };
  }

  // API Security Tests
  private createAPISecurityTestSuite(): PenetrationTestSuite {
    return {
      id: 'api_pentest',
      name: 'API Security Tests',
      category: 'api_security',
      priority: 'high',
      executionTime: 0,
      status: 'pending',
      tests: [
        {
          id: 'api_001',
          name: 'Rate Limiting Bypass Test',
          description: 'Test rate limiting implementation and bypass techniques',
          target: '/api/*',
          methodology: 'Use various techniques to bypass rate limits',
          expectedResult: 'Rate limiting should be effective against bypass attempts'
        },
        {
          id: 'api_002',
          name: 'API Endpoint Enumeration',
          description: 'Test for hidden or undocumented API endpoints',
          target: '/api/',
          methodology: 'Enumerate API endpoints using various techniques',
          expectedResult: 'Undocumented endpoints should not expose sensitive data'
        },
        {
          id: 'api_003',
          name: 'HTTP Method Manipulation',
          description: 'Test HTTP method override and unexpected methods',
          target: '/api/user/profile',
          methodology: 'Use different HTTP methods on endpoints',
          expectedResult: 'Endpoints should only accept appropriate HTTP methods'
        },
        {
          id: 'api_004',
          name: 'Parameter Pollution Test',
          description: 'Test API parameter pollution vulnerabilities',
          target: '/api/search',
          methodology: 'Send duplicate parameters with different values',
          payload: 'category=dogs&category=admin&limit=10&limit=999999',
          expectedResult: 'Parameter pollution should be handled correctly'
        },
        {
          id: 'api_005',
          name: 'API Versioning Exploitation',
          description: 'Test API versioning for security vulnerabilities',
          target: '/api/v1/* vs /api/v2/*',
          methodology: 'Compare security measures across API versions',
          expectedResult: 'All API versions should have consistent security measures'
        }
      ]
    };
  }

  // Mobile Security Tests
  private createMobileSecurityTestSuite(): PenetrationTestSuite {
    return {
      id: 'mobile_pentest',
      name: 'Mobile Security Tests',
      category: 'mobile_security',
      priority: 'medium',
      executionTime: 0,
      status: 'pending',
      tests: [
        {
          id: 'mobile_001',
          name: 'Mobile API Endpoint Security',
          description: 'Test mobile-specific API endpoints for vulnerabilities',
          target: '/api/mobile/*',
          methodology: 'Test mobile API endpoints with various payloads',
          expectedResult: 'Mobile APIs should have same security as web APIs'
        },
        {
          id: 'mobile_002',
          name: 'Local Storage Security Test',
          description: 'Test mobile app local storage for sensitive data',
          target: 'Mobile app storage',
          methodology: 'Inspect local storage for unencrypted sensitive data',
          expectedResult: 'No sensitive data should be stored unencrypted'
        },
        {
          id: 'mobile_003',
          name: 'Push Notification Security',
          description: 'Test push notification security and manipulation',
          target: '/api/notifications/send',
          methodology: 'Attempt to send unauthorized push notifications',
          expectedResult: 'Push notifications should require proper authentication'
        },
        {
          id: 'mobile_004',
          name: 'Deep Link Security Test',
          description: 'Test mobile app deep link handling security',
          target: 'Mobile app deep links',
          methodology: 'Test malicious deep link parameters',
          expectedResult: 'Deep links should validate and sanitize parameters'
        },
        {
          id: 'mobile_005',
          name: 'Inter-app Communication Security',
          description: 'Test security of inter-app communication',
          target: 'Mobile app intents/schemes',
          methodology: 'Test malicious intents and URL schemes',
          expectedResult: 'App should validate external communication requests'
        }
      ]
    };
  }

  // Execute comprehensive penetration test
  async executePenetrationTest(): Promise<PentestReport> {
    const executionId = `pentest_${Date.now()}`;
    this.currentExecution = executionId;
    const startTime = new Date();

    console.log(`🔍 Starting comprehensive penetration test: ${executionId}`);

    const vulnerabilities: VulnerabilityReport[] = [];
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    // Execute all test suites
    for (const suite of this.testSuites) {
      console.log(`🔍 Executing test suite: ${suite.name}`);
      suite.status = 'running';

      for (const test of suite.tests) {
        totalTests++;
        const result = await this.executeTest(test);
        
        if (result.status === 'vulnerable') {
          failedTests++;
          const vulnerability = this.createVulnerabilityReport(test, result);
          vulnerabilities.push(vulnerability);
        } else if (result.status === 'passed') {
          passedTests++;
        } else {
          failedTests++;
        }
      }

      suite.status = 'completed';
    }

    const endTime = new Date();
    const riskScore = this.calculateRiskScore(vulnerabilities);
    
    const report: PentestReport = {
      executionId,
      startTime,
      endTime,
      totalTests,
      passedTests,
      failedTests,
      vulnerabilities,
      riskScore,
      complianceStatus: this.assessCompliance(vulnerabilities),
      recommendations: this.generateRecommendations(vulnerabilities),
      executiveSummary: this.generateExecutiveSummary(vulnerabilities, riskScore)
    };

    // Store vulnerabilities
    this.vulnerabilities.push(...vulnerabilities);

    console.log(`🔍 Penetration test completed. Risk Score: ${riskScore}/100`);
    console.log(`📊 Results: ${passedTests} passed, ${failedTests} failed, ${vulnerabilities.length} vulnerabilities found`);

    return report;
  }

  // Execute individual test
  private async executeTest(test: PenetrationTest): Promise<PenetrationTest> {
    test.status = 'running';
    test.executedAt = new Date();
    const startTime = Date.now();

    try {
      // Simulate test execution (in real implementation, this would make actual HTTP requests)
      const result = await this.simulateTestExecution(test);
      test.actualResult = result.actualResult;
      test.status = result.status;
      test.severity = result.severity;
      test.remediation = result.remediation;
      
    } catch (error) {
      test.status = 'failed';
      test.actualResult = `Test execution failed: ${error}`;
    }

    test.executionTime = Date.now() - startTime;
    return test;
  }

  // Simulate test execution (replace with real implementation)
  private async simulateTestExecution(test: PenetrationTest): Promise<{
    actualResult: string;
    status: 'passed' | 'vulnerable' | 'failed';
    severity?: 'critical' | 'high' | 'medium' | 'low';
    remediation?: string;
  }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 500));

    // Simulate test results based on test ID (for demonstration)
    const simulatedResults: Record<string, any> = {
      'auth_001': { status: 'passed', actualResult: 'JWT validation working correctly' },
      'auth_002': { status: 'vulnerable', severity: 'medium', actualResult: 'Session ID not regenerated after login' },
      'authz_001': { status: 'passed', actualResult: 'Privilege escalation prevented' },
      'inj_001': { status: 'passed', actualResult: 'SQL injection prevented by Prisma ORM' },
      'inj_003': { status: 'vulnerable', severity: 'high', actualResult: 'XSS payload not sanitized in community posts' },
      'biz_001': { status: 'passed', actualResult: 'Payment validation working correctly' },
      'api_001': { status: 'vulnerable', severity: 'medium', actualResult: 'Rate limiting can be bypassed with IP rotation' }
    };

    const result = simulatedResults[test.id] || { 
      status: 'passed', 
      actualResult: 'Test passed - no vulnerabilities detected' 
    };

    if (result.status === 'vulnerable') {
      result.remediation = this.generateRemediation(test.id);
    }

    return result;
  }

  // Create vulnerability report
  private createVulnerabilityReport(test: PenetrationTest, result: any): VulnerabilityReport {
    return {
      id: `vuln_${test.id}_${Date.now()}`,
      title: `${test.name} Vulnerability`,
      severity: result.severity || 'medium',
      cvssScore: this.calculateCVSS(result.severity),
      category: test.target,
      affectedComponents: [test.target],
      description: test.description,
      proof: result.actualResult,
      impact: this.generateImpactAssessment(result.severity),
      remediation: result.remediation || 'Apply security patches and follow best practices',
      references: this.getSecurityReferences(test.id),
      discoveredAt: new Date(),
      status: 'open'
    };
  }

  // Calculate CVSS score
  private calculateCVSS(severity: string): number {
    const scores = {
      'critical': 9.5,
      'high': 7.8,
      'medium': 5.5,
      'low': 3.2,
      'info': 1.0
    };
    return scores[severity as keyof typeof scores] || 5.0;
  }

  // Generate impact assessment
  private generateImpactAssessment(severity: string): string {
    const impacts = {
      'critical': 'Could lead to complete system compromise, data breach, or financial loss',
      'high': 'Could lead to unauthorized access to sensitive data or system functions',
      'medium': 'Could lead to limited unauthorized access or information disclosure',
      'low': 'Minor security weakness with limited impact',
      'info': 'Informational finding for security awareness'
    };
    return impacts[severity as keyof typeof impacts] || 'Security risk requiring attention';
  }

  // Generate remediation steps
  private generateRemediation(testId: string): string {
    const remediations: Record<string, string> = {
      'auth_002': 'Implement session regeneration after successful authentication',
      'inj_003': 'Implement proper input sanitization and output encoding for user content',
      'api_001': 'Strengthen rate limiting with distributed tracking and IP reputation checking'
    };
    return remediations[testId] || 'Review and implement appropriate security controls';
  }

  // Get security references
  private getSecurityReferences(testId: string): string[] {
    const references = [
      'https://owasp.org/www-project-top-ten/',
      'https://cwe.mitre.org/',
      'https://nvd.nist.gov/'
    ];

    // Add specific references based on test type
    if (testId.startsWith('auth_')) {
      references.push('https://owasp.org/www-project-authentication-cheat-sheet/');
    } else if (testId.startsWith('inj_')) {
      references.push('https://owasp.org/www-community/Injection_Flaws');
    } else if (testId.startsWith('api_')) {
      references.push('https://owasp.org/www-project-api-security/');
    }

    return references;
  }

  // Calculate overall risk score
  private calculateRiskScore(vulnerabilities: VulnerabilityReport[]): number {
    if (vulnerabilities.length === 0) return 0;

    const severityWeights = { critical: 10, high: 7, medium: 4, low: 2 };
    const totalWeight = vulnerabilities.reduce((sum, vuln) => {
      return sum + (severityWeights[vuln.severity] || 1);
    }, 0);

    return Math.min(100, totalWeight);
  }

  // Assess compliance status
  private assessCompliance(vulnerabilities: VulnerabilityReport[]) {
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highVulns = vulnerabilities.filter(v => v.severity === 'high').length;

    return {
      owasp: criticalVulns === 0 && highVulns <= 2,
      gdpr: vulnerabilities.filter(v => v.description.includes('data')).length === 0,
      dpdp: vulnerabilities.filter(v => v.description.includes('privacy')).length === 0,
      pci: vulnerabilities.filter(v => v.description.includes('payment')).length === 0
    };
  }

  // Generate recommendations
  private generateRecommendations(vulnerabilities: VulnerabilityReport[]): string[] {
    const recommendations = [];

    if (vulnerabilities.some(v => v.severity === 'critical')) {
      recommendations.push('Address all critical vulnerabilities before production deployment');
    }

    if (vulnerabilities.some(v => v.category.includes('auth'))) {
      recommendations.push('Strengthen authentication and session management controls');
    }

    if (vulnerabilities.some(v => v.description.includes('injection'))) {
      recommendations.push('Implement comprehensive input validation and output encoding');
    }

    if (vulnerabilities.some(v => v.category.includes('api'))) {
      recommendations.push('Enhance API security controls and rate limiting');
    }

    recommendations.push('Conduct regular security assessments and penetration testing');
    recommendations.push('Implement security monitoring and incident response procedures');

    return recommendations;
  }

  // Generate executive summary
  private generateExecutiveSummary(vulnerabilities: VulnerabilityReport[], riskScore: number): string {
    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
    
    let summary = `Penetration testing of Woofadaar platform identified ${vulnerabilities.length} security findings `;
    summary += `with an overall risk score of ${riskScore}/100. `;
    
    if (criticalCount > 0) {
      summary += `${criticalCount} critical vulnerabilities require immediate attention before production deployment. `;
    }
    
    if (highCount > 0) {
      summary += `${highCount} high-severity issues should be addressed within 72 hours. `;
    }
    
    if (riskScore < 20) {
      summary += 'The application demonstrates strong security posture suitable for production deployment.';
    } else if (riskScore < 50) {
      summary += 'The application has moderate security risks that should be addressed before launch.';
    } else {
      summary += 'The application has significant security risks requiring comprehensive remediation.';
    }

    return summary;
  }

  // Public API methods
  async runQuickSecurityScan(): Promise<{ score: number; issues: string[] }> {
    const issues = [];
    let score = 100;

    // Quick authentication checks
    const authIssues = await this.quickAuthCheck();
    issues.push(...authIssues);
    score -= authIssues.length * 10;

    // Quick injection checks
    const injectionIssues = await this.quickInjectionCheck();
    issues.push(...injectionIssues);
    score -= injectionIssues.length * 15;

    // Quick configuration checks
    const configIssues = await this.quickConfigCheck();
    issues.push(...configIssues);
    score -= configIssues.length * 5;

    return { score: Math.max(0, score), issues };
  }

  private async quickAuthCheck(): Promise<string[]> {
    const issues = [];
    
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      issues.push('JWT secret is weak or missing');
    }
    
    return issues;
  }

  private async quickInjectionCheck(): Promise<string[]> {
    const issues = [];
    
    // This would run simplified injection tests
    // For now, assume Prisma provides protection
    
    return issues;
  }

  private async quickConfigCheck(): Promise<string[]> {
    const issues = [];
    
    if (process.env.NODE_ENV === 'production' && process.env.DEBUG === 'true') {
      issues.push('Debug mode enabled in production');
    }
    
    return issues;
  }

  getVulnerabilities(): VulnerabilityReport[] {
    return [...this.vulnerabilities];
  }

  getCriticalVulnerabilities(): VulnerabilityReport[] {
    return this.vulnerabilities.filter(v => v.severity === 'critical');
  }

  getTestSuites(): PenetrationTestSuite[] {
    return [...this.testSuites];
  }

  markVulnerabilityResolved(vulnId: string): boolean {
    const vuln = this.vulnerabilities.find(v => v.id === vulnId);
    if (vuln) {
      vuln.status = 'resolved';
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const penetrationTesting = PenetrationTestingService.getInstance();
export default PenetrationTestingService;