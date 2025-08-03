'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import UserProfileForm from '@/components/profiles/UserProfileForm';
import { useLanguage, useLoadUserLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

interface User {
  id: string;
  name: string;
  email: string;
  location?: string;
  experience_level: string;
  barks_points: number;
  is_premium: boolean;
  preferred_language?: string;
}

export default function ProfilePage() {
  const { t } = useLanguage();
  const loadUserLanguage = useLoadUserLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('woofadaar_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    // Fetch real user data from API
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          // Load user's preferred language
          loadUserLanguage();
        } else {
          console.error('Failed to fetch user data');
          // Redirect to login if token is invalid
          localStorage.removeItem('woofadaar_token');
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Redirect to login on error
        localStorage.removeItem('woofadaar_token');
        window.location.href = '/login';
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('woofadaar_token');
    window.location.href = '/login';
  };

  const handleProfileUpdate = (success: boolean) => {
    if (success) {
      // Refresh user data
      const token = localStorage.getItem('woofadaar_token');
      if (token) {
        fetch('/api/user', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .then(response => response.json())
        .then(data => {
          setUser(data.user);
          setIsEditing(false);
        })
        .catch(error => {
          console.error('Error refreshing user data:', error);
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-milk-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-dark-grey">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (isEditing && user) {
    return (
      <div className="min-h-screen bg-milk-white p-6">
        <UserProfileForm 
          user={user} 
          onSave={handleProfileUpdate}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-milk-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">Welcome back, {user?.name}!</h1>
              <p className="text-dark-grey">Manage your dog profiles and community activity</p>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <LanguageSwitcher className="mb-2 sm:mb-0" />
              <div className="flex space-x-3">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {t('profile.editProfile')}
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                {t('navigation.logout')}
              </button>
              </div>
            </div>
          </div>

          {/* User Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800">{t('profile.barksPoints')}</h3>
              <p className="text-2xl font-bold text-blue-600">{user?.barks_points}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800">{t('profile.experienceLevel')}</h3>
              <p className="text-lg font-semibold text-green-600 capitalize">{t(`experienceLevels.${user?.experience_level}`)}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800">{t('profile.location')}</h3>
              <p className="text-lg font-semibold text-purple-600">
                {user?.location || t('common.notSet')}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/profile/dogs" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-bold text-primary mb-2">{t('dogs.title')}</h2>
            <p className="text-dark-grey mb-4">View and manage your dog profiles</p>
            <div className="flex items-center text-primary">
              <span>{t('dogs.title')}</span>
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link href="/profile/dogs/add" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-bold text-primary mb-2">{t('dogs.addDog')}</h2>
            <p className="text-dark-grey mb-4">Create a new dog profile</p>
            <div className="flex items-center text-primary">
              <span>{t('dogs.addDog')}</span>
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}