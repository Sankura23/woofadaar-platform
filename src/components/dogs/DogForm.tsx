'use client';

import { useState, useEffect } from 'react';
import { Camera, Heart, Calendar, Scale, MapPin } from 'lucide-react';
import PhotoUpload from './PhotoUpload';
import { useLanguage } from '../../contexts/LanguageContext';

interface DogFormData {
  name: string;
  breed: string;
  age_months: number;
  weight_kg: number;
  gender: 'male' | 'female';
  health_id: string;
  kennel_club_registration: string;
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
  'Bakharwal Dog', 'Gaddi Kutta', 'Bully Kutta',
  'Pug', 'Shih Tzu', 'Dachshund', 'Boxer', 'Doberman',
  'Great Dane', 'Saint Bernard', 'Bernese Mountain Dog',
  'Border Collie', 'Australian Shepherd', 'Shiba Inu',
  'Akita', 'Chow Chow', 'Shar Pei', 'Poodle', 'Bichon Frise',
  'Maltese', 'Yorkshire Terrier', 'Jack Russell Terrier',
  'Bull Terrier', 'Staffordshire Bull Terrier', 'Pit Bull',
  'American Bulldog', 'English Bulldog', 'French Bulldog',
  'Boston Terrier', 'Cavalier King Charles Spaniel',
  'Brittany Spaniel', 'English Springer Spaniel',
  'Welsh Corgi', 'Australian Cattle Dog', 'Blue Heeler',
  'Kelpie', 'Border Terrier', 'West Highland White Terrier',
  'Scottish Terrier', 'Cairn Terrier', 'Norwich Terrier',
  'Norfolk Terrier', 'Airedale Terrier', 'Irish Terrier',
  'Welsh Terrier', 'Lakeland Terrier', 'Bedlington Terrier',
  'Dandie Dinmont Terrier', 'Skye Terrier', 'Other'
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

export default function DogForm({ dogId, onSave }: { 
  dogId?: string; 
  onSave: (success: boolean) => void; 
}) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<DogFormData>({
    name: '',
    breed: '',
    age_months: 0,
    weight_kg: 0,
    gender: 'male',
    health_id: '',
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

  const [customBreed, setCustomBreed] = useState('');
  const [isGeneratingHealthId, setIsGeneratingHealthId] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load existing dog data if editing
  useEffect(() => {
    if (dogId) {
      loadDogData();
    }
  }, [dogId]);

  const loadDogData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/dogs/${dogId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        }
      });

      if (response.ok) {
        const { dog } = await response.json();
        setFormData({
          name: dog.name,
          breed: dog.breed,
          age_months: dog.age_months,
          weight_kg: dog.weight_kg,
          gender: dog.gender,
          health_id: dog.health_id || '',
          kennel_club_registration: dog.kennel_club_registration || '',
          vaccination_status: dog.vaccination_status,
          spayed_neutered: dog.spayed_neutered,
          microchip_id: dog.microchip_id || '',
          emergency_contact: dog.emergency_contact || '',
          emergency_phone: dog.emergency_phone || '',
          medical_notes: dog.medical_notes || '',
          personality_traits: Array.isArray(dog.personality_traits) ? dog.personality_traits : [],
          location: dog.location || '',
          photo_url: dog.photo_url || ''
        });

        // Set custom breed if it's not in the predefined list
        if (!INDIAN_DOG_BREEDS.includes(dog.breed)) {
          setCustomBreed(dog.breed);
          setFormData(prev => ({ ...prev, breed: 'Other' }));
        }
      }
    } catch (error) {
      console.error('Error loading dog data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUploaded = (url: string) => {
    setFormData(prev => ({ ...prev, photo_url: url }));
  };

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
    
    const formDataToSend = {
      name: formData.name,
      breed: formData.breed === 'Other' ? customBreed : formData.breed,
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
    };
    
    try {
      const response = await fetch(dogId ? `/api/dogs/${dogId}` : '/api/dogs', {
        method: dogId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        body: JSON.stringify(formDataToSend)
      });

      if (response.ok) {
        const result = await response.json();
        onSave(true);
      } else {
        const errorData = await response.json();
        console.error('Failed to create dog:', errorData);
        onSave(false);
      }
    } catch (error) {
      console.error('Error saving dog profile:', error);
      onSave(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{t('messages.loadingDogProfile')}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
            <div className="text-center sm:text-left mb-4 sm:mb-0">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {dogId ? t('dogs.editDog') : t('dogs.addDog')}
              </h2>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">
                {dogId ? t('common.update') : t('common.add')} a comprehensive profile for your furry friend
              </p>
            </div>
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#3bbca8] rounded-full flex items-center justify-center mx-auto sm:mx-0">
              <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
        {/* Photo Upload Section */}
        <PhotoUpload 
          onPhotoUploaded={handlePhotoUploaded}
          currentPhoto={formData.photo_url}
        />

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('dogs.dogName')} *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3bbca8] touch-target"
              placeholder="e.g., Buddy, Bella, Max"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('dogs.breed')} *
            </label>
            <select
              required
              value={formData.breed}
              onChange={(e) => setFormData(prev => ({ ...prev, breed: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3bbca8] touch-target"
            >
              <option value="">{t('dogs.selectBreed')}</option>
              {INDIAN_DOG_BREEDS.map(breed => (
                <option key={breed} value={breed}>{breed}</option>
              ))}
            </select>
            
            {formData.breed === 'Other' && (
              <div className="mt-2">
                <input
                  type="text"
                  placeholder={t('dogs.customBreed')}
                  value={customBreed}
                  onChange={(e) => setCustomBreed(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3bbca8] touch-target"
                  autoComplete="off"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('dogs.age')} *
            </label>
            <input
              type="number"
              required
              min="1"
              max="300"
              value={formData.age_months}
              onChange={(e) => setFormData(prev => ({ ...prev, age_months: parseInt(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3bbca8] touch-target"
              placeholder={t('forms.ageHelper')}
              inputMode="numeric"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.age_months > 0 && t('dogs.ageHelper', { years: Math.floor(formData.age_months / 12), months: formData.age_months % 12 })}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('dogs.weight')} *
            </label>
            <input
              type="number"
              required
              min="0.5"
              max="100"
              step="0.1"
              value={formData.weight_kg}
              onChange={(e) => setFormData(prev => ({ ...prev, weight_kg: parseFloat(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3bbca8] touch-target"
              placeholder={t('forms.weightHelper')}
              inputMode="decimal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('dogs.gender')} *
            </label>
            <div className="flex space-x-6">
              {['male', 'female'].map((gender) => (
                <label key={gender} className="flex items-center cursor-pointer touch-target">
                  <input
                    type="radio"
                    name="gender"
                    value={gender}
                    checked={formData.gender === gender}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' }))}
                    className="w-4 h-4 mr-3 text-[#3bbca8] focus:ring-[#3bbca8] border-gray-300"
                  />
                  <span className="capitalize font-medium">{t(`dogs.${gender}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('dogs.location')} *
            </label>
            <select
              required
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3bbca8] touch-target"
            >
              <option value="">{t('dogs.selectCity')}</option>
              {INDIAN_CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Health ID & Registration Section */}
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-[#3bbca8]" />
            {t('health.woofadaarHealthId')} & Registration
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('health.woofadaarHealthId')}
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.health_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, health_id: e.target.value }))}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                  placeholder={t('health.healthIdPlaceholder')}
                  readOnly={!formData.health_id}
                />
                <button
                  type="button"
                  onClick={generateHealthId}
                  disabled={!formData.name || !formData.breed || isGeneratingHealthId}
                  className="bg-[#3bbca8] text-white px-4 py-3 rounded-lg hover:bg-[#3bbca8]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingHealthId ? '...' : t('health.generateHealthId')}
                </button>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {t('health.healthIdHelper')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('health.kciRegistration')}
              </label>
              <input
                type="text"
                value={formData.kennel_club_registration}
                onChange={(e) => setFormData(prev => ({ ...prev, kennel_club_registration: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                placeholder={t('health.kciPlaceholder')}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('health.kciHelper')}
              </p>
            </div>
          </div>
        </div>

        {/* Health Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('health.healthInformation')}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('health.vaccinationStatus')}
              </label>
              <select
                value={formData.vaccination_status}
                onChange={(e) => setFormData(prev => ({ ...prev, vaccination_status: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
              >
                <option value="up_to_date">{t('health.upToDate')}</option>
                <option value="pending">{t('health.pending')}</option>
                <option value="not_started">{t('health.notStarted')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('health.microchipId')}
              </label>
              <input
                type="text"
                value={formData.microchip_id}
                onChange={(e) => setFormData(prev => ({ ...prev, microchip_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                placeholder={t('health.microchipPlaceholder')}
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
              {t('health.spayedNeutered')}
            </label>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('health.emergencyContact')}
            </label>
            <input
              type="text"
              value={formData.emergency_contact}
              onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
              placeholder={t('health.emergencyContactPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('health.emergencyPhone')}
            </label>
            <input
              type="tel"
              value={formData.emergency_phone}
              onChange={(e) => setFormData(prev => ({ ...prev, emergency_phone: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
              placeholder={t('health.emergencyPhonePlaceholder')}
            />
          </div>
        </div>

        {/* Personality Traits */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('personality.personalityTraits')}
          </label>
          <div className="flex flex-wrap gap-2">
            {PERSONALITY_TRAITS.map(trait => (
              <button
                key={trait}
                type="button"
                onClick={() => handleTraitToggle(trait)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  formData.personality_traits.includes(trait)
                    ? 'bg-[#3bbca8] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {t(`personality.${trait.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Medical Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('health.medicalNotes')}
          </label>
          <textarea
            value={formData.medical_notes}
            onChange={(e) => setFormData(prev => ({ ...prev, medical_notes: e.target.value }))}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
            placeholder={t('health.medicalNotesPlaceholder')}
          />
        </div>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto px-4 sm:px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium touch-target transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 sm:px-8 py-3 bg-[#3bbca8] text-white rounded-lg hover:bg-[#3bbca8]/90 font-medium flex items-center justify-center space-x-2 touch-target transition-colors"
          >
            <Heart className="w-4 h-4" />
            <span>{dogId ? t('common.update') : t('common.add')} {t('dogs.dogProfile')}</span>
          </button>
        </div>
      </form>
    </>
      )}
    </div>
  );
}