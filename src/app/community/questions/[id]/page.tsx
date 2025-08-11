'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Heart, MessageCircle, Flag, Share2, Eye, ChevronUp, ChevronDown } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface User {
  id: string;
  name: string;
  profile_image_url?: string;
  reputation?: number;
}

interface Dog {
  id: string;
  name: string;
  breed: string;
  photo_url?: string;
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
  downvotes: number;
  answer_count: number;
  photo_url?: string;
  location?: string;
  created_at: string;
  user: User;
  dog?: Dog;
  answers: Answer[];
  comments: Comment[];
}

interface Answer {
  id: string;
  content: string;
  is_best_answer: boolean;
  upvotes: number;
  downvotes: number;
  is_verified_expert: boolean;
  photo_url?: string;
  created_at: string;
  user: User;
  comments: Comment[];
}

interface Comment {
  id: string;
  content: string;
  upvotes: number;
  created_at: string;
  user: User;
}

export default function QuestionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const questionId = params?.id as string;
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [answerContent, setAnswerContent] = useState('');
  const [commentingOnId, setCommentingOnId] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (questionId) {
      fetchQuestion();
    }
  }, [questionId]);

  const fetchQuestion = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/community/questions/${questionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQuestion(data.data.question);
        
        // Increment view count
        await fetch(`/api/community/questions/${questionId}/view`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
          }
        });
      } else if (response.status === 404) {
        router.push('/community');
      }
    } catch (error) {
      console.error('Error fetching question:', error);
      router.push('/community');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (type: 'up' | 'down') => {
    if (!question) return;
    
    try {
      const response = await fetch(`/api/community/questions/${questionId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        body: JSON.stringify({ type })
      });

      if (response.ok) {
        const data = await response.json();
        setQuestion(prev => prev ? {
          ...prev,
          upvotes: data.upvotes,
          downvotes: data.downvotes
        } : null);
        setUserVote(data.userVote);
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerContent.trim() || submittingAnswer) return;

    setSubmittingAnswer(true);
    try {
      const response = await fetch(`/api/community/questions/${questionId}/answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        body: JSON.stringify({
          content: answerContent.trim()
        })
      });

      if (response.ok) {
        setAnswerContent('');
        fetchQuestion(); // Refresh to get new answer
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent, targetType: 'question' | 'answer', targetId: string) => {
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
          [targetType === 'question' ? 'question_id' : 'answer_id']: targetId
        })
      });

      if (response.ok) {
        setCommentContent('');
        setCommentingOnId(null);
        fetchQuestion(); // Refresh to get new comment
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
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

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-milk-white via-gray-50 to-gray-100 min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="bg-gradient-to-br from-milk-white via-gray-50 to-gray-100 min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Question not found</h1>
          <button
            onClick={() => router.push('/community')}
            className="text-[#3bbca8] hover:text-[#2daa96]"
          >
            ← Back to Community
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="bg-gradient-to-br from-milk-white via-gray-50 to-gray-100 min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* Question */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            {/* Question Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  {question.user.profile_image_url ? (
                    <img 
                      src={question.user.profile_image_url} 
                      alt={question.user.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-500 text-xl">👤</span>
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{question.user.name}</div>
                  <div className="text-sm text-gray-500">{formatDate(question.created_at)}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="flex items-center text-sm text-gray-500">
                  <Eye className="w-4 h-4 mr-1" />
                  {question.view_count}
                </span>
                {question.is_resolved && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ Resolved
                  </span>
                )}
              </div>
            </div>

            {/* Question Content */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{question.title}</h1>
            
            <div className="flex items-center space-x-4 mb-4">
              <span className="flex items-center text-sm text-gray-600">
                <span className="mr-1">{getCategoryIcon(question.category)}</span>
                {question.category}
              </span>
              {question.location && (
                <span className="text-sm text-gray-600">📍 {question.location}</span>
              )}
            </div>

            <div className="prose prose-sm max-w-none mb-4">
              <p className="text-gray-700">{question.content}</p>
            </div>

            {question.photo_url && (
              <img
                src={question.photo_url}
                alt="Question photo"
                className="rounded-lg max-w-full h-auto mb-4"
              />
            )}

            {/* Dog Info */}
            {question.dog && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    {question.dog.photo_url ? (
                      <img 
                        src={question.dog.photo_url} 
                        alt={question.dog.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-500">🐕</span>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{question.dog.name}</div>
                    <div className="text-sm text-gray-600">{question.dog.breed}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            {question.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {question.tags.map((tag) => (
                  <span 
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#3bbca8]/10 text-[#3bbca8] border border-[#3bbca8]/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Voting and Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleVote('up')}
                    className={`group flex flex-col items-center px-2 py-1 rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px] justify-center ${
                      userVote === 'up' 
                        ? 'text-[#3bbca8] bg-gradient-to-t from-[#3bbca8]/10 to-[#3bbca8]/30' 
                        : 'text-gray-500 hover:text-[#3bbca8] hover:bg-gradient-to-t hover:from-[#3bbca8]/5 hover:to-[#3bbca8]/20'
                    }`}
                  >
                    <div className="relative">
                      <ChevronUp className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                      {userVote !== 'up' && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#3bbca8] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 animate-pulse"></div>
                      )}
                    </div>
                  </button>
                  <span className="text-sm font-bold text-gray-700 min-w-[2rem] text-center">{question.upvotes}</span>
                  <button
                    onClick={() => handleVote('down')}
                    className={`group flex flex-col items-center px-2 py-1 rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px] justify-center ${
                      userVote === 'down' 
                        ? 'text-red-600 bg-gradient-to-b from-red-100 to-red-200' 
                        : 'text-gray-500 hover:text-red-600 hover:bg-gradient-to-b hover:from-red-50 hover:to-red-100'
                    }`}
                  >
                    <div className="relative">
                      <ChevronDown className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                      {userVote !== 'down' && (
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 animate-pulse"></div>
                      )}
                    </div>
                  </button>
                </div>
                
                <button
                  onClick={() => setCommentingOnId(commentingOnId === question.id ? null : question.id)}
                  className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">Comment</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                  <Share2 className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                  <Flag className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Comment Form */}
            {commentingOnId === question.id && (
              <div className="mt-4 pt-4 border-t">
                <form onSubmit={(e) => handleSubmitComment(e, 'question', question.id)}>
                  <textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent resize-none min-h-[44px]"
                    rows={2}
                  />
                  <div className="flex justify-end space-x-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCommentingOnId(null);
                        setCommentContent('');
                      }}
                      className="px-3 py-1 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!commentContent.trim()}
                      className="px-4 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Comment
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Comments */}
            {question.comments && question.comments.length > 0 && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <h4 className="font-medium text-gray-900">Comments</h4>
                {question.comments.map((comment) => (
                  <div key={comment.id} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      {comment.user.profile_image_url ? (
                        <img 
                          src={comment.user.profile_image_url} 
                          alt={comment.user.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-500 text-sm">👤</span>
                      )}
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
              </div>
            )}
          </div>

          {/* Answers Section */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Answers ({question.answers?.length || 0})
            </h2>

            {/* Answer Form */}
            <form onSubmit={handleSubmitAnswer} className="mb-6">
              <textarea
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                placeholder="Write your answer..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent resize-none min-h-[44px]"
                rows={4}
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={!answerContent.trim() || submittingAnswer}
                  className="px-6 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {submittingAnswer ? 'Submitting...' : 'Submit Answer'}
                </button>
              </div>
            </form>

            {/* Answers List */}
            {question.answers && question.answers.length > 0 ? (
              <div className="space-y-6">
                {question.answers.map((answer) => (
                  <div key={answer.id} className="border-l-4 border-gray-200 pl-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        {answer.user.profile_image_url ? (
                          <img 
                            src={answer.user.profile_image_url} 
                            alt={answer.user.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-500">👤</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{answer.user.name}</span>
                          {answer.is_verified_expert && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              ✓ Expert
                            </span>
                          )}
                          {answer.is_best_answer && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ Best Answer
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{formatDate(answer.created_at)}</div>
                      </div>
                    </div>

                    <div className="prose prose-sm max-w-none mb-3">
                      <p className="text-gray-700">{answer.content}</p>
                    </div>

                    {answer.photo_url && (
                      <img
                        src={answer.photo_url}
                        alt="Answer photo"
                        className="rounded-lg max-w-sm h-auto mb-3"
                      />
                    )}

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <button className="group flex flex-col items-center px-2 py-1 text-gray-500 hover:text-[#3bbca8] rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px] justify-center hover:bg-gradient-to-t hover:from-[#3bbca8]/5 hover:to-[#3bbca8]/20">
                          <div className="relative">
                            <ChevronUp className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                            <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-[#3bbca8] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 animate-pulse"></div>
                          </div>
                        </button>
                        <span className="text-sm font-medium text-gray-700 min-w-[1.5rem] text-center">{answer.upvotes}</span>
                        <button className="group flex flex-col items-center px-2 py-1 text-gray-500 hover:text-red-600 rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px] justify-center hover:bg-gradient-to-b hover:from-red-50 hover:to-red-100">
                          <div className="relative">
                            <ChevronDown className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                            <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 animate-pulse"></div>
                          </div>
                        </button>
                      </div>

                      <button
                        onClick={() => setCommentingOnId(commentingOnId === answer.id ? null : answer.id)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Comment
                      </button>
                    </div>

                    {/* Answer Comment Form */}
                    {commentingOnId === answer.id && (
                      <div className="mt-3">
                        <form onSubmit={(e) => handleSubmitComment(e, 'answer', answer.id)}>
                          <textarea
                            value={commentContent}
                            onChange={(e) => setCommentContent(e.target.value)}
                            placeholder="Write a comment..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent resize-none min-h-[44px]"
                            rows={2}
                          />
                          <div className="flex justify-end space-x-2 mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setCommentingOnId(null);
                                setCommentContent('');
                              }}
                              className="px-3 py-1 text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={!commentContent.trim()}
                              className="px-4 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Comment
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Answer Comments */}
                    {answer.comments && answer.comments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {answer.comments.map((comment) => (
                          <div key={comment.id} className="flex items-start space-x-2 ml-4">
                            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
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
                            <div className="flex-1">
                              <div className="flex items-center space-x-1">
                                <span className="text-xs font-medium text-gray-900">{comment.user.name}</span>
                                <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                              </div>
                              <p className="text-xs text-gray-700">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No answers yet. Be the first to help!
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}