'use client';

import { useState } from 'react';
import { Camera, Heart, Calendar, Scale, MapPin } from 'lucide-react';

interface DogFormData {
  name: string;
  breed: string;
  age_months: number;
  weight_kg: number;
  gender: 'male' | 'female';
  health_id: string; // NEW: Unique Woofadaar Health ID
  kennel_club_registration: string; // NEW: KCI integration
  vaccination_status: 'up_to_date' | 'pending' | 'not_started';
  spayed_neutered: boolean;
  microchip_id: string;
  emergency_contact: string;
  emergency_phone: string;
  medical_notes: string;
  personality_traits: string[];
  location: string;
  photo_url: string;
}

const INDIAN_DOG_BREEDS = [
  'Labrador Retriever', 'Golden Retriever', 'German Shepherd', 
  'Indian Pariah Dog', 'Indie/Mixed Breed', 'Pomeranian',
  'Beagle', 'Rottweiler', 'Siberian Husky', 'Cocker Spaniel',
  'Rajapalayam', 'Chippiparai', 'Kombai', 'Mudhol Hound',
  'Indian Spitz', 'Caravan Hound', 'Rampur Greyhound',
  'Bakharwal Dog', 'Gaddi Kutta', 'Bully Kutta', 'Other'
];

const PERSONALITY_TRAITS = [
  'Friendly', 'Energetic', 'Calm', 'Playful', 'Protective',
  'Social', 'Independent', 'Anxious', 'Curious', 'Gentle',
  'Alert', 'Lazy', 'Aggressive', 'Shy', 'Intelligent'
];

const INDIAN_CITIES = [
  'Mumbai, Maharashtra', 'Delhi, Delhi', 'Bangalore, Karnataka',
  'Hyderabad, Telangana', 'Chennai, Tamil Nadu', 'Kolkata, West Bengal',
  'Pune, Maharashtra', 'Ahmedabad, Gujarat', 'Jaipur, Rajasthan',
  'Surat, Gujarat', 'Lucknow, Uttar Pradesh', 'Kanpur, Uttar Pradesh',
  'Nagpur, Maharashtra', 'Indore, Madhya Pradesh', 'Thane, Maharashtra',
  'Bhopal, Madhya Pradesh', 'Visakhapatnam, Andhra Pradesh',
  'Pimpri-Chinchwad, Maharashtra', 'Patna, Bihar', 'Vadodara, Gujarat'
];

export default function DogProfileForm({ dogId, onSave }: { 
  dogId?: string; 
  onSave: (success: boolean) => void; 
}) {
  const [formData, setFormData] = useState<DogFormData>({
    name: '',
    breed: '',
    age_months: 0,
    weight_kg: 0,
    gender: 'male',
    health_id: '', // Will be auto-generated
    kennel_club_registration: '',
    vaccination_status: 'up_to_date',
    spayed_neutered: false,
    microchip_id: '',
    emergency_contact: '',
    emergency_phone: '',
    medical_notes: '',
    personality_traits: [],
    location: '',
    photo_url: ''
  });

  const [imageError, setImageError] = useState(false);
  const [isGeneratingHealthId, setIsGeneratingHealthId] = useState(false);

  // Generate unique Woofadaar Health ID
  const generateHealthId = async () => {
    setIsGeneratingHealthId(true);
    try {
      const response = await fetch('/api/dogs/generate-health-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: formData.name, 
          breed: formData.breed,
          location: formData.location 
        })
      });
      
      if (response.ok) {
        const { healthId } = await response.json();
        setFormData(prev => ({ ...prev, health_id: healthId }));
      }
    } catch (error) {
      console.error('Error generating health ID:', error);
    } finally {
      setIsGeneratingHealthId(false);
    }
  };

  const handleTraitToggle = (trait: string) => {
    setFormData(prev => ({
      ...prev,
      personality_traits: prev.personality_traits.includes(trait)
        ? prev.personality_traits.filter(t => t !== trait)
        : [...prev.personality_traits, trait]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(dogId ? `/api/dogs/${dogId}` : '/api/dogs', {
        method: dogId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        body: JSON.stringify({
          name: formData.name,
          breed: formData.breed,
          age_months: formData.age_months,
          weight_kg: formData.weight_kg,
          gender: formData.gender,
          photo_url: formData.photo_url,
          medical_notes: formData.medical_notes,
          health_id: formData.health_id,
          kennel_club_registration: formData.kennel_club_registration,
          emergency_contact: formData.emergency_contact,
          emergency_phone: formData.emergency_phone,
          personality_traits: formData.personality_traits,
          vaccination_status: formData.vaccination_status,
          spayed_neutered: formData.spayed_neutered,
          microchip_id: formData.microchip_id,
          location: formData.location
        })
      });

      if (response.ok) {
        onSave(true);
      } else {
        onSave(false);
      }
    } catch (error) {
      console.error('Error saving dog profile:', error);
      onSave(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            {dogId ? 'Edit' : 'Add'} Dog Profile
          </h2>
          <p className="text-gray-600 mt-2">
            Create a comprehensive profile for your furry friend
          </p>
        </div>
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
          <Heart className="w-8 h-8 text-white" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Photo Upload Section */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dog Photo</h3>
          <div className="flex items-center space-x-6">
            <div className="relative">
              {formData.photo_url && !imageError ? (
                <img
                  src={formData.photo_url}
                  alt={formData.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-primary"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                type="url"
                placeholder="Photo URL (optional)"
                value={formData.photo_url}
                onChange={(e) => setFormData(prev => ({ ...prev, photo_url: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-sm text-gray-500 mt-1">
                Add a photo URL or upload will be available soon
              </p>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dog's Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Buddy, Bella, Max"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Breed *
            </label>
            <select
              required
              value={formData.breed}
              onChange={(e) => setFormData(prev => ({ ...prev, breed: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select breed</option>
              {INDIAN_DOG_BREEDS.map(breed => (
                <option key={breed} value={breed}>{breed}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Age (in months) *
            </label>
            <input
              type="number"
              required
              min="1"
              max="300"
              value={formData.age_months}
              onChange={(e) => setFormData(prev => ({ ...prev, age_months: parseInt(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., 24 (for 2 years old)"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.age_months > 0 && `≈ ${Math.floor(formData.age_months / 12)} years, ${formData.age_months % 12} months`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weight (kg) *
            </label>
            <input
              type="number"
              required
              min="0.5"
              max="100"
              step="0.1"
              value={formData.weight_kg}
              onChange={(e) => setFormData(prev => ({ ...prev, weight_kg: parseFloat(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., 25.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender *
            </label>
            <div className="flex space-x-4">
              {['male', 'female'].map((gender) => (
                <label key={gender} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value={gender}
                    checked={formData.gender === gender}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' }))}
                    className="mr-2"
                  />
                  <span className="capitalize">{gender}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location *
            </label>
            <select
              required
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select city</option>
              {INDIAN_CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        {/* NEW: Health ID & Registration Section */}
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-primary" />
            Woofadaar Health ID & Registration
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Woofadaar Health ID
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.health_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, health_id: e.target.value }))}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Will be auto-generated"
                  readOnly={!formData.health_id}
                />
                <button
                  type="button"
                  onClick={generateHealthId}
                  disabled={!formData.name || !formData.breed || isGeneratingHealthId}
                  className="bg-primary text-white px-4 py-3 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingHealthId ? '...' : 'Generate'}
                </button>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Unique health passport for vet visits & discounts across India
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                KCI Registration Number
              </label>
              <input
                type="text"
                value={formData.kennel_club_registration}
                onChange={(e) => setFormData(prev => ({ ...prev, kennel_club_registration: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Kennel Club of India registration (optional)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Link with Kennel Club of India for verified breeding records
              </p>
            </div>
          </div>
        </div>

        {/* Health Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Health Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vaccination Status
              </label>
              <select
                value={formData.vaccination_status}
                onChange={(e) => setFormData(prev => ({ ...prev, vaccination_status: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="up_to_date">Up to date</option>
                <option value="pending">Pending</option>
                <option value="not_started">Not started</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Microchip ID
              </label>
              <input
                type="text"
                value={formData.microchip_id}
                onChange={(e) => setFormData(prev => ({ ...prev, microchip_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="15-digit microchip number (optional)"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="spayed_neutered"
              checked={formData.spayed_neutered}
              onChange={(e) => setFormData(prev => ({ ...prev, spayed_neutered: e.target.checked }))}
              className="mr-3"
            />
            <label htmlFor="spayed_neutered" className="text-sm font-medium text-gray-700">
              Spayed/Neutered
            </label>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Emergency Contact Name
            </label>
            <input
              type="text"
              value={formData.emergency_contact}
              onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Backup contact person"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Emergency Phone
            </label>
            <input
              type="tel"
              value={formData.emergency_phone}
              onChange={(e) => setFormData(prev => ({ ...prev, emergency_phone: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        {/* Personality Traits */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Personality Traits
          </label>
          <div className="flex flex-wrap gap-2">
            {PERSONALITY_TRAITS.map(trait => (
              <button
                key={trait}
                type="button"
                onClick={() => handleTraitToggle(trait)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  formData.personality_traits.includes(trait)
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {trait}
              </button>
            ))}
          </div>
        </div>

        {/* Medical Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Medical Notes & Allergies
          </label>
          <textarea
            value={formData.medical_notes}
            onChange={(e) => setFormData(prev => ({ ...prev, medical_notes: e.target.value }))}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Any medical conditions, allergies, or special care instructions..."
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center space-x-2"
          >
            <Heart className="w-4 h-4" />
            <span>{dogId ? 'Update' : 'Add'} Dog Profile</span>
          </button>
        </div>
      </form>
    </div>
  );
}