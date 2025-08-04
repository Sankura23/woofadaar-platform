// src/app/profile/dogs/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, Heart, Edit3, Trash2, Calendar, Scale, MapPin, Shield, Camera, Users, Award } from 'lucide-react';
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
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDog, setSelectedDog] = useState<string | null>(null);
  const [deletingDog, setDeletingDog] = useState<string | null>(null);

  useEffect(() => {
    fetchDogs();
  }, []);

  const fetchDogs = async () => {
    try {
      const response = await fetch('/api/dogs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDogs(data.dogs || []);
        // Set first dog as selected if none selected
        if (data.dogs && data.dogs.length > 0 && !selectedDog) {
          setSelectedDog(data.dogs[0].id);
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
      const response = await fetch(`/api/dogs/${dogId}`, {
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
      <div className="min-h-screen bg-milk-white p-6">
        <div className="max-w-6xl mx-auto">
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
      <div className="min-h-screen bg-milk-white p-6">
        <div className="max-w-6xl mx-auto">
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
    <div className="min-h-screen bg-milk-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Dogs</h1>
            <p className="text-gray-600">
              Manage your furry family members and their health records
            </p>
          </div>
          <Link
            href="/profile/dogs/add"
            className="mt-4 sm:mt-0 inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Dog
          </Link>
        </div>

        {/* Stats Overview */}
        {dogs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Heart className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Dogs</p>
                  <p className="text-2xl font-bold text-gray-900">{dogs.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Dog IDs</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dogs.filter(dog => dog.health_id).length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Award className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Vaccinated</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dogs.filter(dog => dog.vaccination_status === 'up_to_date').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">{dogs.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dogs Grid */}
        {dogs.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-8 max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Dogs Added Yet</h3>
              <p className="text-gray-600 mb-6">
                Start by adding your first furry family member to track their health and activities.
              </p>
              <Link
                href="/profile/dogs/add"
                className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Your First Dog
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dogs.map((dog) => (
              <div
                key={dog.id}
                className={`bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${
                  selectedDog === dog.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedDog(dog.id)}
              >
                {/* Dog Photo */}
                <div className="relative h-48 bg-gray-100">
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
                    <Camera className="w-12 h-12 text-gray-400" />
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="absolute top-3 right-3 flex space-x-2">
                    <Link
                      href={`/profile/dogs/${dog.id}/edit`}
                      className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Edit3 className="w-4 h-4 text-gray-600" />
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDog(dog.id);
                      }}
                      disabled={deletingDog === dog.id}
                      className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors disabled:opacity-50"
                    >
                      {deletingDog === dog.id ? (
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-4 h-4 text-red-600" />
                      )}
                    </button>
                  </div>

                  {/* Health ID Badge */}
                  {dog.health_id && (
                    <div className="absolute bottom-3 left-3">
                      <div className="bg-primary text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                        <Shield className="w-3 h-3 mr-1" />
                        Dog ID
                      </div>
                    </div>
                  )}
                </div>

                {/* Dog Info */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">{dog.name}</h3>
                      <p className="text-gray-600 text-sm">{dog.breed}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getVaccinationStatusColor(dog.vaccination_status)}`}>
                      {getVaccinationStatusText(dog.vaccination_status)}
                    </span>
                  </div>

                  {/* Basic Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{formatAge(dog.age_months)}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Scale className="w-4 h-4 mr-2" />
                      <span>{dog.weight_kg} kg</span>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center text-sm text-gray-600 mb-4">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span className="truncate">{dog.location}</span>
                  </div>

                  {/* Personality Traits */}
                  {dog.personality_traits.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 mb-2">Personality</p>
                      <div className="flex flex-wrap gap-1">
                        {dog.personality_traits.slice(0, 3).map((trait) => (
                          <span
                            key={trait}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                          >
                            {trait}
                          </span>
                        ))}
                        {dog.personality_traits.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                            +{dog.personality_traits.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Health ID Display */}
                  {dog.health_id && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-900 mb-1">Dog ID</p>
                      <p className="text-sm font-mono text-primary truncate">{dog.health_id}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        {dogs.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/profile/dogs/add"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-5 h-5 text-primary mr-3" />
                <span className="font-medium text-gray-900">Add Another Dog</span>
              </Link>
              
              <Link
                href="/profile"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Users className="w-5 h-5 text-primary mr-3" />
                <span className="font-medium text-gray-900">View Profile</span>
              </Link>
              
              <Link
                href="/partners/directory"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Shield className="w-5 h-5 text-primary mr-3" />
                <span className="font-medium text-gray-900">Find Vets</span>
              </Link>
              
              <Link
                href="/waitlist"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Heart className="w-5 h-5 text-primary mr-3" />
                <span className="font-medium text-gray-900">Join Community</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}