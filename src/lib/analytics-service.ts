// Week 15-16: Advanced Analytics Service - Launch Ready
// Enhanced business intelligence, real-time monitoring, and revenue analytics
// Comprehensive tracking for premium features and mobile performance

interface AnalyticsEvent {
  user_id?: string;
  session_id: string;
  action_type: string;
  page_url?: string;
  element_clicked?: string;
  time_spent_seconds?: number;
  device_type?: string;
  browser?: string;
  location_city?: string;
  language?: string;
  ab_variant?: string;
  referrer?: string;
  error_code?: string;
  metadata?: Record<string, any>;
}

interface SearchEvent {
  user_id?: string;
  search_query: string;
  search_type: 'question' | 'partner' | 'health' | 'general';
  language?: string;
  results_count?: number;
  clicked_result_position?: number;
  clicked_result_id?: string;
  search_duration_ms?: number;
  no_results?: boolean;
  filters_applied?: Record<string, any>;
}

interface UserFunnelUpdate {
  user_id: string;
  stage?: 'signup' | 'profile' | 'dog_profile' | 'active' | 'premium';
  profile_completed_at?: Date;
  dog_profile_created_at?: Date;
  first_question_at?: Date;
  first_answer_at?: Date;
  first_health_log_at?: Date;
  first_booking_at?: Date;
  premium_signup_at?: Date;
  language?: string;
  acquisition_source?: string;
  city?: string;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private eventQueue: AnalyticsEvent[] = [];
  private searchQueue: SearchEvent[] = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds
  private sessionStore = new Map<string, string>(); // userId -> sessionId

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
      AnalyticsService.instance.startBatchProcessor();
    }
    return AnalyticsService.instance;
  }

  // Generate or get session ID for user
  getSessionId(userId?: string): string {
    if (!userId) {
      return `anonymous-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    if (this.sessionStore.has(userId)) {
      return this.sessionStore.get(userId)!;
    }

    const sessionId = `session-${userId}-${Date.now()}`;
    this.sessionStore.set(userId, sessionId);
    
    // Clean up old sessions after 30 minutes
    setTimeout(() => {
      this.sessionStore.delete(userId);
    }, 30 * 60 * 1000);

    return sessionId;
  }

  // Track user behavior events
  track(event: Omit<AnalyticsEvent, 'timestamp'>): void {
    const analyticsEvent: AnalyticsEvent = {
      ...event,
      session_id: event.session_id || this.getSessionId(event.user_id),
      language: event.language || 'en',
      device_type: event.device_type || this.detectDeviceType(),
      browser: event.browser || this.detectBrowser()
    };

    this.eventQueue.push(analyticsEvent);
    
    if (this.eventQueue.length >= this.batchSize) {
      this.flushEvents();
    }
  }

  // Track search events
  trackSearch(event: SearchEvent): void {
    this.searchQueue.push({
      ...event,
      language: event.language || 'en'
    });
    
    if (this.searchQueue.length >= this.batchSize) {
      this.flushSearchEvents();
    }
  }

  // Track specific user journey events
  trackAuth(userId: string, action: 'login' | 'signup' | 'logout', metadata?: Record<string, any>): void {
    this.track({
      user_id: userId,
      session_id: this.getSessionId(userId),
      action_type: `auth_${action}`,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  }

  trackProfile(userId: string, action: 'completed' | 'updated', metadata?: Record<string, any>): void {
    this.track({
      user_id: userId,
      session_id: this.getSessionId(userId),
      action_type: `profile_${action}`,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });

    // Update funnel if profile completed
    if (action === 'completed') {
      this.updateUserFunnel(userId, { 
        stage: 'profile',
        profile_completed_at: new Date()
      });
    }
  }

  trackDogProfile(userId: string, action: 'created' | 'updated', dogId: string, metadata?: Record<string, any>): void {
    this.track({
      user_id: userId,
      session_id: this.getSessionId(userId),
      action_type: `dog_profile_${action}`,
      metadata: {
        dog_id: dogId,
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });

    // Update funnel if dog profile created
    if (action === 'created') {
      this.updateUserFunnel(userId, {
        stage: 'dog_profile',
        dog_profile_created_at: new Date()
      });
    }
  }

  trackQRScan(userId?: string, dogId?: string, metadata?: Record<string, any>): void {
    this.track({
      user_id: userId,
      session_id: this.getSessionId(userId),
      action_type: 'qr_scan',
      metadata: {
        dog_id: dogId,
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  }

  trackPartnerInteraction(userId: string, action: 'search' | 'view' | 'booking_started' | 'booking_completed', partnerId?: string, metadata?: Record<string, any>): void {
    this.track({
      user_id: userId,
      session_id: this.getSessionId(userId),
      action_type: `partner_${action}`,
      metadata: {
        partner_id: partnerId,
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });

    // Update funnel for first booking
    if (action === 'booking_completed') {
      this.updateUserFunnel(userId, {
        first_booking_at: new Date(),
        stage: 'active'
      });
    }
  }

  trackCommunityActivity(userId: string, action: 'question_posted' | 'answer_posted' | 'vote_cast' | 'report_submitted', metadata?: Record<string, any>): void {
    this.track({
      user_id: userId,
      session_id: this.getSessionId(userId),
      action_type: `community_${action}`,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });

    // Update funnel for first community activity
    if (action === 'question_posted') {
      this.updateUserFunnel(userId, {
        first_question_at: new Date(),
        stage: 'active'
      });
    } else if (action === 'answer_posted') {
      this.updateUserFunnel(userId, {
        first_answer_at: new Date(),
        stage: 'active'
      });
    }
  }

  trackHealthActivity(userId: string, action: 'log_created' | 'reminder_set' | 'diary_created' | 'photo_uploaded', dogId: string, metadata?: Record<string, any>): void {
    this.track({
      user_id: userId,
      session_id: this.getSessionId(userId),
      action_type: `health_${action}`,
      metadata: {
        dog_id: dogId,
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });

    // Update funnel for first health log
    if (action === 'log_created') {
      this.updateUserFunnel(userId, {
        first_health_log_at: new Date(),
        stage: 'active'
      });
    }
  }

  trackLanguageSwitch(userId: string, fromLanguage: string, toLanguage: string): void {
    this.track({
      user_id: userId,
      session_id: this.getSessionId(userId),
      action_type: 'language_switched',
      metadata: {
        from_language: fromLanguage,
        to_language: toLanguage,
        timestamp: new Date().toISOString()
      }
    });
  }

  trackNotification(userId: string, action: 'opt_in' | 'opened' | 'clicked' | 'dismissed', notificationId?: string, metadata?: Record<string, any>): void {
    this.track({
      user_id: userId,
      session_id: this.getSessionId(userId),
      action_type: `notification_${action}`,
      metadata: {
        notification_id: notificationId,
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  }

  trackPremiumActivity(userId: string, action: 'signup' | 'cancel' | 'feature_used' | 'trial_started' | 'trial_converted' | 'payment_failed', metadata?: Record<string, any>): void {
    this.track({
      user_id: userId,
      session_id: this.getSessionId(userId),
      action_type: `premium_${action}`,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });

    // Update funnel for premium activities
    if (action === 'signup' || action === 'trial_converted') {
      this.updateUserFunnel(userId, {
        premium_signup_at: new Date(),
        stage: 'premium'
      });
    }
  }

  // Enhanced premium feature tracking
  trackPremiumFeatureUsage(userId: string, feature: string, metadata?: Record<string, any>): void {
    this.track({
      user_id: userId,
      session_id: this.getSessionId(userId),
      action_type: 'premium_feature_used',
      metadata: {
        feature_name: feature,
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Track revenue events
  trackRevenue(userId: string, amount: number, currency: string, subscriptionType: string, metadata?: Record<string, any>): void {
    this.track({
      user_id: userId,
      session_id: this.getSessionId(userId),
      action_type: 'revenue_generated',
      metadata: {
        amount,
        currency,
        subscription_type: subscriptionType,
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Track mobile app performance
  trackMobilePerformance(userId: string, metrics: Record<string, number>): void {
    this.track({
      user_id: userId,
      session_id: this.getSessionId(userId),
      action_type: 'mobile_performance',
      metadata: {
        ...metrics,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Track PWA engagement
  trackPWAEvent(userId: string, action: 'install' | 'offline_usage' | 'push_notification_received' | 'background_sync', metadata?: Record<string, any>): void {
    this.track({
      user_id: userId,
      session_id: this.getSessionId(userId),
      action_type: `pwa_${action}`,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  }

  trackError(userId?: string, error: string, context?: Record<string, any>): void {
    this.track({
      user_id: userId,
      session_id: this.getSessionId(userId),
      action_type: 'error_occurred',
      error_code: error,
      metadata: {
        context,
        timestamp: new Date().toISOString()
      }
    });
  }

  trackPageView(userId?: string, pageUrl: string, timeSpent?: number, metadata?: Record<string, any>): void {
    this.track({
      user_id: userId,
      session_id: this.getSessionId(userId),
      action_type: 'page_view',
      page_url: pageUrl,
      time_spent_seconds: timeSpent,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Update user funnel progression
  async updateUserFunnel(userId: string, updates: UserFunnelUpdate): Promise<void> {
    try {
      const response = await fetch('/api/analytics/funnel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          ...updates
        })
      });

      if (!response.ok) {
        console.error('Failed to update user funnel:', response.statusText);
      }
    } catch (error) {
      console.error('Error updating user funnel:', error);
    }
  }

  // Core funnel analysis methods
  async getUserFunnel(userId: string): Promise<any> {
    try {
      const response = await fetch(`/api/analytics/funnel?user_id=${userId}`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Error getting user funnel:', error);
      return null;
    }
  }

  // Batch processing
  private startBatchProcessor(): void {
    setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flushEvents();
      }
      if (this.searchQueue.length > 0) {
        this.flushSearchEvents();
      }
    }, this.flushInterval);
  }

  private async flushEvents(): void {
    const events = this.eventQueue.splice(0, this.batchSize);
    
    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events })
      });
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
      // Re-queue events for retry
      this.eventQueue.unshift(...events);
    }
  }

  private async flushSearchEvents(): void {
    const events = this.searchQueue.splice(0, this.batchSize);
    
    try {
      await fetch('/api/analytics/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events })
      });
    } catch (error) {
      console.error('Failed to flush search events:', error);
      // Re-queue events for retry
      this.searchQueue.unshift(...events);
    }
  }

  // Utility methods
  private detectDeviceType(): string {
    if (typeof window === 'undefined') return 'unknown';
    
    const userAgent = window.navigator.userAgent;
    
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    }
    
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    
    return 'desktop';
  }

  private detectBrowser(): string {
    if (typeof window === 'undefined') return 'unknown';
    
    const userAgent = window.navigator.userAgent;
    
    if (userAgent.includes('Chrome')) return 'chrome';
    if (userAgent.includes('Firefox')) return 'firefox';
    if (userAgent.includes('Safari')) return 'safari';
    if (userAgent.includes('Edge')) return 'edge';
    if (userAgent.includes('Opera')) return 'opera';
    
    return 'other';
  }

  // Manual flush for immediate processing
  flush(): void {
    this.flushEvents();
    this.flushSearchEvents();
  }
}

export default AnalyticsService;
export type { AnalyticsEvent, SearchEvent, UserFunnelUpdate };