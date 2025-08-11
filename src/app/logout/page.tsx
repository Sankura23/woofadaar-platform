'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear all authentication data
    localStorage.removeItem('woofadaar_token');
    localStorage.removeItem('user_type');
    localStorage.removeItem('user_info');
    
    // Dispatch auth state change event
    window.dispatchEvent(new Event('authStateChanged'));
    
    // Redirect to home page
    router.push('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-milk-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Logging out...</p>
      </div>
    </div>
  );
}