'use client';

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lightbulb, Search, Star, Award, Gift, Lock } from 'lucide-react';

interface HiddenAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  pointsReward: number;
  rarity: string;
  discoveredAt: string;
  discoveredThrough: string;
  discoveryContext: any;
}

interface DiscoveryHint {
  category: string;
  progress: number;
  hint?: string;
  canShowHint: boolean;
}

interface HiddenAchievementsData {
  discoveredAchievements: HiddenAchievement[];
  hints: string[];
  nearDiscovery: DiscoveryHint[];
  stats: {
    totalHiddenAchievements: number;
    discoveredCount: number;
    discoveryRate: number;
    recentDiscoveries: HiddenAchievement[];
  };
}

interface HiddenAchievementsProps {
  className?: string;
}

export default function HiddenAchievements({ className = '' }: HiddenAchievementsProps) {
  const [data, setData] = useState<HiddenAchievementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHints, setShowHints] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchHiddenAchievements();
  }, []);

  const fetchHiddenAchievements = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch('/api/gamification/hidden-achievements?hints=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching hidden achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-300 bg-gray-50 text-gray-700';
      case 'rare': return 'border-blue-300 bg-blue-50 text-blue-700';
      case 'epic': return 'border-purple-300 bg-purple-50 text-purple-700';
      case 'legendary': return 'border-yellow-300 bg-yellow-50 text-yellow-700';
      case 'mythic': return 'border-pink-300 bg-pink-50 text-pink-700';
      default: return 'border-gray-300 bg-gray-50 text-gray-700';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'behavior': return '🦉';
      case 'cultural': return '🎆';
      case 'mentorship': return '🧭';
      case 'engagement': return '🐦';
      case 'expertise': return '🔮';
      default: return '🏆';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600 bg-green-100';
    if (progress >= 50) return 'text-yellow-600 bg-yellow-100';
    if (progress >= 20) return 'text-blue-600 bg-blue-100';
    return 'text-gray-600 bg-gray-100';
  };

  const filteredAchievements = data?.discoveredAchievements.filter(
    achievement => selectedCategory === 'all' || achievement.category === selectedCategory
  ) || [];

  const categories = Array.from(new Set(data?.discoveredAchievements.map(a => a.category) || []));

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-8 text-center ${className}`}>
        <EyeOff className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Hidden Achievements</h3>
        <p className="text-gray-600">Please try again later.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Eye className="w-6 h-6 text-[#76519f]" />
            <span>Hidden Achievements</span>
          </h2>
          
          <button
            onClick={() => setShowHints(!showHints)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              showHints 
                ? 'bg-[#76519f] text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-4 h-4" />
              <span>{showHints ? 'Hide Hints' : 'Show Hints'}</span>
            </div>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-[#76519f]">{data.stats.discoveredCount}</div>
            <div className="text-sm text-gray-600">Discovered</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-[#3bbca8]">{data.stats.totalHiddenAchievements}</div>
            <div className="text-sm text-gray-600">Total Hidden</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-[#e05a37]">{data.stats.discoveryRate}%</div>
            <div className="text-sm text-gray-600">Discovery Rate</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-[#ffa602]">{data.nearDiscovery.length}</div>
            <div className="text-sm text-gray-600">Near Discovery</div>
          </div>
        </div>
      </div>

      {/* Discovery Hints Section */}
      {showHints && (
        <div className="border-b p-6 bg-gradient-to-r from-purple-50 to-indigo-50">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <span>Discovery Hints</span>
          </h3>
          
          {/* General Hints */}
          {data.hints.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Mysterious Whispers...</h4>
              <div className="space-y-2">
                {data.hints.map((hint, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-purple-200">
                    <div className="flex items-center space-x-2">
                      <span className="text-purple-500">💭</span>
                      <span className="text-gray-700 italic">{hint}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress-based Hints */}
          {data.nearDiscovery.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">You're Getting Closer...</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {data.nearDiscovery.map((hint, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-indigo-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span>{getCategoryIcon(hint.category)}</span>
                        <span className="text-sm font-medium capitalize text-gray-700">
                          {hint.category}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getProgressColor(hint.progress)}`}>
                        {hint.progress}%
                      </span>
                    </div>
                    {hint.canShowHint && hint.hint && (
                      <p className="text-xs text-gray-600 italic">{hint.hint}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.hints.length === 0 && data.nearDiscovery.length === 0 && (
            <div className="text-center py-4">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-600">Keep exploring to discover hidden achievements!</p>
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      {categories.length > 1 && (
        <div className="flex border-b">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-3 font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'text-[#76519f] border-b-2 border-[#76519f] bg-[#76519f]/5'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Categories
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-3 font-medium transition-colors capitalize ${
                selectedCategory === category
                  ? 'text-[#76519f] border-b-2 border-[#76519f] bg-[#76519f]/5'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Discovered Achievements */}
      <div className="p-6">
        {filteredAchievements.length === 0 ? (
          <div className="text-center py-12">
            {data.stats.discoveredCount === 0 ? (
              <>
                <Lock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Hidden Achievements Discovered</h3>
                <p className="text-gray-600 mb-4">
                  Hidden achievements are special rewards discovered through unique actions and behaviors.
                </p>
                <p className="text-gray-500 text-sm">
                  💡 Tip: Try different activities and explore various features to discover your first hidden achievement!
                </p>
              </>
            ) : (
              <>
                <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Achievements in This Category</h3>
                <p className="text-gray-600">Try selecting a different category to see your discovered achievements.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`rounded-lg border-2 p-4 transition-all hover:shadow-md ${getRarityColor(achievement.rarity)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="text-3xl">{achievement.icon}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{achievement.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium bg-white/50 capitalize`}>
                        {achievement.rarity}
                      </span>
                    </div>
                    
                    <p className="text-gray-700 text-sm mb-3">{achievement.description}</p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center space-x-1">
                          <Star className="w-3 h-3" />
                          <span>{achievement.pointsReward} points</span>
                        </span>
                        <span className="flex items-center space-x-1 capitalize">
                          <span>{getCategoryIcon(achievement.category)}</span>
                          <span>{achievement.category}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Discovery Info */}
                <div className="mt-3 pt-3 border-t border-white/50">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>
                      Discovered via: <span className="font-medium">{achievement.discoveredThrough}</span>
                    </span>
                    <span>
                      {new Date(achievement.discoveredAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Discoveries */}
        {data.stats.recentDiscoveries.length > 0 && selectedCategory === 'all' && (
          <div className="mt-8 pt-6 border-t">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Award className="w-5 h-5 text-[#ffa602]" />
              <span>Recent Discoveries</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.stats.recentDiscoveries.slice(0, 5).map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center space-x-2 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-full px-3 py-1"
                >
                  <span className="text-lg">{achievement.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{achievement.name}</span>
                  <span className="text-xs text-orange-600">
                    {new Date(achievement.discoveredAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}