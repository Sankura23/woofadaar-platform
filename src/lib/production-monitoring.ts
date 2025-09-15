// Week 30 Phase 4: Production Monitoring & Alerting System
// Comprehensive monitoring for production deployment and operations

import { performanceMonitor } from './performance-monitor';
import { launchMonitoring } from './launch-monitoring';
import { securityService } from './security-hardening';

interface MonitoringAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'performance' | 'security' | 'business' | 'infrastructure' | 'user_experience';
  title: string;
  description: string;
  threshold: number;
  currentValue: number;
  triggeredAt: Date;
  resolvedAt?: Date;
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  severity: number; // 1-10 scale
  affectedSystems: string[];
  actionItems: string[];
  escalationLevel: 0 | 1 | 2 | 3; // 0=team, 1=lead, 2=manager, 3=executive
  notifications: NotificationLog[];
}

interface NotificationLog {
  channel: 'email' | 'sms' | 'slack' | 'pagerduty' | 'webhook';
  recipient: string;
  sentAt: Date;
  status: 'sent' | 'delivered' | 'failed';
  retryCount: number;
}

interface MonitoringMetrics {
  system: SystemMetrics;
  application: ApplicationMetrics;
  business: BusinessMetrics;
  user: UserMetrics;
  security: SecurityMetrics;
}

interface SystemMetrics {
  cpu: { current: number; average: number; peak: number };
  memory: { used: number; available: number; percentage: number };
  disk: { used: number; available: number; percentage: number };
  network: { inbound: number; outbound: number; errors: number };
  uptime: number;
  loadAverage: number[];
}

interface ApplicationMetrics {
  responseTime: { p50: number; p95: number; p99: number };
  throughput: { rps: number; rpm: number; daily: number };
  errorRate: { percentage: number; count: number };
  activeConnections: number;
  queueLength: number;
  cacheHitRate: number;
}

interface BusinessMetrics {
  userRegistrations: { hourly: number; daily: number; monthly: number };
  premiumConversions: { rate: number; count: number };
  revenue: { hourly: number; daily: number; monthly: number };
  partnerBookings: { count: number; revenue: number };
  eventParticipation: { events: number; attendees: number };
}

interface UserMetrics {
  activeUsers: { current: number; daily: number; weekly: number };
  sessionDuration: { average: number; median: number };
  bounceRate: number;
  pageViews: { total: number; unique: number };
  conversionFunnel: { [stage: string]: number };
}

interface SecurityMetrics {
  threats: { blocked: number; analyzed: number };
  loginAttempts: { successful: number; failed: number };
  dataAccess: { authorized: number; unauthorized: number };
  vulnerabilities: { open: number; resolved: number };
}

interface IncidentReport {
  id: string;
  title: string;
  severity: 'sev1' | 'sev2' | 'sev3' | 'sev4';
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  startTime: Date;
  resolvedTime?: Date;
  affectedServices: string[];
  impactDescription: string;
  rootCause?: string;
  resolution?: string;
  timeline: IncidentEvent[];
  postMortemRequired: boolean;
  lessonsLearned?: string[];
}

interface IncidentEvent {
  timestamp: Date;
  type: 'detected' | 'escalated' | 'investigating' | 'update' | 'resolved';
  description: string;
  actor: string;
}

class ProductionMonitoringService {
  private static instance: ProductionMonitoringService;
  private alerts: MonitoringAlert[] = [];
  private incidents: IncidentReport[] = [];
  private metrics: MonitoringMetrics;
  private alertRules: AlertRule[] = [];
  private isMonitoring = false;

  static getInstance(): ProductionMonitoringService {
    if (!ProductionMonitoringService.instance) {
      ProductionMonitoringService.instance = new ProductionMonitoringService();
      ProductionMonitoringService.instance.initialize();
    }
    return ProductionMonitoringService.instance;
  }

  private initialize() {
    this.metrics = this.initializeMetrics();
    this.setupAlertRules();
    this.startMonitoring();
  }

  private initializeMetrics(): MonitoringMetrics {
    return {
      system: {
        cpu: { current: 0, average: 0, peak: 0 },
        memory: { used: 0, available: 0, percentage: 0 },
        disk: { used: 0, available: 0, percentage: 0 },
        network: { inbound: 0, outbound: 0, errors: 0 },
        uptime: 0,
        loadAverage: [0, 0, 0]
      },
      application: {
        responseTime: { p50: 0, p95: 0, p99: 0 },
        throughput: { rps: 0, rpm: 0, daily: 0 },
        errorRate: { percentage: 0, count: 0 },
        activeConnections: 0,
        queueLength: 0,
        cacheHitRate: 0
      },
      business: {
        userRegistrations: { hourly: 0, daily: 0, monthly: 0 },
        premiumConversions: { rate: 0, count: 0 },
        revenue: { hourly: 0, daily: 0, monthly: 0 },
        partnerBookings: { count: 0, revenue: 0 },
        eventParticipation: { events: 0, attendees: 0 }
      },
      user: {
        activeUsers: { current: 0, daily: 0, weekly: 0 },
        sessionDuration: { average: 0, median: 0 },
        bounceRate: 0,
        pageViews: { total: 0, unique: 0 },
        conversionFunnel: {}
      },
      security: {
        threats: { blocked: 0, analyzed: 0 },
        loginAttempts: { successful: 0, failed: 0 },
        dataAccess: { authorized: 0, unauthorized: 0 },
        vulnerabilities: { open: 0, resolved: 0 }
      }
    };
  }

  // Alert Rules Configuration
  private setupAlertRules() {
    this.alertRules = [
      // Critical System Alerts
      {
        id: 'cpu_critical',
        metric: 'system.cpu.current',
        operator: '>',
        threshold: 90,
        duration: 300, // 5 minutes
        severity: 'critical',
        category: 'infrastructure',
        escalationLevel: 2,
        actionItems: [
          'Check for runaway processes',
          'Scale infrastructure if needed',
          'Review recent deployments'
        ]
      },
      {
        id: 'memory_critical',
        metric: 'system.memory.percentage',
        operator: '>',
        threshold: 95,
        duration: 180, // 3 minutes
        severity: 'critical',
        category: 'infrastructure',
        escalationLevel: 2,
        actionItems: [
          'Identify memory leaks',
          'Restart affected services',
          'Scale memory resources'
        ]
      },
      {
        id: 'disk_critical',
        metric: 'system.disk.percentage',
        operator: '>',
        threshold: 90,
        duration: 600, // 10 minutes
        severity: 'critical',
        category: 'infrastructure',
        escalationLevel: 1,
        actionItems: [
          'Clean up log files',
          'Archive old data',
          'Expand disk capacity'
        ]
      },

      // Application Performance Alerts
      {
        id: 'response_time_high',
        metric: 'application.responseTime.p95',
        operator: '>',
        threshold: 3000, // 3 seconds
        duration: 300,
        severity: 'warning',
        category: 'performance',
        escalationLevel: 1,
        actionItems: [
          'Check database query performance',
          'Review API endpoint optimization',
          'Check external service dependencies'
        ]
      },
      {
        id: 'error_rate_high',
        metric: 'application.errorRate.percentage',
        operator: '>',
        threshold: 5, // 5%
        duration: 180,
        severity: 'critical',
        category: 'performance',
        escalationLevel: 2,
        actionItems: [
          'Review error logs immediately',
          'Check recent deployments',
          'Verify external service health'
        ]
      },

      // Business Metrics Alerts
      {
        id: 'registrations_low',
        metric: 'business.userRegistrations.hourly',
        operator: '<',
        threshold: 5,
        duration: 3600, // 1 hour
        severity: 'warning',
        category: 'business',
        escalationLevel: 1,
        actionItems: [
          'Check registration flow health',
          'Review marketing campaign performance',
          'Verify payment system status'
        ]
      },
      {
        id: 'revenue_drop',
        metric: 'business.revenue.hourly',
        operator: '<',
        threshold: 100, // INR 100 per hour
        duration: 7200, // 2 hours
        severity: 'warning',
        category: 'business',
        escalationLevel: 1,
        actionItems: [
          'Check payment gateway health',
          'Review premium conversion funnel',
          'Verify subscription renewals'
        ]
      },

      // Security Alerts
      {
        id: 'failed_logins_high',
        metric: 'security.loginAttempts.failed',
        operator: '>',
        threshold: 100,
        duration: 300,
        severity: 'warning',
        category: 'security',
        escalationLevel: 1,
        actionItems: [
          'Review IP blocking policies',
          'Check for credential stuffing attacks',
          'Verify rate limiting effectiveness'
        ]
      },
      {
        id: 'security_threats_high',
        metric: 'security.threats.blocked',
        operator: '>',
        threshold: 50,
        duration: 600,
        severity: 'critical',
        category: 'security',
        escalationLevel: 2,
        actionItems: [
          'Analyze threat patterns',
          'Update security rules',
          'Consider IP range blocking'
        ]
      }
    ];
  }

  // Start monitoring
  private startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('🔍 Production monitoring started');

    // Collect metrics every 30 seconds
    setInterval(() => {
      this.collectMetrics();
    }, 30000);

    // Evaluate alerts every minute
    setInterval(() => {
      this.evaluateAlerts();
    }, 60000);

    // Generate hourly reports
    setInterval(() => {
      this.generateHourlyReport();
    }, 3600000);

    // Cleanup old data daily
    setInterval(() => {
      this.cleanupOldData();
    }, 24 * 60 * 60 * 1000);
  }

  // Collect comprehensive metrics
  private async collectMetrics() {
    try {
      // System metrics
      this.metrics.system = await this.collectSystemMetrics();

      // Application metrics
      this.metrics.application = await this.collectApplicationMetrics();

      // Business metrics
      this.metrics.business = await this.collectBusinessMetrics();

      // User metrics
      this.metrics.user = await this.collectUserMetrics();

      // Security metrics
      this.metrics.security = await this.collectSecurityMetrics();

      // Store metrics for trending
      await this.storeMetrics();

    } catch (error) {
      console.error('Error collecting metrics:', error);
    }
  }

  private async collectSystemMetrics(): Promise<SystemMetrics> {
    // In production, this would collect real system metrics
    return {
      cpu: {
        current: 45 + Math.random() * 30,
        average: 52,
        peak: 89
      },
      memory: {
        used: 4.2,
        available: 8.0,
        percentage: 52.5
      },
      disk: {
        used: 75,
        available: 175,
        percentage: 30
      },
      network: {
        inbound: 1024 * 1024 * 10, // 10 MB/s
        outbound: 1024 * 1024 * 8,  // 8 MB/s
        errors: 0
      },
      uptime: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days
      loadAverage: [1.2, 1.5, 1.8]
    };
  }

  private async collectApplicationMetrics(): Promise<ApplicationMetrics> {
    const perfReport = performanceMonitor.generateReport();
    
    return {
      responseTime: {
        p50: perfReport.apiPerformance.averageResponseTime * 0.8,
        p95: perfReport.apiPerformance.averageResponseTime * 1.5,
        p99: perfReport.apiPerformance.averageResponseTime * 2.2
      },
      throughput: {
        rps: 25 + Math.random() * 15,
        rpm: (25 + Math.random() * 15) * 60,
        daily: (25 + Math.random() * 15) * 60 * 24
      },
      errorRate: {
        percentage: perfReport.apiPerformance.errorRate,
        count: Math.floor(perfReport.apiPerformance.errorRate * 10)
      },
      activeConnections: 150 + Math.floor(Math.random() * 50),
      queueLength: Math.floor(Math.random() * 5),
      cacheHitRate: 85 + Math.random() * 10
    };
  }

  private async collectBusinessMetrics(): Promise<BusinessMetrics> {
    const launchMetrics = launchMonitoring.getCurrentMetrics();
    
    return {
      userRegistrations: {
        hourly: Math.floor(launchMetrics.userAcquisition.dailySignups / 24),
        daily: launchMetrics.userAcquisition.dailySignups,
        monthly: launchMetrics.userAcquisition.totalSignups
      },
      premiumConversions: {
        rate: launchMetrics.businessMetrics.conversionRate,
        count: launchMetrics.businessMetrics.premiumSubscriptions
      },
      revenue: {
        hourly: Math.floor(launchMetrics.businessMetrics.revenueGenerated / 24),
        daily: launchMetrics.businessMetrics.revenueGenerated,
        monthly: launchMetrics.businessMetrics.revenueGenerated * 30
      },
      partnerBookings: {
        count: Math.floor(Math.random() * 20),
        revenue: Math.floor(Math.random() * 5000)
      },
      eventParticipation: {
        events: Math.floor(Math.random() * 10),
        attendees: Math.floor(Math.random() * 100)
      }
    };
  }

  private async collectUserMetrics(): Promise<UserMetrics> {
    const launchMetrics = launchMonitoring.getCurrentMetrics();
    
    return {
      activeUsers: {
        current: Math.floor(launchMetrics.userEngagement.dailyActiveUsers * 0.1),
        daily: launchMetrics.userEngagement.dailyActiveUsers,
        weekly: launchMetrics.userEngagement.weeklyActiveUsers
      },
      sessionDuration: {
        average: launchMetrics.userEngagement.averageSessionDuration * 60,
        median: launchMetrics.userEngagement.averageSessionDuration * 50
      },
      bounceRate: launchMetrics.userEngagement.bounceRate,
      pageViews: {
        total: Math.floor(Math.random() * 10000),
        unique: Math.floor(Math.random() * 5000)
      },
      conversionFunnel: {
        landing: 100,
        registration: 15,
        profile_complete: 12,
        first_action: 8,
        premium_signup: 2
      }
    };
  }

  private async collectSecurityMetrics(): Promise<SecurityMetrics> {
    const securityStats = securityService.getSecurityMetrics();
    
    return {
      threats: {
        blocked: securityStats.blockedRequests,
        analyzed: securityStats.totalRequests
      },
      loginAttempts: {
        successful: securityStats.totalRequests - securityStats.failedLogins,
        failed: securityStats.failedLogins
      },
      dataAccess: {
        authorized: Math.floor(Math.random() * 1000),
        unauthorized: securityStats.suspiciousActivity
      },
      vulnerabilities: {
        open: 0, // Would get from security audit
        resolved: 5
      }
    };
  }

  // Alert evaluation
  private evaluateAlerts() {
    for (const rule of this.alertRules) {
      const currentValue = this.getMetricValue(rule.metric);
      const shouldAlert = this.evaluateCondition(currentValue, rule.operator, rule.threshold);

      if (shouldAlert) {
        this.triggerAlert(rule, currentValue);
      }
    }
  }

  private getMetricValue(metricPath: string): number {
    const parts = metricPath.split('.');
    let value: any = this.metrics;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return typeof value === 'number' ? value : 0;
  }

  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      case '==': return value === threshold;
      case '!=': return value !== threshold;
      default: return false;
    }
  }

  private triggerAlert(rule: AlertRule, currentValue: number) {
    // Check if alert is already active
    const existingAlert = this.alerts.find(a => 
      a.title.includes(rule.id) && a.status === 'active'
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.currentValue = currentValue;
      return;
    }

    // Create new alert
    const alert: MonitoringAlert = {
      id: `alert_${rule.id}_${Date.now()}`,
      type: rule.severity === 'critical' ? 'critical' : 'warning',
      category: rule.category,
      title: this.generateAlertTitle(rule, currentValue),
      description: this.generateAlertDescription(rule, currentValue),
      threshold: rule.threshold,
      currentValue,
      triggeredAt: new Date(),
      status: 'active',
      severity: rule.severity === 'critical' ? 9 : 6,
      affectedSystems: this.getAffectedSystems(rule),
      actionItems: rule.actionItems,
      escalationLevel: rule.escalationLevel,
      notifications: []
    };

    this.alerts.push(alert);
    this.sendAlertNotifications(alert);

    console.warn(`🚨 Alert triggered: ${alert.title}`);
  }

  private generateAlertTitle(rule: AlertRule, currentValue: number): string {
    const titles: Record<string, string> = {
      'cpu_critical': `Critical CPU Usage: ${currentValue.toFixed(1)}%`,
      'memory_critical': `Critical Memory Usage: ${currentValue.toFixed(1)}%`,
      'disk_critical': `Critical Disk Usage: ${currentValue.toFixed(1)}%`,
      'response_time_high': `High Response Time: ${currentValue.toFixed(0)}ms`,
      'error_rate_high': `High Error Rate: ${currentValue.toFixed(1)}%`,
      'registrations_low': `Low User Registrations: ${currentValue}/hour`,
      'revenue_drop': `Revenue Drop: ₹${currentValue.toFixed(0)}/hour`,
      'failed_logins_high': `High Failed Logins: ${currentValue} attempts`,
      'security_threats_high': `High Security Threats: ${currentValue} blocked`
    };

    return titles[rule.id] || `Alert: ${rule.id}`;
  }

  private generateAlertDescription(rule: AlertRule, currentValue: number): string {
    return `Metric ${rule.metric} has ${rule.operator === '>' ? 'exceeded' : 'fallen below'} ` +
           `the threshold of ${rule.threshold}. Current value: ${currentValue}`;
  }

  private getAffectedSystems(rule: AlertRule): string[] {
    const systemMap: Record<string, string[]> = {
      'infrastructure': ['web-servers', 'load-balancer', 'database'],
      'performance': ['api', 'database', 'cache'],
      'business': ['payment-gateway', 'user-registration', 'subscription'],
      'security': ['authentication', 'firewall', 'monitoring']
    };

    return systemMap[rule.category] || ['unknown'];
  }

  private async sendAlertNotifications(alert: MonitoringAlert) {
    const channels = this.getNotificationChannels(alert.escalationLevel);
    
    for (const channel of channels) {
      try {
        await this.sendNotification(alert, channel);
        
        alert.notifications.push({
          channel: channel.type,
          recipient: channel.recipient,
          sentAt: new Date(),
          status: 'sent',
          retryCount: 0
        });
      } catch (error) {
        console.error(`Failed to send ${channel.type} notification:`, error);
        
        alert.notifications.push({
          channel: channel.type,
          recipient: channel.recipient,
          sentAt: new Date(),
          status: 'failed',
          retryCount: 0
        });
      }
    }
  }

  private getNotificationChannels(escalationLevel: number) {
    const channels = [
      { type: 'slack' as const, recipient: '#alerts' }
    ];

    if (escalationLevel >= 1) {
      channels.push({ type: 'email' as const, recipient: 'tech-lead@woofadaar.com' });
    }

    if (escalationLevel >= 2) {
      channels.push({ type: 'sms' as const, recipient: '+91-9999999999' });
      channels.push({ type: 'pagerduty' as const, recipient: 'critical-alerts' });
    }

    if (escalationLevel >= 3) {
      channels.push({ type: 'email' as const, recipient: 'ceo@woofadaar.com' });
    }

    return channels;
  }

  private async sendNotification(alert: MonitoringAlert, channel: { type: string; recipient: string }) {
    const message = this.formatAlertMessage(alert);
    
    switch (channel.type) {
      case 'slack':
        await this.sendSlackNotification(channel.recipient, message);
        break;
      case 'email':
        await this.sendEmailNotification(channel.recipient, alert.title, message);
        break;
      case 'sms':
        await this.sendSMSNotification(channel.recipient, message);
        break;
      case 'pagerduty':
        await this.sendPagerDutyAlert(alert);
        break;
    }
  }

  private formatAlertMessage(alert: MonitoringAlert): string {
    return `🚨 ${alert.title}\n\n` +
           `Category: ${alert.category}\n` +
           `Severity: ${alert.type}\n` +
           `Current Value: ${alert.currentValue}\n` +
           `Threshold: ${alert.threshold}\n` +
           `Time: ${alert.triggeredAt.toISOString()}\n\n` +
           `Action Items:\n${alert.actionItems.map(item => `• ${item}`).join('\n')}`;
  }

  private async sendSlackNotification(channel: string, message: string) {
    // Implementation would send to actual Slack
    console.log(`Slack notification to ${channel}: ${message}`);
  }

  private async sendEmailNotification(recipient: string, subject: string, message: string) {
    // Implementation would send actual email
    console.log(`Email notification to ${recipient}: ${subject}`);
  }

  private async sendSMSNotification(recipient: string, message: string) {
    // Implementation would send actual SMS
    console.log(`SMS notification to ${recipient}: ${message}`);
  }

  private async sendPagerDutyAlert(alert: MonitoringAlert) {
    // Implementation would send to actual PagerDuty
    console.log(`PagerDuty alert: ${alert.title}`);
  }

  // Incident management
  createIncident(title: string, severity: 'sev1' | 'sev2' | 'sev3' | 'sev4', description: string): IncidentReport {
    const incident: IncidentReport = {
      id: `incident_${Date.now()}`,
      title,
      severity,
      status: 'investigating',
      startTime: new Date(),
      affectedServices: [],
      impactDescription: description,
      timeline: [{
        timestamp: new Date(),
        type: 'detected',
        description: `Incident detected: ${title}`,
        actor: 'monitoring-system'
      }],
      postMortemRequired: severity === 'sev1' || severity === 'sev2'
    };

    this.incidents.push(incident);
    console.log(`📋 Incident created: ${incident.id} - ${title}`);

    return incident;
  }

  updateIncident(incidentId: string, update: {
    status?: IncidentReport['status'];
    description?: string;
    actor: string;
  }) {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (!incident) return;

    if (update.status) {
      incident.status = update.status;
      if (update.status === 'resolved') {
        incident.resolvedTime = new Date();
      }
    }

    incident.timeline.push({
      timestamp: new Date(),
      type: 'update',
      description: update.description || `Status updated to ${update.status}`,
      actor: update.actor
    });
  }

  // Reporting
  private generateHourlyReport() {
    const report = {
      timestamp: new Date(),
      metrics: { ...this.metrics },
      activeAlerts: this.alerts.filter(a => a.status === 'active').length,
      activeIncidents: this.incidents.filter(i => i.status !== 'resolved').length,
      systemHealth: this.calculateSystemHealth()
    };

    console.log('📊 Hourly monitoring report generated');
    // In production, this would be stored/sent to monitoring dashboard
  }

  private calculateSystemHealth(): 'healthy' | 'degraded' | 'critical' {
    const criticalAlerts = this.alerts.filter(a => a.status === 'active' && a.type === 'critical').length;
    const activeIncidents = this.incidents.filter(i => i.status !== 'resolved').length;

    if (criticalAlerts > 0 || activeIncidents > 0) return 'critical';
    if (this.alerts.filter(a => a.status === 'active').length > 3) return 'degraded';
    return 'healthy';
  }

  private async storeMetrics() {
    // In production, store metrics in time-series database
    console.log('📈 Metrics stored');
  }

  private cleanupOldData() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Remove resolved alerts older than 1 day
    this.alerts = this.alerts.filter(a => 
      a.status === 'active' || a.triggeredAt > oneDayAgo
    );

    // Remove resolved incidents older than 1 week
    this.incidents = this.incidents.filter(i => 
      i.status !== 'resolved' || i.startTime > oneWeekAgo
    );
  }

  // Public API
  getCurrentMetrics(): MonitoringMetrics {
    return { ...this.metrics };
  }

  getActiveAlerts(): MonitoringAlert[] {
    return this.alerts.filter(a => a.status === 'active');
  }

  getActiveIncidents(): IncidentReport[] {
    return this.incidents.filter(i => i.status !== 'resolved');
  }

  acknowledgeAlert(alertId: string, actor: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && alert.status === 'active') {
      alert.status = 'acknowledged';
      console.log(`Alert ${alertId} acknowledged by ${actor}`);
      return true;
    }
    return false;
  }

  resolveAlert(alertId: string, actor: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && alert.status !== 'resolved') {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      console.log(`Alert ${alertId} resolved by ${actor}`);
      return true;
    }
    return false;
  }

  getSystemHealth(): { status: string; score: number; details: any } {
    const health = this.calculateSystemHealth();
    const score = health === 'healthy' ? 100 : health === 'degraded' ? 70 : 30;
    
    return {
      status: health,
      score,
      details: {
        activeAlerts: this.getActiveAlerts().length,
        activeIncidents: this.getActiveIncidents().length,
        uptime: this.metrics.system.uptime,
        responseTime: this.metrics.application.responseTime.p95,
        errorRate: this.metrics.application.errorRate.percentage
      }
    };
  }
}

interface AlertRule {
  id: string;
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  duration: number;
  severity: 'critical' | 'warning';
  category: 'infrastructure' | 'performance' | 'business' | 'security';
  escalationLevel: 0 | 1 | 2 | 3;
  actionItems: string[];
}

// Export singleton instance
export const productionMonitoring = ProductionMonitoringService.getInstance();
export default ProductionMonitoringService;