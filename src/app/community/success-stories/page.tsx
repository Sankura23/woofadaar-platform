'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface SuccessStory {
  id: string;
  title: string;
  content: string;
  tags: string[];
  view_count: number;
  like_count: number;
  comment_count: number;
  is_featured: boolean;
  photo_url?: string;
  created_at: string;
  user: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
}

export default function SuccessStoriesPage() {
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [featuredStories, setFeaturedStories] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuccessStories();
  }, []);

  const fetchSuccessStories = async () => {
    try {
      setLoading(true);
      
      // Fetch success stories from the forum posts with success-stories category
      const response = await fetch('/api/community/forums?category=success-stories&sortBy=created_at&sortOrder=desc&limit=50');
      const data = await response.json();
      
      if (data.success) {
        const allStories = data.data.posts;
        setStories(allStories.filter((story: SuccessStory) => !story.is_featured));
        setFeaturedStories(allStories.filter((story: SuccessStory) => story.is_featured));
      }
    } catch (error) {
      console.error('Error fetching success stories:', error);
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

  const renderStoryCard = (story: SuccessStory, featured = false) => (
    <div key={story.id} className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow ${featured ? 'border-2 border-yellow-200' : ''}`}>
      {story.photo_url && (
        <div className="aspect-video w-full overflow-hidden rounded-t-lg">
          <img 
            src={story.photo_url} 
            alt={story.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="p-6">
        {featured && (
          <div className="flex items-center mb-3">
            <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
              ⭐ Featured Story
            </span>
          </div>
        )}
        
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            {story.user.profile_image_url ? (
              <img 
                src={story.user.profile_image_url} 
                alt={story.user.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-gray-500 text-lg">👤</span>
            )}
          </div>
          <div>
            <div className="font-medium text-gray-900">{story.user.name}</div>
            <div className="text-sm text-gray-500">{formatDate(story.created_at)}</div>
          </div>
        </div>
        
        <Link href={`/community/forums/${story.id}`}>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 hover:text-[#76519f] cursor-pointer line-clamp-2">
            {story.title}
          </h3>
        </Link>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {story.content}
        </p>
        
        {story.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {story.tags.slice(0, 3).map((tag) => (
              <span 
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <span>❤️</span>
              <span>{story.like_count}</span>
            </span>
            <span className="flex items-center space-x-1">
              <span>💬</span>
              <span>{story.comment_count}</span>
            </span>
            <span className="flex items-center space-x-1">
              <span>👁️</span>
              <span>{story.view_count}</span>
            </span>
          </div>
          <Link 
            href={`/community/forums/${story.id}`}
            className="text-[#76519f] hover:text-[#6a4a8f] font-medium"
          >
            Read More →
          </Link>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
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
      <div className="bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <Link href="/community" className="hover:text-[#76519f]">Community</Link>
              <span>›</span>
              <span className="text-gray-900">Success Stories</span>
            </nav>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Success Stories</h1>
                <p className="text-gray-600">Celebrate achievements and inspiring journeys from our dog parent community</p>
              </div>
              <Link 
                href="/community/forums/create?category=success-stories"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <span className="mr-2">🏆</span>
                Share Your Story
              </Link>
            </div>
          </div>

          {/* Featured Stories */}
          {featuredStories.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="mr-2">⭐</span>
                Featured Success Stories
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {featuredStories.map((story) => renderStoryCard(story, true))}
              </div>
            </div>
          )}

          {/* All Success Stories */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Community Success Stories ({stories.length})
            </h2>
            
            {stories.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center shadow-sm">
                <div className="text-4xl mb-4">🏆</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No success stories yet</h3>
                <p className="text-gray-600 mb-6">
                  Be the first to share your inspiring journey with the community!
                </p>
                <Link 
                  href="/community/forums/create?category=success-stories"
                  className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  <span className="mr-2">🏆</span>
                  Share Your Success Story
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stories.map((story) => renderStoryCard(story))}
              </div>
            )}
          </div>

          {/* Call to Action */}
          <div className="mt-12 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🌟</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Have a Success Story to Share?</h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Whether it's a training breakthrough, health recovery, rescue story, or special bond - 
              your experience could inspire and help other dog parents in their journey.
            </p>
            <Link 
              href="/community/forums/create?category=success-stories"
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <span className="mr-2">✏️</span>
              Share Your Story
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}