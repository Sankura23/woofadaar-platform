'use client';

import { useState } from 'react';

interface WaitlistFormProps {
  onSuccess?: (position: number) => void;
}

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 
  'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore',
  'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna', 'Vadodara',
  'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot',
  'Kalyan-Dombivli', 'Vasai-Virar', 'Varanasi', 'Srinagar', 'Aurangabad',
  'Other'
];

const REFERRAL_SOURCES = [
  'Social Media (Instagram/Facebook)',
  'Google Search',
  'Friend/Family Referral',
  'Pet Community/Group',
  'Veterinarian Recommendation',
  'Advertisement',
  'Other'
];

export default function WaitlistForm({ onSuccess }: WaitlistFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    location: '',
    phone: '',
    dog_owner: false,
    preferred_language: 'en',
    referral_source: '',
    interests: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [position, setPosition] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/waitlist', {
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
      setPosition(data.position);
      onSuccess?.(data.position);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  if (success) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Woofadaar!</h3>
          <p className="text-gray-600 mb-4">You&apos;re successfully on our waitlist</p>
          
          {/* Enhanced Position Display */}
          <div className="bg-gradient-to-r from-[#3bbca8] to-[#339990] rounded-lg p-6 mb-6 text-white">
            <div className="text-4xl font-bold mb-2">#{position}</div>
            <div className="text-lg font-medium mb-3">You&apos;re in the pack!</div>
            <div className="flex items-center justify-center space-x-4 text-sm">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Early Access</span>
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Premium Features</span>
              </div>
            </div>
          </div>

          {/* What's Next Section */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">What&apos;s Next?</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-[#3bbca8] rounded-full mr-3"></div>
                <span>Launch notification in your inbox</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-[#3bbca8] rounded-full mr-3"></div>
                <span>Exclusive early bird benefits</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-[#3bbca8] rounded-full mr-3"></div>
                <span>Connect with fellow dog parents</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            We&apos;ll notify you as soon as Woofadaar launches. Get ready to connect with India&apos;s amazing dog parent community!
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Join the Pack!</h2>
        <p className="text-gray-600">Be the first to experience India&apos;s dog parent community</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-4">
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
            placeholder="your.email@example.com"
          />
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
            placeholder="Your full name"
          />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            City
          </label>
          <select
            id="location"
            name="location"
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
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="+91 98765 43210"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="dog_owner"
            name="dog_owner"
            checked={formData.dog_owner}
            onChange={handleChange}
            className="h-4 w-4 text-[#3bbca8] focus:ring-[#3bbca8] border-gray-300 rounded"
          />
          <label htmlFor="dog_owner" className="ml-2 block text-sm text-gray-700">
            I am a current dog parent
          </label>
        </div>

        <div>
          <label htmlFor="preferred_language" className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Language
          </label>
          <select
            id="preferred_language"
            name="preferred_language"
            value={formData.preferred_language}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी (Hindi)</option>
          </select>
        </div>

        <div>
          <label htmlFor="referral_source" className="block text-sm font-medium text-gray-700 mb-1">
            How did you hear about us?
          </label>
          <select
            id="referral_source"
            name="referral_source"
            value={formData.referral_source}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
          >
            <option value="">Select an option</option>
            {REFERRAL_SOURCES.map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="interests" className="block text-sm font-medium text-gray-700 mb-1">
            What interests you most? (Optional)
          </label>
          <textarea
            id="interests"
            name="interests"
            value={formData.interests}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="Dog training tips, health advice, community events, etc."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#3bbca8] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#339990] focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Joining...' : 'Join the Waitlist'}
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center mt-4">
                    By joining, you agree to receive updates about Woofadaar&apos;s launch.
      </p>
    </form>
  );
}