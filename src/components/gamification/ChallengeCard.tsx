'use client';

import React, { useState } from 'react';
import { Calendar, Users, Trophy, Clock, Star, Award, CheckCircle, Play, Eye } from 'lucide-react';
import Link from 'next/link';

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
  userParticipation?: {
    id: string;
    status: string;
    joinedAt: string;
    completedAt?: string;
    hasSubmission: boolean;
    submissionStatus?: string;
  };
}

interface ChallengeCardProps {
  challenge: Challenge;
  onJoin?: (challengeId: string) => void;
  onView?: (challengeId: string) => void;
  compact?: boolean;
  className?: string;
}

export default function ChallengeCard({ 
  challenge, 
  onJoin, 
  onView, 
  compact = false, 
  className = '' 
}: ChallengeCardProps) {
  const [isJoining, setIsJoining] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'photo': return '📸';
      case 'story': return '📝';
      case 'knowledge': return '🧠';
      case 'activity': return '🏃';
      case 'health': return '🏥';
      case 'social': return '👥';
      default: return '🏆';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'photo': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'story': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'knowledge': return 'bg-green-100 text-green-700 border-green-200';
      case 'activity': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'health': return 'bg-red-100 text-red-700 border-red-200';
      case 'social': return 'bg-pink-100 text-pink-700 border-pink-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'monthly': return 'bg-indigo-100 text-indigo-700';
      case 'festival': return 'bg-yellow-100 text-yellow-700';
      case 'weekly': return 'bg-green-100 text-green-700';
      case 'contest': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'winner': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric'
    });
  };

  const handleJoin = async () => {
    if (!onJoin || isJoining || challenge.stats.userParticipating) return;
    
    setIsJoining(true);
    try {
      await onJoin(challenge.id);
    } finally {
      setIsJoining(false);
    }
  };

  const handleView = () => {
    if (onView) {
      onView(challenge.id);
    }
  };

  if (compact) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">{getCategoryIcon(challenge.category)}</span>
              <h3 className="font-semibold text-gray-900 truncate">{challenge.name}</h3>
              {challenge.isFeatured && (
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
              )}
            </div>
            
            <p className="text-gray-600 text-sm mb-2 line-clamp-2">{challenge.description}</p>
            
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span className="flex items-center space-x-1">
                <Trophy className="w-3 h-3" />
                <span>{challenge.pointReward} pts</span>
              </span>
              <span className="flex items-center space-x-1">
                <Users className="w-3 h-3" />
                <span>{challenge.stats.participantsCount}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{challenge.stats.daysRemaining}d left</span>
              </span>
            </div>
          </div>
          
          <div className="ml-3">
            {challenge.stats.userParticipating ? (
              <button
                onClick={handleView}
                className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"
              >
                <CheckCircle className="w-4 h-4 inline mr-1" />
                Joined
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="px-3 py-1 bg-[#3bbca8] text-white rounded-full text-sm font-medium hover:bg-[#2daa96] disabled:opacity-50"
              >
                {isJoining ? '...' : 'Join'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all ${className}`}>
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">{getCategoryIcon(challenge.category)}</div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-xl font-bold text-gray-900">{challenge.name}</h3>
                {challenge.isFeatured && (
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getCategoryColor(challenge.category)} border`}>
                  {challenge.category}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getTypeColor(challenge.challengeType)}`}>
                  {challenge.challengeType}
                </span>
              </div>
            </div>
          </div>
          
          {challenge.userParticipation && (
            <div className="text-right">
              <div className={`text-sm font-medium capitalize ${getStatusColor(challenge.userParticipation.status)}`}>
                {challenge.userParticipation.status}
              </div>
              {challenge.userParticipation.hasSubmission && (
                <div className="text-xs text-gray-500 mt-1">
                  Submission: {challenge.userParticipation.submissionStatus}
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-gray-700 mb-4 line-clamp-3">{challenge.description}</p>

        {/* Challenge Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Trophy className="w-5 h-5 mx-auto mb-1 text-[#3bbca8]" />
            <div className="font-semibold text-gray-900">{challenge.pointReward}</div>
            <div className="text-xs text-gray-600">Points</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Users className="w-5 h-5 mx-auto mb-1 text-[#76519f]" />
            <div className="font-semibold text-gray-900">{challenge.stats.participantsCount}</div>
            <div className="text-xs text-gray-600">Participants</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Clock className="w-5 h-5 mx-auto mb-1 text-[#e05a37]" />
            <div className="font-semibold text-gray-900">{challenge.stats.daysRemaining}</div>
            <div className="text-xs text-gray-600">Days Left</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Calendar className="w-5 h-5 mx-auto mb-1 text-[#ffa602]" />
            <div className="font-semibold text-gray-900 text-sm">{formatDate(challenge.endDate)}</div>
            <div className="text-xs text-gray-600">Ends</div>
          </div>
        </div>

        {/* Prizes Preview */}
        {challenge.prizes && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <Award className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Prizes</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {challenge.prizes.first && (
                <div className="text-center">
                  <div className="font-medium text-yellow-700">🥇 1st</div>
                  <div className="text-yellow-600">{challenge.prizes.first.points} pts</div>
                </div>
              )}
              {challenge.prizes.second && (
                <div className="text-center">
                  <div className="font-medium text-gray-600">🥈 2nd</div>
                  <div className="text-gray-500">{challenge.prizes.second.points} pts</div>
                </div>
              )}
              {challenge.prizes.third && (
                <div className="text-center">
                  <div className="font-medium text-orange-600">🥉 3rd</div>
                  <div className="text-orange-500">{challenge.prizes.third.points} pts</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Challenge Rules Preview */}
        {challenge.rules && challenge.rules.requirements && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <h4 className="font-medium text-blue-800 mb-2">Requirements</h4>
            <div className="text-sm text-blue-700 space-y-1">
              {Object.entries(challenge.rules.requirements).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3" />
                  <span className="capitalize">{key.replace(/_/g, ' ')}: {String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 pb-6">
        <div className="flex items-center space-x-3">
          {challenge.stats.userParticipating ? (
            <>
              <Link
                href={`/gamification/challenges/${challenge.id}`}
                className="flex-1 bg-green-100 text-green-700 py-2 px-4 rounded-lg font-medium text-center hover:bg-green-200 transition-colors"
              >
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>View Progress</span>
                </div>
              </Link>
              {!challenge.userParticipation?.hasSubmission && (
                <Link
                  href={`/gamification/challenges/${challenge.id}/submit`}
                  className="flex-1 bg-[#3bbca8] text-white py-2 px-4 rounded-lg font-medium text-center hover:bg-[#2daa96] transition-colors"
                >
                  Submit Entry
                </Link>
              )}
            </>
          ) : (
            <>
              <button
                onClick={handleJoin}
                disabled={isJoining || challenge.stats.daysRemaining <= 0}
                className="flex-1 bg-[#3bbca8] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#2daa96] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <div className="flex items-center justify-center space-x-2">
                  <Play className="w-4 h-4" />
                  <span>{isJoining ? 'Joining...' : 'Join Challenge'}</span>
                </div>
              </button>
              <Link
                href={`/gamification/challenges/${challenge.id}`}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Created by */}
      <div className="px-6 pb-4 border-t border-gray-100 pt-4">
        <div className="text-xs text-gray-500">
          Created by <span className="font-medium">{challenge.createdBy.name}</span>
        </div>
      </div>
    </div>
  );
}