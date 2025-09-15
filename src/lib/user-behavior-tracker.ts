import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface UserBehaviorEvent {
  userId?: string;
  sessionId: string;
  eventType: string;
  eventCategory: string;
  eventName: string;
  eventData?: Record<string, any>;
  pageUrl?: string;
  referrerUrl?: string;
  deviceInfo?: {
    type: string;
    browser: string;
    os: string;
    screenResolution: string;
    isMobile: boolean;
  };
  locationData?: {
    city?: string;
    country?: string;
    timezone?: string;
  };
  userAgent?: string;
}

export interface UserAnalyticsData {
  userId: string;
  sessionId: string;
  pageViews?: number;
  timeOnPlatform?: number;
  featuresUsed?: string[];
  actionsTaken?: any[];
  deviceType?: string;
  browser?: string;
  locationCity?: string;
  referralSource?: string;
  conversionEvents?: any[];
}

class UserBehaviorTracker {
  private static instance: UserBehaviorTracker;
  private eventQueue: UserBehaviorEvent[] = [];
  private analyticsQueue: UserAnalyticsData[] = [];
  private isProcessing = false;
  private flushInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startPeriodicFlush();
  }

  static getInstance(): UserBehaviorTracker {
    if (!UserBehaviorTracker.instance) {
      UserBehaviorTracker.instance = new UserBehaviorTracker();
    }
    return UserBehaviorTracker.instance;
  }

  // Track user behavior events
  async trackEvent(event: UserBehaviorEvent): Promise<void> {
    try {
      // Add to queue for batch processing
      this.eventQueue.push({
        ...event,
        timestamp: new Date(),
        created_at: new Date()
      });

      // If queue is getting large, flush immediately
      if (this.eventQueue.length >= 50) {
        await this.flushEvents();
      }
    } catch (error) {
      console.error('Error tracking user behavior event:', error);
    }
  }

  // Track user analytics data
  async trackUserAnalytics(analytics: UserAnalyticsData): Promise<void> {
    try {
      this.analyticsQueue.push(analytics);

      if (this.analyticsQueue.length >= 20) {
        await this.flushAnalytics();
      }
    } catch (error) {
      console.error('Error tracking user analytics:', error);
    }
  }

  // Common event tracking methods
  async trackPageView(userId: string | null, sessionId: string, pageUrl: string, referrer?: string): Promise<void> {
    await this.trackEvent({
      userId: userId || undefined,
      sessionId,
      eventType: 'page_view',
      eventCategory: 'engagement',
      eventName: 'page_viewed',
      pageUrl,
      referrerUrl: referrer,
      eventData: { timestamp: new Date().toISOString() }
    });
  }

  async trackFeatureUsage(userId: string, sessionId: string, featureName: string, featureData?: any): Promise<void> {
    await this.trackEvent({
      userId,
      sessionId,
      eventType: 'feature_use',
      eventCategory: 'engagement',
      eventName: featureName,
      eventData: { 
        feature: featureName, 
        data: featureData,
        timestamp: new Date().toISOString()
      }
    });
  }

  async trackConversion(userId: string, sessionId: string, conversionType: string, value?: number): Promise<void> {
    await this.trackEvent({
      userId,
      sessionId,
      eventType: 'conversion',
      eventCategory: 'conversion',
      eventName: conversionType,
      eventData: { 
        type: conversionType, 
        value,
        timestamp: new Date().toISOString()
      }
    });
  }

  async trackUserAction(userId: string, sessionId: string, action: string, target?: string, data?: any): Promise<void> {
    await this.trackEvent({
      userId,
      sessionId,
      eventType: 'click',
      eventCategory: 'engagement',
      eventName: action,
      eventData: { 
        action, 
        target, 
        data,
        timestamp: new Date().toISOString()
      }
    });
  }

  async trackError(userId: string | null, sessionId: string, error: Error, context?: any): Promise<void> {
    await this.trackEvent({
      userId: userId || undefined,
      sessionId,
      eventType: 'error',
      eventCategory: 'technical',
      eventName: 'error_occurred',
      eventData: { 
        error: error.message, 
        stack: error.stack,
        context,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Flush events to database
  private async flushEvents(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) return;

    this.isProcessing = true;
    const eventsToProcess = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await prisma.userBehaviorEvents.createMany({
        data: eventsToProcess.map(event => ({
          user_id: event.userId || null,
          session_id: event.sessionId,
          event_type: event.eventType,
          event_category: event.eventCategory,
          event_name: event.eventName,
          event_data: event.eventData || {},
          page_url: event.pageUrl || null,
          referrer_url: event.referrerUrl || null,
          device_info: event.deviceInfo || null,
          location_data: event.locationData || null,
          user_agent: event.userAgent || null,
          timestamp: new Date(),
          created_at: new Date()
        })),
        skipDuplicates: true
      });

      console.log(`Flushed ${eventsToProcess.length} behavior events to database`);
    } catch (error) {
      console.error('Error flushing behavior events:', error);
      // Re-add events to queue on failure
      this.eventQueue.unshift(...eventsToProcess);
    } finally {
      this.isProcessing = false;
    }
  }

  // Flush analytics to database
  private async flushAnalytics(): Promise<void> {
    if (this.analyticsQueue.length === 0) return;

    const analyticsToProcess = [...this.analyticsQueue];
    this.analyticsQueue = [];

    try {
      for (const analytics of analyticsToProcess) {
        // Find existing record or create new one
        const existingAnalytics = await prisma.userAnalytics.findFirst({
          where: {
            user_id: analytics.userId,
            session_id: analytics.sessionId
          }
        });

        if (existingAnalytics) {
          await prisma.userAnalytics.update({
            where: {
              id: existingAnalytics.id
            },
            data: {
              page_views: analytics.pageViews,
              time_on_platform: analytics.timeOnPlatform,
              features_used: analytics.featuresUsed,
              actions_taken: analytics.actionsTaken,
              conversion_events: analytics.conversionEvents,
              updated_at: new Date()
            }
          });
        } else {
          await prisma.userAnalytics.create({
            data: {
              user_id: analytics.userId,
              session_id: analytics.sessionId,
              page_views: analytics.pageViews || 0,
              time_on_platform: analytics.timeOnPlatform || 0,
              features_used: analytics.featuresUsed || [],
              actions_taken: analytics.actionsTaken || [],
              device_type: analytics.deviceType || null,
              browser: analytics.browser || null,
              location_city: analytics.locationCity || null,
              referral_source: analytics.referralSource || null,
              conversion_events: analytics.conversionEvents || [],
              created_at: new Date(),
              updated_at: new Date()
            }
          });
        }
      }

      console.log(`Flushed ${analyticsToProcess.length} analytics records to database`);
    } catch (error) {
      console.error('Error flushing analytics:', error);
      // Re-add analytics to queue on failure
      this.analyticsQueue.unshift(...analyticsToProcess);
    }
  }

  // Start periodic flush
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(async () => {
      await this.flushEvents();
      await this.flushAnalytics();
    }, 30000); // Flush every 30 seconds
  }

  // Get user behavior analytics
  async getUserBehaviorAnalytics(userId: string, days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const [events, analytics] = await Promise.all([
        prisma.userBehaviorEvents.findMany({
          where: {
            user_id: userId,
            created_at: {
              gte: startDate
            }
          },
          orderBy: {
            created_at: 'desc'
          }
        }),
        prisma.userAnalytics.findMany({
          where: {
            user_id: userId,
            created_at: {
              gte: startDate
            }
          },
          orderBy: {
            created_at: 'desc'
          }
        })
      ]);

      // Analyze behavior patterns
      const eventsByType = events.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const eventsByCategory = events.reduce((acc, event) => {
        acc[event.event_category] = (acc[event.event_category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalSessions = new Set(events.map(e => e.session_id)).size;
      const totalPageViews = events.filter(e => e.event_type === 'page_view').length;
      const totalFeatureUsage = events.filter(e => e.event_type === 'feature_use').length;
      const conversions = events.filter(e => e.event_category === 'conversion').length;

      return {
        summary: {
          totalEvents: events.length,
          totalSessions,
          totalPageViews,
          totalFeatureUsage,
          conversions,
          avgSessionDuration: analytics.reduce((sum, a) => sum + (a.time_on_platform || 0), 0) / Math.max(totalSessions, 1)
        },
        eventsByType,
        eventsByCategory,
        recentEvents: events.slice(0, 50),
        sessionsData: analytics
      };
    } catch (error) {
      console.error('Error getting user behavior analytics:', error);
      throw error;
    }
  }

  // Get platform-wide behavior metrics
  async getPlatformBehaviorMetrics(days: number = 7): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const [totalEvents, uniqueSessions, topEvents, deviceBreakdown] = await Promise.all([
        prisma.userBehaviorEvents.count({
          where: {
            created_at: {
              gte: startDate
            }
          }
        }),
        prisma.userBehaviorEvents.groupBy({
          by: ['session_id'],
          where: {
            created_at: {
              gte: startDate
            }
          }
        }),
        prisma.userBehaviorEvents.groupBy({
          by: ['event_name'],
          where: {
            created_at: {
              gte: startDate
            }
          },
          _count: {
            event_name: true
          },
          orderBy: {
            _count: {
              event_name: 'desc'
            }
          },
          take: 10
        }),
        prisma.userAnalytics.groupBy({
          by: ['device_type'],
          where: {
            created_at: {
              gte: startDate
            }
          },
          _count: {
            device_type: true
          }
        })
      ]);

      return {
        totalEvents,
        uniqueSessions: uniqueSessions.length,
        topEvents: topEvents.map(event => ({
          name: event.event_name,
          count: event._count.event_name
        })),
        deviceBreakdown: deviceBreakdown.map(device => ({
          type: device.device_type,
          count: device._count.device_type
        }))
      };
    } catch (error) {
      console.error('Error getting platform behavior metrics:', error);
      throw error;
    }
  }

  // Cleanup - stop periodic flush
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }
}

export const userBehaviorTracker = UserBehaviorTracker.getInstance();
export default userBehaviorTracker;