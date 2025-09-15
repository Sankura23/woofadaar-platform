'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface QuestionRecommendation {
  questionId: string;
  title: string;
  category: string;
  tags: string[];
  relevanceScore: number;
  recommendationReason: string[];
  isUrgent: boolean;
  hasExpertAnswer: boolean;
  viewCount: number;
  upvoteCount: number;
  answerCount: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
  dog?: {
    breed: string;
    name: string;
  };
}

interface QuestionRecommendationsProps {
  currentQuestionId?: string;
  type?: 'personalized' | 'trending' | 'similar';
  category?: string;
  className?: string;
}

export default function QuestionRecommendations({
  currentQuestionId,
  type = 'personalized',
  category,
  className = ''
}: QuestionRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<QuestionRecommendation[]>([]);
  const [trending, setTrending] = useState<QuestionRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'for-you' | 'trending' | 'similar'>('for-you');

  useEffect(() => {
    fetchRecommendations();
  }, [type, category, currentQuestionId]);

  const fetchRecommendations = async () => {
    const token = localStorage.getItem('woofadaar_token');
    if (!token && type !== 'trending') return;
    
    setLoading(true);
    try {
      if (!token) return;

      const params = new URLSearchParams();
      params.append('type', type);
      if (category) params.append('category', category);
      if (currentQuestionId) params.append('questionId', currentQuestionId);

      const response = await fetch(`/api/recommendations/questions?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          if (type === 'similar') {
            setRecommendations(data.data.questions || []);
          } else {
            setRecommendations(data.data.personalized || []);
            setTrending(data.data.trending || []);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackInteraction = async (action: string, questionId: string, category: string, tags: string[]) => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) return;

      await fetch('/api/recommendations/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          questionId,
          category,
          tags
        })
      });
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      health: '🏥',
      behavior: '🐕',
      feeding: '🍖',
      training: '🎓',
      local: '📍',
      general: '💬'
    };
    return icons[category as keyof typeof icons] || '❓';
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const renderRecommendationCard = (rec: QuestionRecommendation) => (
    <div key={rec.questionId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getCategoryIcon(rec.category)}</span>
          <span className="text-sm font-medium text-gray-600 capitalize">
            {rec.category}
          </span>
          {rec.isUrgent && (
            <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full">
              🚨 Urgent
            </span>
          )}
          {rec.hasExpertAnswer && (
            <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">
              ✅ Expert
            </span>
          )}
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium ${getScoreColor(rec.relevanceScore)}`}>
            {Math.round(rec.relevanceScore * 100)}% match
          </div>
        </div>
      </div>

      <Link
        href={`/community/questions/${rec.questionId}`}
        onClick={() => trackInteraction('view', rec.questionId, rec.category, rec.tags)}
        className="block hover:text-blue-600 transition-colors"
      >
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
          {rec.title}
        </h3>
      </Link>

      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
        <span>{rec.answerCount} answers</span>
        <span>{rec.viewCount} views</span>
        <span>{rec.upvoteCount} upvotes</span>
        <span>{formatDate(rec.createdAt)}</span>
      </div>

      {rec.dog && (
        <div className="flex items-center text-sm text-gray-600 mb-2">
          <span className="mr-1">🐕</span>
          <span>{rec.dog.name} ({rec.dog.breed})</span>
        </div>
      )}

      {rec.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {rec.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {rec.recommendationReason.length > 0 && (
        <div className="border-t border-gray-100 pt-2">
          <div className="text-xs text-blue-600 font-medium mb-1">Why recommended:</div>
          <div className="text-xs text-gray-500">
            {rec.recommendationReason.slice(0, 2).join(' • ')}
          </div>
        </div>
      )}
    </div>
  );

  if (type === 'similar' && currentQuestionId) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">🔍</span>
          Similar Questions
        </h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
            Finding similar questions...
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No similar questions found
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map(renderRecommendationCard)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Recommended for You</h3>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1">
          <button
            onClick={() => setSelectedTab('for-you')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedTab === 'for-you'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            For You ({recommendations.length})
          </button>
          
          <button
            onClick={() => setSelectedTab('trending')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedTab === 'trending'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🔥 Trending ({trending.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
            Loading recommendations...
          </div>
        ) : (
          <div className="space-y-4">
            {selectedTab === 'for-you' && recommendations.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-2">🤔</div>
                <div className="text-gray-600 text-sm">
                  No personalized recommendations yet. Interact with more questions to improve suggestions!
                </div>
              </div>
            )}

            {selectedTab === 'trending' && trending.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-2">📈</div>
                <div className="text-gray-600 text-sm">
                  No trending questions at the moment.
                </div>
              </div>
            )}

            {selectedTab === 'for-you' && recommendations.map(renderRecommendationCard)}
            {selectedTab === 'trending' && trending.map(renderRecommendationCard)}
          </div>
        )}
      </div>
    </div>
  );
}