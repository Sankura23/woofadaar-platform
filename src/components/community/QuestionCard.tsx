'use client';

import { useState } from 'react';
import Link from 'next/link';

interface QuestionCardProps {
  question: {
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
      profile_image_url?: string;
    };
  };
  onUpvote?: (questionId: string) => void;
  onDownvote?: (questionId: string) => void;
}

export default function QuestionCard({ question, onUpvote, onDownvote }: QuestionCardProps) {
  const [isUpvoted, setIsUpvoted] = useState(false);
  const [isDownvoted, setIsDownvoted] = useState(false);

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

  const handleUpvote = () => {
    if (isDownvoted) {
      setIsDownvoted(false);
    }
    setIsUpvoted(!isUpvoted);
    onUpvote?.(question.id);
  };

  const handleDownvote = () => {
    if (isUpvoted) {
      setIsUpvoted(false);
    }
    setIsDownvoted(!isDownvoted);
    onDownvote?.(question.id);
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-3">
        {/* User Avatar */}
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
          <Link href={`/community/questions/${question.id}`}>
            <h3 className="text-lg font-medium text-gray-900 mb-2 hover:text-blue-600 cursor-pointer">
              {question.title}
            </h3>
          </Link>
          
          {/* Content Preview */}
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {question.content}
          </p>
          
          {/* Stats */}
          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
            <span className="flex items-center">
              <span className="mr-1">{getCategoryIcon(question.category)}</span>
              {question.category}
            </span>
            <span>{question.answer_count} answers</span>
            <span>{question.view_count} views</span>
            <span>{question.upvotes} upvotes</span>
          </div>
          
          {/* Tags */}
          {question.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {question.tags.slice(0, 3).map((tag) => (
                <span 
                  key={tag}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
                         <button
               onClick={handleUpvote}
               className={`flex items-center space-x-1 text-sm transition-colors ${
                 isUpvoted ? 'text-[#3bbca8]' : 'text-gray-500 hover:text-[#3bbca8]'
               }`}
             >
               <span>👍</span>
               <span>Upvote</span>
             </button>
            
                         <button
               onClick={handleDownvote}
               className={`flex items-center space-x-1 text-sm transition-colors ${
                 isDownvoted ? 'text-[#e05a37]' : 'text-gray-500 hover:text-[#e05a37]'
               }`}
             >
               <span>👎</span>
               <span>Downvote</span>
             </button>
            
                         <Link 
               href={`/community/questions/${question.id}`}
               className="flex items-center space-x-1 text-sm text-gray-500 hover:text-[#76519f] transition-colors"
             >
               <span>💬</span>
               <span>Answer</span>
             </Link>
            
                         <button className="flex items-center space-x-1 text-sm text-gray-500 hover:text-[#e05a37] transition-colors">
               <span>🚩</span>
               <span>Report</span>
             </button>
          </div>
        </div>
      </div>
    </div>
  );
} 