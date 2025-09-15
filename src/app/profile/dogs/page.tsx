// src/app/profile/dogs/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Heart, Edit3, Trash2, Calendar, Scale, MapPin, Shield, Camera, Users, Award, QrCode } from 'lucide-react';
import Link from 'next/link';


interface Dog {
  id: string;
  name: string;
  breed: string;
  age_months: number;
  weight_kg: number;
  gender: 'male' | 'female';
  health_id: string;
  kennel_club_registration?: string;
  vaccination_status: 'up_to_date' | 'pending' | 'not_started';
  location: string;
  photo_url?: string;
  personality_traits: string[];
  created_at: string;
}

export default function DogsPage() {
  const searchParams = useSearchParams();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDog, setSelectedDog] = useState<string | null>(null);
  const [deletingDog, setDeletingDog] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeDog, setQrCodeDog] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchDogs();
  }, []);

  // Listen for refresh parameter changes
  useEffect(() => {
    const refreshParam = searchParams?.get('refresh');
    const addedParam = searchParams?.get('added');
    if (refreshParam || addedParam) {
      // Clear any existing dogs state first to force a fresh fetch
      setDogs([]);
      // Add a small delay if a dog was just added to ensure backend processing is complete
      const delay = addedParam ? 200 : 0;
      setTimeout(() => {
        fetchDogs();
      }, delay);
    }
  }, [searchParams]);

  // Refresh dogs when returning to this page
  useEffect(() => {
    const handleFocus = () => {
      fetchDogs();
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchDogs();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchDogs = async () => {
    try {
      const response = await fetch(`/api/auth/working-dogs?t=${Date.now()}&r=${Math.random()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        setDogs(data.data?.dogs || []);
        // Set first dog as selected if none selected
        if (data.data?.dogs && data.data.dogs.length > 0 && !selectedDog) {
          setSelectedDog(data.data.dogs[0].id);
        }
      } else {
        setError('Failed to fetch dogs');
      }
    } catch (error) {
      console.error('Error fetching dogs:', error);
      setError('Failed to load dogs');
    } finally {
      setLoading(false);
    }
  };

  const deleteDog = async (dogId: string) => {
    if (!confirm('Are you sure you want to delete this dog profile? This action cannot be undone.')) return;

    setDeletingDog(dogId);
    try {
      const response = await fetch(`/api/auth/working-dogs/${dogId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        }
      });

      if (response.ok) {
        setDogs(dogs.filter(dog => dog.id !== dogId));
        // If deleted dog was selected, select another dog
        if (selectedDog === dogId) {
          const remainingDogs = dogs.filter(dog => dog.id !== dogId);
          setSelectedDog(remainingDogs.length > 0 ? remainingDogs[0].id : null);
        }
      } else {
        alert('Failed to delete dog profile');
      }
    } catch (error) {
      console.error('Error deleting dog:', error);
      alert('Failed to delete dog profile');
    } finally {
      setDeletingDog(null);
    }
  };

  const getVaccinationStatusColor = (status: string) => {
    switch (status) {
      case 'up_to_date': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'not_started': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getVaccinationStatusText = (status: string) => {
    switch (status) {
      case 'up_to_date': return 'Up to Date';
      case 'pending': return 'Pending';
      case 'not_started': return 'Not Started';
      default: return 'Unknown';
    }
  };

  const showQRCodeForDog = (dog: Dog) => {
    setQrCodeDog({ id: dog.id, name: dog.name });
    setShowQRCode(true);
  };

  const closeQRCode = () => {
    setShowQRCode(false);
    setQrCodeDog(null);
  };

  const formatAge = (months: number) => {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else if (remainingMonths === 0) {
      return `${years} year${years !== 1 ? 's' : ''}`;
    } else {
      return `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="h-32 bg-gray-300 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg max-w-md mx-auto">
              <p className="text-lg font-medium mb-2">Error Loading Dogs</p>
              <p className="text-sm mb-4">{error}</p>
              <button
                onClick={fetchDogs}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 py-4 sm:py-6 lg:py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div className="text-center sm:text-left mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My Dogs</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Manage your furry family members and their health records
            </p>
          </div>
          <Link
            href="/profile/dogs/add"
            className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 bg-[#3bbca8] text-white rounded-xl hover:bg-[#339990] transition-colors font-medium touch-target shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="hidden sm:inline">Add New Dog</span>
            <span className="sm:hidden">Add Dog</span>
          </Link>
        </div>

        {/* Stats Overview */}
        {dogs && dogs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Heart className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Dogs</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{dogs?.length || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Award className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Vaccinated</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {dogs?.filter(dog => dog.vaccination_status === 'up_to_date').length || 0}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Active</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{dogs?.length || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dogs Grid */}
        {(!dogs || dogs.length === 0) ? (
          <div className="text-center py-8 sm:py-12">
            <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 max-w-md mx-auto border border-gray-100">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">No Dogs Added Yet</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                Start by adding your first furry family member to track their health and activities.
              </p>
              <Link
                href="/profile/dogs/add"
                className="inline-flex items-center px-4 sm:px-6 py-2.5 sm:py-3 bg-[#3bbca8] text-white rounded-xl hover:bg-[#339990] transition-colors font-medium touch-target shadow-md hover:shadow-lg"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Add Your First Dog
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {dogs?.map((dog) => (
              <div
                key={dog.id}
                className={`bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer border border-gray-100 ${
                  selectedDog === dog.id ? 'ring-2 ring-[#3bbca8]' : ''
                }`}
                onClick={() => setSelectedDog(dog.id)}
              >
                {/* Dog Photo */}
                <div className="relative h-40 sm:h-48 bg-gray-100">
                  {dog.photo_url ? (
                    <img
                      src={dog.photo_url}
                      alt={dog.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`absolute inset-0 flex items-center justify-center ${dog.photo_url ? 'hidden' : ''}`}>
                    <Camera className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="absolute top-2 sm:top-3 right-2 sm:right-3 flex space-x-1 sm:space-x-2">
                    {dog.health_id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showQRCodeForDog(dog);
                        }}
                        className="p-1.5 sm:p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors touch-target"
                        title="View QR Code"
                      >
                        <QrCode className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                      </button>
                    )}
                    <Link
                      href={`/profile/dogs/${dog.id}/edit`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 sm:p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors touch-target"
                      title="Edit Dog"
                    >
                      <Edit3 className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDog(dog.id);
                      }}
                      disabled={deletingDog === dog.id}
                      className="p-1.5 sm:p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors touch-target disabled:opacity-50"
                      title="Delete Dog"
                    >
                      {deletingDog === dog.id ? (
                        <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Dog Info */}
                <div className="p-3 sm:p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">{dog.name}</h3>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getVaccinationStatusColor(dog.vaccination_status)}`}>
                      {getVaccinationStatusText(dog.vaccination_status)}
                    </span>
                  </div>
                  
                  <div className="space-y-1 sm:space-y-2 text-sm sm:text-base">
                    <div className="flex items-center text-gray-600">
                      <span className="mr-2">🐕</span>
                      <span className="font-medium">{dog.breed}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-gray-400" />
                      <span>{formatAge(dog.age_months)}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Scale className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-gray-400" />
                      <span>{dog.weight_kg} kg</span>
                    </div>
                    {dog.location && (
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-gray-400" />
                        <span className="truncate">{dog.location}</span>
                      </div>
                    )}
                    {dog.health_id && (
                      <div className="flex items-center text-[#3bbca8]">
                        <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                        <span className="font-medium text-xs sm:text-sm">ID: {dog.health_id}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* QR Code Modal */}
        {showQRCode && qrCodeDog && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
              <div className="text-center">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                  QR Code for {qrCodeDog.name}
                </h3>
                <div className="bg-gray-100 rounded-lg p-4 mb-4">
                  <div className="w-48 h-48 mx-auto bg-white rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-32 h-32 bg-gray-300 rounded-lg flex items-center justify-center mb-2">
                        <QrCode className="w-8 h-8 text-gray-500" />
                      </div>
                      <p className="text-xs text-gray-500">QR Code Placeholder</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={closeQRCode}
                  className="w-full px-4 py-2 bg-[#3bbca8] text-white rounded-lg hover:bg-[#339990] transition-colors font-medium touch-target"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}