// Woofadaar Performance Monitoring Service
// Real-time performance tracking for mobile and web

interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  timestamp: number;
  context?: string;
  userId?: string;
}

interface PerformanceReport {
  loadTimes: {
    pageLoad: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    firstInputDelay: number;
    cumulativeLayoutShift: number;
  };
  networkMetrics: {
    effectiveConnectionType: string;
    downlink: number;
    rtt: number;
  };
  memoryUsage: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  apiPerformance: {
    averageResponseTime: number;
    errorRate: number;
    slowRequests: number;
  };
  userExperience: {
    bounceRate: number;
    sessionDuration: number;
    pageViews: number;
  };
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private isRecording = false;
  private startTime = Date.now();
  private apiCallTimes = new Map<string, number>();
  private pageLoadStart = 0;
  private observer?: PerformanceObserver;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
      PerformanceMonitor.instance.initialize();
    }
    return PerformanceMonitor.instance;
  }

  private initialize() {
    if (typeof window === 'undefined') return;

    this.isRecording = true;
    this.pageLoadStart = performance.now();
    
    // Initialize performance observers
    this.initializeObservers();
    
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.recordMetric('page_visibility', 1, 'count', 'resumed');
      } else {
        this.recordMetric('page_visibility', 0, 'count', 'hidden');
      }
    });

    // Track memory usage periodically
    setInterval(() => {
      this.trackMemoryUsage();
    }, 30000); // Every 30 seconds

    // Track network information
    this.trackNetworkInfo();
    
    // Listen for performance navigation timing
    window.addEventListener('load', () => {
      setTimeout(() => this.trackLoadPerformance(), 1000);
    });
  }

  private initializeObservers() {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      // Largest Contentful Paint
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('largest_contentful_paint', lastEntry.startTime, 'ms');
      });
      this.observer.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fid = entry.processingStart - entry.startTime;
          this.recordMetric('first_input_delay', fid, 'ms');
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            this.recordMetric('cumulative_layout_shift', entry.value, 'count');
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Navigation timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processNavigationEntry(entry as PerformanceNavigationTiming);
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });

    } catch (error) {
      console.warn('Performance Observer initialization failed:', error);
    }
  }

  private processNavigationEntry(entry: PerformanceNavigationTiming) {
    // DNS lookup time
    if (entry.domainLookupEnd && entry.domainLookupStart) {
      this.recordMetric('dns_lookup_time', 
        entry.domainLookupEnd - entry.domainLookupStart, 'ms');
    }

    // TCP connection time
    if (entry.connectEnd && entry.connectStart) {
      this.recordMetric('tcp_connection_time', 
        entry.connectEnd - entry.connectStart, 'ms');
    }

    // Request/response time
    if (entry.responseEnd && entry.requestStart) {
      this.recordMetric('request_response_time', 
        entry.responseEnd - entry.requestStart, 'ms');
    }

    // DOM processing time
    if (entry.domContentLoadedEventEnd && entry.domContentLoadedEventStart) {
      this.recordMetric('dom_processing_time', 
        entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart, 'ms');
    }

    // Page load complete time
    if (entry.loadEventEnd && entry.loadEventStart) {
      this.recordMetric('page_load_complete', 
        entry.loadEventEnd - entry.fetchStart, 'ms');
    }
  }

  private trackLoadPerformance() {
    if (typeof performance === 'undefined') return;

    const paintEntries = performance.getEntriesByType('paint');
    
    for (const entry of paintEntries) {
      if (entry.name === 'first-contentful-paint') {
        this.recordMetric('first_contentful_paint', entry.startTime, 'ms');
      }
      if (entry.name === 'first-paint') {
        this.recordMetric('first_paint', entry.startTime, 'ms');
      }
    }

    // Time to Interactive (approximation)
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry) {
      const tti = navigationEntry.domInteractive - navigationEntry.fetchStart;
      this.recordMetric('time_to_interactive', tti, 'ms');
    }
  }

  private trackMemoryUsage() {
    if (typeof performance === 'undefined' || !('memory' in performance)) return;

    // @ts-ignore
    const memory = performance.memory;
    
    this.recordMetric('memory_used', memory.usedJSHeapSize, 'bytes');
    this.recordMetric('memory_total', memory.totalJSHeapSize, 'bytes');
    this.recordMetric('memory_limit', memory.jsHeapSizeLimit, 'bytes');
    
    const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    this.recordMetric('memory_usage_percent', usagePercent, 'percent');
  }

  private trackNetworkInfo() {
    if (typeof navigator === 'undefined') return;

    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      this.recordMetric('network_downlink', connection.downlink || 0, 'ms');
      this.recordMetric('network_rtt', connection.rtt || 0, 'ms');
      
      // Track effective connection type
      const connectionTypes = {
        'slow-2g': 1,
        '2g': 2,
        '3g': 3,
        '4g': 4
      };
      
      const typeValue = connectionTypes[connection.effectiveType as keyof typeof connectionTypes] || 0;
      this.recordMetric('network_effective_type', typeValue, 'count', connection.effectiveType);
    }

    // Track online/offline status
    const onlineStatus = navigator.onLine ? 1 : 0;
    this.recordMetric('network_online_status', onlineStatus, 'count');
  }

  // Public API methods
  recordMetric(name: string, value: number, unit: PerformanceMetric['unit'], context?: string) {
    if (!this.isRecording) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      context,
      userId: this.getCurrentUserId()
    };

    this.metrics.push(metric);

    // Keep only recent metrics to prevent memory leaks
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-5000);
    }

    // Send critical metrics immediately
    if (this.isCriticalMetric(name, value)) {
      this.sendMetricToServer(metric);
    }
  }

  // Track API call performance
  startAPICall(endpoint: string): string {
    const callId = `${endpoint}_${Date.now()}_${Math.random()}`;
    this.apiCallTimes.set(callId, Date.now());
    return callId;
  }

  endAPICall(callId: string, success: boolean, statusCode?: number) {
    const startTime = this.apiCallTimes.get(callId);
    if (!startTime) return;

    const duration = Date.now() - startTime;
    this.apiCallTimes.delete(callId);

    const endpoint = callId.split('_')[0];
    
    this.recordMetric('api_response_time', duration, 'ms', endpoint);
    this.recordMetric('api_call_status', success ? 1 : 0, 'count', 
      `${endpoint}_${statusCode || 'unknown'}`);

    // Track slow API calls
    if (duration > 3000) { // 3 seconds threshold
      this.recordMetric('slow_api_call', duration, 'ms', endpoint);
    }
  }

  // Track user interactions
  trackUserInteraction(action: string, element?: string) {
    this.recordMetric('user_interaction', 1, 'count', `${action}_${element || 'unknown'}`);
  }

  // Track page transitions
  trackPageTransition(fromPage: string, toPage: string, transitionTime: number) {
    this.recordMetric('page_transition_time', transitionTime, 'ms', `${fromPage}_to_${toPage}`);
  }

  // Track rendering performance
  trackRenderTime(component: string, renderTime: number) {
    this.recordMetric('component_render_time', renderTime, 'ms', component);
  }

  // Generate performance report
  generateReport(): PerformanceReport {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 300000); // Last 5 minutes

    return {
      loadTimes: {
        pageLoad: this.getMetricValue(recentMetrics, 'page_load_complete') || 0,
        firstContentfulPaint: this.getMetricValue(recentMetrics, 'first_contentful_paint') || 0,
        largestContentfulPaint: this.getMetricValue(recentMetrics, 'largest_contentful_paint') || 0,
        firstInputDelay: this.getMetricValue(recentMetrics, 'first_input_delay') || 0,
        cumulativeLayoutShift: this.getMetricValue(recentMetrics, 'cumulative_layout_shift') || 0
      },
      networkMetrics: {
        effectiveConnectionType: this.getMetricContext(recentMetrics, 'network_effective_type') || 'unknown',
        downlink: this.getMetricValue(recentMetrics, 'network_downlink') || 0,
        rtt: this.getMetricValue(recentMetrics, 'network_rtt') || 0
      },
      memoryUsage: {
        usedJSHeapSize: this.getMetricValue(recentMetrics, 'memory_used') || 0,
        totalJSHeapSize: this.getMetricValue(recentMetrics, 'memory_total') || 0,
        jsHeapSizeLimit: this.getMetricValue(recentMetrics, 'memory_limit') || 0
      },
      apiPerformance: {
        averageResponseTime: this.getAverageMetricValue(recentMetrics, 'api_response_time') || 0,
        errorRate: this.calculateErrorRate(recentMetrics) || 0,
        slowRequests: recentMetrics.filter(m => m.name === 'slow_api_call').length
      },
      userExperience: {
        bounceRate: 0, // Would need session tracking
        sessionDuration: now - this.startTime,
        pageViews: recentMetrics.filter(m => m.name === 'page_transition_time').length + 1
      }
    };
  }

  // Get performance insights
  getPerformanceInsights(): string[] {
    const report = this.generateReport();
    const insights: string[] = [];

    // Load performance insights
    if (report.loadTimes.firstContentfulPaint > 2500) {
      insights.push('First Contentful Paint is slow (>2.5s). Consider optimizing critical resources.');
    }

    if (report.loadTimes.largestContentfulPaint > 4000) {
      insights.push('Largest Contentful Paint is slow (>4s). Optimize images and critical content.');
    }

    if (report.loadTimes.cumulativeLayoutShift > 0.1) {
      insights.push('High Cumulative Layout Shift detected. Stabilize layout during load.');
    }

    // API performance insights
    if (report.apiPerformance.averageResponseTime > 2000) {
      insights.push('API response times are slow (>2s). Consider caching or API optimization.');
    }

    if (report.apiPerformance.errorRate > 5) {
      insights.push('High API error rate detected. Check backend stability.');
    }

    // Memory insights
    const memoryUsagePercent = (report.memoryUsage.usedJSHeapSize / report.memoryUsage.jsHeapSizeLimit) * 100;
    if (memoryUsagePercent > 80) {
      insights.push('High memory usage detected. Check for memory leaks.');
    }

    // Network insights
    if (report.networkMetrics.effectiveConnectionType === 'slow-2g' || report.networkMetrics.effectiveConnectionType === '2g') {
      insights.push('Slow network detected. Optimize for low-bandwidth users.');
    }

    return insights;
  }

  // Helper methods
  private getMetricValue(metrics: PerformanceMetric[], name: string): number | null {
    const metric = metrics.filter(m => m.name === name).sort((a, b) => b.timestamp - a.timestamp)[0];
    return metric ? metric.value : null;
  }

  private getMetricContext(metrics: PerformanceMetric[], name: string): string | null {
    const metric = metrics.filter(m => m.name === name).sort((a, b) => b.timestamp - a.timestamp)[0];
    return metric ? metric.context || null : null;
  }

  private getAverageMetricValue(metrics: PerformanceMetric[], name: string): number | null {
    const relevantMetrics = metrics.filter(m => m.name === name);
    if (relevantMetrics.length === 0) return null;
    
    const sum = relevantMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / relevantMetrics.length;
  }

  private calculateErrorRate(metrics: PerformanceMetric[]): number {
    const apiCalls = metrics.filter(m => m.name === 'api_call_status');
    if (apiCalls.length === 0) return 0;
    
    const errors = apiCalls.filter(m => m.value === 0);
    return (errors.length / apiCalls.length) * 100;
  }

  private isCriticalMetric(name: string, value: number): boolean {
    const criticalThresholds = {
      'first_contentful_paint': 3000,
      'largest_contentful_paint': 4000,
      'first_input_delay': 300,
      'api_response_time': 5000,
      'memory_usage_percent': 90
    };

    return Object.entries(criticalThresholds).some(([metricName, threshold]) => 
      name === metricName && value > threshold
    );
  }

  private async sendMetricToServer(metric: PerformanceMetric) {
    // In production, send to your analytics/monitoring service
    try {
      if (process.env.NODE_ENV === 'production') {
        // Example: Send to your monitoring endpoint
        // await fetch('/api/analytics/performance', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(metric)
        // });
      }
    } catch (error) {
      console.warn('Failed to send performance metric:', error);
    }
  }

  private getCurrentUserId(): string | undefined {
    if (typeof localStorage === 'undefined') return undefined;
    
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) return undefined;
      
      // Decode JWT to get user ID (simplified)
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id;
    } catch {
      return undefined;
    }
  }

  // Export data for analysis
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  // Clear old metrics
  clearOldMetrics(olderThanMs = 3600000) { // 1 hour default
    const cutoffTime = Date.now() - olderThanMs;
    this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime);
  }

  // Enable/disable monitoring
  setRecording(enabled: boolean) {
    this.isRecording = enabled;
  }

  isRecordingEnabled(): boolean {
    return this.isRecording;
  }
}

// Global performance monitor instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// React hook for performance monitoring
export function usePerformanceMonitoring() {
  const startRender = (componentName: string) => {
    return performance.now();
  };

  const endRender = (componentName: string, startTime: number) => {
    const renderTime = performance.now() - startTime;
    performanceMonitor.trackRenderTime(componentName, renderTime);
  };

  const trackInteraction = (action: string, element?: string) => {
    performanceMonitor.trackUserInteraction(action, element);
  };

  return {
    startRender,
    endRender,
    trackInteraction,
    getReport: () => performanceMonitor.generateReport(),
    getInsights: () => performanceMonitor.getPerformanceInsights()
  };
}

// API performance wrapper
export function withPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T, 
  endpoint: string
): T {
  return (async (...args: any[]) => {
    const callId = performanceMonitor.startAPICall(endpoint);
    
    try {
      const result = await fn(...args);
      performanceMonitor.endAPICall(callId, true);
      return result;
    } catch (error: any) {
      const statusCode = error?.response?.status || error?.status;
      performanceMonitor.endAPICall(callId, false, statusCode);
      throw error;
    }
  }) as T;
}

// Performance monitoring middleware for API routes
export function performanceMiddleware() {
  return {
    before: (endpoint: string) => {
      return performanceMonitor.startAPICall(endpoint);
    },
    after: (callId: string, success: boolean, statusCode?: number) => {
      performanceMonitor.endAPICall(callId, success, statusCode);
    }
  };
}