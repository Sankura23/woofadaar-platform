'use client';

import { useState, useEffect } from 'react';

interface TopicActionsProps {
  topicId: string;
  className?: string;
}

export default function TopicActions({ topicId, className = '' }: TopicActionsProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState({ subscribe: false, bookmark: false });

  useEffect(() => {
    fetchStatus();
  }, [topicId]);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const [subscriptionResponse, bookmarkResponse] = await Promise.all([
        fetch(`/api/community/forums/${topicId}/subscribe`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/community/forums/${topicId}/bookmark`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const subscriptionData = await subscriptionResponse.json();
      const bookmarkData = await bookmarkResponse.json();

      if (subscriptionData.success) {
        setIsSubscribed(subscriptionData.data.isSubscribed);
      }
      if (bookmarkData.success) {
        setIsBookmarked(bookmarkData.data.isBookmarked);
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const handleSubscribe = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    setLoading(prev => ({ ...prev, subscribe: true }));

    try {
      const method = isSubscribed ? 'DELETE' : 'POST';
      const response = await fetch(`/api/community/forums/${topicId}/subscribe`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setIsSubscribed(!isSubscribed);
      }
    } catch (error) {
      console.error('Error toggling subscription:', error);
    } finally {
      setLoading(prev => ({ ...prev, subscribe: false }));
    }
  };

  const handleBookmark = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    setLoading(prev => ({ ...prev, bookmark: true }));

    try {
      const method = isBookmarked ? 'DELETE' : 'POST';
      const response = await fetch(`/api/community/forums/${topicId}/bookmark`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setIsBookmarked(!isBookmarked);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setLoading(prev => ({ ...prev, bookmark: false }));
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <button
        onClick={handleSubscribe}
        disabled={loading.subscribe}
        className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
          isSubscribed
            ? 'bg-[#76519f] text-white hover:bg-[#6a4a8f]'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        } ${loading.subscribe ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isSubscribed ? 'Unsubscribe from topic' : 'Subscribe to get notifications'}
      >
        <span className="mr-1">
          {loading.subscribe ? '⏳' : isSubscribed ? '🔔' : '🔕'}
        </span>
        {isSubscribed ? 'Subscribed' : 'Subscribe'}
      </button>

      <button
        onClick={handleBookmark}
        disabled={loading.bookmark}
        className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
          isBookmarked
            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        } ${loading.bookmark ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isBookmarked ? 'Remove bookmark' : 'Bookmark this post'}
      >
        <span className="mr-1">
          {loading.bookmark ? '⏳' : isBookmarked ? '🔖' : '📑'}
        </span>
        {isBookmarked ? 'Bookmarked' : 'Bookmark'}
      </button>
    </div>
  );
}