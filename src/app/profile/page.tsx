'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Settings, Shield, Download, Share2, Plus, Edit, Trash2, Eye, EyeOff, Camera, Upload } from 'lucide-react';
import PrivacySettings from '@/components/profiles/PrivacySettings';
import AccountSettings from '@/components/profiles/AccountSettings';
import ProfileExport from '@/components/profiles/ProfileExport';
import DogProfileShare from '@/components/dogs/DogProfileShare';

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

interface Dog {
  id: string;
  name: string;
  breed: string;
  age_months: number;
  photo_url: string | null;
  health_id: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingUser, setFetchingUser] = useState(false);
  const [fetchingDogs, setFetchingDogs] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showProfileExport, setShowProfileExport] = useState(false);
  const [showDogShare, setShowDogShare] = useState(false);
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load data concurrently for better performance
    Promise.allSettled([fetchUserData(), fetchDogs()]).finally(() => {
      setLoading(false);
    });
  }, []);

  // Check for settings parameter and auto-open modal
  useEffect(() => {
    const settingsParam = searchParams?.get('settings');
    if (settingsParam === 'account' && userData) {
      setShowAccountSettings(true);
    }
  }, [searchParams, userData]);

  const fetchUserData = async () => {
    if (fetchingUser) return; // Prevent duplicate requests
    setFetchingUser(true);
    try {
      const response = await fetch('/api/user', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserData(data.user);
      } else if (response.status === 401) {
        router.push('/login');
      } else if (response.status === 404) {
        // User not found - this can happen with new registrations
        // Redirect to onboarding
        router.push('/onboarding');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // For any other error, redirect to onboarding as a safety measure
      router.push('/onboarding');
    } finally {
      setFetchingUser(false);
    }
  };

  const fetchDogs = async () => {
    if (fetchingDogs) return; // Prevent duplicate requests
    setFetchingDogs(true);
    try {
      const response = await fetch('/api/dogs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDogs(data.data?.dogs || []);
      }
    } catch (error) {
      console.error('Error fetching dogs:', error);
    } finally {
      setFetchingDogs(false);
    }
  };

  const handleDogShare = (dog: Dog) => {
    setSelectedDog(dog);
    setShowDogShare(true);
  };

  const handleProfileUpdate = (updatedData: Partial<UserData>) => {
    setUserData(prev => prev ? { ...prev, ...updatedData } : null);
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('File selected:', file);
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('Image size should be less than 5MB');
      return;
    }

    setUploadingPhoto(true);

    try {
      console.log('Starting upload process...');
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload to Cloudinary
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.text();
        console.error('Upload failed:', uploadResponse.status, errorData);
        throw new Error(`Failed to upload image: ${uploadResponse.status}`);
      }

      const uploadData = await uploadResponse.json();
      console.log('Upload successful:', uploadData);
      const imageUrl = uploadData.url;

      // Update user profile with new image URL
      const updateResponse = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        body: JSON.stringify({
          name: userData?.name || 'User',
          profile_image_url: imageUrl
        })
      });

      if (updateResponse.ok) {
        // Update local state
        setUserData(prev => prev ? { ...prev, profile_image_url: imageUrl } : null);
      } else {
        const errorData = await updateResponse.text();
        console.error('Profile update failed:', updateResponse.status, errorData);
        throw new Error(`Failed to update profile: ${updateResponse.status}`);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerPhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleLogout = () => {
    localStorage.removeItem('woofadaar_token');
    localStorage.removeItem('user_type');
    // Dispatch custom event to update navigation
    window.dispatchEvent(new Event('authStateChanged'));
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fef8e8] py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="bg-white rounded-2xl shadow-lg border border-[#f5f5f5] p-8 max-w-md mx-auto">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3bbca8] mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-[#171717] mb-2">Loading your profile...</h3>
              <p className="text-[#525252]">Please wait while we fetch your data</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-[#fef8e8] py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="bg-white rounded-2xl shadow-lg border border-[#f5f5f5] p-8 max-w-md mx-auto">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3bbca8] mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-[#171717] mb-2">Setting up your profile...</h3>
              <p className="text-[#525252]">This should only take a moment.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 py-4 sm:py-6 lg:py-8">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="text-center lg:text-left mb-4 lg:mb-0">
              <h1 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold text-[#3bbca8] mb-2 sm:mb-3">
                {userData?.name ? `${userData.name}'s Profile` : 'My Profile'}
              </h1>
              <p className="text-base sm:text-lg text-gray-600 font-medium">Manage your profile and connect with the dog community</p>
            </div>
            <div className="flex justify-center lg:justify-end">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200 font-medium touch-target"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Profile Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Profile Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 lg:p-8 relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-[#3bbca8]/5 rounded-full -translate-y-12 sm:-translate-y-16 translate-x-12 sm:translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-16 sm:w-24 h-16 sm:h-24 bg-[#e05a37]/5 rounded-full translate-y-8 sm:translate-y-12 -translate-x-8 sm:-translate-x-12"></div>
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8">
                  <div className="flex items-center mb-4 sm:mb-0">
                    <div className="relative group">
                      {userData.profile_image_url ? (
                        <img
                          src={userData.profile_image_url}
                          alt={userData.name}
                          className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-2xl object-cover shadow-lg ring-4 ring-white"
                        />
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-[#3bbca8]/20 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-white">
                          <User className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-[#3bbca8]" />
                        </div>
                      )}
                      
                      {/* Photo Upload Overlay */}
                      <button
                        onClick={triggerPhotoUpload}
                        disabled={uploadingPhoto}
                        className="absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-2xl bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 disabled:opacity-50 backdrop-blur-sm"
                      >
                        {uploadingPhoto ? (
                          <div className="w-4 h-4 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Camera className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                        )}
                      </button>
                      
                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-7 sm:h-7 bg-[#3bbca8] rounded-full flex items-center justify-center shadow-lg">
                        {userData.profile_visibility === 'public' ? (
                          <Eye className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                        ) : (
                          <EyeOff className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="ml-3 sm:ml-4 lg:ml-6">
                      <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{userData.name}</h2>
                      <p className="text-sm sm:text-base text-gray-600 font-medium mt-1 break-all">{userData.email}</p>
                      {userData.location && (
                        <div className="flex items-center mt-2 text-gray-500">
                          <span className="text-base mr-2">📍</span>
                          <span className="font-medium text-sm sm:text-base">{userData.location}</span>
                        </div>
                      )}
                      <div className="flex items-center mt-2">
                        <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                          userData.is_premium ? 'bg-[#ffa602] text-white' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {userData.is_premium ? '⭐ Premium' : 'Standard'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/profile/dogs')}
                    className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-[#3bbca8] hover:bg-[#339990] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium touch-target"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="hidden sm:inline">Manage Dogs</span>
                    <span className="sm:hidden">Dogs</span>
                  </button>
                </div>

                {/* Stats - Clean and Simple */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  <div className="bg-white rounded-xl p-4 sm:p-6 text-center border border-gray-100 hover:shadow-md transition-shadow duration-200">
                    <div className="text-2xl sm:text-3xl font-bold text-[#3bbca8] mb-1">{userData.barks_points || 0}</div>
                    <div className="flex items-center justify-center gap-1 text-xs sm:text-sm text-gray-600">
                      <span>🏆</span>
                      <span className="font-medium">Barks Points</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 sm:p-6 text-center border border-gray-100 hover:shadow-md transition-shadow duration-200">
                    <div className="text-2xl sm:text-3xl font-bold text-[#76519f] mb-1">{dogs?.length || 0}</div>
                    <div className="flex items-center justify-center gap-1 text-xs sm:text-sm text-gray-600">
                      <span>🐕</span>
                      <span className="font-medium">Dogs</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 sm:p-6 text-center border border-gray-100 hover:shadow-md transition-shadow duration-200">
                    <div className="text-2xl sm:text-3xl font-bold text-[#e05a37] mb-1">{userData.reputation || 0}</div>
                    <div className="flex items-center justify-center gap-1 text-xs sm:text-sm text-gray-600">
                      <span>⭐</span>
                      <span className="font-medium">Reputation</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowAccountSettings(true)}
                    className="group flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-4 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-xl border border-blue-200 hover:shadow-lg hover:scale-105 transition-all duration-200 touch-target"
                  >
                    <Settings className="w-4 h-4 sm:w-5 sm:h-5 group-hover:text-blue-600 transition-colors" />
                    <span className="font-medium text-sm sm:text-base">Account Settings</span>
                  </button>
                  <button
                    onClick={() => setShowPrivacySettings(true)}
                    className="group flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-4 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-xl border border-gray-200 hover:shadow-lg hover:scale-105 transition-all duration-200 touch-target"
                  >
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 group-hover:text-[#3bbca8] transition-colors" />
                    <span className="font-medium text-sm sm:text-base">Privacy Settings</span>
                  </button>
                  <button
                    onClick={() => setShowProfileExport(true)}
                    className="group flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-4 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-xl border border-gray-200 hover:shadow-lg hover:scale-105 transition-all duration-200 touch-target"
                  >
                    <Download className="w-4 h-4 sm:w-5 sm:h-5 group-hover:text-[#339990] transition-colors" />
                    <span className="font-medium text-sm sm:text-base">Export Data</span>
                  </button>
                  <button
                    onClick={() => router.push('/profile/dogs/add')}
                    className="group flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-4 bg-[#ffa602] hover:bg-[#e05a37] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 touch-target"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="font-medium text-sm sm:text-base">Add Dog</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6 sm:space-y-8">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 bg-[#3bbca8]/10 rounded-full -translate-y-8 sm:-translate-y-10 translate-x-8 sm:translate-x-10"></div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 relative z-10">Quick Actions</h3>
              <div className="space-y-3 sm:space-y-4 relative z-10">
                <button
                  onClick={() => router.push('/profile/dogs')}
                  className="group w-full flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-[#3bbca8]/10 hover:to-[#3bbca8]/10 hover:shadow-md transition-all duration-200 border border-gray-200 touch-target"
                >
                  <span className="text-gray-700 font-medium group-hover:text-gray-900 text-sm sm:text-base">Manage Dogs</span>
                  <span className="text-xs sm:text-sm font-semibold text-[#3bbca8] bg-[#3bbca8]/10 px-2 py-1 rounded-full">{dogs?.length || 0} dogs</span>
                </button>
                <button
                  onClick={() => router.push('/partners/directory')}
                  className="group w-full flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-[#76519f]/10 hover:to-[#76519f]/10 hover:shadow-md transition-all duration-200 border border-gray-200 touch-target"
                >
                  <span className="text-gray-700 font-medium group-hover:text-gray-900 text-sm sm:text-base">Find Partners</span>
                  <span className="text-xs sm:text-sm text-[#76519f] font-medium">Vets & Trainers</span>
                </button>
                <button
                  onClick={() => setShowAccountSettings(true)}
                  className="group w-full flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-[#ffa602]/10 hover:to-[#ffa602]/10 hover:shadow-md transition-all duration-200 border border-gray-200 touch-target"
                >
                  <span className="text-gray-700 font-medium group-hover:text-gray-900 text-sm sm:text-base">Account Settings</span>
                  <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 group-hover:text-[#ffa602] transition-colors" />
                </button>
                <button
                  onClick={() => router.push('/premium')}
                  className="group w-full flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl hover:from-blue-100 hover:to-purple-100 hover:shadow-md transition-all duration-200 border-2 border-blue-200 touch-target"
                >
                  <div className="flex flex-col items-start">
                    <span className="text-gray-700 font-medium group-hover:text-gray-900 text-sm sm:text-base">
                      {userData.is_premium ? 'Manage Subscription' : 'Upgrade to Premium'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {userData.is_premium ? 'View billing & usage' : 'Unlock all features + 14-day free trial'}
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    {userData.is_premium ? '✓ Premium' : '⭐ ₹99/mo'}
                  </span>
                </button>
              </div>
            </div>
            {/* Recent Dogs */}
            {dogs && dogs.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 overflow-hidden relative">
                <div className="absolute bottom-0 left-0 w-12 sm:w-16 h-12 sm:h-16 bg-[#76519f]/10 rounded-full translate-y-6 sm:translate-y-8 -translate-x-6 sm:-translate-x-8"></div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 relative z-10">Recent Dogs</h3>
                <div className="space-y-3 sm:space-y-4 relative z-10">
                  {dogs?.slice(0, 3).map((dog) => (
                    <div key={dog.id} className="group flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all duration-200 border border-gray-200">
                      <div className="flex items-center gap-3 sm:gap-4">
                        {dog.photo_url ? (
                          <img
                            src={dog.photo_url}
                            alt={dog.name}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover ring-2 ring-white shadow-md"
                          />
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#3bbca8]/20 rounded-xl flex items-center justify-center shadow-md ring-2 ring-white">
                            <span className="text-sm sm:text-base font-bold text-[#3bbca8]">
                              {dog.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900 group-hover:text-[#3bbca8] transition-colors text-sm sm:text-base">{dog.name}</p>
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">{dog.breed}</p>
                          {dog.health_id && (
                            <p className="text-xs text-[#3bbca8] font-medium bg-[#3bbca8]/10 px-2 py-1 rounded-full inline-block mt-1">
                              ID: {dog.health_id}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDogShare(dog)}
                        className="p-2 sm:p-3 text-gray-500 hover:text-[#3bbca8] hover:bg-[#3bbca8]/10 rounded-xl transition-all duration-200 touch-target"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {dogs && dogs.length > 3 && (
                    <button
                      onClick={() => router.push('/profile/dogs')}
                      className="w-full text-center py-3 text-[#3bbca8] hover:text-[#76519f] font-semibold hover:bg-[#3bbca8]/5 rounded-xl transition-all duration-200 touch-target"
                    >
                      View all {dogs?.length || 0} dogs →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Empty State for Dogs */}
        {(!dogs || dogs.length === 0) && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 text-center mb-6 sm:mb-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#3bbca8]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-[#3bbca8]" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Add Your First Dog</h3>
            <p className="text-gray-600 mb-6 text-sm sm:text-base">Start building your dog's profile and connect with the community</p>
            <button
              onClick={() => router.push('/profile/dogs/add')}
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-[#ffa602] hover:bg-[#e05a37] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium touch-target"
            >
              <Plus className="w-4 h-4" />
              Add Your Dog
            </button>
          </div>
        )}
        
        {/* Modals */}
        {showAccountSettings && userData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <AccountSettings 
                userData={userData}
                onClose={() => setShowAccountSettings(false)}
                onUpdate={handleProfileUpdate}
              />
            </div>
          </div>
        )}
        {showPrivacySettings && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <PrivacySettings onClose={() => setShowPrivacySettings(false)} />
            </div>
          </div>
        )}
        {showProfileExport && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <ProfileExport onClose={() => setShowProfileExport(false)} />
            </div>
          </div>
        )}
        {showDogShare && selectedDog && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <DogProfileShare
                dogId={selectedDog.id}
                dogName={selectedDog.name}
                onClose={() => {
                  setShowDogShare(false);
                  setSelectedDog(null);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}