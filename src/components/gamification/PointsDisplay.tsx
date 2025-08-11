'use client';

import React, { useState, useEffect } from 'react';
import { Star, TrendingUp, Trophy, Gift } from 'lucide-react';

interface UserPoints {
  id: string;
  points_earned: number;
  points_spent: number;
  current_balance: number;
  total_lifetime_points: number;
  level: number;
  experience_points: number;
  streak_count: number;
  badges: any[];
  achievements: any[];
}

interface PointTransaction {
  id: string;
  points_amount: number;
  transaction_type: string;
  source: string;
  description: string;
  created_at: string;
}

interface PointsDisplayProps {
  className?: string;
  showTransactions?: boolean;
}

export default function PointsDisplay({ className = '', showTransactions = false }: PointsDisplayProps) {
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserPoints();
  }, []);

  const fetchUserPoints = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch('/api/points', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserPoints(data.data.userPoints);
        if (showTransactions && data.data.userPoints.point_transactions) {
          setTransactions(data.data.userPoints.point_transactions);
        }
      }
    } catch (error) {
      console.error('Error fetching user points:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelProgress = () => {
    if (!userPoints) return 0;
    const currentLevelXP = userPoints.level * 100; // Example: level 1 = 100 XP, level 2 = 200 XP
    const nextLevelXP = (userPoints.level + 1) * 100;
    const progress = ((userPoints.experience_points - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const getTransactionIcon = (source: string) => {
    switch (source) {
      case 'question_post':
        return '❓';
      case 'answer_post':
        return '💬';
      case 'best_answer':
        return '⭐';
      case 'daily_bonus':
        return '🎁';
      case 'expert_verified':
        return '👨‍⚕️';
      default:
        return '🐕';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg p-6 shadow-sm animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  if (!userPoints) {
    return (
      <div className={`bg-white rounded-lg p-6 shadow-sm ${className}`}>
        <p className="text-gray-600">Unable to load points data</p>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-[#3bbca8] to-[#2daa96] rounded-lg p-6 text-white shadow-lg ${className}`}>
      {/* Points Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold opacity-90">Barks Points</h3>
          <div className="flex items-center space-x-2">
            <span className="text-3xl font-bold">{userPoints.current_balance.toLocaleString()}</span>
            <div className="bg-white/20 rounded-full p-1">
              <Star className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm opacity-90">Level {userPoints.level}</div>
          <div className="flex items-center space-x-1 mt-1">
            <Trophy className="w-4 h-4" />
            <span className="text-sm">{userPoints.streak_count} day streak</span>
          </div>
        </div>
      </div>

      {/* Level Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm opacity-90 mb-1">
          <span>Level {userPoints.level}</span>
          <span>Level {userPoints.level + 1}</span>
        </div>
        <div className="bg-white/20 rounded-full h-2">
          <div 
            className="bg-white rounded-full h-2 transition-all duration-300"
            style={{ width: `${getLevelProgress()}%` }}
          ></div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-sm opacity-90">Earned</div>
          <div className="text-lg font-semibold">{userPoints.points_earned.toLocaleString()}</div>
        </div>
        <div className="text-center">
          <div className="text-sm opacity-90">Spent</div>
          <div className="text-lg font-semibold">{userPoints.points_spent.toLocaleString()}</div>
        </div>
        <div className="text-center">
          <div className="text-sm opacity-90">Lifetime</div>
          <div className="text-lg font-semibold">{userPoints.total_lifetime_points.toLocaleString()}</div>
        </div>
      </div>

      {/* Badges */}
      {userPoints.badges && userPoints.badges.length > 0 && (
        <div className="border-t border-white/20 pt-4">
          <div className="flex items-center space-x-2 mb-2">
            <Gift className="w-4 h-4" />
            <span className="text-sm font-medium">Recent Badges</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {userPoints.badges.slice(0, 5).map((badge: any, index: number) => (
              <span 
                key={index}
                className="inline-flex items-center px-2 py-1 bg-white/20 rounded-full text-xs"
                title={badge.name || badge}
              >
                {badge.icon || '🏆'} {badge.name || badge}
              </span>
            ))}
            {userPoints.badges.length > 5 && (
              <span className="inline-flex items-center px-2 py-1 bg-white/20 rounded-full text-xs">
                +{userPoints.badges.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {showTransactions && transactions.length > 0 && (
        <div className="border-t border-white/20 pt-4 mt-4">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">Recent Activity</span>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {transactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between py-1">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getTransactionIcon(transaction.source)}</span>
                  <div>
                    <div className="text-sm">{transaction.description}</div>
                    <div className="text-xs opacity-75">{formatDate(transaction.created_at)}</div>
                  </div>
                </div>
                <div className={`text-sm font-semibold ${
                  transaction.transaction_type === 'earned' ? 'text-green-200' : 'text-red-200'
                }`}>
                  {transaction.transaction_type === 'earned' ? '+' : '-'}{Math.abs(transaction.points_amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}