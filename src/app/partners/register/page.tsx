'use client';

import { useState } from 'react';
import Link from 'next/link';

interface PartnerRegistrationForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  partner_type: string;
  business_name: string;
  location: string;
  website: string;
  bio: string;
  services_offered: string;
  consultation_fee: string;
  availability_hours: string;
  languages_spoken: string;
  certifications: string;
}

export default function PartnerRegistrationPage() {
  const [formData, setFormData] = useState<PartnerRegistrationForm>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    partner_type: 'vet',
    business_name: '',
    location: '',
    website: '',
    bio: '',
    services_offered: '',
    consultation_fee: '',
    availability_hours: '',
    languages_spoken: '',
    certifications: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);

    // Password validation
    if (formData.password !== formData.confirmPassword) {
      setSubmitResult({
        success: false,
        message: 'Passwords do not match'
      });
      setIsSubmitting(false);
      return;
    }

    if (formData.password.length < 6) {
      setSubmitResult({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // Don't send confirmPassword to API
      const { confirmPassword, ...dataToSend } = formData;
      
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      const result = await response.json();
      setSubmitResult(result);

      if (result.success) {
        // Reset form on success
        setFormData({
          name: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: '',
          partner_type: 'vet',
          business_name: '',
          location: '',
          website: '',
          bio: '',
          services_offered: '',
          consultation_fee: '',
          availability_hours: '',
          languages_spoken: '',
          certifications: ''
        });
      }
    } catch (error) {
      setSubmitResult({
        success: false,
        message: 'Failed to submit registration. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof PartnerRegistrationForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🏢 Partner Registration</h1>
          <p className="text-lg text-gray-600">
            Join Woofadaar as a verified partner and connect with dog parents across India
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Partner Application</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Minimum 6 characters"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Re-enter your password"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="partner_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Partner Type *
                  </label>
                  <select
                    id="partner_type"
                    value={formData.partner_type}
                    onChange={(e) => handleInputChange('partner_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  >
                    <option value="vet">Veterinarian</option>
                    <option value="trainer">Dog Trainer</option>
                    <option value="corporate">Corporate Partner</option>
                    <option value="kci">KCI Certified</option>
                  </select>
                </div>
              </div>

              {/* Business Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="business_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => handleInputChange('business_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Your clinic, business, or organization name"
                  />
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="City, State"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="https://your-website.com"
                  />
                </div>

                <div>
                  <label htmlFor="consultation_fee" className="block text-sm font-medium text-gray-700 mb-2">
                    Consultation Fee
                  </label>
                  <input
                    type="text"
                    id="consultation_fee"
                    value={formData.consultation_fee}
                    onChange={(e) => handleInputChange('consultation_fee', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., ₹500 per session"
                  />
                </div>
              </div>

              {/* Services and Availability */}
              <div>
                <label htmlFor="services_offered" className="block text-sm font-medium text-gray-700 mb-2">
                  Services Offered
                </label>
                <textarea
                  id="services_offered"
                  value={formData.services_offered}
                  onChange={(e) => handleInputChange('services_offered', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Describe the services you offer..."
                />
              </div>

              <div>
                <label htmlFor="availability_hours" className="block text-sm font-medium text-gray-700 mb-2">
                  Availability Hours
                </label>
                <input
                  type="text"
                  id="availability_hours"
                  value={formData.availability_hours}
                  onChange={(e) => handleInputChange('availability_hours', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., Mon-Fri 9 AM - 6 PM, Sat 10 AM - 4 PM"
                />
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="languages_spoken" className="block text-sm font-medium text-gray-700 mb-2">
                    Languages Spoken
                  </label>
                  <input
                    type="text"
                    id="languages_spoken"
                    value={formData.languages_spoken}
                    onChange={(e) => handleInputChange('languages_spoken', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., English, Hindi, Marathi"
                  />
                </div>

                <div>
                  <label htmlFor="certifications" className="block text-sm font-medium text-gray-700 mb-2">
                    Certifications & Qualifications
                  </label>
                  <input
                    type="text"
                    id="certifications"
                    value={formData.certifications}
                    onChange={(e) => handleInputChange('certifications', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., BVSc, Certified Dog Trainer"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                  Bio/About You
                </label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Tell us about your experience, expertise, and what makes you unique..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white px-6 py-3 rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
              </button>
            </form>

            {/* Submission Result */}
            {submitResult && (
              <div className={`mt-6 p-4 rounded-lg ${
                submitResult.success 
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <h3 className="font-semibold mb-2">
                  {submitResult.success ? '✅ Application Submitted Successfully' : '❌ Submission Failed'}
                </h3>
                <p>{submitResult.message}</p>
                
                {submitResult.success && (
                  <div className="mt-4 p-3 bg-white rounded border">
                    <h4 className="font-medium mb-2">Next Steps:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Our team will review your application within 2-3 business days</li>
                      <li>• You'll receive an email confirmation with your application ID</li>
                      <li>• We may contact you for additional information or verification</li>
                      <li>• Once approved, you can <a href="/login" className="text-primary hover:underline">login here</a> using your email and password</li>
                      <li>• After login, you'll have access to your partner dashboard</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Back to Home */}
            <div className="mt-8 text-center">
              <Link
                href="/"
                className="text-primary hover:underline font-medium"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}