'use client';

interface QualityScore {
  overallScore: number;
  factors: {
    contentQuality: number;
    expertCredibility: number;
    communityEngagement: number;
    timeliness: number;
    completeness: number;
  };
  tier: 'poor' | 'fair' | 'good' | 'excellent' | 'outstanding';
}

interface AnswerQualityBadgeProps {
  qualityScore?: QualityScore;
  isVerifiedExpert?: boolean;
  isBestAnswer?: boolean;
  showDetails?: boolean;
  className?: string;
}

export default function AnswerQualityBadge({
  qualityScore,
  isVerifiedExpert = false,
  isBestAnswer = false,
  showDetails = false,
  className = ''
}: AnswerQualityBadgeProps) {
  
  const getTierInfo = (tier: string, score: number) => {
    const tierConfig = {
      outstanding: {
        icon: '🌟',
        label: 'Outstanding Answer',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        description: 'Exceptional quality and extremely helpful'
      },
      excellent: {
        icon: '⭐',
        label: 'Excellent Answer',
        color: 'bg-green-100 text-green-800 border-green-200',
        description: 'High quality and very helpful'
      },
      good: {
        icon: '👍',
        label: 'Good Answer',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        description: 'Good quality and helpful'
      },
      fair: {
        icon: '👌',
        label: 'Fair Answer',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        description: 'Adequate quality'
      },
      poor: {
        icon: '📝',
        label: 'Basic Answer',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        description: 'Could be improved'
      }
    };

    return tierConfig[tier as keyof typeof tierConfig] || tierConfig.fair;
  };

  const getFactorIcon = (factor: string) => {
    const icons = {
      contentQuality: '📝',
      expertCredibility: '🎓',
      communityEngagement: '👥',
      timeliness: '⏱️',
      completeness: '✅'
    };
    return icons[factor as keyof typeof icons] || '📊';
  };

  const getFactorLabel = (factor: string) => {
    const labels = {
      contentQuality: 'Content Quality',
      expertCredibility: 'Expert Credibility',
      communityEngagement: 'Community Engagement',
      timeliness: 'Response Time',
      completeness: 'Completeness'
    };
    return labels[factor as keyof typeof labels] || factor;
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    if (score >= 0.4) return 'text-orange-600';
    return 'text-red-600';
  };

  if (!qualityScore) return null;

  const tierInfo = getTierInfo(qualityScore.tier, qualityScore.overallScore);

  return (
    <div className={className}>
      {/* Main Quality Badge */}
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${tierInfo.color}`}>
        <span className="mr-1">{tierInfo.icon}</span>
        <span>{tierInfo.label}</span>
        <span className="ml-1 font-bold">
          {Math.round(qualityScore.overallScore * 100)}%
        </span>
      </div>

      {/* Additional Badges */}
      <div className="flex items-center space-x-2 mt-2">
        {isVerifiedExpert && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            <span className="mr-1">🔬</span>
            Verified Expert
          </span>
        )}
        
        {isBestAnswer && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            <span className="mr-1">✅</span>
            Best Answer
          </span>
        )}

        {qualityScore.factors.communityEngagement > 0.8 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
            <span className="mr-1">🔥</span>
            Popular
          </span>
        )}
      </div>

      {/* Detailed Breakdown */}
      {showDetails && (
        <div className="mt-3 p-3 bg-gray-50 rounded-md border">
          <div className="text-xs font-medium text-gray-700 mb-2">Quality Breakdown:</div>
          
          <div className="space-y-2">
            {Object.entries(qualityScore.factors).map(([factor, score]) => (
              <div key={factor} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="mr-1">{getFactorIcon(factor)}</span>
                  <span className="text-xs text-gray-600">
                    {getFactorLabel(factor)}
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-16 h-2 bg-gray-200 rounded-full mr-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        score >= 0.8 ? 'bg-green-500' :
                        score >= 0.6 ? 'bg-yellow-500' :
                        score >= 0.4 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${score * 100}%` }}
                    ></div>
                  </div>
                  <span className={`text-xs font-medium ${getScoreColor(score)}`}>
                    {Math.round(score * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-600">
              <span className="font-medium">Overall:</span> {tierInfo.description}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}