// src/app/profile/dogs/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, Heart, Edit3, Trash2, Calendar, Scale, MapPin, Shield } from 'lucide-react';
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
    if (!confirm('Are you sure you want to delete this dog profile?')) return;

    try {
      const response = await fetch(`/api/dogs/${dogId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        }
      });

      if (response.ok) {
        setDogs(dogs.filter(dog => dog.id !== dogId));
      } else {
        alert('Failed to delete dog profile');
      }
    } catch (error) {
      console.error('Error deleting dog:', error);
      alert('Failed to delete dog profile');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-milk-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="w-20 h-20 bg-gray-300 rounded-full mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2 mx-auto"></div>
                </div>
              ))}
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Dogs</h1>
            <p className="text-gray-600 mt-2">
              Manage your furry family members
            </p>
          </div>
          <Link
            href="/profile/dogs/add"
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 font-medium flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Dog</span>
          </Link>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Empty State */}
        {dogs.length === 0 && !error && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Heart className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              No Dogs Added Yet
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Start building your dog's profile to connect with the community and track their health journey.
            </p>
            <Link
              href="/profile/dogs/add"
              className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-primary/90 font-medium inline-flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add Your First Dog</span>
            </Link>
          </div>
        )}

        {/* Dogs Grid */}
        {dogs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dogs.map((dog) => (
              <div
                key={dog.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Dog Photo */}
                <div className="relative h-48 bg-gradient-to-br from-primary/20 to-secondary/20">
                  {dog.photo_url ? (
                    <img
                      src={dog.photo_url}
                      alt={dog.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Heart className="w-12 h-12 text-primary/60" />
                    </div>
                  )}
                  
                  {/* Health ID Badge */}
                  {dog.health_id && (
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1">
                      <Shield className="w-3 h-3 text-primary" />
                      <span className="text-xs font-medium text-primary">ID: {dog.health_id}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="absolute bottom-2 right-2 flex space-x-2">
                    <Link
                      href={`/profile/dogs/${dog.id}/edit`}
                      className="bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-colors"
                    >
                      <Edit3 className="w-4 h-4 text-gray-600" />
                    </Link>
                    <button
                      onClick={() => deleteDog(dog.id)}
                      className="bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-colors text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Dog Info */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{dog.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVaccinationStatusColor(dog.vaccination_status)}`}>
                      {getVaccinationStatusText(dog.vaccination_status)}
                    </span>
                  </div>

                  <p className="text-gray-600 mb-4">{dog.breed}</p>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{Math.floor(dog.age_months / 12)}y {dog.age_months % 12}m</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Scale className="w-4 h-4" />
                      <span>{dog.weight_kg} kg</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 col-span-2">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{dog.location}</span>
                    </div>
                  </div>

                  {/* Personality Traits */}
                  {dog.personality_traits && dog.personality_traits.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(dog.personality_traits) ? dog.personality_traits : []).slice(0, 3).map(trait => (
                          <span
                            key={trait}
                            className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                          >
                            {trait}
                          </span>
                        ))}
                        {Array.isArray(dog.personality_traits) && dog.personality_traits.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{dog.personality_traits.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* KCI Registration */}
                  {dog.kennel_club_registration && (
                    <div className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 mb-2">
                      KCI: {dog.kennel_club_registration}
                    </div>
                  )}

                  {/* Gender Badge */}
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      dog.gender === 'male' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-pink-100 text-pink-800'
                    }`}>
                      {dog.gender === 'male' ? '♂ Male' : '♀ Female'}
                    </span>
                    <span className="text-xs text-gray-400">
                      Added {new Date(dog.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Stats Summary */}
        {dogs.length > 0 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="text-2xl font-bold text-primary mb-2">{dogs.length}</div>
              <p className="text-gray-600">Total Dogs</p>
            </div>
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {dogs.filter(d => d.vaccination_status === 'up_to_date').length}
              </div>
              <p className="text-gray-600">Vaccinated</p>
            </div>
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {dogs.filter(d => d.health_id).length}
              </div>
              <p className="text-gray-600">With Health ID</p>
            </div>
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {dogs.filter(d => d.kennel_club_registration).length}
              </div>
              <p className="text-gray-600">KCI Registered</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}