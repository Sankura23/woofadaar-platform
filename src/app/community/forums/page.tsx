'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

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

export default function ForumsPage() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    fetchForumData();
  }, [selectedCategory]);

  const fetchForumData = async () => {
    try {
      setLoading(true);
      
      // Fetch forum posts
      const postsUrl = `/api/community/forums?limit=20&sortBy=created_at&sortOrder=desc${selectedCategory ? `&categoryId=${selectedCategory}` : ''}`;
      const postsResponse = await fetch(postsUrl);
      const postsData = await postsResponse.json();
      
      // Fetch categories
      const categoriesResponse = await fetch('/api/community/forums/categories?isActive=true');
      const categoriesData = await categoriesResponse.json();

      if (postsData.success) {
        setPosts(postsData.data.posts);
      }
      
      if (categoriesData.success) {
        setCategories(categoriesData.data.categories);
      }
    } catch (error) {
      console.error('Error fetching forum data:', error);
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
            <Link 
              href="/community"
              className="inline-flex items-center text-[#76519f] hover:text-[#6a4a8f] mb-4"
            >
              ← Back to Community
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Forums</h1>
            <p className="text-gray-600">Join discussions and connect with fellow dog parents</p>
          </div>

          {/* Category Filter */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === ''
                    ? 'bg-[#76519f] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                All Categories
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    selectedCategory === category.id
                      ? 'text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                  style={{
                    backgroundColor: selectedCategory === category.id ? category.color : undefined
                  }}
                >
                  <span>{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedCategory 
                      ? `Posts in ${categories.find(c => c.id === selectedCategory)?.name || 'Category'}`
                      : 'All Forum Posts'
                    }
                  </h2>
                  <Link 
                    href="/community/forums/create"
                    className="inline-flex items-center px-4 py-2 bg-[#76519f] text-white text-sm font-medium rounded-lg hover:bg-[#6a4a8f] transition-colors"
                  >
                    <span className="mr-2">✏️</span>
                    Start Discussion
                  </Link>
                </div>
                
                {posts.length === 0 ? (
                  <div className="bg-white rounded-lg p-8 text-center shadow-sm">
                    <div className="text-4xl mb-4">💬</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No forum posts yet</h3>
                    <p className="text-gray-600 mb-4">
                      {selectedCategory 
                        ? 'No posts in this category yet. Be the first to start a discussion!'
                        : 'Be the first to start a discussion in our community forums!'
                      }
                    </p>
                    <Link 
                      href="/community/forums/create"
                      className="inline-flex items-center px-4 py-2 bg-[#76519f] text-white rounded-lg hover:bg-[#6a4a8f] transition-colors"
                    >
                      <span className="mr-2">✏️</span>
                      Start Discussion
                    </Link>
                  </div>
                ) : (
                  posts.map((post) => (
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
                          
                          <Link href={`/community/forums/${post.id}`}>
                            <h3 className="text-lg font-medium text-gray-900 mb-2 hover:text-[#76519f] cursor-pointer">
                              {post.title}
                            </h3>
                          </Link>
                          
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
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Categories */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left flex items-center justify-between p-3 rounded-lg transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-gray-100'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{category.icon}</span>
                        <div>
                          <div className="font-medium text-gray-900">{category.name}</div>
                          <div className="text-sm text-gray-500">{category.description}</div>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">{category.post_count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Link 
                    href="/community/ask"
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span>❓</span>
                    <span className="text-gray-700">Ask a Question</span>
                  </Link>
                  <Link 
                    href="/community/experts"
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span>👨‍⚕️</span>
                    <span className="text-gray-700">Find Experts</span>
                  </Link>
                  <Link 
                    href="/community"
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span>🏠</span>
                    <span className="text-gray-700">Community Home</span>
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