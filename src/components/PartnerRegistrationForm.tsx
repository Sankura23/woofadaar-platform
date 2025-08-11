'use client';

import React, { useState, useContext } from 'react';
import { LanguageContext } from '@/contexts/LanguageContext';

interface PartnerRegistrationData {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
  partner_type: 'vet' | 'trainer' | 'corporate' | 'kci';
  business_name?: string;
  license_number?: string;
  specialization: string[];
  experience_years?: number;
  location: string;
  address?: string;
  phone: string;
  website?: string;
  bio?: string;
  services_offered: string[];
  pricing_info: {
    consultation_fee?: number;
    home_visit_fee?: number;
    emergency_fee?: number;
  };
  availability_schedule: {
    [key: string]: {
      open: boolean;
      start_time?: string;
      end_time?: string;
    };
  };
  languages_spoken: string[];
  certifications: string[];
  partnership_tier: 'basic' | 'premium' | 'enterprise';
  kci_registration_id?: string;
  commission_rate?: number;
  emergency_available: boolean;
  home_visit_available: boolean;
  online_consultation: boolean;
  response_time_hours?: number;
  service_radius_km?: number;
  languages_primary: string;
}

const PartnerRegistrationForm: React.FC = () => {
  const { translations, currentLanguage } = useContext(LanguageContext);
  const t = translations[currentLanguage];

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<PartnerRegistrationData>({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    partner_type: 'vet',
    specialization: [],
    location: '',
    phone: '',
    services_offered: [],
    pricing_info: {},
    availability_schedule: {
      monday: { open: false },
      tuesday: { open: false },
      wednesday: { open: false },
      thursday: { open: false },
      friday: { open: false },
      saturday: { open: false },
      sunday: { open: false },
    },
    languages_spoken: ['english'],
    certifications: [],
    partnership_tier: 'basic',
    emergency_available: false,
    home_visit_available: false,
    online_consultation: false,
    languages_primary: 'english',
  });

  const partnerTypes = [
    { value: 'vet', label: 'Veterinarian', icon: '🏥' },
    { value: 'trainer', label: 'Dog Trainer', icon: '🎾' },
    { value: 'corporate', label: 'Corporate Partner', icon: '🏢' },
    { value: 'kci', label: 'KCI Certified', icon: '🏆' },
  ];

  const specializations = {
    vet: ['General Practice', 'Emergency Medicine', 'Surgery', 'Dermatology', 'Cardiology', 'Orthopedics', 'Internal Medicine', 'Dental', 'Oncology'],
    trainer: ['Basic Obedience', 'Advanced Training', 'Puppy Training', 'Behavioral Issues', 'Agility Training', 'Guard Dog Training', 'Therapy Dog Training'],
    corporate: ['Pet Services', 'Pet Products', 'Insurance', 'Technology', 'Logistics', 'Marketing'],
    kci: ['Breeding Services', 'Show Training', 'Breed Evaluation', 'Registration Services'],
  };

  const services = {
    vet: ['Consultation', 'Vaccination', 'Surgery', 'Emergency Care', 'Dental Care', 'Grooming', 'Health Checkup', 'Lab Tests'],
    trainer: ['Basic Training', 'Advanced Training', 'Behavioral Training', 'Puppy Training', 'Group Classes', 'Private Sessions'],
    corporate: ['Consultation', 'Products', 'Services', 'Support'],
    kci: ['Breeding Consultation', 'Registration', 'Show Preparation', 'Breed Evaluation'],
  };

  const updateFormData = (field: keyof PartnerRegistrationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user makes changes
  };

  const toggleArrayItem = (field: keyof PartnerRegistrationData, item: string) => {
    const currentArray = formData[field] as string[];
    const updated = currentArray.includes(item)
      ? currentArray.filter(i => i !== item)
      : [...currentArray, item];
    updateFormData(field, updated);
  };

  const updateSchedule = (day: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      availability_schedule: {
        ...prev.availability_schedule,
        [day]: {
          ...prev.availability_schedule[day],
          [field]: value,
        }
      }
    }));
  };

  const validateStep = (step: number): boolean => {
    setError('');
    
    console.log(`Validating step ${step}...`);
    console.log('Form data at validation:', {
      partner_type: formData.partner_type,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      location: formData.location,
      password: formData.password ? '***' : '',
      confirmPassword: formData.confirmPassword ? '***' : '',
      specialization: formData.specialization,
      services_offered: formData.services_offered
    });
    
    switch (step) {
      case 1: // Basic Info
        if (!formData.name || !formData.email || !formData.phone || !formData.location) {
          console.log('Missing required fields in step 1');
          setError('Please fill in all required fields');
          return false;
        }
        if (!formData.password || formData.password.length < 6) {
          console.log('Invalid password in step 1');
          setError('Password must be at least 6 characters long');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          console.log('Passwords do not match in step 1');
          setError('Passwords do not match');
          return false;
        }
        console.log('Step 1 validation passed');
        break;
      
      case 2: // Professional Info
        if (formData.specialization.length === 0) {
          setError('Please select at least one specialization');
          return false;
        }
        if (formData.partner_type === 'kci' && !formData.kci_registration_id) {
          setError('KCI Registration ID is required for KCI certified partners');
          return false;
        }
        break;
      
      case 3: // Services
        if (formData.services_offered.length === 0) {
          setError('Please select at least one service');
          return false;
        }
        break;
    }
    
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    console.log('Form submission starting...');
    console.log('Current form data:', {
      partner_type: formData.partner_type,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      location: formData.location,
      specialization: formData.specialization,
      services_offered: formData.services_offered
    });

    setLoading(true);
    setError('');

    try {
      console.log('Sending request to /api/partners...');
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      const result = await response.json();
      console.log('Response data:', result);

      if (response.ok && result.success) {
        console.log('Registration successful!');
        setSuccess(result.message);
        setCurrentStep(5); // Success step
      } else {
        console.log('Registration failed:', result.message);
        setError(result.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Network error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Basic Information</h2>
            
            {/* Partner Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Partner Type *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {partnerTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => updateFormData('partner_type', type.value)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      formData.partner_type === type.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">{type.icon}</div>
                    <div className="text-sm font-medium">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateFormData('name', e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your full name"
              />
            </div>

            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name
              </label>
              <input
                type="text"
                value={formData.business_name || ''}
                onChange={(e) => updateFormData('business_name', e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your business name (optional)"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email address"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateFormData('phone', e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your phone number"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => updateFormData('location', e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="City, State"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => updateFormData('password', e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter a strong password"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm your password"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Professional Information</h2>
            
            {/* License Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                License Number {formData.partner_type === 'vet' ? '*' : '(Optional)'}
              </label>
              <input
                type="text"
                value={formData.license_number || ''}
                onChange={(e) => updateFormData('license_number', e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your professional license number"
              />
            </div>

            {/* KCI Registration ID (if KCI partner) */}
            {formData.partner_type === 'kci' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  KCI Registration ID *
                </label>
                <input
                  type="text"
                  value={formData.kci_registration_id || ''}
                  onChange={(e) => updateFormData('kci_registration_id', e.target.value)}
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your KCI registration ID"
                />
              </div>
            )}

            {/* Experience Years */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Years of Experience
              </label>
              <input
                type="number"
                value={formData.experience_years || ''}
                onChange={(e) => updateFormData('experience_years', parseInt(e.target.value))}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter years of experience"
                min="0"
                max="50"
              />
            </div>

            {/* Specializations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Specializations * (Select all that apply)
              </label>
              <div className="grid grid-cols-1 gap-2">
                {specializations[formData.partner_type].map((spec) => (
                  <label key={spec} className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.specialization.includes(spec)}
                      onChange={() => toggleArrayItem('specialization', spec)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">{spec}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Professional Bio
              </label>
              <textarea
                value={formData.bio || ''}
                onChange={(e) => updateFormData('bio', e.target.value)}
                rows={4}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tell us about your experience and expertise..."
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Services & Availability</h2>
            
            {/* Services Offered */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Services Offered * (Select all that apply)
              </label>
              <div className="grid grid-cols-1 gap-2">
                {services[formData.partner_type].map((service) => (
                  <label key={service} className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.services_offered.includes(service)}
                      onChange={() => toggleArrayItem('services_offered', service)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">{service}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Service Options */}
            <div className="grid grid-cols-1 gap-4">
              <label className="flex items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.emergency_available}
                  onChange={(e) => updateFormData('emergency_available', e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-700">Emergency Services</div>
                  <div className="text-sm text-gray-500">Available for emergency calls</div>
                </div>
              </label>

              <label className="flex items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.home_visit_available}
                  onChange={(e) => updateFormData('home_visit_available', e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-700">Home Visits</div>
                  <div className="text-sm text-gray-500">Available for home visits</div>
                </div>
              </label>

              <label className="flex items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.online_consultation}
                  onChange={(e) => updateFormData('online_consultation', e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-700">Online Consultations</div>
                  <div className="text-sm text-gray-500">Available for video/phone consultations</div>
                </div>
              </label>
            </div>

            {/* Pricing Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Pricing Information (Optional)
              </label>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Consultation Fee (₹)</label>
                  <input
                    type="number"
                    value={formData.pricing_info.consultation_fee || ''}
                    onChange={(e) => updateFormData('pricing_info', {
                      ...formData.pricing_info,
                      consultation_fee: parseInt(e.target.value) || undefined
                    })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="500"
                    min="0"
                  />
                </div>
                
                {formData.home_visit_available && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Home Visit Fee (₹)</label>
                    <input
                      type="number"
                      value={formData.pricing_info.home_visit_fee || ''}
                      onChange={(e) => updateFormData('pricing_info', {
                        ...formData.pricing_info,
                        home_visit_fee: parseInt(e.target.value) || undefined
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="1000"
                      min="0"
                    />
                  </div>
                )}

                {formData.emergency_available && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Emergency Fee (₹)</label>
                    <input
                      type="number"
                      value={formData.pricing_info.emergency_fee || ''}
                      onChange={(e) => updateFormData('pricing_info', {
                        ...formData.pricing_info,
                        emergency_fee: parseInt(e.target.value) || undefined
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="2000"
                      min="0"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Review & Submit</h2>
            
            <div className="bg-gray-50 p-6 rounded-lg space-y-4">
              <div>
                <h3 className="font-medium text-gray-800">Basic Information</h3>
                <p className="text-sm text-gray-600">
                  {formData.name} • {formData.partner_type} • {formData.location}
                </p>
                <p className="text-sm text-gray-600">{formData.email} • {formData.phone}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-800">Specializations</h3>
                <p className="text-sm text-gray-600">{formData.specialization.join(', ')}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-800">Services</h3>
                <p className="text-sm text-gray-600">{formData.services_offered.join(', ')}</p>
              </div>

              <div>
                <h3 className="font-medium text-gray-800">Additional Services</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  {formData.emergency_available && <p>✓ Emergency Services</p>}
                  {formData.home_visit_available && <p>✓ Home Visits</p>}
                  {formData.online_consultation && <p>✓ Online Consultations</p>}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">What happens next?</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Your application will be reviewed within 2-3 business days</li>
                <li>• We may contact you for additional verification</li>
                <li>• Once approved, you'll receive login credentials</li>
                <li>• You can then access your partner dashboard</li>
              </ul>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <div className="text-4xl">✓</div>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">Registration Submitted!</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              {success}
            </p>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">Next Steps:</h3>
              <ul className="text-sm text-green-700 space-y-1 text-left">
                <li>• Check your email for confirmation</li>
                <li>• Our team will review your application</li>
                <li>• You'll receive approval notification within 2-3 days</li>
                <li>• Once approved, you can login and start accepting bookings</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1: return 'Basic Info';
      case 2: return 'Professional';
      case 3: return 'Services';
      case 4: return 'Review';
      case 5: return 'Complete';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                <div className="ml-2 text-sm font-medium text-gray-600 hidden sm:block">
                  {getStepTitle(step)}
                </div>
                {step < 4 && (
                  <div className={`w-8 h-1 mx-4 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {currentStep !== 5 && (
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Become a Partner
              </h1>
              <p className="text-gray-600">
                Join thousands of professionals helping pet parents across India
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {renderStep()}

          {/* Navigation Buttons */}
          {currentStep < 5 && (
            <div className="mt-8 flex justify-between">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`px-6 py-3 rounded-lg font-medium ${
                  currentStep === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                Previous
              </button>

              <button
                onClick={currentStep === 4 ? handleSubmit : nextStep}
                disabled={loading}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 flex items-center"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                )}
                {currentStep === 4 ? 'Submit Application' : 'Next'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartnerRegistrationForm;