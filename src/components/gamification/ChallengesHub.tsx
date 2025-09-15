'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Filter, Calendar, Star, Users, Clock, Plus, Search } from 'lucide-react';
import ChallengeCard from './ChallengeCard';

interface Challenge {
  id: string;
  name: string;
  description: string;
  challengeType: string;
  category: string;
  startDate: string;
  endDate: string;
  pointReward: number;
  maxParticipants?: number;
  rules: any;
  prizes?: any;
  isFeatured: boolean;
  createdBy: {
    id: string;
    name: string;
  };
  stats: {
    participantsCount: number;
    userParticipating: boolean;
    daysRemaining: number;
  };
  userParticipation?: any;
}

interface ChallengesData {
  challenges: Challenge[];
  recommendations: any[];
  stats: {
    totalActive: number;
    userParticipating: number;
    featuredCount: number;
    categories: string[];
  };
}

interface ChallengesHubProps {
  className?: string;
}

export default function ChallengesHub({ className = '' }: ChallengesHubProps) {
  const [data, setData] = useState<ChallengesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchChallenges();
  }, [selectedCategory, selectedType, showFeaturedOnly]);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        participation: 'true'
      });

      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedType !== 'all') params.append('type', selectedType);
      if (showFeaturedOnly) params.append('featured', 'true');

      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch(`/api/gamification/challenges?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch(`/api/gamification/challenges/${challengeId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        // Show success message
        alert(result.data.message);
        // Refresh challenges
        fetchChallenges();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to join challenge');
      }
    } catch (error) {
      console.error('Error joining challenge:', error);
      alert('Failed to join challenge');
    }
  };

  const handleViewChallenge = (challengeId: string) => {
    window.location.href = `/gamification/challenges/${challengeId}`;
  };

  const filteredChallenges = data?.challenges.filter(challenge => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return challenge.name.toLowerCase().includes(term) ||
             challenge.description.toLowerCase().includes(term) ||
             challenge.category.toLowerCase().includes(term);
    }
    return true;
  }) || [];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'monthly': return '📅';
      case 'festival': return '🎉';
      case 'weekly': return '⏰';
      case 'contest': return '🏆';
      default: return '🎯';
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 animate-pulse ${className}`}>
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-8 text-center ${className}`}>
        <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Challenges</h3>
        <p className="text-gray-600">Please try again later.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-[#3bbca8]" />
            <span>Community Challenges</span>
          </h2>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search challenges..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-[#3bbca8]">{data.stats.totalActive}</div>
            <div className="text-sm text-gray-600">Active Challenges</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-[#76519f]">{data.stats.userParticipating}</div>
            <div className="text-sm text-gray-600">My Challenges</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-[#e05a37]">{data.stats.featuredCount}</div>
            <div className="text-sm text-gray-600">Featured</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-[#ffa602]">{data.stats.categories.length}</div>
            <div className="text-sm text-gray-600">Categories</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {data.stats.categories.map(category => (
              <option key={category} value={category} className="capitalize">
                {category}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="monthly">Monthly</option>
            <option value="festival">Festival</option>
            <option value="weekly">Weekly</option>
            <option value="contest">Contest</option>
          </select>

          {/* Featured Toggle */}
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showFeaturedOnly}
              onChange={(e) => setShowFeaturedOnly(e.target.checked)}
              className="w-4 h-4 text-[#3bbca8] border-gray-300 rounded focus:ring-[#3bbca8]"
            />
            <span className="text-sm text-gray-700 flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>Featured Only</span>
            </span>
          </label>

          {/* Clear Filters */}
          {(selectedCategory !== 'all' || selectedType !== 'all' || showFeaturedOnly || searchTerm) && (
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedType('all');
                setShowFeaturedOnly(false);
                setSearchTerm('');
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && !searchTerm && (
        <div className="border-b p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Star className="w-5 h-5 text-yellow-500" />
            <span>Recommended for You</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.recommendations.map((rec) => (
              <div key={rec.id} className="bg-white rounded-lg border border-indigo-200 p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">{getTypeIcon(rec.challengeType)}</span>
                  <h4 className="font-medium text-gray-900">{rec.name}</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{rec.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#3bbca8] font-medium">~{rec.estimatedReward} pts</span>
                  <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">
                    Coming Soon
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Challenges Grid */}
      <div className="p-6">
        {filteredChallenges.length === 0 ? (
          <div className="text-center py-12">
            {data.challenges.length === 0 ? (
              <>
                <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Challenges</h3>
                <p className="text-gray-600 mb-4">
                  There are no active challenges at the moment.
                </p>
                <p className="text-gray-500 text-sm">
                  💡 Check back soon for new exciting challenges to participate in!
                </p>
              </>
            ) : (
              <>
                <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Matching Challenges</h3>
                <p className="text-gray-600">Try adjusting your filters or search terms.</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Featured Challenges */}
            {filteredChallenges.some(c => c.isFeatured) && !showFeaturedOnly && (
              <div className="mb-8">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  <span>Featured Challenges</span>
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {filteredChallenges
                    .filter(challenge => challenge.isFeatured)
                    .map((challenge) => (
                      <ChallengeCard
                        key={challenge.id}
                        challenge={challenge}
                        onJoin={handleJoinChallenge}
                        onView={handleViewChallenge}
                        className="border-2 border-yellow-200"
                      />
                    ))}
                </div>
              </div>
            )}

            {/* All Challenges */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredChallenges
                .filter(challenge => showFeaturedOnly ? challenge.isFeatured : !challenge.isFeatured)
                .map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    onJoin={handleJoinChallenge}
                    onView={handleViewChallenge}
                  />
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}