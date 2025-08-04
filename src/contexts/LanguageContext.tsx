'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, params?: Record<string, any>) => string;
  translations: Record<string, any>;
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<string>('en');
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Load translations from localStorage or default to 'en'
  useEffect(() => {
    const savedLanguage = localStorage.getItem('woofadaar_language') || 'en';
    setLanguageState(savedLanguage);
    loadTranslations(savedLanguage);
  }, []);

  const loadTranslations = async (lang: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/i18n/${lang}`);
      if (response.ok) {
        const translationData = await response.json();
        setTranslations(translationData);
      } else {
        // Fallback to default English translations
        const fallbackResponse = await fetch('/api/i18n/en');
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setTranslations(fallbackData);
        }
      }
    } catch (error) {
      console.error('Error loading translations:', error);
    } finally {
      setLoading(false);
    }
  };

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('woofadaar_language', lang);
    loadTranslations(lang);
    
    // Update user preference in database if user is logged in
    const token = localStorage.getItem('woofadaar_token');
    if (token) {
      updateUserLanguagePreference(lang);
    }
  };

  const updateUserLanguagePreference = async (lang: string) => {
    try {
      await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        body: JSON.stringify({ preferred_language: lang })
      });
    } catch (error) {
      console.error('Error updating user language preference:', error);
    }
  };

  // Translation function with nested key support and parameter interpolation
  const t = (key: string, params?: Record<string, any>): string => {
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }
    
    if (typeof value !== 'string') {
      return key;
    }
    
    // Handle parameter interpolation
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? String(params[paramKey]) : match;
      });
    }
    
    return value;
  };

  const contextValue: LanguageContextType = {
    language,
    setLanguage,
    t,
    translations,
    loading
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

// Helper hook for loading user's preferred language from profile
export const useLoadUserLanguage = () => {
  const { setLanguage } = useLanguage();
  
  const loadUserLanguage = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) return;
      
      const response = await fetch('/api/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        if (userData.user && userData.user.preferred_language) {
          setLanguage(userData.user.preferred_language);
        }
      }
    } catch (error) {
      console.error('Error loading user language preference:', error);
    }
  };
  
  return loadUserLanguage;
};