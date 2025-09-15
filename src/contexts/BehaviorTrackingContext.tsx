'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';

interface User {
  id: string;
  name?: string;
  email?: string;
  is_premium?: boolean;
}

interface BehaviorTrackingContextType {
  trackPageView: (url: string, referrer?: string) => Promise<void>;
  trackFeatureUsage: (featureName: string, featureData?: any) => Promise<void>;
  trackUserAction: (action: string, target?: string, data?: any) => Promise<void>;
  trackConversion: (conversionType: string, value?: number, data?: any) => Promise<void>;
  trackFormSubmission: (formName: string, formData?: any) => Promise<void>;
  trackError: (error: Error, context?: any) => Promise<void>;
  sessionId: string;
  user: User | null;
  setUser: (user: User | null) => void;
}

const BehaviorTrackingContext = createContext<BehaviorTrackingContextType | undefined>(undefined);

export function BehaviorTrackingProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Initialize behavior tracking with current user
  const tracking = useBehaviorTracking({
    userId: user?.id,
    trackPageViews: true,
    trackClicks: true,
    trackFormSubmissions: true,
    trackTimeOnPage: true,
  });

  // Check for user in localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
        } catch (error) {
          console.error('Error parsing stored user data:', error);
        }
      }
    }
  }, []);

  // Track user login/logout events
  useEffect(() => {
    if (user) {
      tracking.trackConversion('user_login', undefined, {
        userId: user.id,
        isPremium: user.is_premium,
        loginTime: new Date().toISOString()
      });
    }
  }, [user, tracking]);

  const contextValue: BehaviorTrackingContextType = {
    trackPageView: tracking.trackPageView,
    trackFeatureUsage: tracking.trackFeatureUsage,
    trackUserAction: tracking.trackUserAction,
    trackConversion: tracking.trackConversion,
    trackFormSubmission: tracking.trackFormSubmission,
    trackError: tracking.trackError,
    sessionId: tracking.sessionId,
    user,
    setUser,
  };

  return (
    <BehaviorTrackingContext.Provider value={contextValue}>
      {children}
    </BehaviorTrackingContext.Provider>
  );
}

export function useBehaviorTrackingContext() {
  const context = useContext(BehaviorTrackingContext);
  if (context === undefined) {
    throw new Error('useBehaviorTrackingContext must be used within a BehaviorTrackingProvider');
  }
  return context;
}

// Helper hook for tracking specific user actions
export function useTrackAction() {
  const { trackUserAction, trackFeatureUsage } = useBehaviorTrackingContext();

  return {
    trackClick: (element: string, data?: any) => trackUserAction('click', element, data),
    trackButton: (buttonName: string, data?: any) => trackUserAction('button_click', buttonName, data),
    trackLink: (linkUrl: string, linkText?: string) => trackUserAction('link_click', linkUrl, { text: linkText }),
    trackFeature: (featureName: string, data?: any) => trackFeatureUsage(featureName, data),
    trackSearch: (query: string, results?: number) => trackFeatureUsage('search', { query, resultsCount: results }),
    trackFilter: (filterType: string, filterValue: string) => trackFeatureUsage('filter_applied', { type: filterType, value: filterValue }),
  };
}

// Helper hook for tracking conversions
export function useTrackConversion() {
  const { trackConversion } = useBehaviorTrackingContext();

  return {
    trackSignup: (method?: string) => trackConversion('user_signup', undefined, { method }),
    trackPremiumUpgrade: (plan?: string, amount?: number) => trackConversion('premium_upgrade', amount, { plan }),
    trackAppointmentBooking: (partnerId?: string, serviceType?: string) => trackConversion('appointment_booked', undefined, { partnerId, serviceType }),
    trackQuestionAsked: (category?: string) => trackConversion('question_asked', undefined, { category }),
    trackAnswerProvided: (questionId?: string) => trackConversion('answer_provided', undefined, { questionId }),
    trackHealthLogEntry: (dogId?: string) => trackConversion('health_log_entry', undefined, { dogId }),
    trackDogProfileCreated: () => trackConversion('dog_profile_created'),
  };
}

// Helper hook for tracking form submissions
export function useTrackForm() {
  const { trackFormSubmission, trackError } = useBehaviorTrackingContext();

  return {
    trackFormStart: (formName: string) => trackFormSubmission(`${formName}_started`),
    trackFormSubmit: (formName: string, success: boolean = true, data?: any) => {
      if (success) {
        trackFormSubmission(`${formName}_submitted`, data);
      } else {
        trackFormSubmission(`${formName}_failed`, data);
      }
    },
    trackFormError: (formName: string, error: Error, fieldName?: string) => {
      trackError(error, { form: formName, field: fieldName });
    },
  };
}