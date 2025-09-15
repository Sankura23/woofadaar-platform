'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import MentionTextarea from '@/components/community/MentionTextarea';

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  slug: string;
  icon: string;
  color: string;
}

export default function CreateForumPostPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    categoryId: '',
    tags: '',
    photoUrl: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/community/forums/categories?isActive=true');
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    } else if (formData.content.length < 20) {
      newErrors.content = 'Content must be at least 20 characters';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Please select a category';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const response = await fetch('/api/community/forums', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          categoryId: formData.categoryId,
          tags,
          photoUrl: formData.photoUrl || null
        })
      });

      const data = await response.json();
      
      if (data.success) {
        router.push(`/community/forums/${data.data.post.id}`);
      } else {
        setErrors({ submit: data.error || 'Failed to create forum post' });
      }
    } catch (error) {
      console.error('Error creating forum post:', error);
      setErrors({ submit: 'Failed to create forum post. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === formData.categoryId);

  return (
    <ProtectedRoute>
      <div className="bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <Link href="/community" className="hover:text-[#76519f]">Community</Link>
              <span>›</span>
              <Link href="/community/forums" className="hover:text-[#76519f]">Forums</Link>
              <span>›</span>
              <span className="text-gray-900">Start Discussion</span>
            </nav>
            <h1 className="text-3xl font-bold text-gray-900">Start a New Discussion</h1>
            <p className="text-gray-600 mt-2">Share your thoughts, questions, or experiences with the community</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
            {/* Title */}
            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Discussion Title *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#76519f] focus:border-transparent ${
                  errors.title ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder="What would you like to discuss?"
                maxLength={200}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {formData.title.length}/200 characters
              </p>
            </div>

            {/* Category */}
            <div className="mb-6">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                id="category"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#76519f] focus:border-transparent ${
                  errors.categoryId ? 'border-red-300' : 'border-gray-200'
                }`}
              >
                <option value="">Select a category...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name} - {category.description}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-sm text-red-600">{errors.categoryId}</p>
              )}
              {selectedCategory && (
                <div className="mt-2">
                  <span 
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: `${selectedCategory.color}20`, color: selectedCategory.color }}
                  >
                    {selectedCategory.icon} {selectedCategory.name}
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="mb-6">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Discussion Content *
              </label>
              <MentionTextarea
                value={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
                placeholder="Share your thoughts, ask questions, or start a conversation... (Type @ to mention someone)"
                rows={8}
                className={errors.content ? 'border-red-300' : ''}
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-600">{errors.content}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {formData.content.length} characters - Be detailed and helpful
              </p>
            </div>

            {/* Tags */}
            <div className="mb-6">
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                Tags (Optional)
              </label>
              <input
                type="text"
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#76519f] focus:border-transparent"
                placeholder="puppy, training, health, behavior (separate with commas)"
              />
              <p className="mt-1 text-sm text-gray-500">
                Add relevant tags to help others find your discussion
              </p>
            </div>

            {/* Photo URL */}
            <div className="mb-6">
              <label htmlFor="photoUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Photo URL (Optional)
              </label>
              <input
                type="url"
                id="photoUrl"
                value={formData.photoUrl}
                onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#76519f] focus:border-transparent"
                placeholder="https://example.com/image.jpg"
              />
              <p className="mt-1 text-sm text-gray-500">
                Add an image to make your post more engaging
              </p>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{errors.submit}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Link 
                href="/community/forums"
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </Link>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  <span className="font-medium">Tip:</span> Clear, detailed posts get better responses
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-[#76519f] text-white font-medium rounded-lg hover:bg-[#6a4a8f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Start Discussion'}
                </button>
              </div>
            </div>
          </form>

          {/* Guidelines */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Community Guidelines</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Be respectful and kind to fellow dog parents</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Provide detailed context for better answers</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Use relevant categories and tags</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Search existing discussions before posting</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>For emergencies, contact a vet immediately</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}