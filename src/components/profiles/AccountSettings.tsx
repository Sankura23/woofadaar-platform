'use client';

import { useState, useEffect } from 'react';
import { User, Mail, MapPin, Award, Save, X, Eye, EyeOff } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  location: string | null;
  experience_level: string;
  barks_points: number;
  is_premium: boolean;
  profile_image_url: string | null;
  profile_visibility: string;
  reputation: number;
  preferred_language?: string;
  created_at: string;
}

interface AccountSettingsProps {
  userData: UserData;
  onClose: () => void;
  onUpdate: (updatedData: Partial<UserData>) => void;
}

export default function AccountSettings({ userData, onClose, onUpdate }: AccountSettingsProps) {
  const [formData, setFormData] = useState({
    name: userData.name || '',
    email: userData.email || '',
    location: userData.location || '',
    experience_level: userData.experience_level || 'beginner',
    profile_visibility: userData.profile_visibility || 'public',
    preferred_language: userData.preferred_language || 'en'
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/working-user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        onUpdate(formData);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          Account Settings
        </h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <p className="font-medium">
            {message.type === 'success' ? '✅ ' : '❌ '} 
            {message.text}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px]"
                placeholder="Enter your full name"
                autoComplete="name"
                inputMode="text"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px]"
                  placeholder="Enter your email address"
                  autoComplete="email"
                  inputMode="email"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                This email is used for account login and important notifications
              </p>
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px]"
                  placeholder="e.g., Mumbai, Maharashtra"
                  autoComplete="address-level2"
                  inputMode="text"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Experience & Preferences Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" />
            Experience & Preferences
          </h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="experience_level" className="block text-sm font-medium text-gray-700 mb-2">
                Dog Experience Level
              </label>
              <select
                id="experience_level"
                name="experience_level"
                value={formData.experience_level}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px]"
              >
                <option value="beginner">Beginner - New to dogs</option>
                <option value="intermediate">Intermediate - Some experience</option>
                <option value="experienced">Experienced - Several years with dogs</option>
                <option value="expert">Expert - Professional or extensive experience</option>
              </select>
            </div>

            <div>
              <label htmlFor="preferred_language" className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Language
              </label>
              <select
                id="preferred_language"
                name="preferred_language"
                value={formData.preferred_language}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px]"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </div>
          </div>
        </div>

        {/* Privacy Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Privacy Settings
          </h3>
          <div>
            <label htmlFor="profile_visibility" className="block text-sm font-medium text-gray-700 mb-2">
              Profile Visibility
            </label>
            <select
              id="profile_visibility"
              name="profile_visibility"
              value={formData.profile_visibility}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px]"
            >
              <option value="public">Public - Visible to all users</option>
              <option value="limited">Limited - Visible to connections only</option>
              <option value="private">Private - Only visible to you</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Controls who can see your profile information and dogs
            </p>
          </div>
        </div>

        {/* Account Information Display Only */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Account Type:</span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                userData.is_premium ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {userData.is_premium ? '⭐ Premium' : 'Standard'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Barks Points:</span>
              <span className="text-sm font-medium text-gray-900">{userData.barks_points || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Reputation:</span>
              <span className="text-sm font-medium text-gray-900">{userData.reputation || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Member Since:</span>
              <span className="text-sm font-medium text-gray-900">
                {new Date(userData.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors min-h-[44px]"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}