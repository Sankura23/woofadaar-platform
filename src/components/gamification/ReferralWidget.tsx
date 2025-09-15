// Week 22 Phase 3: Referral Widget Component
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  Share2, 
  Users, 
  Gift, 
  Copy, 
  MessageCircle, 
  Mail,
  Twitter,
  Facebook,
  Trophy,
  TrendingUp,
  Calendar,
  Sparkles,
  Target,
  Crown,
  Star,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  Clock
} from 'lucide-react';

interface ReferralWidgetProps {
  userId?: string;
  compact?: boolean;
}

interface ReferralData {
  referralCode: string;
  stats: {
    totalReferred: number;
    successfulReferred: number;
    totalPointsEarned: number;
    currentTier: number;
    nextTierTarget: number;
    conversionRate: number;
    averageRewardPerReferral: number;
    monthlyReferrals: number;
  };
  insights: {
    insights: string[];
    recommendations: string[];
    nextGoal: string;
  };
  referralHistory: Array<{
    id: string;
    referredUser: {
      name: string;
      profileImage?: string;
    };
    status: string;
    pointsAwarded: number;
    milestoneReached?: string;
    createdAt: string;
    rewardedAt?: string;
  }>;
  program: {
    baseReward: number;
    milestones: Array<{
      name: string;
      description: string;
      requirement: string;
      reward: number;
      icon: string;
    }>;
    tierBonuses: { [key: number]: number };
  };
  activeSpecialBonuses: Array<{
    id: string;
    name: string;
    description: string;
    multiplier: number;
  }>;
  leaderboard: {
    topReferrers: Array<{
      id: string;
      name: string;
      referralCount: number;
      totalPoints: number;
      rank: number;
    }>;
    userRank: number;
  };
  referralMessages: {
    whatsapp: string;
    sms: string;
    email: string;
    social: string;
  };
}

export default function ReferralWidget({ userId, compact = false }: ReferralWidgetProps) {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'history' | 'leaderboard' | 'share'>('overview');
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchReferralData();
  }, [userId]);

  const fetchReferralData = async () => {
    try {
      const response = await fetch('/api/gamification/referrals');
      if (response.ok) {
        const data = await response.json();
        setReferralData(data.data);
      }
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessage(type);
      setTimeout(() => setCopiedMessage(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareToSocial = (platform: string) => {
    if (!referralData) return;

    const messages = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(referralData.referralMessages.whatsapp)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(referralData.referralMessages.social)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=woofadaar.com/join&quote=${encodeURIComponent(referralData.referralMessages.social)}`,
      email: `mailto:?subject=Join me on Woofadaar!&body=${encodeURIComponent(referralData.referralMessages.email)}`
    };

    window.open(messages[platform as keyof typeof messages], '_blank');
  };

  const getTierInfo = (tierNumber: number) => {
    const tierNames = ['', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
    const tierColors = ['', '#CD7F32', '#C0C0C0', '#FFD700', '#E5E4E2', '#B9F2FF'];
    const tierIcons = ['', '🥉', '🥈', '🥇', '💎', '💠'];
    
    return {
      name: tierNames[tierNumber] || 'Bronze',
      color: tierColors[tierNumber] || '#CD7F32',
      icon: tierIcons[tierNumber] || '🥉'
    };
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${compact ? 'p-4' : ''}`}>
        <div className="animate-pulse bg-gray-200 h-32 rounded-xl"></div>
        {!compact && <div className="animate-pulse bg-gray-200 h-48 rounded-xl"></div>}
      </div>
    );
  }

  if (!referralData) {
    return <div className="text-center py-8 text-gray-600">Unable to load referral information</div>;
  }

  const currentTier = getTierInfo(referralData.stats.currentTier);
  const nextTier = getTierInfo(referralData.stats.currentTier + 1);

  if (compact) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Referral Progress
            </h3>
            <Badge 
              variant="secondary" 
              style={{ backgroundColor: `${currentTier.color}20`, color: currentTier.color }}
            >
              {currentTier.icon} {currentTier.name}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {referralData.stats.successfulReferred}
              </div>
              <div className="text-xs text-gray-600">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {referralData.stats.totalPointsEarned}
              </div>
              <div className="text-xs text-gray-600">Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {referralData.stats.conversionRate}%
              </div>
              <div className="text-xs text-gray-600">Rate</div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Code: {referralData.referralCode}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(referralData.referralCode, 'code')}
              className="p-1"
            >
              {copiedMessage === 'code' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <Button variant="outline" size="sm" className="w-full">
            <Share2 className="w-4 h-4 mr-2" />
            Share Now
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Referral Overview */}
      <Card className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Referral Rewards</h1>
              <p className="text-gray-600">
                Share the love and earn rewards for every successful referral!
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{currentTier.icon}</span>
                <div>
                  <div className="font-semibold" style={{ color: currentTier.color }}>
                    {currentTier.name} Tier
                  </div>
                  <div className="text-sm text-gray-600">
                    {referralData.program.tierBonuses[referralData.stats.currentTier] || 1}x multiplier
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium">Total Referred</span>
              </div>
              <div className="text-2xl font-bold">{referralData.stats.totalReferred}</div>
              <div className="text-sm text-gray-600">
                {referralData.stats.successfulReferred} successful
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium">Points Earned</span>
              </div>
              <div className="text-2xl font-bold">{referralData.stats.totalPointsEarned}</div>
              <div className="text-sm text-gray-600">
                Avg: {referralData.stats.averageRewardPerReferral}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium">Success Rate</span>
              </div>
              <div className="text-2xl font-bold">{referralData.stats.conversionRate}%</div>
              <div className="text-sm text-gray-600">
                This month: {referralData.stats.monthlyReferrals}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium">Next Tier</span>
              </div>
              <div className="text-2xl font-bold">
                {referralData.stats.nextTierTarget - referralData.stats.successfulReferred}
              </div>
              <div className="text-sm text-gray-600">
                to {nextTier.name}
              </div>
            </div>
          </div>

          {/* Your Referral Code */}
          <div className="bg-white p-4 rounded-lg border-2 border-dashed border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Your Referral Code</div>
                <div className="text-2xl font-bold text-blue-600 font-mono">
                  {referralData.referralCode}
                </div>
              </div>
              <Button
                onClick={() => copyToClipboard(referralData.referralCode, 'code')}
                variant="outline"
                className="flex items-center gap-2"
              >
                {copiedMessage === 'code' ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Active Bonuses */}
          {referralData.activeSpecialBonuses.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-600" />
                Active Bonuses
              </h4>
              <div className="flex flex-wrap gap-2">
                {referralData.activeSpecialBonuses.map((bonus) => (
                  <Badge 
                    key={bonus.id} 
                    variant="secondary"
                    className="bg-yellow-100 text-yellow-800"
                  >
                    {bonus.name} ({bonus.multiplier}x)
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'overview', label: 'Overview', icon: Star },
          { key: 'history', label: 'History', icon: Clock },
          { key: 'leaderboard', label: 'Leaderboard', icon: Trophy },
          { key: 'share', label: 'Share', icon: Share2 }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSelectedTab(key as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium transition-all ${
              selectedTab === key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {selectedTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Insights & Recommendations */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Insights & Tips</h3>
                  <div className="space-y-4">
                    {referralData.insights.insights.map((insight, index) => (
                      <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm">{insight}</p>
                      </div>
                    ))}
                    {referralData.insights.recommendations.map((recommendation, index) => (
                      <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm font-medium">💡 Tip:</p>
                        <p className="text-sm">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                    <p className="text-sm font-medium text-purple-700">Next Goal:</p>
                    <p className="text-sm">{referralData.insights.nextGoal}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Milestones */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Referral Milestones</h3>
                  <div className="space-y-3">
                    {referralData.program.milestones.map((milestone, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="text-2xl">{milestone.icon}</div>
                        <div className="flex-1">
                          <div className="font-medium">{milestone.name}</div>
                          <div className="text-sm text-gray-600">{milestone.description}</div>
                        </div>
                        <Badge variant="outline">
                          {milestone.reward} pts
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedTab === 'history' && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Referral History</h3>
                {referralData.referralHistory.length > 0 ? (
                  <div className="space-y-4">
                    {referralData.referralHistory.map((referral) => (
                      <div key={referral.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                          {referral.referredUser.profileImage ? (
                            <img 
                              src={referral.referredUser.profileImage} 
                              alt={referral.referredUser.name}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <span className="text-sm font-medium">
                              {referral.referredUser.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="font-medium">{referral.referredUser.name}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(referral.createdAt).toLocaleDateString()}
                            {referral.milestoneReached && (
                              <span className="ml-2 font-medium">• {referral.milestoneReached}</span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-medium text-green-600">
                            +{referral.pointsAwarded} pts
                          </div>
                          <Badge 
                            variant={referral.status === 'rewarded' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {referral.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-600">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No referrals yet. Start sharing your code!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedTab === 'leaderboard' && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Referral Leaderboard</h3>
                  <Badge variant="outline">
                    Your Rank: #{referralData.leaderboard.userRank || 'Unranked'}
                  </Badge>
                </div>
                
                {referralData.leaderboard.topReferrers.length > 0 ? (
                  <div className="space-y-3">
                    {referralData.leaderboard.topReferrers.map((user, index) => (
                      <div 
                        key={user.id}
                        className={`flex items-center gap-4 p-4 rounded-lg ${
                          index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-orange-500 text-white' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        
                        <div className="flex-1">
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-600">
                            {user.referralCount} referrals
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-medium">{user.totalPoints} pts</div>
                          {index < 3 && (
                            <div className="text-xs text-yellow-600">
                              {index === 0 ? '👑 Champion' :
                               index === 1 ? '🥈 Elite' : '🥉 Star'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-600">
                    <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>Leaderboard will populate as referrals come in</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedTab === 'share' && (
            <div className="space-y-6">
              {/* Quick Share Buttons */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Share Your Code</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { key: 'whatsapp', label: 'WhatsApp', color: 'bg-green-600', icon: MessageCircle },
                      { key: 'twitter', label: 'Twitter', color: 'bg-blue-400', icon: Twitter },
                      { key: 'facebook', label: 'Facebook', color: 'bg-blue-600', icon: Facebook },
                      { key: 'email', label: 'Email', color: 'bg-gray-600', icon: Mail }
                    ].map(({ key, label, color, icon: Icon }) => (
                      <Button
                        key={key}
                        onClick={() => shareToSocial(key)}
                        className={`${color} hover:opacity-90 flex flex-col gap-2 h-auto py-4`}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-sm">{label}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Custom Messages */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Share Messages</h3>
                  <div className="space-y-4">
                    {[
                      { key: 'whatsapp', label: 'WhatsApp Message', icon: MessageCircle },
                      { key: 'sms', label: 'SMS Message', icon: MessageCircle },
                      { key: 'email', label: 'Email Template', icon: Mail },
                      { key: 'social', label: 'Social Media Post', icon: Share2 }
                    ].map(({ key, label, icon: Icon }) => (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <label className="font-medium text-sm">{label}</label>
                        </div>
                        <div className="relative">
                          <textarea
                            className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none"
                            rows={3}
                            value={referralData.referralMessages[key as keyof typeof referralData.referralMessages]}
                            readOnly
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(
                              referralData.referralMessages[key as keyof typeof referralData.referralMessages], 
                              key
                            )}
                            className="absolute top-2 right-2"
                          >
                            {copiedMessage === key ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}