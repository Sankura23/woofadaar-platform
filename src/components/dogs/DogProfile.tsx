'use client';

import { useState } from 'react';
import { Camera, Heart, MapPin, Calendar, Scale, Phone, Shield, X } from 'lucide-react';
import PhotoUpload from './PhotoUpload';

interface Dog {
  id: string;
  name: string;
  breed: string;
  age_months: number;
  weight_kg: number;
  gender: 'male' | 'female';
  photo_url?: string;
  health_id?: string;
  kennel_club_registration?: string;
  vaccination_status: 'up_to_date' | 'pending' | 'not_started';
  spayed_neutered: boolean;
  microchip_id?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  medical_notes?: string;
  personality_traits: string[];
  location: string;
}

interface DogProfileProps {
  dog: Dog;
  onEdit?: () => void;
  onPhotoUpdated?: (newPhotoUrl: string) => void;
}

export default function DogProfile({ dog, onEdit, onPhotoUpdated }: DogProfileProps) {
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [currentDog, setCurrentDog] = useState(dog);

  const getVaccinationStatusColor = (status: string) => {
    switch (status) {
      case 'up_to_date': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'not_started': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatAge = (months: number) => {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years === 0) return `${remainingMonths} months`;
    if (remainingMonths === 0) return `${years} ${years === 1 ? 'year' : 'years'}`;
    return `${years} ${years === 1 ? 'year' : 'years'}, ${remainingMonths} months`;
  };

  const updateDogPhoto = async (dogId: string, photoUrl: string) => {
    setIsUpdatingPhoto(true);
    
    try {
      const response = await fetch(`/api/dogs/${dogId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        body: JSON.stringify({ photo_url: photoUrl }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setCurrentDog(prev => ({ ...prev, photo_url: photoUrl }));
        setIsEditingPhoto(false);
        
        // Call the optional callback to update parent component
        if (onPhotoUpdated) {
          onPhotoUpdated(photoUrl);
        }
      } else {
        const error = await response.json();
        alert(`Failed to update photo: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to update photo:', error);
      alert('Failed to update photo. Please try again.');
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-4xl mx-auto">
      {/* Header with Photo */}
      <div className="bg-gradient-to-br from-[#3bbca8] to-[#e05a37] p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
          {/* Dog Photo - Clickable */}
          <div className="relative group">
            {currentDog.photo_url ? (
              <div 
                className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white shadow-lg cursor-pointer hover:opacity-80 transition-opacity relative"
                onClick={() => setIsEditingPhoto(true)}
                title="Click to change photo"
              >
                <img
                  src={currentDog.photo_url}
                  alt={`${currentDog.name}'s photo`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const placeholder = target.nextElementSibling as HTMLElement;
                    if (placeholder) placeholder.style.display = 'flex';
                  }}
                />
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
              </div>
            ) : (
              <div 
                className="w-24 h-24 md:w-32 md:h-32 bg-white/20 rounded-full flex items-center justify-center border-4 border-white shadow-lg cursor-pointer hover:bg-white/30 transition-colors"
                onClick={() => setIsEditingPhoto(true)}
                title="Click to add photo"
              >
                <div className="text-center">
                  <Camera className="w-8 h-8 md:w-12 md:h-12 text-white mx-auto mb-1" />
                  <span className="text-white text-xs">Add Photo</span>
                </div>
              </div>
            )}
          </div>

          {/* Dog Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              {currentDog.name}
            </h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-white/90">
              <div className="flex items-center">
                <Heart className="w-4 h-4 mr-1" />
                <span>{currentDog.breed}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                <span>{formatAge(currentDog.age_months)}</span>
              </div>
              <div className="flex items-center">
                <Scale className="w-4 h-4 mr-1" />
                <span>{currentDog.weight_kg}kg</span>
              </div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                <span>{currentDog.location}</span>
              </div>
            </div>
            
            {currentDog.health_id && (
              <div className="mt-3 inline-block bg-white/20 rounded-full px-4 py-2">
                <span className="text-white text-sm font-medium">
                  Health ID: {currentDog.health_id}
                </span>
              </div>
            )}
          </div>

          {/* Edit Button */}
          {onEdit && (
            <button
              onClick={onEdit}
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition-colors duration-200"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-8 space-y-8">
        {/* Basic Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Gender</h3>
            <p className="text-lg font-semibold text-gray-900 capitalize">{currentDog.gender}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Vaccination Status</h3>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getVaccinationStatusColor(currentDog.vaccination_status)}`}>
              {currentDog.vaccination_status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Spayed/Neutered</h3>
            <p className="text-lg font-semibold text-gray-900">
              {currentDog.spayed_neutered ? 'Yes' : 'No'}
            </p>
          </div>
        </div>

        {/* Personality Traits */}
        {currentDog.personality_traits.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personality Traits</h3>
            <div className="flex flex-wrap gap-2">
              {currentDog.personality_traits.map(trait => (
                <span 
                  key={trait}
                  className="px-3 py-1 bg-[#3bbca8] text-white rounded-full text-sm font-medium"
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Medical Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Medical Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentDog.microchip_id && (
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-[#3bbca8] mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Microchip ID</h4>
                  <p className="text-gray-600 text-sm">{currentDog.microchip_id}</p>
                </div>
              </div>
            )}

            {currentDog.kennel_club_registration && (
              <div className="flex items-start space-x-3">
                <Heart className="w-5 h-5 text-[#3bbca8] mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">KCI Registration</h4>
                  <p className="text-gray-600 text-sm">{currentDog.kennel_club_registration}</p>
                </div>
              </div>
            )}
          </div>

          {currentDog.medical_notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Medical Notes & Allergies</h4>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{currentDog.medical_notes}</p>
            </div>
          )}
        </div>

        {/* Emergency Contact */}
        {(currentDog.emergency_contact || currentDog.emergency_phone) && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Phone className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  {currentDog.emergency_contact && (
                    <h4 className="font-medium text-gray-900">{currentDog.emergency_contact}</h4>
                  )}
                  {currentDog.emergency_phone && (
                    <p className="text-gray-600">{currentDog.emergency_phone}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Photo Edit Modal */}
      {isEditingPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Update {currentDog.name}'s Photo
              </h3>
              <button
                onClick={() => setIsEditingPhoto(false)}
                disabled={isUpdatingPhoto}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <PhotoUpload 
                onPhotoUploaded={(newPhotoUrl) => {
                  updateDogPhoto(currentDog.id, newPhotoUrl);
                }}
                currentPhoto={currentDog.photo_url}
              />
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button 
                onClick={() => setIsEditingPhoto(false)}
                disabled={isUpdatingPhoto}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>

            {/* Loading Overlay */}
            {isUpdatingPhoto && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-xl">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-[#3bbca8] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-600">Updating photo...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}