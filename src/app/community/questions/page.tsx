'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Filter, Plus, Eye, ThumbsUp, MessageCircle } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface Question {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  is_resolved: boolean;
  view_count: number;
  upvotes: number;
  downvotes: number;
  answer_count: number;
  created_at: string;
  user: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
  dog?: {
    id: string;
    name: string;
    breed: string;
    photo_url?: string;
  };
}

export default function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'health', label: 'Health', icon: '🏥' },
    { value: 'behavior', label: 'Behavior', icon: '🎾' },
    { value: 'feeding', label: 'Feeding', icon: '🍖' },
    { value: 'training', label: 'Training', icon: '📚' },
    { value: 'local', label: 'Local', icon: '📍' },
    { value: 'general', label: 'General', icon: '🐕' }
  ];

  const sortOptions = [
    { value: 'created_at', label: 'Newest First' },
    { value: 'upvotes', label: 'Most Upvoted' },
    { value: 'answer_count', label: 'Most Answered' },
    { value: 'view_count', label: 'Most Viewed' }
  ];

  useEffect(() => {
    fetchQuestions();
  }, [searchTerm, selectedCategory, sortBy, sortOrder]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category', selectedCategory);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('limit', '20');

      const response = await fetch(`/api/community/questions?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setQuestions(data.data.questions);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
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

  const getCategoryIcon = (category: string) => {
    const found = categories.find(cat => cat.value === category);
    return found?.icon || '❓';
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-milk-white via-gray-50 to-gray-100 min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="bg-gradient-to-br from-milk-white via-gray-50 to-gray-100 min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <button
                onClick={() => router.push('/community')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Community</span>
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">All Questions</h1>
                <p className="text-gray-600">Browse and answer community questions</p>
              </div>
              
              <Link
                href="/community/ask"
                className="mt-4 sm:mt-0 inline-flex items-center space-x-2 px-4 py-2 bg-[#3bbca8] text-white rounded-lg hover:bg-[#2daa96] transition-colors min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Ask Question</span>
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent min-h-[44px]"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent min-h-[44px]"
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.icon && `${category.icon} `}{category.label}
                  </option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent min-h-[44px]"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={`${option.value}-desc`}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {questions.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center shadow-sm">
                <div className="text-6xl mb-4">❓</div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No questions found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || selectedCategory
                    ? 'Try adjusting your filters or search terms.'
                    : 'Be the first to ask a question and help build our community!'
                  }
                </p>
                <Link
                  href="/community/ask"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-[#3bbca8] text-white rounded-lg hover:bg-[#2daa96] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ask a Question</span>
                </Link>
              </div>
            ) : (
              questions.map((question) => (
                <div key={question.id} className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-4">
                    {/* User Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        {question.user.profile_image_url ? (
                          <img 
                            src={question.user.profile_image_url} 
                            alt={question.user.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-500 text-lg">👤</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Question Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {question.user.name}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(question.created_at)}
                        </span>
                        {question.is_resolved && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Resolved
                          </span>
                        )}
                      </div>
                      
                      {/* Title */}
                      <h3 
                        className="text-xl font-semibold text-gray-900 mb-2 hover:text-[#3bbca8] cursor-pointer"
                        onClick={() => router.push(`/community/questions/${question.id}`)}
                      >
                        {question.title}
                      </h3>
                      
                      {/* Content Preview */}
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {question.content}
                      </p>
                      
                      {/* Meta Info */}
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                        <span className="flex items-center">
                          <span className="mr-1">{getCategoryIcon(question.category)}</span>
                          {question.category}
                        </span>
                        <span className="flex items-center">
                          <MessageCircle className="w-4 h-4 mr-1" />
                          {question.answer_count} answers
                        </span>
                        <span className="flex items-center">
                          <Eye className="w-4 h-4 mr-1" />
                          {question.view_count} views
                        </span>
                        <span className="flex items-center">
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          {question.upvotes} upvotes
                        </span>
                      </div>
                      
                      {/* Dog Info */}
                      {question.dog && (
                        <div className="flex items-center space-x-2 mb-3 p-2 bg-gray-50 rounded-lg">
                          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                            {question.dog.photo_url ? (
                              <img 
                                src={question.dog.photo_url} 
                                alt={question.dog.name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-gray-500 text-xs">🐕</span>
                            )}
                          </div>
                          <span className="text-sm text-gray-700">
                            About {question.dog.name} ({question.dog.breed})
                          </span>
                        </div>
                      )}
                      
                      {/* Tags */}
                      {question.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {question.tags.slice(0, 4).map((tag) => (
                            <span 
                              key={tag}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#3bbca8]/10 text-[#3bbca8] border border-[#3bbca8]/20"
                            >
                              {tag}
                            </span>
                          ))}
                          {question.tags.length > 4 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-gray-500">
                              +{question.tags.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}