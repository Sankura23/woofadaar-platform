'use client';

import React, { useState } from 'react';
import { 
  Save,
  X,
  Camera,
  MapPin,
  Tag,
  Globe,
  Lock,
  Star,
  Heart,
  Calendar,
  Upload,
  Plus
} from 'lucide-react';

interface DiaryEntryFormProps {
  dogId?: string;
  dogs?: Array<{ id: string; name: string; photo_url?: string }>;
  initialData?: any;
  onSave?: (data: any) => void;
  onCancel?: () => void;
}

const ENTRY_TYPES = [
  { value: 'general', label: 'Daily Life', icon: Heart, color: 'text-gray-500' },
  { value: 'milestone', label: 'Milestone', icon: Star, color: 'text-yellow-500' },
  { value: 'training', label: 'Training', icon: Calendar, color: 'text-blue-500' },
  { value: 'health', label: 'Health', icon: Heart, color: 'text-red-500' },
  { value: 'adventure', label: 'Adventure', icon: MapPin, color: 'text-green-500' }
];

const MILESTONE_TYPES = [
  'First Day Home', 'First Walk', 'First Trick', 'First Vet Visit',
  'Potty Trained', 'Lost First Tooth', 'First Birthday',
  'Graduated Training', 'Made a Friend', 'Learned to Swim',
  'First Grooming', 'Other'
];

const MOODS = [
  { value: 'happy', label: 'Happy', emoji: '😊' },
  { value: 'excited', label: 'Excited', emoji: '🤩' },
  { value: 'calm', label: 'Calm', emoji: '😌' },
  { value: 'sleepy', label: 'Sleepy', emoji: '😴' },
  { value: 'playful', label: 'Playful', emoji: '😄' },
  { value: 'anxious', label: 'Anxious', emoji: '😰' },
  { value: 'sick', label: 'Sick', emoji: '🤒' }
];

const WEATHER_OPTIONS = [
  { value: 'sunny', label: 'Sunny', emoji: '☀️' },
  { value: 'cloudy', label: 'Cloudy', emoji: '☁️' },
  { value: 'rainy', label: 'Rainy', emoji: '🌧️' },
  { value: 'snowy', label: 'Snowy', emoji: '❄️' },
  { value: 'windy', label: 'Windy', emoji: '💨' }
];

export default function DiaryEntryForm({
  dogId,
  dogs = [],
  initialData,
  onSave,
  onCancel
}: DiaryEntryFormProps) {
  const [formData, setFormData] = useState({
    dog_id: dogId || dogs[0]?.id || '',
    title: initialData?.title || '',
    content: initialData?.content || '',
    entry_type: initialData?.entry_type || 'general',
    milestone_type: initialData?.milestone_type || '',
    mood: initialData?.mood || '',
    weather: initialData?.weather || '',
    location: initialData?.location || '',
    tags: initialData?.tags || [],
    privacy_level: initialData?.privacy_level || 'public',
    photos: initialData?.photos || []
  });

  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !formData.tags.includes(tag)) {
      handleChange('tags', [...formData.tags, tag]);
    }
    setNewTag('');
  };

  const removeTag = (tagToRemove: string) => {
    handleChange('tags', formData.tags.filter((tag: string) => tag !== tagToRemove));
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.dog_id) {
      newErrors.dog_id = 'Please select a dog';
    }
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('woofadaar_token');

      const url = initialData ? `/api/diary/entries/${initialData.id}` : '/api/diary/entries';
      const method = initialData ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        onSave?.(data.data.entry);
      } else {
        const error = await response.json();
        setErrors({ general: error.error || 'Failed to save diary entry' });
      }
    } catch (error) {
      console.error('Error saving diary entry:', error);
      setErrors({ general: 'Failed to save diary entry' });
    } finally {
      setLoading(false);
    }
  };

  const selectedEntryType = ENTRY_TYPES.find(type => type.value === formData.entry_type);
  const SelectedIcon = selectedEntryType?.icon || Heart;

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {initialData ? 'Edit Diary Entry' : 'New Diary Entry'}
          </h2>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{errors.general}</p>
          </div>
        )}

        {/* Dog Selection */}
        {dogs.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Which dog is this about?
            </label>
            <select
              value={formData.dog_id}
              onChange={(e) => handleChange('dog_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            >
              {dogs.map(dog => (
                <option key={dog.id} value={dog.id}>{dog.name}</option>
              ))}
            </select>
            {errors.dog_id && <p className="text-red-500 text-xs mt-1">{errors.dog_id}</p>}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="What's the story about?"
            maxLength={100}
          />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Story
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => handleChange('content', e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="Tell us what happened..."
          />
          {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content}</p>}
        </div>

        {/* Entry Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Entry Type
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {ENTRY_TYPES.map(type => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleChange('entry_type', type.value)}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    formData.entry_type === type.value
                      ? 'border-[#3bbca8] bg-[#3bbca8] bg-opacity-10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 mx-auto mb-1 ${
                    formData.entry_type === type.value ? 'text-[#3bbca8]' : type.color
                  }`} />
                  <div className="text-xs font-medium">{type.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Milestone Type - Only show for milestone entries */}
        {formData.entry_type === 'milestone' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Milestone Type
            </label>
            <select
              value={formData.milestone_type}
              onChange={(e) => handleChange('milestone_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            >
              <option value="">Select milestone type</option>
              {MILESTONE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        )}

        {/* Mood and Weather */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mood
            </label>
            <div className="grid grid-cols-4 gap-2">
              {MOODS.map(mood => (
                <button
                  key={mood.value}
                  type="button"
                  onClick={() => handleChange('mood', mood.value)}
                  className={`p-2 border rounded-lg text-center transition-colors ${
                    formData.mood === mood.value
                      ? 'border-[#3bbca8] bg-[#3bbca8] bg-opacity-10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg">{mood.emoji}</div>
                  <div className="text-xs">{mood.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weather
            </label>
            <div className="grid grid-cols-3 gap-2">
              {WEATHER_OPTIONS.map(weather => (
                <button
                  key={weather.value}
                  type="button"
                  onClick={() => handleChange('weather', weather.value)}
                  className={`p-2 border rounded-lg text-center transition-colors ${
                    formData.weather === weather.value
                      ? 'border-[#3bbca8] bg-[#3bbca8] bg-opacity-10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg">{weather.emoji}</div>
                  <div className="text-xs">{weather.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4" />
            <span>Location</span>
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="Where did this happen?"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <Tag className="w-4 h-4" />
            <span>Tags</span>
          </label>
          
          <div className="flex space-x-2 mb-3">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
              placeholder="Add a tag"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <button
              type="button"
              onClick={addTag}
              className="px-4 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Privacy */}
        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.privacy_level === 'private'}
              onChange={(e) => handleChange('privacy_level', e.target.checked ? 'private' : 'public')}
              className="w-4 h-4 text-[#3bbca8] border-gray-300 rounded focus:ring-[#3bbca8]"
            />
            <span className="flex items-center space-x-2 text-sm text-gray-700">
              {formData.privacy_level === 'private' ? (
                <Lock className="w-4 h-4 text-gray-500" />
              ) : (
                <Globe className="w-4 h-4 text-gray-500" />
              )}
              <span>
                {formData.privacy_level === 'private' ? 'Private (only you can see this)' : 'Public (visible to community)'}
              </span>
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {initialData ? 'Update Entry' : 'Share Story'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}