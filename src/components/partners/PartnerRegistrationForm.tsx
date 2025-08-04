'use client';

import { useState } from 'react';
import { PartnerFormData, PARTNER_TYPES, INDIAN_CITIES, SPECIALIZATIONS } from '@/types/partner';

interface PartnerRegistrationFormProps {
  onSuccess?: () => void;
}

export default function PartnerRegistrationForm({ onSuccess }: PartnerRegistrationFormProps) {
  const [formData, setFormData] = useState<PartnerFormData>({
    email: '',
    name: '',
    partner_type: 'veterinarian',
    business_name: '',
    license_number: '',
    specialization: '',
    experience_years: '',
    location: '',
    address: '',
    phone: '',
    website: '',
    bio: '',
    services_offered: '',
    consultation_fee: '',
    availability_hours: '',
    languages_spoken: '',
    certifications: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/partners/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h3>
          <p className="text-gray-600 mb-4">
            Thank you for your interest in partnering with Woofadaar. We&apos;ve received your application and will review it within 3-5 business days.
          </p>
          <div className="bg-gradient-to-r from-[#3bbca8] to-[#339990] rounded-lg p-6 mb-4 text-white">
            <h4 className="text-lg font-semibold mb-4 text-center">What happens next?</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-white text-sm">Our team will verify your credentials</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-white text-sm">We&apos;ll contact you via email with updates</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-white text-sm">Upon approval, you&apos;ll get access to our partner portal</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-white text-sm">You&apos;ll be listed in our verified partner directory</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Woofadaar&apos;s Partner Network</h2>
        <p className="text-gray-600">Connect with India&apos;s dog parent community</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="md:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
        </div>

        <div>
          <label htmlFor="partner_type" className="block text-sm font-medium text-gray-700 mb-1">
            Partner Type *
          </label>
          <select
            id="partner_type"
            name="partner_type"
            required
            value={formData.partner_type}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
          >
            {Object.entries(PARTNER_TYPES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="Your professional name"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="professional@email.com"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number *
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            required
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="+91 98765 43210"
          />
        </div>

        {/* Professional Information */}
        <div className="md:col-span-2 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h3>
        </div>

        <div>
          <label htmlFor="business_name" className="block text-sm font-medium text-gray-700 mb-1">
            Business/Clinic Name
          </label>
          <input
            type="text"
            id="business_name"
            name="business_name"
            value={formData.business_name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="Your clinic or business name"
          />
        </div>

        <div>
          <label htmlFor="license_number" className="block text-sm font-medium text-gray-700 mb-1">
            License Number
            {formData.partner_type === 'veterinarian' && ' *'}
          </label>
          <input
            type="text"
            id="license_number"
            name="license_number"
            required={formData.partner_type === 'veterinarian'}
            value={formData.license_number}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="Professional license number"
          />
        </div>

        <div>
          <label htmlFor="specialization" className="block text-sm font-medium text-gray-700 mb-1">
            Specialization
          </label>
          <select
            id="specialization"
            name="specialization"
            value={formData.specialization}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
          >
            <option value="">Select specialization</option>
            {SPECIALIZATIONS[formData.partner_type]?.map(spec => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="experience_years" className="block text-sm font-medium text-gray-700 mb-1">
            Years of Experience
          </label>
          <input
            type="number"
            id="experience_years"
            name="experience_years"
            min="0"
            max="50"
            value={formData.experience_years}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="5"
          />
        </div>

        {/* Location Information */}
        <div className="md:col-span-2 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Information</h3>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            City *
          </label>
          <select
            id="location"
            name="location"
            required
            value={formData.location}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
          >
            <option value="">Select your city</option>
            {INDIAN_CITIES.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
            Website (Optional)
          </label>
          <input
            type="url"
            id="website"
            name="website"
            value={formData.website}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="https://your-website.com"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Complete Address
          </label>
          <textarea
            id="address"
            name="address"
            rows={2}
            value={formData.address}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="Complete business address"
          />
        </div>

        {/* Additional Information */}
        <div className="md:col-span-2 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
            Professional Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            value={formData.bio}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="Tell us about your professional background and approach..."
          />
        </div>

        <div>
          <label htmlFor="services_offered" className="block text-sm font-medium text-gray-700 mb-1">
            Services Offered
          </label>
          <textarea
            id="services_offered"
            name="services_offered"
            rows={2}
            value={formData.services_offered}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="List the services you provide..."
          />
        </div>

        <div>
          <label htmlFor="consultation_fee" className="block text-sm font-medium text-gray-700 mb-1">
            Consultation Fee
          </label>
          <input
            type="text"
            id="consultation_fee"
            name="consultation_fee"
            value={formData.consultation_fee}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="₹500 - ₹1000"
          />
        </div>

        <div>
          <label htmlFor="availability_hours" className="block text-sm font-medium text-gray-700 mb-1">
            Availability Hours
          </label>
          <input
            type="text"
            id="availability_hours"
            name="availability_hours"
            value={formData.availability_hours}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="Mon-Fri: 9AM-6PM, Sat: 9AM-2PM"
          />
        </div>

        <div>
          <label htmlFor="languages_spoken" className="block text-sm font-medium text-gray-700 mb-1">
            Languages Spoken
          </label>
          <input
            type="text"
            id="languages_spoken"
            name="languages_spoken"
            value={formData.languages_spoken}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="English, Hindi, Marathi"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="certifications" className="block text-sm font-medium text-gray-700 mb-1">
            Certifications & Qualifications
          </label>
          <textarea
            id="certifications"
            name="certifications"
            rows={2}
            value={formData.certifications}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="List your degrees, certifications, and professional qualifications..."
          />
        </div>
      </div>

      <div className="mt-8">
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#3bbca8] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#339990] focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Submitting Application...' : 'Submit Partnership Application'}
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center mt-4">
        By submitting this application, you agree to our partner terms and conditions. 
        We&apos;ll review your application and contact you within 3-5 business days.
      </p>
    </form>
  );
}