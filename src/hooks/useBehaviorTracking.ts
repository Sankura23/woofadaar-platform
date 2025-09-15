import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from 'uuid';

interface BehaviorEvent {
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

interface BehaviorTrackingOptions {
  userId?: string;
  trackPageViews?: boolean;
  trackClicks?: boolean;
  trackFormSubmissions?: boolean;
  trackTimeOnPage?: boolean;
}

export function useBehaviorTracking(options: BehaviorTrackingOptions = {}) {
  const router = useRouter();
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      let stored = sessionStorage.getItem('behavior_session_id');
      if (!stored) {
        stored = uuidv4();
        sessionStorage.setItem('behavior_session_id', stored);
      }
      return stored;
    }
    return uuidv4();
  });
  
  const pageStartTime = useRef<number>(Date.now());
  const lastPageUrl = useRef<string>('');

  // Get device info
  const getDeviceInfo = () => {
    if (typeof window === 'undefined') return null;

    const userAgent = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    let os = 'Unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    return {
      type: isMobile ? 'mobile' : 'desktop',
      browser,
      os,
      screenResolution: `${screen.width}x${screen.height}`,
      isMobile
    };
  };

  // Send tracking event to API
  const sendTrackingEvent = async (event: BehaviorEvent) => {
    try {
      await fetch('/api/analytics/track-behavior', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...event,
          timestamp: new Date().toISOString(),
          deviceInfo: event.deviceInfo || getDeviceInfo(),
          userAgent: navigator.userAgent
        }),
      });
    } catch (error) {
      console.error('Error sending tracking event:', error);
    }
  };

  // Track page view
  const trackPageView = async (url: string, referrer?: string) => {
    if (!options.trackPageViews) return;

    await sendTrackingEvent({
      userId: options.userId,
      sessionId,
      eventType: 'page_view',
      eventCategory: 'engagement',
      eventName: 'page_viewed',
      pageUrl: url,
      referrerUrl: referrer,
      eventData: { 
        timestamp: new Date().toISOString(),
        routeChange: true 
      }
    });
  };

  // Track feature usage
  const trackFeatureUsage = async (featureName: string, featureData?: any) => {
    await sendTrackingEvent({
      userId: options.userId,
      sessionId,
      eventType: 'feature_use',
      eventCategory: 'engagement',
      eventName: featureName,
      pageUrl: window.location.pathname,
      eventData: { 
        feature: featureName, 
        data: featureData,
        timestamp: new Date().toISOString()
      }
    });
  };

  // Track user action/click
  const trackUserAction = async (action: string, target?: string, data?: any) => {
    if (!options.trackClicks) return;

    await sendTrackingEvent({
      userId: options.userId,
      sessionId,
      eventType: 'click',
      eventCategory: 'engagement',
      eventName: action,
      pageUrl: window.location.pathname,
      eventData: { 
        action, 
        target, 
        data,
        timestamp: new Date().toISOString()
      }
    });
  };

  // Track conversion event
  const trackConversion = async (conversionType: string, value?: number, data?: any) => {
    await sendTrackingEvent({
      userId: options.userId,
      sessionId,
      eventType: 'conversion',
      eventCategory: 'conversion',
      eventName: conversionType,
      pageUrl: window.location.pathname,
      eventData: { 
        type: conversionType, 
        value,
        data,
        timestamp: new Date().toISOString()
      }
    });
  };

  // Track form submission
  const trackFormSubmission = async (formName: string, formData?: any) => {
    if (!options.trackFormSubmissions) return;

    await sendTrackingEvent({
      userId: options.userId,
      sessionId,
      eventType: 'form_submit',
      eventCategory: 'engagement',
      eventName: formName,
      pageUrl: window.location.pathname,
      eventData: { 
        form: formName, 
        data: formData,
        timestamp: new Date().toISOString()
      }
    });
  };

  // Track error
  const trackError = async (error: Error, context?: any) => {
    await sendTrackingEvent({
      userId: options.userId,
      sessionId,
      eventType: 'error',
      eventCategory: 'technical',
      eventName: 'error_occurred',
      pageUrl: window.location.pathname,
      eventData: { 
        error: error.message, 
        stack: error.stack,
        context,
        timestamp: new Date().toISOString()
      }
    });
  };

  // Track time on page when leaving
  const trackTimeOnPage = async (url: string) => {
    if (!options.trackTimeOnPage) return;
    
    const timeSpent = Math.floor((Date.now() - pageStartTime.current) / 1000);
    
    if (timeSpent > 5) { // Only track if more than 5 seconds
      await sendTrackingEvent({
        userId: options.userId,
        sessionId,
        eventType: 'time_on_page',
        eventCategory: 'engagement',
        eventName: 'page_time_spent',
        pageUrl: url,
        eventData: { 
          timeSpentSeconds: timeSpent,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  // Auto-track page views on route changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleRouteChange = async (url: string) => {
      // Track time on previous page
      if (lastPageUrl.current && options.trackTimeOnPage) {
        await trackTimeOnPage(lastPageUrl.current);
      }
      
      // Track new page view
      await trackPageView(url, lastPageUrl.current);
      
      // Update tracking vars
      lastPageUrl.current = url;
      pageStartTime.current = Date.now();
    };

    // Track initial page load
    handleRouteChange(router.asPath);

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router, options.trackPageViews, options.trackTimeOnPage]);

  // Track page visibility changes
  useEffect(() => {
    if (typeof window === 'undefined' || !options.trackTimeOnPage) return;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Page is being hidden, track time spent
        await trackTimeOnPage(window.location.pathname);
        pageStartTime.current = Date.now(); // Reset timer
      } else {
        // Page is visible again
        pageStartTime.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [options.trackTimeOnPage]);

  // Auto-track clicks if enabled
  useEffect(() => {
    if (typeof window === 'undefined' || !options.trackClicks) return;

    const handleClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const className = target.className;
      const id = target.id;
      const text = target.textContent?.slice(0, 50) || '';
      
      // Only track meaningful clicks
      if (['button', 'a', 'input'].includes(tagName) || className.includes('clickable')) {
        await trackUserAction('click', tagName, {
          id,
          className,
          text,
          coordinates: { x: event.clientX, y: event.clientY }
        });
      }
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [options.trackClicks]);

  return {
    trackPageView,
    trackFeatureUsage,
    trackUserAction,
    trackConversion,
    trackFormSubmission,
    trackError,
    trackTimeOnPage,
    sessionId
  };
}