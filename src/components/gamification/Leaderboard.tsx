'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star, Crown, TrendingUp, Users, Award } from 'lucide-react';
import Link from 'next/link';

interface LeaderboardUser {
  rank: number;
  user: {
    id: string;
    name: string;
    profile_image_url?: string;
    location?: string;
    experience_level: string;
  };
  points: number;
  level: number;
  badges: any[];
  streak: number;
  achievements: any[];
}

interface TopContributor {
  user: {
    id: string;
    name: string;
    profile_image_url?: string;
    location?: string;
  };
  questionsCount: number;
  answersCount: number;
  bestAnswersCount: number;
  reputation: number;
  points: number;
  level: number;
}

interface TopExpert {
  user: {
    id: string;
    name: string;
    profile_image_url?: string;
    location?: string;
  };
  expertise_areas: string[];
  answer_count: number;
  best_answer_count: number;
  years_experience?: number;
  is_featured: boolean;
}

interface LeaderboardData {
  leaderboard: LeaderboardUser[];
  topContributors: TopContributor[];
  topExperts: TopExpert[];
  stats: {
    totalUsers: number;
    totalPointsDistributed: number;
    averagePoints: number;
    averageLevel: number;
  };
  timeframe: string;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all');
  const [activeTab, setActiveTab] = useState<'points' | 'contributors' | 'experts'>('points');

  useEffect(() => {
    fetchLeaderboard();
  }, [timeframe]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leaderboard?timeframe=${timeframe}&limit=50`);
      
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-gray-600 font-semibold">#{rank}</span>;
    }
  };

  const getExperienceLevel = (level: string) => {
    const levels: { [key: string]: string } = {
      beginner: '🌱 Beginner',
      intermediate: '🐕 Experienced',
      expert: '🏆 Expert'
    };
    return levels[level] || level;
  };

  const formatPoints = (points: number) => {
    if (points >= 1000000) {
      return `${(points / 1000000).toFixed(1)}M`;
    }
    if (points >= 1000) {
      return `${(points / 1000).toFixed(1)}K`;
    }
    return points.toString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <p className="text-gray-600">Unable to load leaderboard data</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-[#3bbca8]" />
            <span>Community Leaderboard</span>
          </h2>
          
          <div className="flex items-center space-x-2">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="month">This Month</option>
              <option value="week">This Week</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-[#3bbca8]">{data.stats.totalUsers}</div>
            <div className="text-sm text-gray-600">Active Members</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-[#76519f]">{formatPoints(data.stats.totalPointsDistributed)}</div>
            <div className="text-sm text-gray-600">Points Earned</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-[#e05a37]">{data.stats.averagePoints}</div>
            <div className="text-sm text-gray-600">Avg Points</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-[#ffa602]">{data.stats.averageLevel}</div>
            <div className="text-sm text-gray-600">Avg Level</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('points')}
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            activeTab === 'points'
              ? 'text-[#3bbca8] border-b-2 border-[#3bbca8] bg-[#3bbca8]/5'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Star className="w-4 h-4" />
            <span>Top Points</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('contributors')}
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            activeTab === 'contributors'
              ? 'text-[#76519f] border-b-2 border-[#76519f] bg-[#76519f]/5'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Contributors</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('experts')}
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            activeTab === 'experts'
              ? 'text-[#e05a37] border-b-2 border-[#e05a37] bg-[#e05a37]/5'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Award className="w-4 h-4" />
            <span>Experts</span>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'points' && (
          <div className="space-y-3">
            {data.leaderboard.map((user) => (
              <div 
                key={user.user.id}
                className={`flex items-center space-x-4 p-4 rounded-lg transition-colors hover:bg-gray-50 ${
                  user.rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' : ''
                }`}
              >
                <div className="flex-shrink-0">
                  {getRankIcon(user.rank)}
                </div>
                
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    {user.user.profile_image_url ? (
                      <img 
                        src={user.user.profile_image_url} 
                        alt={user.user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-500 text-xl">👤</span>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium text-gray-900 truncate">
                      {user.user.name}
                    </h3>
                    <span className="text-sm text-gray-500">
                      Level {user.level}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                    <span>{getExperienceLevel(user.user.experience_level)}</span>
                    {user.user.location && (
                      <>
                        <span>•</span>
                        <span>📍 {user.user.location}</span>
                      </>
                    )}
                    {user.streak > 0 && (
                      <>
                        <span>•</span>
                        <span>🔥 {user.streak} day streak</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-[#3bbca8]">
                    {formatPoints(user.points)}
                  </div>
                  <div className="text-sm text-gray-500">points</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'contributors' && (
          <div className="space-y-3">
            {data.topContributors.map((contributor, index) => (
              <div 
                key={contributor.user.id}
                className="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0">
                  {getRankIcon(index + 1)}
                </div>
                
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    {contributor.user.profile_image_url ? (
                      <img 
                        src={contributor.user.profile_image_url} 
                        alt={contributor.user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-500 text-xl">👤</span>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {contributor.user.name}
                  </h3>
                  <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                    <span>❓ {contributor.questionsCount} questions</span>
                    <span>💬 {contributor.answersCount} answers</span>
                    <span>⭐ {contributor.bestAnswersCount} best</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-[#76519f]">
                    {contributor.reputation}
                  </div>
                  <div className="text-sm text-gray-500">reputation</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'experts' && (
          <div className="space-y-3">
            {data.topExperts.map((expert, index) => (
              <div 
                key={expert.user.id}
                className={`flex items-center space-x-4 p-4 rounded-lg transition-colors hover:bg-gray-50 ${
                  expert.is_featured ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200' : ''
                }`}
              >
                <div className="flex-shrink-0">
                  {expert.is_featured ? (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Star className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    getRankIcon(index + 1)
                  )}
                </div>
                
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    {expert.user.profile_image_url ? (
                      <img 
                        src={expert.user.profile_image_url} 
                        alt={expert.user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-500 text-xl">👨‍⚕️</span>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium text-gray-900 truncate">
                      {expert.user.name}
                    </h3>
                    {expert.is_featured && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Featured Expert
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                    <span>💬 {expert.answer_count} answers</span>
                    <span>⭐ {expert.best_answer_count} best</span>
                    {expert.years_experience && (
                      <span>📚 {expert.years_experience}+ years</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {expert.expertise_areas.slice(0, 3).map((area) => (
                      <span 
                        key={area}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#e05a37]/10 text-[#e05a37] border border-[#e05a37]/20"
                      >
                        {area}
                      </span>
                    ))}
                    {expert.expertise_areas.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{expert.expertise_areas.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}