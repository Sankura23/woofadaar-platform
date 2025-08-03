'use client';

import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface LanguageSwitcherProps {
  className?: string;
  showText?: boolean;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' }
];

export default function LanguageSwitcher({ 
  className = '', 
  showText = true 
}: LanguageSwitcherProps) {
  const { language, setLanguage, t, loading } = useLanguage();

  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode);
  };

  const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === language);

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Globe className="w-5 h-5 text-gray-400" />
        {showText && (
          <span className="text-sm text-gray-400">Loading...</span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <div className="flex items-center space-x-2">
        <Globe className="w-5 h-5 text-gray-600" />
        {showText && (
          <span className="text-sm font-medium text-gray-700">
            {t('profile.languagePreference')}:
          </span>
        )}
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:border-[#3bbca8] focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent cursor-pointer"
          aria-label={t('profile.languagePreference')}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeName}
            </option>
          ))}
        </select>
      </div>
      
      {/* Custom dropdown arrow */}
      <style jsx>{`
        select {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 0.5rem center;
          background-repeat: no-repeat;
          background-size: 1.5em 1.5em;
          padding-right: 2.5rem;
        }
      `}</style>
    </div>
  );
}

// Compact version for headers/nav bars
export function CompactLanguageSwitcher({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  const handleLanguageToggle = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  const currentLang = SUPPORTED_LANGUAGES.find(lang => lang.code === language);

  return (
    <button
      onClick={handleLanguageToggle}
      className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-[#3bbca8] hover:bg-gray-50 rounded-lg transition-colors ${className}`}
      aria-label="Switch language"
    >
      <Globe className="w-4 h-4" />
      <span>{currentLang?.nativeName}</span>
    </button>
  );
}