'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, Lock, CheckCircle, Star, Trophy, Award, Zap } from 'lucide-react';

interface Achievement {
  id: string;
  level: number;
  name: string;
  description: string;
  icon: string;
  pointsReward: number;
  rarity: string;
  requirements: any;
}

interface ChainProgress {
  currentLevel: number;
  completedAt?: string;
  progressData: any;
  achievements: {
    achievementId: string;
    name: string;
    icon: string;
    level: number;
    progressPercentage: number;
    isUnlocked: boolean;
    unlockedAt?: string;
  }[];
}

interface AchievementChainData {
  id: string;
  name: string;
  description: string;
  category: string;
  totalLevels: number;
  achievements: Achievement[];
  userProgress?: ChainProgress;
}

interface AchievementChainProps {
  className?: string;
}

export default function AchievementChain({ className = '' }: AchievementChainProps) {
  const [chains, setChains] = useState<AchievementChainData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState<string | null>(null);

  useEffect(() => {
    fetchAchievementChains();
  }, []);

  const fetchAchievementChains = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch('/api/gamification/achievement-chains?progress=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setChains(result.data.chains || []);
        if (result.data.chains.length > 0) {
          setSelectedChain(result.data.chains[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching achievement chains:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-300 bg-gray-50';
      case 'rare': return 'border-blue-300 bg-blue-50';
      case 'epic': return 'border-purple-300 bg-purple-50';
      case 'legendary': return 'border-yellow-300 bg-yellow-50';
      case 'mythic': return 'border-pink-300 bg-pink-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getRarityTextColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-600';
      case 'rare': return 'text-blue-600';
      case 'epic': return 'text-purple-600';
      case 'legendary': return 'text-yellow-600';
      case 'mythic': return 'text-pink-600';
      default: return 'text-gray-600';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'community': return <Trophy className="w-5 h-5" />;
      case 'dog_care': return <Award className="w-5 h-5" />;
      case 'health': return <Zap className="w-5 h-5" />;
      default: return <Star className="w-5 h-5" />;
    }
  };

  const getProgressPercentage = (chain: AchievementChainData): number => {
    if (!chain.userProgress) return 0;
    return Math.round((chain.userProgress.currentLevel / chain.totalLevels) * 100);
  };

  const selectedChainData = chains.find(chain => chain.id === selectedChain);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (chains.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-8 text-center ${className}`}>
        <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Achievement Chains Available</h3>
        <p className="text-gray-600">Start engaging with the community to unlock progressive achievement chains!</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="border-b p-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <Trophy className="w-6 h-6 text-[#3bbca8]" />
          <span>Achievement Chains</span>
        </h2>
        <p className="text-gray-600 mt-1">Progress through multi-level achievements and unlock special rewards</p>
      </div>

      {/* Chain Selection */}
      <div className="flex">
        <div className="w-1/3 border-r">
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Available Chains</h3>
            <div className="space-y-2">
              {chains.map((chain) => {
                const progress = getProgressPercentage(chain);
                const isSelected = selectedChain === chain.id;
                
                return (
                  <button
                    key={chain.id}
                    onClick={() => setSelectedChain(chain.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isSelected 
                        ? 'border-[#3bbca8] bg-[#3bbca8]/5' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-[#3bbca8]">
                        {getCategoryIcon(chain.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {chain.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          Level {chain.userProgress?.currentLevel || 0}/{chain.totalLevels}
                        </div>
                        <div className="mt-2">
                          <div className="bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-[#3bbca8] rounded-full h-2 transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chain Details */}
        <div className="flex-1 p-6">
          {selectedChainData && (
            <div>
              {/* Chain Header */}
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="text-[#3bbca8]">
                    {getCategoryIcon(selectedChainData.category)}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedChainData.name}
                  </h3>
                </div>
                <p className="text-gray-600 mb-4">{selectedChainData.description}</p>
                
                {/* Overall Progress */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                    <span className="text-sm font-semibold text-[#3bbca8]">
                      {getProgressPercentage(selectedChainData)}%
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-[#3bbca8] to-[#2daa96] rounded-full h-3 transition-all duration-300"
                      style={{ width: `${getProgressPercentage(selectedChainData)}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    Level {selectedChainData.userProgress?.currentLevel || 0} of {selectedChainData.totalLevels}
                  </div>
                </div>
              </div>

              {/* Achievement Levels */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Achievement Levels</h4>
                {selectedChainData.achievements
                  .sort((a, b) => a.level - b.level)
                  .map((achievement, index) => {
                    const userAchievement = selectedChainData.userProgress?.achievements
                      .find(ua => ua.achievementId === achievement.id);
                    
                    const isUnlocked = userAchievement?.isUnlocked || false;
                    const isCurrentLevel = achievement.level === (selectedChainData.userProgress?.currentLevel || 0) + 1;
                    const isPreviousLevel = achievement.level <= (selectedChainData.userProgress?.currentLevel || 0);
                    
                    return (
                      <div key={achievement.id} className="relative">
                        {/* Connecting Line */}
                        {index < selectedChainData.achievements.length - 1 && (
                          <div className={`absolute left-6 top-16 w-0.5 h-8 ${
                            isPreviousLevel ? 'bg-green-400' : 'bg-gray-200'
                          }`}></div>
                        )}
                        
                        <div className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-all ${
                          isUnlocked 
                            ? 'border-green-200 bg-green-50' 
                            : isCurrentLevel
                            ? 'border-[#3bbca8] bg-[#3bbca8]/5'
                            : 'border-gray-200 bg-gray-50'
                        }`}>
                          {/* Level Icon */}
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                            isUnlocked 
                              ? 'bg-green-500' 
                              : isCurrentLevel
                              ? 'bg-[#3bbca8]'
                              : 'bg-gray-400'
                          }`}>
                            {isUnlocked ? (
                              <CheckCircle className="w-6 h-6" />
                            ) : isCurrentLevel ? (
                              <Zap className="w-6 h-6" />
                            ) : (
                              <Lock className="w-6 h-6" />
                            )}
                          </div>

                          {/* Achievement Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h5 className="font-semibold text-gray-900">
                                Level {achievement.level}: {achievement.name}
                              </h5>
                              <span className="text-2xl">{achievement.icon}</span>
                            </div>
                            <p className="text-gray-600 text-sm mb-2">
                              {achievement.description}
                            </p>
                            
                            {/* Requirements */}
                            <div className="text-xs text-gray-500 mb-2">
                              {Object.entries(achievement.requirements)
                                .filter(([key]) => !['dependencies', 'timeframe'].includes(key))
                                .map(([key, value]) => (
                                  <span key={key} className="mr-3">
                                    {key.replace(/_/g, ' ')}: {String(value)}
                                  </span>
                                ))}
                            </div>

                            {/* Progress Bar for Current Level */}
                            {isCurrentLevel && userAchievement && userAchievement.progressPercentage < 100 && (
                              <div className="mb-2">
                                <div className="bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-[#3bbca8] rounded-full h-2 transition-all duration-300"
                                    style={{ width: `${userAchievement.progressPercentage}%` }}
                                  ></div>
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {userAchievement.progressPercentage}% complete
                                </div>
                              </div>
                            )}

                            {/* Unlock Status */}
                            {isUnlocked && userAchievement?.unlockedAt && (
                              <div className="text-xs text-green-600">
                                ✅ Unlocked {new Date(userAchievement.unlockedAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>

                          {/* Points Reward */}
                          <div className="text-right">
                            <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-sm font-medium ${getRarityColor(achievement.rarity)} ${getRarityTextColor(achievement.rarity)}`}>
                              <Star className="w-3 h-3" />
                              <span>{achievement.pointsReward}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1 capitalize">
                              {achievement.rarity}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}