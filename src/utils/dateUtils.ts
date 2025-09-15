import { useState, useEffect } from 'react';

// Type for date-like values
type DateLike = string | Date | number | undefined | null;

// Custom hook for hydration-safe date formatting
export const useSafeDate = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set client flag after hydration
    setIsClient(true);
  }, []);

  // Safe date validation function
  const isValidDate = (date: any): date is Date => {
    return date instanceof Date && !isNaN(date.getTime());
  };

  // Safe date conversion function
  const safelyConvertToDate = (dateValue: DateLike): Date | null => {
    if (!dateValue) return null;

    try {
      let date: Date;

      if (typeof dateValue === 'string') {
        // Handle various string formats
        date = new Date(dateValue);
      } else if (typeof dateValue === 'number') {
        // Handle timestamps
        date = new Date(dateValue);
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else {
        return null;
      }

      // Validate the resulting date
      return isValidDate(date) ? date : null;
    } catch {
      return null;
    }
  };

  // Main formatting function with comprehensive error handling
  const formatDate = (
    dateValue: DateLike,
    options?: Intl.DateTimeFormatOptions,
    fallback = 'Date not available'
  ): string => {
    // Return placeholder during SSR to prevent hydration mismatch
    if (!isClient) {
      return '...';
    }

    // Handle undefined/null values
    if (!dateValue) {
      return fallback;
    }

    try {
      const date = safelyConvertToDate(dateValue);
      
      if (!date) {
        return 'Invalid date';
      }

      // Default options optimized for Indian locale
      const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      };

      const finalOptions = { ...defaultOptions, ...options };
      
      return date.toLocaleString('en-IN', finalOptions);
    } catch (error) {
      console.error('Date formatting error:', error, { dateValue, options });
      return 'Date format error';
    }
  };

  // Specialized formatting functions
  const formatTime = (dateValue: DateLike, fallback = 'Time not available'): string => {
    return formatDate(dateValue, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    }, fallback);
  };

  const formatDateOnly = (dateValue: DateLike, fallback = 'Date not available'): string => {
    return formatDate(dateValue, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }, fallback);
  };

  const formatShortDate = (dateValue: DateLike, fallback = 'Date not available'): string => {
    return formatDate(dateValue, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }, fallback);
  };

  const formatRelativeTime = (dateValue: DateLike, fallback = 'Unknown time'): string => {
    if (!isClient) return '...';
    
    const date = safelyConvertToDate(dateValue);
    if (!date) return fallback;

    try {
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
      if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
      
      return formatShortDate(dateValue, fallback);
    } catch {
      return fallback;
    }
  };

  // Utility functions for date comparisons
  const isToday = (dateValue: DateLike): boolean => {
    if (!isClient) return false;
    
    const date = safelyConvertToDate(dateValue);
    if (!date) return false;

    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isFuture = (dateValue: DateLike): boolean => {
    if (!isClient) return false;
    
    const date = safelyConvertToDate(dateValue);
    if (!date) return false;

    return date.getTime() > Date.now();
  };

  const isPast = (dateValue: DateLike): boolean => {
    if (!isClient) return false;
    
    const date = safelyConvertToDate(dateValue);
    if (!date) return false;

    return date.getTime() < Date.now();
  };

  return {
    formatDate,
    formatTime,
    formatDateOnly,
    formatShortDate,
    formatRelativeTime,
    isToday,
    isFuture,
    isPast,
    isClient,
    safelyConvertToDate,
    isValidDate
  };
};

// Standalone safe date formatter (for use outside of React components)
export const safeDateFormat = (
  dateValue: DateLike,
  options?: Intl.DateTimeFormatOptions,
  fallback = 'Date not available'
): string => {
  if (!dateValue) return fallback;

  try {
    let date: Date;

    if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else if (typeof dateValue === 'number') {
      date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      return fallback;
    }

    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    };

    return date.toLocaleString('en-IN', { ...defaultOptions, ...options });
  } catch (error) {
    console.error('Standalone date formatting error:', error);
    return 'Date format error';
  }
};

// Date validation utilities
export const validateDateString = (dateString: string): boolean => {
  if (!dateString || typeof dateString !== 'string') return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

export const validateDateRange = (startDate: DateLike, endDate: DateLike): boolean => {
  try {
    const start = startDate instanceof Date ? startDate : new Date(startDate as string);
    const end = endDate instanceof Date ? endDate : new Date(endDate as string);
    
    return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end;
  } catch {
    return false;
  }
};

// Appointment-specific date utilities
export const getAppointmentStatus = (scheduledAt: DateLike): 'upcoming' | 'today' | 'past' | 'invalid' => {
  try {
    const appointmentDate = scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt as string);
    
    if (isNaN(appointmentDate.getTime())) return 'invalid';
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (appointmentDate < today) return 'past';
    if (appointmentDate >= today && appointmentDate < tomorrow) return 'today';
    return 'upcoming';
  } catch {
    return 'invalid';
  }
};

export const formatAppointmentDuration = (minutes: number | undefined): string => {
  if (!minutes || typeof minutes !== 'number') return 'Duration not specified';
  
  if (minutes < 60) return `${minutes} min`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

// Note: React components moved to separate .tsx files to avoid TypeScript compilation issues