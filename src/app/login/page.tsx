'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '../../components/profiles/auth/LoginForm';
import { CompactLanguageSwitcher } from '../../components/ui/LanguageSwitcher';

export default function LoginPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<'pet-parent' | 'partner'>('pet-parent');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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
      
      // User is not logged in, show login page
      setIsCheckingAuth(false);
    };

    checkAuthStatus();
  }, [router]);

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
          <a
            href="/"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </a>
          <CompactLanguageSwitcher />
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">woofadaar</h1>
          <p className="text-dark-grey">
            {userType === 'pet-parent' 
              ? 'Welcome back to your pet community' 
              : 'Welcome back to your partner dashboard'
            }
          </p>
        </div>
        <LoginForm onUserTypeChange={setUserType} />
      </div>
    </div>
  )
}