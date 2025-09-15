'use client';

import React, { useState, useEffect } from 'react';
import { Globe, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface LanguageDetectionResult {
  detectedLanguage: 'en' | 'hi' | 'mixed';
  confidence: number;
  suggestedLanguage: 'en' | 'hi';
  shouldTranslate: boolean;
  reasons: string[];
}

interface LanguageDetectorProps {
  content: string;
  contentType?: 'question' | 'answer' | 'comment' | 'story' | 'post';
  onLanguageDetected?: (result: LanguageDetectionResult) => void;
  showRecommendations?: boolean;
  autoDetect?: boolean;
  className?: string;
}

export default function LanguageDetector({
  content,
  contentType = 'post',
  onLanguageDetected,
  showRecommendations = true,
  autoDetect = true,
  className = ''
}: LanguageDetectorProps) {
  const { language, setLanguage, t } = useLanguage();
  const [detection, setDetection] = useState<LanguageDetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect language when content changes
  useEffect(() => {
    if (autoDetect && content && content.trim().length > 10) {
      detectLanguage();
    }
  }, [content, autoDetect]);

  const detectLanguage = async () => {
    if (!content || content.trim().length < 5) {
      setDetection(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch('/api/language/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          text: content,
          contentType,
          expectedLanguage: language
        })
      });

      const data = await response.json();

      if (data.success) {
        const result: LanguageDetectionResult = {
          detectedLanguage: data.data.detection.detectedLanguage,
          confidence: data.data.detection.confidence,
          suggestedLanguage: data.data.suggestions.suggestedLanguage,
          shouldTranslate: data.data.suggestions.shouldTranslate,
          reasons: data.data.detection.reasons
        };

        setDetection(result);
        onLanguageDetected?.(result);
      } else {
        setError(data.error || 'Failed to detect language');
      }
    } catch (error) {
      console.error('Language detection error:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageSwitch = (newLanguage: 'en' | 'hi') => {
    setLanguage(newLanguage);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (confidence >= 0.6) return <Info className="w-4 h-4 text-yellow-600" />;
    return <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  const getLanguageDisplayName = (lang: string) => {
    switch (lang) {
      case 'hi': return 'हिंदी (Hindi)';
      case 'en': return 'English';
      case 'mixed': return 'Mixed/मिश्रित';
      default: return lang;
    }
  };

  if (!content || content.trim().length < 5) {
    return null;
  }

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center space-x-2 mb-3">
        <Globe className="w-5 h-5 text-gray-600" />
        <h3 className="text-sm font-medium text-gray-700">
          {t('language.detection')} | भाषा पहचान
        </h3>
        {loading && (
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <span className="text-xs text-gray-500">Detecting... | पहचान रहे हैं...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        </div>
      )}

      {detection && (
        <div className="space-y-3">
          {/* Detection Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white rounded-md p-3 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Detected Language</span>
                {getConfidenceIcon(detection.confidence)}
              </div>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {getLanguageDisplayName(detection.detectedLanguage)}
              </p>
              <p className={`text-xs mt-1 ${getConfidenceColor(detection.confidence)}`}>
                Confidence: {Math.round(detection.confidence * 100)}%
              </p>
            </div>

            <div className="bg-white rounded-md p-3 border border-gray-200">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Suggested Language</span>
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm font-medium text-gray-900">
                  {getLanguageDisplayName(detection.suggestedLanguage)}
                </p>
                {detection.suggestedLanguage !== language && (
                  <button
                    onClick={() => handleLanguageSwitch(detection.suggestedLanguage)}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                  >
                    Switch | बदलें
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Translation Recommendation */}
          {detection.shouldTranslate && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-700 font-medium">
                    Translation Recommended | अनुवाद की सिफारिश
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Content language differs from your preference. Consider providing translations for better accessibility.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Detection Reasons (for debugging/transparency) */}
          {showRecommendations && detection.reasons.length > 0 && (
            <details className="bg-gray-100 rounded-md p-3">
              <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                Detection Details | पहचान विवरण
              </summary>
              <div className="mt-2 space-y-1">
                {detection.reasons.map((reason, index) => (
                  <p key={index} className="text-xs text-gray-600">
                    • {reason}
                  </p>
                ))}
              </div>
            </details>
          )}

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            {detection.detectedLanguage !== language && (
              <button
                onClick={() => handleLanguageSwitch(detection.detectedLanguage)}
                className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 transition-colors"
              >
                Switch to {getLanguageDisplayName(detection.detectedLanguage)}
              </button>
            )}
            
            <button
              onClick={detectLanguage}
              className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition-colors"
            >
              Re-detect | पुनः पहचानें
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for inline use
export function InlineLanguageDetector({ 
  content, 
  onLanguageDetected,
  className = '' 
}: {
  content: string;
  onLanguageDetected?: (result: LanguageDetectionResult) => void;
  className?: string;
}) {
  const [detection, setDetection] = useState<LanguageDetectionResult | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (content && content.trim().length > 10) {
      detectLanguageInline();
    }
  }, [content]);

  const detectLanguageInline = async () => {
    try {
      const response = await fetch('/api/language/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content })
      });

      const data = await response.json();
      if (data.success) {
        const result: LanguageDetectionResult = {
          detectedLanguage: data.data.detection.detectedLanguage,
          confidence: data.data.detection.confidence,
          suggestedLanguage: data.data.suggestions.suggestedLanguage,
          shouldTranslate: data.data.suggestions.shouldTranslate,
          reasons: data.data.detection.reasons
        };
        setDetection(result);
        onLanguageDetected?.(result);
      }
    } catch (error) {
      console.error('Inline language detection error:', error);
    }
  };

  if (!detection || detection.confidence < 0.6) {
    return null;
  }

  return (
    <div className={`inline-flex items-center space-x-1 text-xs text-gray-500 ${className}`}>
      <Globe className="w-3 h-3" />
      <span>
        {detection.detectedLanguage === 'hi' ? 'हिंदी' : 
         detection.detectedLanguage === 'mixed' ? 'Mixed' : 'English'}
      </span>
      {detection.confidence < 0.8 && (
        <span className="text-yellow-600">?</span>
      )}
    </div>
  );
}