'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HealthDashboard from '@/components/health/HealthDashboard';
import Link from 'next/link';
import { Dog, Heart, Plus } from 'lucide-react';

interface Dog {
  id: string;
  name: string;
  breed: string;
  age_months: number;
  photo_url?: string;
}

export default function HealthPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUserDogs();
  }, []);

  const fetchUserDogs = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch('/api/dogs', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDogs(data.data?.dogs || []);
        if (data.data?.dogs?.length > 0) {
          setSelectedDog(data.data.dogs[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching dogs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-milk-white via-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3bbca8] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading health dashboard...</p>
        </div>
      </div>
    );
  }

  if (dogs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-milk-white via-gray-50 to-gray-100 px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Dogs Found</h3>
            <p className="text-gray-500 mb-6">
              Add your first dog to start tracking their health and wellness.
            </p>
            <Link 
              href="/profile"
              className="inline-flex items-center px-6 py-3 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your Dog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-milk-white via-gray-50 to-gray-100 px-4 py-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Health Tracking</h1>
          <p className="text-gray-600">Monitor your dog's health and wellness journey</p>
        </div>

        {/* Dog Selection */}
        {dogs.length > 1 && (
          <div className="mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {dogs.map((dog) => (
                <button
                  key={dog.id}
                  onClick={() => setSelectedDog(dog)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    selectedDog?.id === dog.id
                      ? 'bg-[#3bbca8] text-white border-[#3bbca8]'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {dog.photo_url ? (
                    <img
                      src={dog.photo_url}
                      alt={dog.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <Dog className="w-5 h-5" />
                  )}
                  <span className="font-medium">{dog.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Health Dashboard */}
        {selectedDog && (
          <HealthDashboard dogId={selectedDog.id} />
        )}
      </div>
    </div>
  );
}