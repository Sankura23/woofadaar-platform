'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

interface PartnerAuthProps {
  onSuccess?: () => void;
}

export default function PartnerAuthentication({ onSuccess }: PartnerAuthProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    mfaCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [partnerId, setPartnerId] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/partners/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          mfaCode: formData.mfaCode || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.requiresMFA) {
        setRequiresMFA(true);
        setPartnerId(data.partnerId);
        setError('');
      } else {
        // Successful login
        localStorage.setItem('woofadaar_partner_token', data.token);
        localStorage.setItem('partner_info', JSON.stringify(data.partner));
        
        // Trigger auth state change
        window.dispatchEvent(new Event('partnerAuthStateChanged'));
        
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/partner/dashboard');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFAVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.mfaCode) {
      setError('Please enter the MFA code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/partners/auth/mfa-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partnerId,
          mfaCode: formData.mfaCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'MFA verification failed');
      }

      // Successful MFA verification
      localStorage.setItem('woofadaar_partner_token', data.token);
      localStorage.setItem('partner_info', JSON.stringify(data.partner));
      
      // Trigger auth state change
      window.dispatchEvent(new Event('partnerAuthStateChanged'));
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/partner/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MFA verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const requestNewMFACode = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/partners/auth/mfa-verify', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ partnerId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send new MFA code');
      }

      setError('New MFA code sent successfully');
      setFormData(prev => ({ ...prev, mfaCode: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send new MFA code');
    } finally {
      setIsLoading(false);
    }
  };

  if (requiresMFA) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Multi-Factor Authentication</h2>
            <p className="text-gray-600">Please enter the 6-digit code sent to your registered device</p>
          </div>

          <form onSubmit={handleMFAVerification} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MFA Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={formData.mfaCode}
                onChange={(e) => setFormData(prev => ({ ...prev, mfaCode: e.target.value.replace(/\D/g, '') }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
                placeholder="123456"
                required
              />
            </div>

            {error && (
              <div className={`p-4 rounded-lg flex items-center gap-2 ${
                error.includes('successfully') 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                {error.includes('successfully') ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <span className={`text-sm ${
                  error.includes('successfully') ? 'text-green-800' : 'text-red-800'
                }`}>
                  {error}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || formData.mfaCode.length !== 6}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? 'Verifying...' : 'Verify & Login'}
            </button>

            <button
              type="button"
              onClick={requestNewMFACode}
              disabled={isLoading}
              className="w-full text-blue-600 hover:text-blue-700 py-2 text-sm transition-colors"
            >
              Didn't receive code? Send new one
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Partner Portal</h2>
          <p className="text-gray-600">Secure access to Dog ID verification system</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="partner@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Secure partner access • All activity is monitored and logged
          </p>
        </div>
      </div>
    </div>
  );
}