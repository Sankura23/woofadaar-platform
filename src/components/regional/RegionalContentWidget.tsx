'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Heart, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface RegionalContentData {
  hasRegionalContent: boolean;
  location: string;
  state?: string;
  region?: string;
  festivals?: {
    upcoming: Array<{
      name: string;
      nameHindi: string;
      daysUntil: number;
      petRelevance: 'high' | 'medium' | 'low';
      safetyTips: string[];
      safetyTipsHindi: string[];
      relevanceScore: number;
    }>;
    totalUpcoming: number;
    nextImportant?: any;
  };
  health?: {
    seasonalTips: Array<{
      season: string;
      tips: string[];
      tipsHindi: string[];
    }>;
    commonDiseases: Array<{
      name: string;
      nameHindi: string;
      prevalence: string;
      prevention: string[];
      preventionHindi: string[];
    }>;
  };
  breeds?: {
    popular: string[];
    climateConsiderations: string[];
  };
  phrases?: {
    veterinary: Array<{
      english: string;
      hindi: string;
      regional?: string;
      usage: string;
    }>;
  };
}

interface RegionalContentWidgetProps {
  location: string;
  className?: string;
  showCompact?: boolean;
  contentTypes?: string[]; // festivals, health, breeds, phrases
}

export default function RegionalContentWidget({
  location,
  className = '',
  showCompact = false,
  contentTypes = ['festivals', 'health']
}: RegionalContentWidgetProps) {
  const { language, t } = useLanguage();
  const [contentData, setContentData] = useState<RegionalContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['festivals']));

  useEffect(() => {
    if (location) {
      fetchRegionalContent();
    }
  }, [location, language]);

  const fetchRegionalContent = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('woofadaar_token');
      const params = new URLSearchParams({
        location,
        language,
        ...(contentTypes.length > 0 && { type: contentTypes.join(',') })
      });

      const response = await fetch(`/api/regional/content?${params}`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setContentData(data.data);
      } else {
        setError(data.error || 'Failed to load regional content');
      }
    } catch (error) {
      console.error('Error fetching regional content:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getRelevanceIcon = (relevance: 'high' | 'medium' | 'low') => {
    switch (relevance) {
      case 'high': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'medium': return <Info className="w-4 h-4 text-yellow-500" />;
      case 'low': return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const formatDaysUntil = (days: number) => {
    if (days === 0) return language === 'hi' ? 'आज' : 'Today';
    if (days === 1) return language === 'hi' ? 'कल' : 'Tomorrow';
    return language === 'hi' ? `${days} दिन में` : `in ${days} days`;
  };

  if (loading) {
    return (
      <div className={`bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center space-x-2 mb-3">
            <MapPin className="w-5 h-5 text-gray-400" />
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !contentData) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-gray-600">
          <MapPin className="w-5 h-5" />
          <span className="text-sm">
            {error || (language === 'hi' ? 'क्षेत्रीय सामग्री उपलब्ध नहीं' : 'No regional content available')}
          </span>
        </div>
      </div>
    );
  }

  if (!contentData.hasRegionalContent) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start space-x-2">
          <MapPin className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900">
              {contentData.location}
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              {language === 'hi' 
                ? 'इस स्थान के लिए विशिष्ट क्षेत्रीय सामग्री जल्द ही उपलब्ध होगी।'
                : 'Regional content for this location is coming soon.'
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-green-600" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {contentData.state} • {language === 'hi' ? 'क्षेत्रीय सामग्री' : 'Regional Content'}
            </h3>
            <p className="text-xs text-gray-600">
              {contentData.region} {language === 'hi' ? 'भारत' : 'India'} • {contentData.location}
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {/* Festivals Section */}
        {contentData.festivals && contentData.festivals.totalUpcoming > 0 && (
          <div className="p-4">
            <button
              onClick={() => toggleSection('festivals')}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-gray-900">
                  {language === 'hi' ? 'आने वाले त्योहार' : 'Upcoming Festivals'}
                </span>
                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full">
                  {contentData.festivals.totalUpcoming}
                </span>
              </div>
              {expandedSections.has('festivals') ? 
                <ChevronUp className="w-4 h-4 text-gray-500" /> : 
                <ChevronDown className="w-4 h-4 text-gray-500" />
              }
            </button>

            {expandedSections.has('festivals') && (
              <div className="mt-3 space-y-3">
                {contentData.festivals.upcoming.slice(0, showCompact ? 2 : 5).map((festival, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {language === 'hi' ? festival.nameHindi : festival.name}
                        </h4>
                        <p className="text-xs text-gray-600">
                          {formatDaysUntil(festival.daysUntil)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        {getRelevanceIcon(festival.petRelevance)}
                        <span className="text-xs text-gray-500 capitalize">
                          {festival.petRelevance} {language === 'hi' ? 'प्रासंगिकता' : 'relevance'}
                        </span>
                      </div>
                    </div>

                    {festival.petRelevance !== 'low' && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-700">
                          {language === 'hi' ? 'पेट सुरक्षा युक्तियाँ:' : 'Pet Safety Tips:'}
                        </p>
                        {(language === 'hi' ? festival.safetyTipsHindi : festival.safetyTips)
                          .slice(0, showCompact ? 2 : 3)
                          .map((tip, tipIndex) => (
                          <p key={tipIndex} className="text-xs text-gray-600 ml-2">
                            • {tip}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Health Section */}
        {contentData.health && (contentData.health.seasonalTips.length > 0 || contentData.health.commonDiseases.length > 0) && (
          <div className="p-4">
            <button
              onClick={() => toggleSection('health')}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center space-x-2">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-gray-900">
                  {language === 'hi' ? 'क्षेत्रीय स्वास्थ्य सुझाव' : 'Regional Health Tips'}
                </span>
              </div>
              {expandedSections.has('health') ? 
                <ChevronUp className="w-4 h-4 text-gray-500" /> : 
                <ChevronDown className="w-4 h-4 text-gray-500" />
              }
            </button>

            {expandedSections.has('health') && (
              <div className="mt-3 space-y-3">
                {/* Seasonal Tips */}
                {contentData.health.seasonalTips.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">
                      {language === 'hi' ? 'मौसमी सुझाव' : 'Seasonal Tips'}
                    </h4>
                    {contentData.health.seasonalTips.map((seasonal, index) => (
                      <div key={index} className="space-y-1">
                        {(language === 'hi' ? seasonal.tipsHindi : seasonal.tips)
                          .slice(0, showCompact ? 2 : 4)
                          .map((tip, tipIndex) => (
                          <p key={tipIndex} className="text-xs text-blue-800">
                            • {tip}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* Common Diseases */}
                {contentData.health.commonDiseases.length > 0 && !showCompact && (
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-yellow-900 mb-2">
                      {language === 'hi' ? 'सामान्य बीमारियां' : 'Common Diseases'}
                    </h4>
                    {contentData.health.commonDiseases.slice(0, 2).map((disease, index) => (
                      <div key={index} className="mb-2">
                        <p className="text-xs font-medium text-yellow-800">
                          {language === 'hi' ? disease.nameHindi : disease.name}
                        </p>
                        <p className="text-xs text-yellow-700">
                          Prevalence: {disease.prevalence} | 
                          {language === 'hi' ? ' रोकथाम:' : ' Prevention:'} 
                          {(language === 'hi' ? disease.preventionHindi : disease.prevention)[0]}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="px-4 py-3 bg-gray-50 flex flex-wrap gap-2">
          <button
            onClick={fetchRegionalContent}
            className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
          >
            {language === 'hi' ? 'रिफ्रेश करें' : 'Refresh'}
          </button>
          
          {!showCompact && (
            <button className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition-colors">
              {language === 'hi' ? 'और जानकारी' : 'More Info'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact version for dashboard widgets
export function RegionalContentCompact({ location, className = '' }: { location: string; className?: string }) {
  return (
    <RegionalContentWidget
      location={location}
      className={className}
      showCompact={true}
      contentTypes={['festivals']}
    />
  );
}