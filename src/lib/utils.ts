import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Mobile utility functions for Woofadaar
export const mobileUtils = {
  // Check if device is mobile
  isMobile: () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  },

  // Check if device supports touch
  hasTouch: () => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

  // Get safe area insets for iOS devices
  getSafeAreaInsets: () => {
    if (typeof window === 'undefined') return { top: 0, bottom: 0 };
    
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    return {
      top: parseInt(computedStyle.getPropertyValue('--sat') || '0'),
      bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0')
    };
  },

  // Haptic feedback for mobile devices
  hapticFeedback: (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (typeof window === 'undefined') return;
    
    // iOS Safari haptic feedback
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [50]
      };
      navigator.vibrate(patterns[type]);
    }

    // iOS WebKit haptic feedback (if available)
    if ('TapticEngine' in window) {
      // @ts-ignore
      window.TapticEngine.impact(type);
    }
  },

  // Prevent zoom on double tap
  preventZoom: () => {
    if (typeof document === 'undefined') return;
    
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    });

    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  },

  // Handle orientation changes
  handleOrientationChange: (callback: (orientation: string) => void) => {
    if (typeof window === 'undefined') return;
    
    const handleChange = () => {
      const orientation = window.screen?.orientation?.type || 
                         (window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
      callback(orientation);
    };

    window.addEventListener('orientationchange', handleChange);
    window.addEventListener('resize', handleChange);
    
    return () => {
      window.removeEventListener('orientationchange', handleChange);
      window.removeEventListener('resize', handleChange);
    };
  }
};

// Performance utilities
export const performanceUtils = {
  // Debounce function for search and input
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  },

  // Throttle function for scroll events
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(null, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Lazy loading utility
  lazyLoad: (target: HTMLElement, callback: () => void, threshold = 0.1) => {
    if (typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callback();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );

    observer.observe(target);
    return observer;
  },

  // Memory usage monitoring
  getMemoryUsage: () => {
    if (typeof performance === 'undefined' || !('memory' in performance)) {
      return null;
    }
    
    // @ts-ignore
    const memory = performance.memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1048576), // MB
      total: Math.round(memory.totalJSHeapSize / 1048576), // MB
      limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
    };
  }
};

// Cache utilities
export const cacheUtils = {
  // Local storage with expiry
  setWithExpiry: (key: string, value: any, ttl: number) => {
    if (typeof localStorage === 'undefined') return;
    
    const now = new Date();
    const item = {
      value: value,
      expiry: now.getTime() + ttl
    };
    localStorage.setItem(key, JSON.stringify(item));
  },

  getWithExpiry: (key: string) => {
    if (typeof localStorage === 'undefined') return null;
    
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;

    const item = JSON.parse(itemStr);
    const now = new Date();

    if (now.getTime() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    
    return item.value;
  },

  // Cache size management
  getCacheSize: () => {
    if (typeof localStorage === 'undefined') return 0;
    
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage.getItem(key)?.length || 0;
      }
    }
    return total;
  },

  clearExpiredCache: () => {
    if (typeof localStorage === 'undefined') return;
    
    const now = new Date();
    const keysToRemove: string[] = [];
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          if (item.expiry && now.getTime() > item.expiry) {
            keysToRemove.push(key);
          }
        } catch (e) {
          // Invalid JSON, keep the item
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    return keysToRemove.length;
  }
};

// API utilities
export const apiUtils = {
  // API call with retry logic
  fetchWithRetry: async (url: string, options: RequestInit = {}, maxRetries = 3) => {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        
        if (response.ok) {
          return response;
        }
        
        // Don't retry on 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500) {
          return response;
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error;
        
        if (i < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, i) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  },

  // Check network connectivity
  isOnline: () => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  },

  // Network speed estimation
  estimateNetworkSpeed: async (): Promise<'slow' | 'medium' | 'fast'> => {
    if (typeof navigator === 'undefined') return 'medium';
    
    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      const effectiveType = connection.effectiveType;
      if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'slow';
      if (effectiveType === '3g') return 'medium';
      return 'fast';
    }
    
    // Fallback: measure a small request
    try {
      const startTime = performance.now();
      await fetch('/api/ping', { method: 'HEAD' });
      const duration = performance.now() - startTime;
      
      if (duration > 1000) return 'slow';
      if (duration > 500) return 'medium';
      return 'fast';
    } catch {
      return 'medium';
    }
  }
};

// Date and time utilities
export const dateUtils = {
  formatRelativeTime: (date: Date | string) => {
    const now = new Date();
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const diffInMs = now.getTime() - targetDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return targetDate.toLocaleDateString();
  },

  formatDuration: (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  },

  isToday: (date: Date | string) => {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    
    return targetDate.getDate() === today.getDate() &&
           targetDate.getMonth() === today.getMonth() &&
           targetDate.getFullYear() === today.getFullYear();
  }
};

// Form validation utilities
export const validationUtils = {
  email: (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  phone: (phone: string) => {
    // Indian phone number validation
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s|-/g, ''));
  },

  password: (password: string) => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      isValid: password.length >= 8 && 
               /[A-Z]/.test(password) && 
               /[a-z]/.test(password) && 
               /\d/.test(password)
    };
  },

  dogName: (name: string) => {
    return name.length >= 2 && name.length <= 50 && /^[a-zA-Z\s]+$/.test(name);
  }
};

// Error handling utilities
export const errorUtils = {
  getErrorMessage: (error: any) => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    return 'An unexpected error occurred';
  },

  isNetworkError: (error: any) => {
    return error?.name === 'TypeError' && error?.message?.includes('fetch');
  },

  reportError: (error: any, context?: string) => {
    console.error('Woofadaar Error:', {
      error: errorUtils.getErrorMessage(error),
      context,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    });

    // In production, you would send this to your error tracking service
    // e.g., Sentry, LogRocket, etc.
  }
};

// Analytics utilities
export const analyticsUtils = {
  track: (event: string, properties?: Record<string, any>) => {
    // In production, integrate with your analytics service
    console.log('Analytics Event:', event, properties);
    
    // Example integration points:
    // - Google Analytics 4
    // - Mixpanel
    // - Amplitude
    // - Custom analytics backend
  },

  trackPageView: (page: string) => {
    analyticsUtils.track('page_view', {
      page,
      timestamp: new Date().toISOString(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    });
  },

  trackUserAction: (action: string, properties?: Record<string, any>) => {
    analyticsUtils.track('user_action', {
      action,
      ...properties,
      timestamp: new Date().toISOString()
    });
  }
};