'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface Dog {
  id: string;
  name: string;
  breed: string;
  profile_image_url?: string;
}

export default function AskQuestionPage() {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    tags: [] as string[],
    dogId: '',
    photoUrl: '',
    location: ''
  });
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const router = useRouter();

  const categories = [
    { value: 'general', label: 'General', icon: '🐕' },
    { value: 'health', label: 'Health & Wellness', icon: '🏥' },
    { value: 'behavior', label: 'Behavior', icon: '🎾' },
    { value: 'feeding', label: 'Feeding & Nutrition', icon: '🍖' },
    { value: 'training', label: 'Training', icon: '📚' },
    { value: 'local', label: 'Local', icon: '📍' }
  ];

  const popularTags = [
    'puppy', 'senior', 'vaccination', 'diet', 'exercise', 'grooming',
    'anxiety', 'aggression', 'house-training', 'socialization', 'vet-visit'
  ];

  useEffect(() => {
    fetchDogs();
  }, []);

  const fetchDogs = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) return;

      const response = await fetch('/api/dogs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDogs(data.data?.dogs || []);
        }
      }
    } catch (error) {
      console.error('Error fetching dogs:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 5) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addPopularTag = (tag: string) => {
    if (!formData.tags.includes(tag) && formData.tags.length < 5) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required');
      return;
    }

    if (formData.title.length < 10) {
      setError('Title must be at least 10 characters long');
      return;
    }

    if (formData.content.length < 20) {
      setError('Question content must be at least 20 characters long');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) {
        setError('Please log in to ask a question');
        return;
      }

      const response = await fetch('/api/community/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim(),
          category: formData.category,
          tags: formData.tags,
          dogId: formData.dogId || null,
          photoUrl: formData.photoUrl || null,
          location: formData.location || null
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/community');
        }, 2000);
      } else {
        setError(data.error || 'Failed to post question');
      }
    } catch (error) {
      console.error('Error posting question:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-gradient-to-br from-milk-white via-gray-50 to-gray-100 min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-8 text-center shadow-sm">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Question Posted Successfully!</h1>
            <p className="text-gray-600 mb-6">Your question has been posted to the community. You'll receive notifications when someone answers.</p>
                         <Link 
               href="/community"
               className="inline-flex items-center px-4 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] transition-colors"
             >
               Back to Community
             </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="bg-gradient-to-br from-milk-white via-gray-50 to-gray-100 min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
                     <Link 
             href="/community"
             className="inline-flex items-center text-[#3bbca8] hover:text-[#2daa96] mb-4"
           >
             ← Back to Community
           </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ask a Question</h1>
          <p className="text-gray-600">Get help from our community of dog parents and experts</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 shadow-sm">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              {/* Title */}
              <div className="mb-6">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Question Title *
                </label>
                                 <input
                   type="text"
                   id="title"
                   name="title"
                   value={formData.title}
                   onChange={handleInputChange}
                   placeholder="What's your question? Be specific..."
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent min-h-[44px]"
                   maxLength={200}
                   autoComplete="off"
                   inputMode="text"
                 />
                <p className="text-sm text-gray-500 mt-1">
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
                   name="category"
                   value={formData.category}
                   onChange={handleInputChange}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent min-h-[44px]"
                 >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.icon} {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Content */}
              <div className="mb-6">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  Question Details *
                </label>
                                 <textarea
                   id="content"
                   name="content"
                   value={formData.content}
                   onChange={handleInputChange}
                   rows={8}
                   placeholder="Provide more details about your question. Include relevant information like your dog's age, breed, symptoms, etc."
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent resize-vertical"
                   autoComplete="off"
                   inputMode="text"
                 />
                <p className="text-sm text-gray-500 mt-1">
                  {formData.content.length} characters (minimum 20)
                </p>
              </div>

              {/* Dog Selection */}
              {dogs.length > 0 && (
                <div className="mb-6">
                  <label htmlFor="dogId" className="block text-sm font-medium text-gray-700 mb-2">
                    Related to your dog (optional)
                  </label>
                                     <select
                     id="dogId"
                     name="dogId"
                     value={formData.dogId}
                     onChange={handleInputChange}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent min-h-[44px]"
                   >
                    <option value="">Select a dog (optional)</option>
                    {dogs.map((dog) => (
                      <option key={dog.id} value={dog.id}>
                        {dog.name} ({dog.breed})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tags */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (optional)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag) => (
                                         <span
                       key={tag}
                       className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#3bbca8]/10 text-[#3bbca8] border border-[#3bbca8]/20"
                     >
                       {tag}
                       <button
                         type="button"
                         onClick={() => removeTag(tag)}
                         className="ml-2 text-[#3bbca8] hover:text-[#2daa96]"
                       >
                         ×
                       </button>
                     </span>
                  ))}
                </div>
                <div className="flex gap-2">
                                     <input
                     type="text"
                     value={tagInput}
                     onChange={(e) => setTagInput(e.target.value)}
                     onKeyDown={handleTagInputKeyDown}
                     placeholder="Add tags..."
                     className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent min-h-[44px]"
                     maxLength={20}
                     autoComplete="off"
                     inputMode="text"
                   />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors min-h-[44px]"
                  >
                    Add
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {formData.tags.length}/5 tags
                </p>
              </div>

              {/* Location */}
              <div className="mb-6">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Location (optional)
                </label>
                                   <input
                     type="text"
                     id="location"
                     name="location"
                     value={formData.location}
                     onChange={handleInputChange}
                     placeholder="City, State (for local questions)"
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent min-h-[44px]"
                     autoComplete="address-level2"
                     inputMode="text"
                   />
              </div>

              {/* Photo URL */}
              <div className="mb-6">
                <label htmlFor="photoUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Photo URL (optional)
                </label>
                                 <input
                   type="url"
                   id="photoUrl"
                   name="photoUrl"
                   value={formData.photoUrl}
                   onChange={handleInputChange}
                   placeholder="https://example.com/photo.jpg"
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent min-h-[44px]"
                   autoComplete="url"
                   inputMode="url"
                 />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                                 <button
                   type="submit"
                   disabled={loading}
                   className="px-6 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg min-h-[44px]"
                 >
                   {loading ? 'Posting...' : 'Post Question'}
                 </button>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tips */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Tips for Better Questions</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Be specific and provide relevant details</li>
                <li>• Include your dog's age, breed, and symptoms</li>
                <li>• Mention what you've already tried</li>
                <li>• Use clear, descriptive language</li>
                <li>• Add relevant tags to help others find your question</li>
              </ul>
            </div>

            {/* Popular Tags */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🏷️ Popular Tags</h3>
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                                       <button
                       key={tag}
                       type="button"
                       onClick={() => addPopularTag(tag)}
                       disabled={formData.tags.includes(tag) || formData.tags.length >= 5}
                       className="px-3 py-1 text-sm bg-[#3bbca8]/10 text-[#3bbca8] border border-[#3bbca8]/20 rounded-full hover:bg-[#3bbca8]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                     >
                       {tag}
                     </button>
                ))}
              </div>
            </div>

            {/* Community Guidelines */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Community Guidelines</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Be respectful and kind to others</li>
                <li>• Provide helpful, accurate information</li>
                <li>• Don't spam or post irrelevant content</li>
                <li>• For urgent health issues, contact a vet</li>
                <li>• Report inappropriate content</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
} 