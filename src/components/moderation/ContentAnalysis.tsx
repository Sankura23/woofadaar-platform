'use client';

import { useState, useEffect } from 'react';

interface ContentAnalysisProps {
  content: string;
  contentType: 'question' | 'answer' | 'comment' | 'forum_post' | 'story';
  contentId?: string;
  showRecommendations?: boolean;
  onAnalysisComplete?: (analysis: any) => void;
}

interface AnalysisResult {
  spam: {
    spamScore: number;
    isSpam: boolean;
    confidence: number;
    flags: string[];
    analysis: {
      keywordMatches: string[];
      urlCount: number;
      capsRatio: number;
      wordCount: number;
      languageQuality: number;
      repetitiveScore: number;
      promotionalScore: number;
    };
  };
  quality: {
    qualityScore: number;
    readabilityScore: number;
    feedback: string[];
    metrics: {
      wordCount: number;
      sentenceCount: number;
      avgWordsPerSentence: number;
      meaningfulRatio: number;
      grammarScore: number;
      coherenceScore: number;
    };
  };
  toxicity: {
    toxicityScore: number;
    isToxic: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    flags: string[];
    categories: {
      harassment: number;
      threats: number;
      profanity: number;
      animalAbuse: number;
      misinformation: number;
    };
  };
  overallScore: number;
  recommendation: 'approve' | 'flag' | 'review' | 'block';
  processingTime: number;
}

const ScoreBar = ({ score, color, label }: { score: number; color: string; label: string }) => {
  const getColorClass = (color: string) => {
    const colors = {
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500',
      blue: 'bg-blue-500'
    };
    return colors[color as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-600">{score}/100</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getColorClass(color)}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  );
};

const RecommendationBadge = ({ recommendation }: { recommendation: string }) => {
  const config = {
    approve: { bg: 'bg-green-100', text: 'text-green-800', icon: '✅', label: 'Approved' },
    flag: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '🏴', label: 'Flagged' },
    review: { bg: 'bg-orange-100', text: 'text-orange-800', icon: '👀', label: 'Needs Review' },
    block: { bg: 'bg-red-100', text: 'text-red-800', icon: '🚫', label: 'Blocked' }
  };

  const { bg, text, icon, label } = config[recommendation as keyof typeof config] || config.approve;

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${bg} ${text}`}>
      <span className="mr-1">{icon}</span>
      {label}
    </div>
  );
};

export default function ContentAnalysis({ 
  content, 
  contentType, 
  contentId,
  showRecommendations = true,
  onAnalysisComplete 
}: ContentAnalysisProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const analyzeContent = async () => {
    if (!content.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setError('');
    
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('/api/moderation/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content,
          contentType,
          contentId,
          analysisType: 'comprehensive'
        })
      });

      const data = await response.json();

      if (data.success) {
        setAnalysis(data.data.analysis);
        if (onAnalysisComplete) {
          onAnalysisComplete(data.data.analysis);
        }
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('Content analysis error:', err);
      setError('Failed to analyze content');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (content.trim().length > 10) {
        analyzeContent();
      }
    }, 1000);

    return () => clearTimeout(debounceTimer);
  }, [content]);

  if (!content.trim()) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500 text-center">
          Content analysis will appear here as you type...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm text-blue-700">Analyzing content...</span>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    if (score >= 40) return 'orange';
    return 'red';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Header with Overall Score */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <span className="text-lg font-semibold text-gray-900 mr-2">
              Content Score: {analysis.overallScore}/100
            </span>
            <div className={`w-3 h-3 rounded-full ${
              analysis.overallScore >= 70 ? 'bg-green-500' :
              analysis.overallScore >= 50 ? 'bg-yellow-500' :
              analysis.overallScore >= 30 ? 'bg-orange-500' : 'bg-red-500'
            }`} />
          </div>
          <RecommendationBadge recommendation={analysis.recommendation} />
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
          <svg 
            className={`w-4 h-4 ml-1 transition-transform ${showDetails ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Key Scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <ScoreBar 
          score={100 - analysis.spam.spamScore} 
          color={getScoreColor(100 - analysis.spam.spamScore)}
          label="Spam Safety"
        />
        <ScoreBar 
          score={analysis.quality.qualityScore} 
          color={getScoreColor(analysis.quality.qualityScore)}
          label="Content Quality"
        />
        <ScoreBar 
          score={100 - analysis.toxicity.toxicityScore} 
          color={getScoreColor(100 - analysis.toxicity.toxicityScore)}
          label="Safety Score"
        />
      </div>

      {/* Flags and Issues */}
      {(analysis.spam.flags.length > 0 || analysis.toxicity.flags.length > 0) && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Issues Detected:</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.spam.flags.map((flag, index) => (
              <span key={`spam-${index}`} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                🚫 {flag.replace(/_/g, ' ')}
              </span>
            ))}
            {analysis.toxicity.flags.map((flag, index) => (
              <span key={`toxicity-${index}`} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                ⚠️ {flag.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quality Feedback */}
      {showRecommendations && analysis.quality.feedback.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Suggestions for Improvement:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {analysis.quality.feedback.map((feedback, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                {feedback}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed Analysis */}
      {showDetails && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Spam Analysis Details */}
            <div>
              <h5 className="font-medium text-gray-900 mb-3">📊 Spam Analysis</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Confidence:</span>
                  <span>{Math.round(analysis.spam.confidence * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Word Count:</span>
                  <span>{analysis.spam.analysis.wordCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Language Quality:</span>
                  <span>{Math.round(analysis.spam.analysis.languageQuality * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Caps Ratio:</span>
                  <span>{Math.round(analysis.spam.analysis.capsRatio * 100)}%</span>
                </div>
                {analysis.spam.analysis.keywordMatches.length > 0 && (
                  <div>
                    <span className="text-red-600">Spam Keywords:</span>
                    <div className="text-xs text-red-500 mt-1">
                      {analysis.spam.analysis.keywordMatches.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quality Analysis Details */}
            <div>
              <h5 className="font-medium text-gray-900 mb-3">📝 Quality Analysis</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Readability:</span>
                  <span>{analysis.quality.readabilityScore}/100</span>
                </div>
                <div className="flex justify-between">
                  <span>Sentences:</span>
                  <span>{analysis.quality.metrics.sentenceCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Words/Sentence:</span>
                  <span>{analysis.quality.metrics.avgWordsPerSentence}</span>
                </div>
                <div className="flex justify-between">
                  <span>Grammar Score:</span>
                  <span>{analysis.quality.metrics.grammarScore}/100</span>
                </div>
                <div className="flex justify-between">
                  <span>Meaningful Content:</span>
                  <span>{Math.round(analysis.quality.metrics.meaningfulRatio * 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Toxicity Categories */}
          {analysis.toxicity.isToxic && (
            <div className="mt-4">
              <h5 className="font-medium text-gray-900 mb-3">🛡️ Safety Categories</h5>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                {Object.entries(analysis.toxicity.categories).map(([category, score]) => (
                  score > 0 && (
                    <div key={category} className="text-center">
                      <div className="font-medium capitalize">{category.replace(/([A-Z])/g, ' $1')}</div>
                      <div className={`text-lg font-bold ${score > 50 ? 'text-red-600' : 'text-yellow-600'}`}>
                        {score}/100
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Processing Info */}
          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
            <span>Analysis completed in {analysis.processingTime}ms</span>
            <span>AI-powered content analysis</span>
          </div>
        </div>
      )}
    </div>
  );
}