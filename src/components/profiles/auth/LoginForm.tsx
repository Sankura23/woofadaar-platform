'use client';

import { useState } from 'react';
import { User, Building2 } from 'lucide-react';

interface LoginFormProps {
  onUserTypeChange?: (userType: 'pet-parent' | 'partner') => void;
}

export default function LoginForm({ onUserTypeChange }: LoginFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [userType, setUserType] = useState<'pet-parent' | 'partner'>('pet-parent');
  const [isLoading, setIsLoading] = useState(false);

  const handleUserTypeChange = (newUserType: 'pet-parent' | 'partner') => {
    setUserType(newUserType);
    onUserTypeChange?.(newUserType);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          userType: userType
        }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('woofadaar_token', data.token);
        localStorage.setItem('user_type', data.userType);
        
        // Redirect based on user type
        if (userType === 'partner') {
          window.location.href = '/partners/directory';
        } else {
          window.location.href = '/profile';
        }
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Login failed');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-primary mb-6 text-center">Welcome Back!</h2>
      
      {/* User Type Toggle */}
      <div className="mb-6">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => handleUserTypeChange('pet-parent')}
            className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md transition-all ${
              userType === 'pet-parent'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <User className="w-4 h-4 mr-2" />
            Pet Parent
          </button>
          <button
            type="button"
            onClick={() => handleUserTypeChange('partner')}
            className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md transition-all ${
              userType === 'partner'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Building2 className="w-4 h-4 mr-2" />
            Partner
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-dark-grey mb-2">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full px-4 py-3 border border-light-grey rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="your.email@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-grey mb-2">
            Password
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            className="w-full px-4 py-3 border border-light-grey rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter your password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary text-white font-semibold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Logging in...
            </>
          ) : (
            `Login as ${userType === 'pet-parent' ? 'Pet Parent' : 'Partner'}`
          )}
        </button>

        <div className="text-center space-y-2">
          <div>
            <a href="/register" className="text-primary hover:underline">
              Don't have an account? Register here
            </a>
          </div>
          {userType === 'partner' && (
            <div className="space-y-2">
              <a href="/partners/register" className="text-primary hover:underline text-sm block">
                Register as a Partner
              </a>
              <p className="text-xs text-gray-500 mt-2">
                Note: Partner accounts require admin approval before login access
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}