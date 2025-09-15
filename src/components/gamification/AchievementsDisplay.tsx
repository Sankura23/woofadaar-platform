'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Award, Star, Lock, CheckCircle } from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  pointsRequired: number;
  rarity: string;
  isUnlocked?: boolean;
  progress?: number;
  earnedAt?: string;
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedAt: string;
  category: string;
  rarity: string;
}

interface AchievementsData {
  unlockedAchievements: Achievement[];
  lockedAchievements: Achievement[];
  badges: Badge[];
  totalAchievements: number;
  totalPossibleAchievements: number;
  completionPercentage: number;
}

interface AchievementsDisplayProps {
  className?: string;
  showProgress?: boolean;
}

export default function AchievementsDisplay({ className = '', showProgress = true }: AchievementsDisplayProps) {
  const [data, setData] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'unlocked' | 'locked' | 'badges'>('unlocked');

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch('/api/achievements/unlock', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-600 bg-gray-100';
      case 'rare': return 'text-blue-600 bg-blue-100';
      case 'epic': return 'text-purple-600 bg-purple-100';
      case 'legendary': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg p-6 shadow-sm animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`bg-white rounded-lg p-6 shadow-sm ${className}`}>
        <p className="text-gray-600">Unable to load achievements data</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-[#3bbca8]" />
            <span>Achievements</span>
          </h2>
          
          {showProgress && (
            <div className="text-right">
              <div className="text-2xl font-bold text-[#3bbca8]">
                {data.totalAchievements}/{data.totalPossibleAchievements}
              </div>
              <div className="text-sm text-gray-600">{data.completionPercentage}% Complete</div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="mb-4">
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-[#3bbca8] rounded-full h-2 transition-all duration-300"
                style={{ width: `${data.completionPercentage}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('unlocked')}
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            activeTab === 'unlocked'
              ? 'text-[#3bbca8] border-b-2 border-[#3bbca8] bg-[#3bbca8]/5'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>Unlocked ({data.unlockedAchievements.length})</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('locked')}
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            activeTab === 'locked'
              ? 'text-[#76519f] border-b-2 border-[#76519f] bg-[#76519f]/5'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Lock className="w-4 h-4" />
            <span>Locked ({data.lockedAchievements.length})</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('badges')}
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            activeTab === 'badges'
              ? 'text-[#e05a37] border-b-2 border-[#e05a37] bg-[#e05a37]/5'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Award className="w-4 h-4" />
            <span>Badges ({data.badges.length})</span>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'unlocked' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.unlockedAchievements.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                <Trophy className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No achievements unlocked yet</p>
                <p className="text-sm">Start engaging with the community to earn your first achievement!</p>
              </div>
            ) : (
              data.unlockedAchievements.map((achievement) => (
                <div 
                  key={achievement.id}
                  className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 relative"
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl flex-shrink-0">
                      {achievement.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {achievement.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {achievement.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRarityColor(achievement.rarity)}`}>
                          {achievement.rarity}
                        </span>
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <Star className="w-3 h-3 text-[#3bbca8]" />
                          <span>{achievement.pointsRequired}</span>
                        </div>
                      </div>
                      {achievement.earnedAt && (
                        <div className="text-xs text-gray-500 mt-2">
                          Earned: {formatDate(achievement.earnedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500 absolute top-2 right-2" />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'locked' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.lockedAchievements.map((achievement) => (
              <div 
                key={achievement.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200 relative opacity-75"
              >
                <div className="flex items-start space-x-3">
                  <div className="text-2xl flex-shrink-0 grayscale">
                    {achievement.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-700 mb-1">
                      {achievement.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {achievement.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRarityColor(achievement.rarity)}`}>
                        {achievement.rarity}
                      </span>
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <Star className="w-3 h-3 text-gray-400" />
                        <span>{achievement.pointsRequired}</span>
                      </div>
                    </div>
                    {achievement.progress !== undefined && achievement.progress > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500 mb-1">
                          Progress: {achievement.progress}%
                        </div>
                        <div className="bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-[#3bbca8] rounded-full h-1 transition-all duration-300"
                            style={{ width: `${achievement.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <Lock className="w-4 h-4 text-gray-400 absolute top-2 right-2" />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'badges' && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {data.badges.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                <Award className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No badges earned yet</p>
                <p className="text-sm">Unlock achievements to earn badges!</p>
              </div>
            ) : (
              data.badges.map((badge) => (
                <div 
                  key={badge.id}
                  className="bg-white rounded-lg p-4 border border-gray-200 text-center hover:shadow-md transition-shadow"
                  title={badge.description}
                >
                  <div className="text-3xl mb-2">
                    {badge.icon}
                  </div>
                  <h4 className="font-medium text-gray-900 text-sm mb-1 truncate">
                    {badge.name}
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRarityColor(badge.rarity)}`}>
                    {badge.rarity}
                  </span>
                  <div className="text-xs text-gray-500 mt-2">
                    {formatDate(badge.earnedAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}