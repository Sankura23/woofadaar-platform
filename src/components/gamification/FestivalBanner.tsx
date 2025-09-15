'use client';

import React, { useState, useEffect } from 'react';
import { Gift, Star, Calendar, Clock } from 'lucide-react';

interface Festival {
  name: string;
  multiplier: number;
  duration: number;
  isActive: boolean;
}

interface UpcomingFestival {
  name: string;
  multiplier: number;
  startDate: string;
  daysUntil: number;
}

interface FestivalData {
  currentFestival: Festival | null;
  upcomingFestivals: UpcomingFestival[];
}

interface FestivalBannerProps {
  className?: string;
}

export default function FestivalBanner({ className = '' }: FestivalBannerProps) {
  const [festivalData, setFestivalData] = useState<FestivalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFestivalData();
    
    // Check for festival updates every hour
    const interval = setInterval(fetchFestivalData, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchFestivalData = async () => {
    try {
      const response = await fetch('/api/festivals/current');
      if (response.ok) {
        const result = await response.json();
        setFestivalData(result.data);
      }
    } catch (error) {
      console.error('Error fetching festival data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-gradient-to-r from-orange-100 to-pink-100 rounded-lg p-4 animate-pulse ${className}`}>
        <div className="h-4 bg-orange-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-orange-200 rounded w-3/4"></div>
      </div>
    );
  }

  // Show current festival banner
  if (festivalData?.currentFestival) {
    return (
      <div className={`bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 rounded-lg p-6 text-white shadow-lg ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-full p-2">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">🎉 {festivalData.currentFestival.name} Special!</h3>
              <p className="text-white/90">
                Earn {festivalData.currentFestival.multiplier}x points on all activities during the festival!
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center space-x-1 text-white/90">
              <Star className="w-4 h-4" />
              <span className="font-semibold">{festivalData.currentFestival.multiplier}x Multiplier</span>
            </div>
            <div className="text-sm text-white/80 mt-1">
              Festival Active Now! 🎊
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show upcoming festival banner
  if (festivalData?.upcomingFestivals && festivalData.upcomingFestivals.length > 0) {
    const nextFestival = festivalData.upcomingFestivals[0];
    
    return (
      <div className={`bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-indigo-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-indigo-900 font-semibold">{nextFestival.name} Coming Soon!</h4>
              <p className="text-indigo-700 text-sm">
                Get ready for {nextFestival.multiplier}x points multiplier
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center space-x-1 text-indigo-600">
              <Clock className="w-4 h-4" />
              <span className="font-semibold">
                {nextFestival.daysUntil} day{nextFestival.daysUntil !== 1 ? 's' : ''} to go
              </span>
            </div>
            <div className="text-xs text-indigo-500 mt-1">
              Mark your calendar! 📅
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No active or upcoming festivals - show general Indian context
  return (
    <div className={`bg-gradient-to-r from-green-50 to-orange-50 border border-green-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="text-2xl">🇮🇳</div>
        <div>
          <h4 className="text-gray-900 font-semibold">Celebrating India's Dog Parent Community</h4>
          <p className="text-gray-700 text-sm">
            Special bonuses for Indian cities and desi dog breeds. Join the conversation!
          </p>
        </div>
      </div>
    </div>
  );
}