'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Leaderboard from '@/components/gamification/Leaderboard';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LeaderboardPage() {
  return (
    <ProtectedRoute>
      <div className="bg-gradient-to-br from-milk-white via-gray-50 to-gray-100 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/community"
              className="inline-flex items-center text-[#3bbca8] hover:text-[#2daa96] font-medium mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Community
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Leaderboard</h1>
            <p className="text-gray-600">
              Celebrate our most active members, helpful contributors, and verified experts
            </p>
          </div>

          {/* Leaderboard Component */}
          <Leaderboard />
        </div>
      </div>
    </ProtectedRoute>
  );
}