'use client';

import { useState, useRef } from 'react';
import { User, MapPin, Award, Camera, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface UserProfileFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    location?: string;
    experience_level: string;
    barks_points: number;
    is_premium: boolean;
    profile_image_url?: string;
  };
  onSave: (success: boolean) => void;
  onCancel: () => void;
}

const INDIAN_CITIES = [
  'Mumbai, Maharashtra', 'Delhi, Delhi', 'Bangalore, Karnataka',
  'Hyderabad, Telangana', 'Chennai, Tamil Nadu', 'Kolkata, West Bengal',
  'Pune, Maharashtra', 'Ahmedabad, Gujarat', 'Jaipur, Rajasthan',
  'Surat, Gujarat', 'Lucknow, Uttar Pradesh', 'Kanpur, Uttar Pradesh',
  'Nagpur, Maharashtra', 'Indore, Madhya Pradesh', 'Thane, Maharashtra',
  'Bhopal, Madhya Pradesh', 'Visakhapatnam, Andhra Pradesh',
  'Pimpri-Chinchwad, Maharashtra', 'Patna, Bihar', 'Vadodara, Gujarat'
];

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', description: 'First-time dog parent' },
  { value: 'intermediate', label: 'Intermediate', description: '1-3 years experience' },
  { value: 'experienced', label: 'Experienced', description: '3+ years experience' },
  { value: 'expert', label: 'Expert', description: 'Professional or breeder' }
];

export default function UserProfileForm({ user, onSave, onCancel }: UserProfileFormProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: user.name,
    location: user.location || '',
    customLocation: '',
    experience_level: user.experience_level
  });
  
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(user.profile_image_url || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user starts typing
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      setProfileImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const removeImage = () => {
    setProfileImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    
    if (formData.name.trim().length < 2) {
      setError('Name must be at least 2 characters long');
      return false;
    }

    const finalLocation = formData.location === 'Other' ? formData.customLocation : formData.location;
    if (!finalLocation.trim()) {
      setError('Location is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Use custom location if "Other" is selected
      const finalLocation = formData.location === 'Other' ? formData.customLocation : formData.location;

      // First, upload image if selected
      let imageUrl = user.profile_image_url;
      if (profileImage) {
        const formDataImage = new FormData();
        formDataImage.append('file', profileImage);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
          },
          body: formDataImage
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          imageUrl = uploadData.url;
        } else {
          throw new Error('Failed to upload image');
        }
      }

      // Update user profile
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          location: finalLocation.trim(),
          experience_level: formData.experience_level,
          profile_image_url: imageUrl
        }),
      });

      if (response.ok) {
        setSuccess('Profile updated successfully!');
        setTimeout(() => {
          onSave(true);
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update profile');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{t('profile.editProfile')}</h2>
          <p className="text-gray-600 mt-2">{t('profile.updateProfile')}</p>
        </div>
        <div className="relative">
          {imagePreview ? (
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-gray-100">
              <img 
                src={imagePreview} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-16 h-16 md:w-20 md:h-20 bg-primary rounded-full flex items-center justify-center">
              <User className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            <Camera className="w-3 h-3 text-white" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm">{success}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />

        {/* Profile Image Section */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Profile Photo
          </label>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            >
              {imagePreview ? 'Change Photo' : 'Upload Photo'}
            </button>
            {imagePreview && (
              <button
                type="button"
                onClick={removeImage}
                className="px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Upload a clear photo of yourself. Max size: 5MB. Supported formats: JPG, PNG, GIF.
          </p>
        </div>

        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            placeholder="Enter your full name"
            required
          />
        </div>

        {/* Email Display (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">
            Email address cannot be changed. Contact support if needed.
          </p>
        </div>

        {/* Location Field */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
            Location *
          </label>
          <select
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            required
          >
            <option value="">Select your city</option>
            {INDIAN_CITIES.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
            <option value="Other">Other (specify below)</option>
          </select>
          
          {formData.location === 'Other' && (
            <input
              type="text"
              name="customLocation"
              value={formData.customLocation}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors mt-3"
              placeholder="Enter your city and state"
              required
            />
          )}
        </div>

        {/* Experience Level */}
        <div>
          <label htmlFor="experience_level" className="block text-sm font-medium text-gray-700 mb-2">
            Dog Parenting Experience *
          </label>
          <select
            id="experience_level"
            name="experience_level"
            value={formData.experience_level}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            required
          >
            {EXPERIENCE_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label} - {level.description}
              </option>
            ))}
          </select>
        </div>

        {/* Stats Display */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{user.barks_points}</div>
              <div className="text-sm text-gray-600">Barks Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {user.is_premium ? 'Premium' : 'Free'}
              </div>
              <div className="text-sm text-gray-600">Membership</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              'Save Changes'
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}