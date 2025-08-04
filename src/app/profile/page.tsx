'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import UserProfileForm from '@/components/profiles/UserProfileForm';
import { useLanguage, useLoadUserLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { User, Heart, MapPin, Award, Plus, ArrowRight, LogOut, Edit3 } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  location?: string;
  experience_level: string;
  barks_points: number;
  is_premium: boolean;
  preferred_language?: string;
  profile_image_url?: string;
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
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex items-center mb-4 md:mb-0">
              {/* Profile Image */}
              <div className="relative mr-4">
                {user?.profile_image_url ? (
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-gray-100">
                    <img 
                      src={user.profile_image_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-primary rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 md:w-10 md:h-10 text-white" />
                  </div>
                )}
              </div>
              
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                  Welcome back, {user?.name}!
                </h1>
                <p className="text-gray-600">
                  Manage your dog profiles and community activity
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <LanguageSwitcher className="mb-2 sm:mb-0" />
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* User Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <Award className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-800 text-sm">Barks Points</h3>
                  <p className="text-2xl font-bold text-blue-600">{user?.barks_points}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800 text-sm">Experience Level</h3>
                  <p className="text-lg font-semibold text-green-600 capitalize">
                    {user?.experience_level}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg mr-3">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-800 text-sm">Location</h3>
                  <p className="text-lg font-semibold text-purple-600">
                    {user?.location || 'Not set'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link 
            href="/profile/dogs" 
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
                  <Heart className="w-5 h-5 text-primary mr-2" />
                  My Dogs
                </h2>
                <p className="text-gray-600 mb-4">View and manage your dog profiles</p>
                <div className="flex items-center text-primary font-medium">
                  <span>Manage Dogs</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>

          <Link 
            href="/profile/dogs/add" 
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
                  <Plus className="w-5 h-5 text-primary mr-2" />
                  Add New Dog
                </h2>
                <p className="text-gray-600 mb-4">Create a new dog profile</p>
                <div className="flex items-center text-primary font-medium">
                  <span>Add Dog</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Additional Actions */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/partners/directory"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <span className="font-medium text-gray-900">Find Vets</span>
            </Link>
            
            <Link
              href="/waitlist"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <Heart className="w-5 h-5 text-green-600" />
              </div>
              <span className="font-medium text-gray-900">Join Community</span>
            </Link>
            
            <Link
              href="/admin/waitlist"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <span className="font-medium text-gray-900">Admin Dashboard</span>
            </Link>
            
            <Link
              href="/"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-orange-100 rounded-lg mr-3">
                <User className="w-5 h-5 text-orange-600" />
              </div>
              <span className="font-medium text-gray-900">Go Home</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}