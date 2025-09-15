'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle, Send, ChevronUp } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PointsDisplay from '@/components/gamification/PointsDisplay';
import QuestionRecommendations from '@/components/community/QuestionRecommendations';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
}

interface Question {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  is_resolved: boolean;
  view_count: number;
  upvotes: number;
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
  comments?: Comment[];
}

interface ForumPost {
  id: string;
  title: string;
  content: string;
  tags: string[];
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  user: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    color: string;
  };
}

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  slug: string;
  icon: string;
  color: string;
  post_count: number;
}

export default function CommunityPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'qa' | 'forums'>('qa');
  const [commentingOnId, setCommentingOnId] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [votingQuestionId, setVotingQuestionId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchCommunityData();
  }, []);

  const fetchCommunityData = async () => {
    try {
      setLoading(true);
      
      // Use Promise.allSettled for better error handling and parallel requests
      const [questionsResult, postsResult, categoriesResult] = await Promise.allSettled([
        fetch('/api/community/questions?limit=5&sortBy=created_at&sortOrder=desc', {
          signal: AbortSignal.timeout(10000) // 10 second timeout
        }),
        fetch('/api/community/forums?limit=5&sortBy=created_at&sortOrder=desc', {
          signal: AbortSignal.timeout(10000)
        }),
        fetch('/api/community/forums/categories?isActive=true', {
          signal: AbortSignal.timeout(10000)
        })
      ]);

      // Process questions
      if (questionsResult.status === 'fulfilled') {
        try {
          const questionsData = await questionsResult.value.json();
          if (questionsData.success) {
            setQuestions(questionsData.data.questions || []);
          }
        } catch (error) {
          console.warn('Failed to parse questions data:', error);
          setQuestions([]); // Set empty array as fallback
        }
      } else {
        console.warn('Failed to fetch questions:', questionsResult.reason);
        setQuestions([]);
      }
      
      // Process forum posts
      if (postsResult.status === 'fulfilled') {
        try {
          const postsData = await postsResult.value.json();
          if (postsData.success) {
            setForumPosts(postsData.data.posts || []);
          }
        } catch (error) {
          console.warn('Failed to parse posts data:', error);
          setForumPosts([]);
        }
      } else {
        console.warn('Failed to fetch posts:', postsResult.reason);
        setForumPosts([]);
      }
      
      // Process categories
      if (categoriesResult.status === 'fulfilled') {
        try {
          const categoriesData = await categoriesResult.value.json();
          if (categoriesData.success) {
            setCategories(categoriesData.data.categories || []);
          }
        } catch (error) {
          console.warn('Failed to parse categories data:', error);
          setCategories([]);
        }
      } else {
        console.warn('Failed to fetch categories:', categoriesResult.reason);
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching community data:', error);
      // Set fallback empty states
      setQuestions([]);
      setForumPosts([]);
      setCategories([]);
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
    const categoryMap: { [key: string]: string } = {
      health: '🏥',
      behavior: '🎾',
      feeding: '🍖',
      training: '📚',
      local: '📍',
      general: '🐕'
    };
    return categoryMap[category] || '❓';
  };

  const handleVote = async (questionId: string, type: 'up' | 'down') => {
    if (votingQuestionId === questionId) return; // Prevent double clicking
    
    setVotingQuestionId(questionId);
    try {
      const token = localStorage.getItem('woofadaar_token');
      
      const response = await fetch(`/api/community/questions/${questionId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update the question in the list
        setQuestions(prev => prev.map(q => 
          q.id === questionId 
            ? { ...q, upvotes: data.data.upvotes, downvotes: data.data.downvotes }
            : q
        ));
      } else {
        console.error('Vote failed:', data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setVotingQuestionId(null);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent, questionId: string) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    try {
      const response = await fetch(`/api/community/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        body: JSON.stringify({
          content: commentContent.trim(),
          question_id: questionId
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newComment = data.data.comment;
        
        // Add the new comment to the local state immediately
        setQuestions(prev => prev.map(q => 
          q.id === questionId 
            ? { 
                ...q, 
                comments: [...(q.comments || []), newComment]
              }
            : q
        ));
        
        setCommentContent('');
        setCommentingOnId(null);
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-3 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Community</h1>
            <p className="text-gray-600">Connect with fellow dog parents, ask questions, and share experiences</p>
          </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Link 
            href="/community/ask"
            className="bg-[#3bbca8] hover:bg-[#2daa96] text-white p-4 rounded-lg text-center transition-colors shadow-md hover:shadow-lg"
          >
            <div className="text-2xl mb-2">❓</div>
            <div className="font-semibold">Ask a Question</div>
            <div className="text-sm opacity-90">Get help from the community</div>
          </Link>
          
          <Link 
            href="/community/forums"
            className="bg-[#76519f] hover:bg-[#6a4a8f] text-white p-4 rounded-lg text-center transition-colors shadow-md hover:shadow-lg"
          >
            <div className="text-2xl mb-2">💬</div>
            <div className="font-semibold">Join Discussions</div>
            <div className="text-sm opacity-90">Participate in forum conversations</div>
          </Link>
          
          <Link 
            href="/community/experts"
            className="bg-[#e05a37] hover:bg-[#d04a27] text-white p-4 rounded-lg text-center transition-colors shadow-md hover:shadow-lg"
          >
            <div className="text-2xl mb-2">👨‍⚕️</div>
            <div className="font-semibold">Find Experts</div>
            <div className="text-sm opacity-90">Connect with verified professionals</div>
          </Link>
          
          <Link 
            href="/community/success-stories"
            className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-center transition-colors shadow-md hover:shadow-lg"
          >
            <div className="text-2xl mb-2">🏆</div>
            <div className="font-semibold">Success Stories</div>
            <div className="text-sm opacity-90">Celebrate inspiring journeys</div>
          </Link>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm mb-6">
          <button
            onClick={() => setActiveTab('qa')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'qa'
                ? 'bg-[#3bbca8] text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Q&A ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab('forums')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'forums'
                ? 'bg-[#76519f] text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Forums ({forumPosts.length})
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'qa' ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Questions</h2>
                  <Link 
                    href="/community/questions"
                    className="text-[#3bbca8] hover:text-[#2daa96] text-sm font-medium"
                  >
                    View all →
                  </Link>
                </div>
                
                {questions.length === 0 ? (
                  <div className="bg-white rounded-lg p-8 text-center shadow-sm">
                    <div className="text-4xl mb-4">❓</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No questions yet</h3>
                    <p className="text-gray-600 mb-4">Be the first to ask a question and help build our community!</p>
                                         <Link 
                       href="/community/ask"
                       className="inline-flex items-center px-4 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] transition-colors"
                     >
                       Ask a Question
                     </Link>
                  </div>
                ) : (
                  questions.map((question) => (
                    <div key={question.id} className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            {question.user.profile_image_url ? (
                              <img 
                                src={question.user.profile_image_url} 
                                alt={question.user.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-gray-500 text-lg">👤</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
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
                          
                          <h3 
                            className="text-lg font-medium text-gray-900 mb-2 hover:text-[#3bbca8] cursor-pointer"
                            onClick={() => router.push(`/community/questions/${question.id}`)}
                          >
                            {question.title}
                          </h3>
                          
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {question.content}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center">
                                <span className="mr-1">{getCategoryIcon(question.category)}</span>
                                {question.category}
                              </span>
                              <span>{question.answer_count} answers</span>
                              <span>{question.view_count} views</span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVote(question.id, 'up');
                                }}
                                disabled={votingQuestionId === question.id}
                                className="group flex flex-col items-center px-2 py-1 text-gray-500 hover:text-[#3bbca8] rounded-lg transition-all duration-200 disabled:opacity-50 min-h-[44px] min-w-[44px] justify-center hover:bg-gradient-to-t hover:from-[#3bbca8]/5 hover:to-[#3bbca8]/20"
                              >
                                <div className="relative">
                                  <ChevronUp className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#3bbca8] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 animate-pulse"></div>
                                </div>
                                <span className="text-xs font-bold group-hover:text-[#2daa96] transition-colors duration-200">{question.upvotes}</span>
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCommentingOnId(commentingOnId === question.id ? null : question.id);
                                }}
                                className="flex items-center space-x-1 px-3 py-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors min-h-[44px] min-w-[44px] justify-center"
                              >
                                <MessageCircle className="w-4 h-4" />
                                <span className="text-sm">Comment</span>
                              </button>
                            </div>
                          </div>
                          
                          {question.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {question.tags.slice(0, 3).map((tag) => (
                                <span 
                                  key={tag}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#3bbca8]/10 text-[#3bbca8] border border-[#3bbca8]/20"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {/* Comment Form */}
                          {commentingOnId === question.id && (
                            <div className="mt-4 pt-4 border-t">
                              <form onSubmit={(e) => handleSubmitComment(e, question.id)}>
                                <div className="flex space-x-2">
                                  <input
                                    type="text"
                                    value={commentContent}
                                    onChange={(e) => setCommentContent(e.target.value)}
                                    placeholder="Write a comment..."
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent min-h-[44px]"
                                    autoFocus
                                  />
                                  <button
                                    type="submit"
                                    disabled={!commentContent.trim()}
                                    className="px-4 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 min-h-[44px]"
                                  >
                                    <Send className="w-4 h-4" />
                                    <span className="hidden sm:inline">Send</span>
                                  </button>
                                </div>
                                <div className="flex justify-end mt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCommentingOnId(null);
                                      setCommentContent('');
                                    }}
                                    className="text-sm text-gray-600 hover:text-gray-800"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            </div>
                          )}
                          
                          {/* Comments Display */}
                          {question.comments && question.comments.length > 0 && (
                            <div className="mt-4 pt-4 border-t space-y-3">
                              <div className="flex items-center space-x-2">
                                <MessageCircle className="w-4 h-4 text-gray-500" />
                                <h4 className="font-medium text-gray-900 text-sm">
                                  Comments ({question.comments.length})
                                </h4>
                              </div>
                              
                              {question.comments.map((comment) => (
                                <div key={comment.id} className="flex items-start space-x-3 bg-gray-50 rounded-lg p-3">
                                  <div className="flex-shrink-0">
                                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                                      {comment.user.profile_image_url ? (
                                        <img 
                                          src={comment.user.profile_image_url} 
                                          alt={comment.user.name}
                                          className="w-6 h-6 rounded-full object-cover"
                                        />
                                      ) : (
                                        <span className="text-gray-500 text-xs">👤</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="text-sm font-medium text-gray-900">{comment.user.name}</span>
                                      <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                                    </div>
                                    <p className="text-sm text-gray-700">{comment.content}</p>
                                  </div>
                                </div>
                              ))}
                              
                              {/* View more comments link if applicable */}
                              {question.comments.length >= 3 && (
                                <button
                                  onClick={() => router.push(`/community/questions/${question.id}`)}
                                  className="text-sm text-[#3bbca8] hover:text-[#2daa96] font-medium"
                                >
                                  View all comments →
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Forum Posts</h2>
                  <Link 
                    href="/community/forums"
                    className="text-[#76519f] hover:text-[#6a4a8f] text-sm font-medium"
                  >
                    View all →
                  </Link>
                </div>
                
                {forumPosts.length === 0 ? (
                  <div className="bg-white rounded-lg p-8 text-center shadow-sm">
                    <div className="text-4xl mb-4">💬</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No forum posts yet</h3>
                    <p className="text-gray-600 mb-4">Start a discussion and engage with the community!</p>
                                         <Link 
                       href="/community/forums"
                       className="inline-flex items-center px-4 py-2 bg-[#76519f] text-white rounded-md hover:bg-[#6a4a8f] transition-colors"
                     >
                       Start Discussion
                     </Link>
                  </div>
                ) : (
                  forumPosts.map((post) => (
                    <div key={post.id} className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            {post.user.profile_image_url ? (
                              <img 
                                src={post.user.profile_image_url} 
                                alt={post.user.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-gray-500 text-lg">👤</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {post.user.name}
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatDate(post.created_at)}
                            </span>
                            <span 
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                              style={{ backgroundColor: `${post.category.color}20`, color: post.category.color }}
                            >
                              {post.category.icon} {post.category.name}
                            </span>
                          </div>
                          
                          <h3 
                            className="text-lg font-medium text-gray-900 mb-2 hover:text-[#76519f] cursor-pointer"
                            onClick={() => router.push(`/community/forums/${post.id}`)}
                          >
                            {post.title}
                          </h3>
                          
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {post.content}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{post.comment_count} comments</span>
                            <span>{post.like_count} likes</span>
                            <span>{post.view_count} views</span>
                          </div>
                          
                          {post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {post.tags.slice(0, 3).map((tag) => (
                                                             <span 
                               key={tag}
                               className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#76519f]/10 text-[#76519f] border border-[#76519f]/20"
                             >
                               {tag}
                             </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Points Display */}
            <PointsDisplay showTransactions={true} />
            
            {/* Question Recommendations */}
            <QuestionRecommendations />
            
            {/* Forum Categories */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Forum Categories</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/community/forums?categoryId=${category.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{category.icon}</span>
                      <div>
                        <div className="font-medium text-gray-900">{category.name}</div>
                        <div className="text-sm text-gray-500">{category.description}</div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{category.post_count}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Community Stats */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Community Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                                 <div className="text-center">
                   <div className="text-2xl font-bold text-[#3bbca8]">{questions.length}</div>
                   <div className="text-sm text-gray-600">Questions</div>
                 </div>
                 <div className="text-center">
                   <div className="text-2xl font-bold text-[#76519f]">{forumPosts.length}</div>
                   <div className="text-sm text-gray-600">Forum Posts</div>
                 </div>
                 <div className="text-center">
                   <div className="text-2xl font-bold text-[#e05a37]">{categories.length}</div>
                   <div className="text-sm text-gray-600">Categories</div>
                 </div>
                 <div className="text-center">
                   <div className="text-2xl font-bold text-[#ffa602]">0</div>
                   <div className="text-sm text-gray-600">Experts</div>
                 </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link 
                  href="/community/experts"
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span>👨‍⚕️</span>
                  <span className="text-gray-700">Find Experts</span>
                </Link>
                <Link 
                  href="/community/leaderboard"
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span>🏆</span>
                  <span className="text-gray-700">Leaderboard</span>
                </Link>
                <Link 
                  href="/community/guidelines"
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span>📋</span>
                  <span className="text-gray-700">Community Guidelines</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
} 