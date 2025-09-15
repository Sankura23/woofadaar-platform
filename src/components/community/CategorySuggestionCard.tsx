'use client';

import { useState, useEffect } from 'react';

interface CategorySuggestion {
  category: string;
  confidence: number;
  reason: string;
}

interface TagSuggestion {
  tag: string;
  relevance: number;
}

interface CategorySuggestionCardProps {
  title: string;
  content: string;
  currentCategory: string;
  onCategorySelect: (category: string) => void;
  onTagsSelect: (tags: string[]) => void;
  currentTags: string[];
}

export default function CategorySuggestionCard({
  title,
  content,
  currentCategory,
  onCategorySelect,
  onTagsSelect,
  currentTags
}: CategorySuggestionCardProps) {
  const [suggestions, setSuggestions] = useState<{
    primary: CategorySuggestion;
    alternatives: CategorySuggestion[];
    tags: TagSuggestion[];
    confidence: number;
    template: any;
    recommendations: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Debounce suggestions to avoid too many API calls
    const timeoutId = setTimeout(() => {
      if (title.length > 5 || content.length > 10) {
        fetchSuggestions();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [title, content]);

  const fetchSuggestions = async () => {
    if (!title.trim() && !content.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/qa/categories/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          includeTemplates: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuggestions(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching category suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!suggestions && !loading) return null;

  const getCategoryIcon = (category: string) => {
    const icons = {
      health: '🏥',
      behavior: '🐕',
      feeding: '🍖',
      training: '🎓',
      local: '📍',
      general: '💬'
    };
    return icons[category as keyof typeof icons] || '📁';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High confidence';
    if (confidence >= 0.6) return 'Medium confidence';
    return 'Low confidence';
  };

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center mb-3">
        <span className="text-blue-600 mr-2">🤖</span>
        <h3 className="text-sm font-medium text-blue-900">AI Category Suggestions</h3>
        {loading && (
          <div className="ml-2 w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>

      {suggestions && (
        <div className="space-y-4">
          {/* Primary Category Suggestion */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Recommended Category:</span>
              <span className={`text-xs ${getConfidenceColor(suggestions.confidence)}`}>
                {getConfidenceText(suggestions.confidence)}
              </span>
            </div>
            <button
              onClick={() => onCategorySelect(suggestions.primary.category)}
              className={`w-full flex items-center justify-between p-3 rounded-md border-2 transition-all ${
                currentCategory === suggestions.primary.category
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex items-center">
                <span className="mr-2">{getCategoryIcon(suggestions.primary.category)}</span>
                <div className="text-left">
                  <div className="font-medium capitalize">{suggestions.primary.category}</div>
                  <div className="text-xs text-gray-500">{suggestions.primary.reason}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{Math.round(suggestions.primary.confidence * 100)}%</div>
              </div>
            </button>
          </div>

          {/* Alternative Categories */}
          {suggestions.alternatives.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-700 mb-2 block">Alternatives:</span>
              <div className="space-y-1">
                {suggestions.alternatives.slice(0, 2).map((alt) => (
                  <button
                    key={alt.category}
                    onClick={() => onCategorySelect(alt.category)}
                    className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-all ${
                      currentCategory === alt.category
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="mr-2">{getCategoryIcon(alt.category)}</span>
                      <span className="capitalize">{alt.category}</span>
                    </div>
                    <span className="text-xs">{Math.round(alt.confidence * 100)}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tag Suggestions */}
          {suggestions.tags.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-700 mb-2 block">Suggested Tags:</span>
              <div className="flex flex-wrap gap-1">
                {suggestions.tags.slice(0, 4).map((tagSugg) => {
                  const isSelected = currentTags.includes(tagSugg.tag);
                  const canAdd = !isSelected && currentTags.length < 5;
                  
                  return (
                    <button
                      key={tagSugg.tag}
                      onClick={() => {
                        if (isSelected) {
                          onTagsSelect(currentTags.filter(t => t !== tagSugg.tag));
                        } else if (canAdd) {
                          onTagsSelect([...currentTags, tagSugg.tag]);
                        }
                      }}
                      disabled={!isSelected && !canAdd}
                      className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : canAdd
                          ? 'bg-white border border-blue-300 text-blue-600 hover:bg-blue-50'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {tagSugg.tag} {isSelected ? '✓' : '+'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Template Suggestion */}
          {suggestions.template && (
            <div>
              <span className="text-sm font-medium text-gray-700 mb-2 block">Suggested Template:</span>
              <div className="p-3 bg-white rounded-md border border-gray-200">
                <div className="font-medium text-sm">{suggestions.template.template.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  This template can help structure your question for better answers
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {suggestions.recommendations.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-700 mb-2 block">Tips to Improve:</span>
              <ul className="space-y-1">
                {suggestions.recommendations.map((rec, index) => (
                  <li key={index} className="text-xs text-gray-600 flex items-start">
                    <span className="mr-1 mt-0.5">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}