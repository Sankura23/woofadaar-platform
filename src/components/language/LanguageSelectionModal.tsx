'use client';

import React, { useState, useEffect } from 'react';
import { Globe, Check, ArrowRight, MapPin, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface LanguageSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLanguageSelected: (language: 'en' | 'hi') => void;
  userLocation?: string;
  autoDetectedLanguage?: 'en' | 'hi';
  detectionConfidence?: number;
}

interface DetectionResult {
  autoDetection: {
    detectedLanguage: 'en' | 'hi';
    confidence: number;
    method: string;
    shouldPromptUser: boolean;
  };
  newUserSuggestion: {
    suggestedLanguage: 'en' | 'hi';
    confidence: number;
    reasoning: string[];
    shouldPromptUser: boolean;
  };
  browserLanguages: string[];
}

export default function LanguageSelectionModal({
  isOpen,
  onClose,
  onLanguageSelected,
  userLocation,
  autoDetectedLanguage,
  detectionConfidence
}: LanguageSelectionModalProps) {
  const { setLanguage } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi'>('en');
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReasons, setShowReasons] = useState(false);

  useEffect(() => {
    if (isOpen) {
      performLanguageDetection();
    }
  }, [isOpen]);

  const performLanguageDetection = async () => {
    setLoading(true);
    
    try {
      const params = new URLSearchParams();
      if (userLocation) params.append('location', userLocation);
      
      const response = await fetch(`/api/language/detect?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setDetectionResult(data.data);
        setSelectedLanguage(data.data.newUserSuggestion.suggestedLanguage);
      }
    } catch (error) {
      console.error('Language detection failed:', error);
      // Use fallbacks if provided
      if (autoDetectedLanguage) {
        setSelectedLanguage(autoDetectedLanguage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageSelection = (lang: 'en' | 'hi') => {
    setSelectedLanguage(lang);
  };

  const handleConfirm = () => {
    setLanguage(selectedLanguage);
    onLanguageSelected(selectedLanguage);
    onClose();
  };

  const getLanguageInfo = (lang: 'en' | 'hi') => {
    if (lang === 'hi') {
      return {
        name: 'हिंदी',
        englishName: 'Hindi',
        description: 'भारत की राष्ट्रीय भाषा',
        englishDescription: 'India\'s national language',
        flag: '🇮🇳',
        benefits: [
          'देसी कुत्ते की नस्लों की जानकारी',
          'पारंपरिक पेट केयर के नुस्खे',
          'स्थानीय त्योहारों की सुरक्षा गाइड',
          'भारतीय जलवायु के अनुकूल सलाह'
        ],
        englishBenefits: [
          'Information on native Indian dog breeds',
          'Traditional pet care remedies',
          'Local festival safety guides',
          'Climate-appropriate advice for India'
        ]
      };
    } else {
      return {
        name: 'English',
        englishName: 'English',
        description: 'International language',
        englishDescription: 'International language',
        flag: '🌍',
        benefits: [
          'Global pet care best practices',
          'International veterinary standards',
          'Broader community discussions',
          'Latest research and trends'
        ],
        englishBenefits: [
          'Global pet care best practices',
          'International veterinary standards',
          'Broader community discussions',
          'Latest research and trends'
        ]
      };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-6 rounded-t-xl">
          <div className="flex items-center space-x-3 mb-2">
            <Globe className="w-6 h-6" />
            <h2 className="text-xl font-bold">Choose Your Language</h2>
          </div>
          <p className="text-blue-100 text-sm">
            भाषा चुनें • Select your preferred language for the best experience
          </p>
          
          {userLocation && (
            <div className="flex items-center space-x-2 mt-3 text-blue-100">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">Detected location: {userLocation}</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Detecting optimal language...</p>
            <p className="text-gray-600 text-sm">भाषा का पता लगाया जा रहा है...</p>
          </div>
        ) : (
          <>
            {/* Smart Detection Results */}
            {detectionResult && detectionResult.newUserSuggestion.confidence > 0.5 && (
              <div className="p-4 bg-blue-50 border-b border-blue-100">
                <div className="flex items-start space-x-3">
                  <Sparkles className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      Smart Suggestion • स्मार्ट सुझाव
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Based on your location and browser settings, we recommend{' '}
                      <span className="font-semibold">
                        {detectionResult.newUserSuggestion.suggestedLanguage === 'hi' ? 'हिंदी (Hindi)' : 'English'}
                      </span>
                      {' '}({Math.round(detectionResult.newUserSuggestion.confidence * 100)}% confidence)
                    </p>
                    
                    <button
                      onClick={() => setShowReasons(!showReasons)}
                      className="text-xs text-blue-600 hover:text-blue-800 mt-1 underline"
                    >
                      {showReasons ? 'Hide' : 'Show'} reasoning • कारण {showReasons ? 'छुपाएं' : 'दिखाएं'}
                    </button>
                    
                    {showReasons && (
                      <div className="mt-2 text-xs text-blue-600 space-y-1">
                        {detectionResult.newUserSuggestion.reasoning.map((reason, index) => (
                          <p key={index}>• {reason}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Language Options */}
            <div className="p-6 space-y-4">
              {(['hi', 'en'] as const).map((lang) => {
                const langInfo = getLanguageInfo(lang);
                const isSelected = selectedLanguage === lang;
                const isRecommended = detectionResult?.newUserSuggestion.suggestedLanguage === lang;

                return (
                  <div key={lang} className="relative">
                    <button
                      onClick={() => handleLanguageSelection(lang)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="text-2xl">{langInfo.flag}</div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {langInfo.name}
                              </h3>
                              {lang !== 'en' && (
                                <span className="text-sm text-gray-500">
                                  ({langInfo.englishName})
                                </span>
                              )}
                              {isRecommended && (
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                                  Recommended • सुझाया गया
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-3">
                              {langInfo.description}
                              {lang === 'hi' && (
                                <span className="text-gray-500 ml-2">
                                  • {langInfo.englishDescription}
                                </span>
                              )}
                            </p>
                            
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-gray-700 mb-1">
                                {lang === 'hi' ? 'मुख्य लाभ:' : 'Key Benefits:'}
                              </p>
                              {langInfo.benefits.slice(0, 3).map((benefit, index) => (
                                <p key={index} className="text-xs text-gray-600">
                                  • {benefit}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-xs text-gray-600 text-center">
                  {selectedLanguage === 'hi' 
                    ? 'आप बाद में अपने प्रोफाइल सेटिंग्स में भाषा बदल सकते हैं।'
                    : 'You can change your language preference later in profile settings.'
                  }
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Skip • छोड़ें
                </button>
                
                <button
                  onClick={handleConfirm}
                  className="flex-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <span>Continue • जारी रखें</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Hook to trigger language selection for new users
export function useNewUserLanguageDetection() {
  const [shouldShowModal, setShouldShowModal] = useState(false);
  const [detectionData, setDetectionData] = useState<any>(null);

  useEffect(() => {
    checkIfNewUser();
  }, []);

  const checkIfNewUser = async () => {
    // Check if user has already set language preference
    const savedLanguage = localStorage.getItem('woofadaar_language');
    const hasShownModal = localStorage.getItem('woofadaar_language_modal_shown');
    
    if (!savedLanguage && !hasShownModal) {
      try {
        // Trigger auto-detection for new users
        const response = await fetch('/api/language/detect');
        const data = await response.json();
        
        if (data.success && data.data.autoDetection.shouldPromptUser) {
          setDetectionData(data.data);
          setShouldShowModal(true);
        }
      } catch (error) {
        console.error('Language detection failed:', error);
      }
    }
  };

  const handleModalClose = () => {
    setShouldShowModal(false);
    localStorage.setItem('woofadaar_language_modal_shown', 'true');
  };

  const handleLanguageSelected = (language: 'en' | 'hi') => {
    localStorage.setItem('woofadaar_language', language);
    localStorage.setItem('woofadaar_language_modal_shown', 'true');
  };

  return {
    shouldShowModal,
    detectionData,
    onClose: handleModalClose,
    onLanguageSelected: handleLanguageSelected
  };
}