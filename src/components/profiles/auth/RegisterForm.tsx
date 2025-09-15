'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    location: '',
    customLocation: '',
    experience_level: 'beginner'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    // Use custom location if "Other" is selected
    const finalLocation = formData.location === 'Other' ? formData.customLocation : formData.location;

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          location: finalLocation,
          experience_level: formData.experience_level
        }),
      });

      console.log('Registration response status:', response.status);
      
      const responseData = await response.json();
      console.log('Registration response data:', responseData);
      
      if (response.ok) {
        console.log('Registration successful!', responseData);
        localStorage.setItem('woofadaar_token', responseData.token);
        localStorage.setItem('user_type', 'pet-parent');
        
        // Dispatch auth state change event
        window.dispatchEvent(new Event('authStateChanged'));
        
        // Clear any previous errors and redirect immediately
        setError('');
        router.push('/profile');
      } else {
        console.log('Registration failed:', responseData);
        setError(responseData.message || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-primary mb-6 text-center">Create Account</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent touch-target"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent touch-target"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent touch-target"
              placeholder="Create a password"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent touch-target"
              placeholder="Confirm your password"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent touch-target"
            >
              <option value="">Select your city</option>
              <option value="Mumbai, Maharashtra">Mumbai, Maharashtra</option>
              <option value="Delhi, Delhi">Delhi, Delhi</option>
              <option value="Bangalore, Karnataka">Bangalore, Karnataka</option>
              <option value="Hyderabad, Telangana">Hyderabad, Telangana</option>
              <option value="Chennai, Tamil Nadu">Chennai, Tamil Nadu</option>
              <option value="Kolkata, West Bengal">Kolkata, West Bengal</option>
              <option value="Pune, Maharashtra">Pune, Maharashtra</option>
              <option value="Ahmedabad, Gujarat">Ahmedabad, Gujarat</option>
              <option value="Jaipur, Rajasthan">Jaipur, Rajasthan</option>
              <option value="Surat, Gujarat">Surat, Gujarat</option>
              <option value="Lucknow, Uttar Pradesh">Lucknow, Uttar Pradesh</option>
              <option value="Kanpur, Uttar Pradesh">Kanpur, Uttar Pradesh</option>
              <option value="Nagpur, Maharashtra">Nagpur, Maharashtra</option>
              <option value="Indore, Madhya Pradesh">Indore, Madhya Pradesh</option>
              <option value="Thane, Maharashtra">Thane, Maharashtra</option>
              <option value="Bhopal, Madhya Pradesh">Bhopal, Madhya Pradesh</option>
              <option value="Visakhapatnam, Andhra Pradesh">Visakhapatnam, Andhra Pradesh</option>
              <option value="Pimpri-Chinchwad, Maharashtra">Pimpri-Chinchwad, Maharashtra</option>
              <option value="Patna, Bihar">Patna, Bihar</option>
              <option value="Vadodara, Gujarat">Vadodara, Gujarat</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {formData.location === 'Other' && (
            <div>
              <label htmlFor="customLocation" className="block text-sm font-medium text-gray-700 mb-1">
                Enter Your City *
              </label>
              <input
                type="text"
                id="customLocation"
                name="customLocation"
                value={formData.customLocation}
                onChange={handleChange}
                required
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent touch-target"
                placeholder="Enter your city name (e.g., Chandigarh, Punjab)"
              />
            </div>
          )}

          <div>
            <label htmlFor="experience_level" className="block text-sm font-medium text-gray-700 mb-1">
              Dog Parenting Experience
            </label>
            <select
              id="experience_level"
              name="experience_level"
              value={formData.experience_level}
              onChange={handleChange}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent touch-target"
            >
              <option value="beginner">First-time dog parent</option>
              <option value="intermediate">Experienced dog parent</option>
              <option value="expert">Expert dog parent</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-target"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="text-primary hover:underline">
              Login here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}