'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CompactLanguageSwitcher } from '../../components/ui/LanguageSwitcher';

interface RegistrationForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  location: string;
  experience_level: string;
  preferred_language: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [formData, setFormData] = useState<RegistrationForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    location: '',
    experience_level: 'beginner',
    preferred_language: 'en'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuthStatus = () => {
      const token = localStorage.getItem('woofadaar_token');
      const userType = localStorage.getItem('user_type');
      
      if (token) {
        // User is logged in, redirect based on user type
        if (userType === 'partner') {
          router.push('/partner/dashboard');
        } else {
          router.push('/profile');
        }
        return;
      }
      
      // User is not logged in, show register page
      setIsCheckingAuth(false);
    };

    checkAuthStatus();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setSubmitResult({
        success: false,
        message: 'Passwords do not match. Please try again.',
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

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
          location: formData.location,
          experience_level: formData.experience_level,
          preferred_language: formData.preferred_language,
          userType: 'pet-parent'
        }),
      });

      const result = await response.json();
      setSubmitResult(result);

      if (result.success) {
        // Reset form on success
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          location: '',
          experience_level: 'beginner',
          preferred_language: 'en'
        });
      }
    } catch (error) {
      setSubmitResult({
        success: false,
        message: 'Failed to register. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof RegistrationForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Show loading spinner while checking auth status
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-milk-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-milk-white py-12">
      <div className="container mx-auto px-4">
        {/* Language Switcher and Home button in top right */}
        <div className="flex justify-end items-center space-x-4 mb-4">
          <Link
            href="/"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </Link>
          <CompactLanguageSwitcher />
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">woofadaar</h1>
          <p className="text-dark-grey">Join India's Dog Parent Community</p>
        </div>

        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-primary mb-6 text-center">Create Your Account</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-dark-grey mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-4 py-3 border border-light-grey rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px]"
                placeholder="Enter your full name"
                autoComplete="name"
                inputMode="text"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-grey mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-4 py-3 border border-light-grey rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px]"
                placeholder="your.email@example.com"
                autoComplete="email"
                inputMode="email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-grey mb-2">
                Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full px-4 py-3 border border-light-grey rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px]"
                placeholder="Create a strong password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-grey mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className="w-full px-4 py-3 border border-light-grey rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px]"
                placeholder="Confirm your password"
                autoComplete="new-password"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-grey mb-2">
                Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-4 py-3 border border-light-grey rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px]"
                placeholder="City, State"
                autoComplete="address-level2"
                inputMode="text"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-grey mb-2">
                Dog Parenting Experience *
              </label>
              <select
                value={formData.experience_level}
                onChange={(e) => handleInputChange('experience_level', e.target.value)}
                className="w-full px-4 py-3 border border-light-grey rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px]"
                required
              >
                <option value="beginner">First-time dog parent</option>
                <option value="intermediate">Experienced dog parent</option>
                <option value="expert">Expert dog parent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-grey mb-2">
                Preferred Language *
              </label>
              <select
                value={formData.preferred_language}
                onChange={(e) => handleInputChange('preferred_language', e.target.value)}
                className="w-full px-4 py-3 border border-light-grey rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px]"
                required
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-white font-semibold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
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
                {submitResult.success ? '✅ Account Created Successfully' : '❌ Registration Failed'}
              </h3>
              <p>{submitResult.message}</p>
              
              {submitResult.success && (
                <div className="mt-4">
                  <Link
                    href="/login"
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors inline-block"
                  >
                    Login Now
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="text-center space-y-2 mt-6">
            <div>
              <span className="text-gray-600">Already have an account? </span>
              <Link href="/login" className="text-primary hover:underline">
                Login here
              </Link>
            </div>
            <div>
              <Link href="/partners/register" className="text-primary hover:underline text-sm">
                Register as a Partner instead
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}