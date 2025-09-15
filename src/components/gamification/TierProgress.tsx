// Week 22 Phase 3: Tier Progress Component
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/progress';
import { 
  Crown, 
  Star, 
  Gift, 
  TrendingUp, 
  Calendar, 
  Users, 
  Award,
  Sparkles,
  ChevronRight,
  Info,
  Zap
} from 'lucide-react';

interface TierProgressProps {
  userId?: string;
  showUpgradeModal?: boolean;
}

interface TierData {
  userTier: {
    id: string;
    currentTier: string;
    tierPoints: number;
    monthlyTierPoints: number;
    tierStart: string;
    tierHistory: any[];
  };
  tierDetails: {
    name: string;
    minPoints: number;
    benefits: string[];
    perks: any[];
    icon: string;
    color: string;
    bgColor: string;
    specialFeatures: string[];
    monthlyPointsRequired: number;
  };
  progression: {
    currentTier: any;
    nextTier: any;
    progressPercentage: number;
    pointsToNext: number;
    monthlyProgress: number;
    estimatedDaysToNext: number;
  };
  benefits: {
    current: string[];
    cumulative: string[];
    availablePerks: any[];
    estimatedValue: number;
  };
  activity: any;
  stats: {
    totalUsers: { [tier: string]: number };
    tierDistribution: { tier: string; count: number; percentage: number }[];
    userRank: number;
  };
}

export default function TierProgress({ userId, showUpgradeModal = false }: TierProgressProps) {
  const [tierData, setTierData] = useState<TierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'benefits' | 'progress' | 'history'>('overview');
  const [showBenefitModal, setShowBenefitModal] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState(null);

  useEffect(() => {
    fetchTierData();
  }, [userId]);

  const fetchTierData = async () => {
    try {
      const response = await fetch('/api/gamification/tiers');
      if (response.ok) {
        const data = await response.json();
        setTierData(data.data);
      }
    } catch (error) {
      console.error('Error fetching tier data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tierColors = {
    bronze: { primary: '#CD7F32', bg: '#FDF2E9', light: '#F4E4BC' },
    silver: { primary: '#C0C0C0', bg: '#F8F9FA', light: '#E9ECEF' },
    gold: { primary: '#FFD700', bg: '#FFFBF0', light: '#FFF8DC' },
    platinum: { primary: '#E5E4E2', bg: '#FAFAFA', light: '#F5F5F5' },
    diamond: { primary: '#B9F2FF', bg: '#F0FCFF', light: '#E0F8FF' }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 h-48 rounded-xl"></div>
        <div className="animate-pulse bg-gray-200 h-32 rounded-xl"></div>
      </div>
    );
  }

  if (!tierData) {
    return <div className="text-center py-8 text-gray-600">Unable to load tier information</div>;
  }

  const currentTierColor = tierColors[tierData.userTier.currentTier as keyof typeof tierColors];

  return (
    <div className="space-y-6">
      {/* Tier Overview Card */}
      <Card 
        className="overflow-hidden border-0 shadow-xl"
        style={{ backgroundColor: currentTierColor.bg }}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-lg"
                style={{ backgroundColor: currentTierColor.light }}
              >
                {tierData.tierDetails.icon}
              </div>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  {tierData.tierDetails.name}
                  <Crown className="w-6 h-6" style={{ color: currentTierColor.primary }} />
                </h1>
                <p className="text-gray-600">
                  Since {new Date(tierData.userTier.tierStart).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-white/50">
                    Rank #{tierData.stats.userRank}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/50">
                    ₹{tierData.benefits.estimatedValue} value
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: currentTierColor.primary }}>
                {tierData.userTier.tierPoints.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Points</div>
              <div className="text-lg font-semibold mt-2">
                {tierData.userTier.monthlyTierPoints}
              </div>
              <div className="text-xs text-gray-500">This Month</div>
            </div>
          </div>

          {/* Progress to Next Tier */}
          {tierData.progression.nextTier && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Progress to {tierData.progression.nextTier.name}</span>
                <span className="text-sm text-gray-600">
                  {tierData.progression.pointsToNext} points to go
                </span>
              </div>
              
              <div className="space-y-2">
                <Progress 
                  value={tierData.progression.progressPercentage} 
                  className="h-3"
                  style={{ 
                    backgroundColor: currentTierColor.light,
                  }}
                />
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{tierData.progression.progressPercentage}% Complete</span>
                  <span>~{tierData.progression.estimatedDaysToNext} days</span>
                </div>
              </div>

              {/* Monthly Requirements */}
              {tierData.progression.nextTier.monthlyPointsRequired > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Monthly Requirement</span>
                    <span className="text-sm text-gray-600">
                      {tierData.progression.nextTier.monthlyPointsRequired} points/month
                    </span>
                  </div>
                  <Progress 
                    value={tierData.progression.monthlyProgress} 
                    className="h-2"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'overview', label: 'Overview', icon: Star },
          { key: 'benefits', label: 'Benefits', icon: Gift },
          { key: 'progress', label: 'Progress', icon: TrendingUp },
          { key: 'history', label: 'History', icon: Calendar }
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current Benefits */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-blue-600" />
                    Current Benefits
                  </h3>
                  <div className="space-y-3">
                    {tierData.tierDetails.benefits.slice(0, 4).map((benefit, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        </div>
                        <span className="text-sm">{benefit}</span>
                      </div>
                    ))}
                    {tierData.tierDetails.benefits.length > 4 && (
                      <button 
                        onClick={() => setSelectedTab('benefits')}
                        className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1"
                      >
                        View all benefits <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tier Statistics */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    Community Stats
                  </h3>
                  <div className="space-y-4">
                    {tierData.stats.tierDistribution.map(({ tier, count, percentage }) => (
                      <div key={tier} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ 
                            backgroundColor: tierColors[tier as keyof typeof tierColors]?.primary || '#gray' 
                          }}></div>
                          <span className="text-sm capitalize">{tier}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{count}</div>
                          <div className="text-xs text-gray-500">{percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedTab === 'benefits' && (
            <div className="space-y-6">
              {/* Active Benefits */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Active Benefits</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tierData.benefits.current.map((benefit, index) => (
                      <div 
                        key={index}
                        className="p-4 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-sm">{benefit}</span>
                          <Sparkles className="w-4 h-4 text-green-600 flex-shrink-0 ml-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Redeemable Perks */}
              {tierData.benefits.availablePerks.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Redeemable Perks</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {tierData.benefits.availablePerks.map((perk) => (
                        <div 
                          key={perk.id}
                          className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedBenefit(perk);
                            setShowBenefitModal(true);
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium">{perk.name}</h4>
                            <Badge variant="outline">
                              {perk.pointsCost} pts
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{perk.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {selectedTab === 'progress' && (
            <div className="space-y-6">
              {/* Activity Breakdown */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Activity Breakdown</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Questions', value: tierData.activity.questionsPosted, icon: '❓' },
                      { label: 'Answers', value: tierData.activity.answersGiven, icon: '💬' },
                      { label: 'Referrals', value: tierData.activity.referralsCompleted, icon: '👥' },
                      { label: 'Challenges', value: tierData.activity.challengesCompleted, icon: '🏆' }
                    ].map(({ label, value, icon }) => (
                      <div key={label} className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl mb-1">{icon}</div>
                        <div className="text-2xl font-bold">{value}</div>
                        <div className="text-sm text-gray-600">{label}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Next Tier Preview */}
              {tierData.progression.nextTier && (
                <Card className="border-2 border-dashed border-blue-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Zap className="w-5 h-5 text-blue-600" />
                        Next: {tierData.progression.nextTier.name}
                      </h3>
                      <div className="text-2xl">{tierData.progression.nextTier.icon}</div>
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <p className="text-sm text-gray-600">
                        Unlock these additional benefits:
                      </p>
                      {tierData.progression.nextTier.benefits.slice(0, 3).map((benefit: string, index: number) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          </div>
                          <span className="text-sm">{benefit}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div>
                        <div className="font-medium">Requirements:</div>
                        <div className="text-sm text-gray-600">
                          {tierData.progression.nextTier.minPoints.toLocaleString()} total points
                          {tierData.progression.nextTier.monthlyPointsRequired > 0 && (
                            <>, {tierData.progression.nextTier.monthlyPointsRequired} monthly</>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Learn More
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {selectedTab === 'history' && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Tier History</h3>
                {tierData.userTier.tierHistory.length > 0 ? (
                  <div className="space-y-4">
                    {tierData.userTier.tierHistory.map((entry: any, index: number) => (
                      <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                          <Award className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium capitalize">
                            Achieved {entry.tier} Tier
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(entry.achievedAt).toLocaleDateString()} • 
                            {entry.pointsAtAchievement.toLocaleString()} points
                          </div>
                        </div>
                        <Badge variant="secondary" className="capitalize">
                          {entry.tier}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-600">
                    <Award className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>Your tier progression will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Benefit Details Modal */}
      {showBenefitModal && selectedBenefit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{(selectedBenefit as any).name}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBenefitModal(false)}
              >
                ✕
              </Button>
            </div>
            <p className="text-gray-600 mb-4">{(selectedBenefit as any).description}</p>
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span className="text-sm">{(selectedBenefit as any).pointsCost} points required</span>
              </div>
              <Button>
                Redeem Now
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}