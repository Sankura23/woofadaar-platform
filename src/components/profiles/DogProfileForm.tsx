'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, Heart, Calendar, Scale, MapPin, Shield, X } from 'lucide-react';

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
  birthday?: string;
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

export default function DogProfileForm({ dogId, onSave }: { 
  dogId?: string; 
  onSave: (success: boolean) => void; 
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
    photo_url: '',
    birthday: ''
  });

  const [dogImage, setDogImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [customBreed, setCustomBreed] = useState('');
  const [isGeneratingHealthId, setIsGeneratingHealthId] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load existing dog data if editing
  useEffect(() => {
    if (dogId) {
      loadDogData();
    }
  }, [dogId]);

  const loadDogData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dogs/${dogId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        }
      });

      if (response.ok) {
        const { dog } = await response.json();
        setFormData({
          name: dog.name || '',
          breed: dog.breed || '',
          age_months: dog.age_months || 0,
          weight_kg: dog.weight_kg || 0,
          gender: dog.gender || 'male',
          health_id: dog.health_id || '',
          kennel_club_registration: dog.kennel_club_registration || '',
          vaccination_status: dog.vaccination_status || 'up_to_date',
          spayed_neutered: dog.spayed_neutered || false,
          microchip_id: dog.microchip_id || '',
          emergency_contact: dog.emergency_contact || '',
          emergency_phone: dog.emergency_phone || '',
          medical_notes: dog.medical_notes || '',
          personality_traits: Array.isArray(dog.personality_traits) ? dog.personality_traits : [],
          location: dog.location || '',
          photo_url: dog.photo_url || '',
          birthday: dog.birthday || ''
        });

        // Set custom breed if it's not in the predefined list
        if (dog.breed && !INDIAN_DOG_BREEDS.includes(dog.breed)) {
          setCustomBreed(dog.breed);
          setFormData(prev => ({ ...prev, breed: 'Other' }));
        }

        // Set image preview if photo exists
        if (dog.photo_url) {
          setImagePreview(dog.photo_url);
        }
      }
    } catch (error) {
      console.error('Error loading dog data:', error);
      setError('Failed to load dog data');
    } finally {
      setLoading(false);
    }
  };

  // Generate unique Woofadaar Dog ID
  const generateDogId = async () => {
    const breedName = formData.breed === 'Other' ? customBreed.trim() : formData.breed.trim();
    
    if (!formData.name.trim() || !breedName) {
      setError('Please enter dog name and breed first to generate Dog ID');
      return;
    }

    setIsGeneratingHealthId(true);
    setError('');
    
    try {
      const response = await fetch('/api/dogs/generate-health-id', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        body: JSON.stringify({ 
          name: formData.name, 
          breed: breedName,
          location: formData.location 
        })
      });
      
      if (response.ok) {
        const { healthId } = await response.json();
        setFormData(prev => ({ ...prev, health_id: healthId }));
        setSuccess('Dog ID generated successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to generate Dog ID');
      }
    } catch (error) {
      console.error('Error generating dog ID:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsGeneratingHealthId(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    setError(''); // Clear error when user starts typing

    // Auto-generate Dog ID when name and breed are filled
    if (name === 'name' || name === 'breed') {
      const newFormData = { ...formData, [name]: value };
      const breedName = newFormData.breed === 'Other' ? customBreed.trim() : newFormData.breed.trim();
      
      if (newFormData.name.trim() && breedName && !newFormData.health_id && !dogId) {
        // Auto-generate after a short delay
        setTimeout(() => {
          generateDogId();
        }, 1000);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      setDogImage(file);
      setImagePreview(URL.createObjectURL(file));
      setImageError(false);
      setError('');
    }
  };

  const removeImage = () => {
    setDogImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePersonalityTraitToggle = (trait: string) => {
    setFormData(prev => ({
      ...prev,
      personality_traits: prev.personality_traits.includes(trait)
        ? prev.personality_traits.filter(t => t !== trait)
        : [...prev.personality_traits, trait]
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Dog name is required');
      return false;
    }
    
    if (formData.name.trim().length < 2) {
      setError('Dog name must be at least 2 characters long');
      return false;
    }

    if (!formData.breed.trim()) {
      setError('Breed is required');
      return false;
    }

    if (formData.breed === 'Other' && !customBreed.trim()) {
      setError('Please enter the custom breed name');
      return false;
    }

    if (formData.age_months <= 0) {
      setError('Age must be greater than 0');
      return false;
    }

    if (formData.weight_kg <= 0) {
      setError('Weight must be greater than 0');
      return false;
    }

    if (!formData.location.trim()) {
      setError('Location is required');
      return false;
    }

    if (!formData.emergency_contact.trim()) {
      setError('Emergency contact name is required');
      return false;
    }

    if (!formData.emergency_phone.trim()) {
      setError('Emergency phone number is required');
      return false;
    }

    // Basic phone validation
    const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
    if (!phoneRegex.test(formData.emergency_phone)) {
      setError('Please enter a valid phone number');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // First, upload image if selected
      let imageUrl = formData.photo_url;
      if (dogImage) {
        const formDataImage = new FormData();
        formDataImage.append('file', dogImage);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
          },
          body: formDataImage
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          imageUrl = uploadData.url;
        } else {
          throw new Error('Failed to upload image');
        }
      }

      // Prepare the final form data
      const finalFormData = {
        ...formData,
        photo_url: imageUrl,
        name: formData.name.trim(),
        breed: formData.breed === 'Other' ? customBreed.trim() : formData.breed.trim(),
        location: formData.location.trim(),
        emergency_contact: formData.emergency_contact.trim(),
        emergency_phone: formData.emergency_phone.trim(),
        medical_notes: formData.medical_notes.trim(),
        birthday: formData.birthday || undefined
      };

      const url = dogId ? `/api/dogs/${dogId}` : '/api/dogs';
      const method = dogId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        body: JSON.stringify(finalFormData)
      });

      if (response.ok) {
        setSuccess(dogId ? 'Dog profile updated successfully!' : 'Dog profile created successfully!');
        setTimeout(() => {
          onSave(true);
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to save dog profile');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 max-w-4xl mx-auto">
      {loading && dogId ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dog profile...</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                {dogId ? 'Edit Dog Profile' : 'Add New Dog'}
              </h2>
              <p className="text-gray-600 mt-2">
                {dogId ? 'Update your dog\'s information' : 'Create a profile for your furry friend'}
              </p>
            </div>
            <div className="relative">
              {imagePreview ? (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-gray-100">
                  <img 
                    src={imagePreview} 
                    alt="Dog" 
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                </div>
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 bg-primary rounded-full flex items-center justify-center">
                  <Heart className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-3 h-3 text-white" />
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{success}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />

            {/* Dog Photo Section */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Dog Photo
              </label>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                >
                  {imagePreview ? 'Change Photo' : 'Upload Photo'}
                </button>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Upload a clear photo of your dog. Max size: 5MB. Supported formats: JPG, PNG, GIF.
              </p>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Dog Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  placeholder="Enter your dog's name"
                  required
                />
              </div>

              <div>
                <label htmlFor="breed" className="block text-sm font-medium text-gray-700 mb-2">
                  Breed *
                </label>
                <select
                  id="breed"
                  name="breed"
                  value={formData.breed}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  required
                >
                  <option value="">Select breed</option>
                  {INDIAN_DOG_BREEDS.map((breed) => (
                    <option key={breed} value={breed}>{breed}</option>
                  ))}
                </select>
                
                {formData.breed === 'Other' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="Enter custom breed"
                      value={customBreed}
                      onChange={(e) => setCustomBreed(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                      required
                    />
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="age_months" className="block text-sm font-medium text-gray-700 mb-2">
                  Age (months) *
                </label>
                <input
                  type="number"
                  id="age_months"
                  name="age_months"
                  value={formData.age_months}
                  onChange={handleChange}
                  min="1"
                  max="300"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  placeholder="Enter age in months"
                  required
                />
              </div>

              <div>
                <label htmlFor="weight_kg" className="block text-sm font-medium text-gray-700 mb-2">
                  Weight (kg) *
                </label>
                <input
                  type="number"
                  id="weight_kg"
                  name="weight_kg"
                  value={formData.weight_kg}
                  onChange={handleChange}
                  min="0.1"
                  max="100"
                  step="0.1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  placeholder="Enter weight in kg"
                  required
                />
              </div>

              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                  Gender *
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  required
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <select
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  required
                >
                  <option value="">Select location</option>
                  {INDIAN_CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-2">
                  Birthday (Optional)
                </label>
                <input
                  type="date"
                  id="birthday"
                  name="birthday"
                  value={formData.birthday}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">
                  If you know your dog's birthday, enter it here
                </p>
              </div>
            </div>

            {/* Health ID Section */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-primary" />
                    Woofadaar Dog ID
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Unique identifier for your dog's health records
                  </p>
                </div>
                <button
                  type="button"
                  onClick={generateDogId}
                  disabled={isGeneratingHealthId || !formData.name.trim() || !formData.breed.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingHealthId ? 'Generating...' : 'Generate Dog ID'}
                </button>
              </div>
              
              {formData.health_id && (
                <div className="mt-4 p-3 bg-white border border-primary/30 rounded-lg">
                  <div className="text-sm text-gray-900 font-medium">Dog ID:</div>
                  <div className="text-lg font-mono text-primary">{formData.health_id}</div>
                </div>
              )}
            </div>

            {/* Health Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="vaccination_status" className="block text-sm font-medium text-gray-700 mb-2">
                  Vaccination Status *
                </label>
                <select
                  id="vaccination_status"
                  name="vaccination_status"
                  value={formData.vaccination_status}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  required
                >
                  <option value="up_to_date">Up to Date</option>
                  <option value="pending">Pending</option>
                  <option value="not_started">Not Started</option>
                </select>
              </div>

              <div>
                <label htmlFor="kennel_club_registration" className="block text-sm font-medium text-gray-700 mb-2">
                  Kennel Club Registration
                </label>
                <input
                  type="text"
                  id="kennel_club_registration"
                  name="kennel_club_registration"
                  value={formData.kennel_club_registration}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  placeholder="KCI registration number (optional)"
                />
              </div>

              <div>
                <label htmlFor="microchip_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Microchip ID
                </label>
                <input
                  type="text"
                  id="microchip_id"
                  name="microchip_id"
                  value={formData.microchip_id}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  placeholder="Microchip identification number"
                />
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="spayed_neutered"
                  name="spayed_neutered"
                  checked={formData.spayed_neutered}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                />
                <label htmlFor="spayed_neutered" className="text-sm font-medium text-gray-700">
                  Spayed/Neutered
                </label>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="emergency_contact" className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Name *
                </label>
                <input
                  type="text"
                  id="emergency_contact"
                  name="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  placeholder="Emergency contact person name"
                  required
                />
              </div>

              <div>
                <label htmlFor="emergency_phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Phone *
                </label>
                <input
                  type="tel"
                  id="emergency_phone"
                  name="emergency_phone"
                  value={formData.emergency_phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  placeholder="Emergency contact phone number"
                  required
                />
              </div>
            </div>

            {/* Medical Notes */}
            <div>
              <label htmlFor="medical_notes" className="block text-sm font-medium text-gray-700 mb-2">
                Medical Notes
              </label>
              <textarea
                id="medical_notes"
                name="medical_notes"
                value={formData.medical_notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                placeholder="Any medical conditions, allergies, or special care instructions"
              />
            </div>

            {/* Personality Traits */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Personality Traits
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {PERSONALITY_TRAITS.map((trait) => (
                  <label key={trait} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.personality_traits.includes(trait)}
                      onChange={() => handlePersonalityTraitToggle(trait)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                    />
                    <span className="text-sm text-gray-700">{trait}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {dogId ? 'Updating...' : 'Creating...'}
                  </div>
                ) : (
                  dogId ? 'Update Dog Profile' : 'Create Dog Profile'
                )}
              </button>
              <button
                type="button"
                onClick={() => onSave(false)}
                disabled={loading}
                className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}