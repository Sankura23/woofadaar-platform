'use client';

import { useState } from 'react';
import { User, MapPin, Award } from 'lucide-react';
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

export default function UserProfileForm({ user, onSave, onCancel }: UserProfileFormProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: user.name,
    location: user.location || '',
    customLocation: '',
    experience_level: user.experience_level
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Use custom location if "Other" is selected
    const finalLocation = formData.location === 'Other' ? formData.customLocation : formData.location;

    try {
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        body: JSON.stringify({
          name: formData.name,
          location: finalLocation,
          experience_level: formData.experience_level
        }),
      });

      if (response.ok) {
        onSave(true);
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
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{t('profile.editProfile')}</h2>
          <p className="text-gray-600 mt-2">{t('profile.updateProfile')}</p>
        </div>
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-white" />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('profile.fullName')} *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={t('profile.fullName')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('profile.email')}
          </label>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-500"
            placeholder={t('profile.emailCannotBeChanged')}
          />
          <p className="text-sm text-gray-500 mt-1">{t('profile.emailCannotBeChanged')}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('profile.location')}
          </label>
          <select
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">{t('profile.selectCity')}</option>
            {INDIAN_CITIES.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
            <option value="Other">{t('cities.other')}</option>
          </select>
        </div>

        {formData.location === 'Other' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('profile.enterCity')} *
            </label>
            <input
              type="text"
              name="customLocation"
              value={formData.customLocation}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('profile.customLocationPlaceholder')}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('profile.experienceLevel')}
          </label>
          <select
            name="experience_level"
            value={formData.experience_level}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="beginner">{t('experienceLevels.beginner')}</option>
            <option value="intermediate">{t('experienceLevels.intermediate')}</option>
            <option value="expert">{t('experienceLevels.expert')}</option>
          </select>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('common.loading') : t('profile.updateProfile')}
          </button>
        </div>
      </form>
    </div>
  );
}