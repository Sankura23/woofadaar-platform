'use client';

import { useState, useEffect } from 'react';

interface VotingButtonsProps {
  questionId?: string;
  answerId?: string;
  initialUpvotes?: number;
  initialDownvotes?: number;
  initialUserVote?: 'up' | 'down' | null;
  size?: 'sm' | 'md' | 'lg';
  showCounts?: boolean;
  disabled?: boolean;
  onVoteChange?: (upvotes: number, downvotes: number, userVote: 'up' | 'down' | null) => void;
}

export default function VotingButtons({
  questionId,
  answerId,
  initialUpvotes = 0,
  initialDownvotes = 0,
  initialUserVote = null,
  size = 'md',
  showCounts = true,
  disabled = false,
  onVoteChange
}: VotingButtonsProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(initialUserVote);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUpvotes(initialUpvotes);
    setDownvotes(initialDownvotes);
    setUserVote(initialUserVote);
  }, [initialUpvotes, initialDownvotes, initialUserVote]);

  const handleVote = async (type: 'up' | 'down') => {
    if (disabled || loading || (!questionId && !answerId)) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('woofadaar_token');
      
      if (!token) {
        alert('Please log in to vote');
        return;
      }

      const endpoint = questionId 
        ? `/api/community/questions/${questionId}/vote`
        : `/api/community/answers/${answerId}/vote`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUpvotes(data.data.upvotes);
        setDownvotes(data.data.downvotes);
        setUserVote(data.data.userVote);
        onVoteChange?.(data.data.upvotes, data.data.downvotes, data.data.userVote);
      } else {
        throw new Error(data.error || 'Failed to vote');
      }
    } catch (error) {
      console.error('Error voting:', error);
      alert(error instanceof Error ? error.message : 'Failed to vote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: {
      button: 'p-1 text-xs',
      icon: 'w-3 h-3',
      count: 'text-xs'
    },
    md: {
      button: 'p-2 text-sm',
      icon: 'w-4 h-4',
      count: 'text-sm'
    },
    lg: {
      button: 'p-3 text-base',
      icon: 'w-5 h-5',
      count: 'text-base'
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <div className="flex items-center gap-1">
      {/* Upvote button */}
      <button
        onClick={() => handleVote('up')}
        disabled={disabled || loading}
        className={`
          ${currentSize.button}
          flex items-center gap-1 rounded-full transition-colors
          ${userVote === 'up' 
            ? 'bg-green-100 text-green-600 hover:bg-green-200' 
            : 'text-gray-500 hover:bg-gray-100 hover:text-green-600'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        title="Upvote"
      >
        <svg 
          className={currentSize.icon} 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path d="M10 3l7 7H3l7-7z" />
        </svg>
        {showCounts && (
          <span className={`font-medium ${currentSize.count}`}>
            {upvotes}
          </span>
        )}
      </button>

      {/* Downvote button */}
      <button
        onClick={() => handleVote('down')}
        disabled={disabled || loading}
        className={`
          ${currentSize.button}
          flex items-center gap-1 rounded-full transition-colors
          ${userVote === 'down' 
            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
            : 'text-gray-500 hover:bg-gray-100 hover:text-red-600'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        title="Downvote"
      >
        <svg 
          className={currentSize.icon} 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path d="M10 17L3 10h14l-7 7z" />
        </svg>
        {showCounts && (
          <span className={`font-medium ${currentSize.count}`}>
            {downvotes}
          </span>
        )}
      </button>

      {/* Net score (optional) */}
      {!showCounts && (
        <span className={`text-gray-600 font-medium ${currentSize.count} ml-1`}>
          {upvotes - downvotes}
        </span>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#3bbca8] border-t-transparent ml-1"></div>
      )}
    </div>
  );
}