'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PartnerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/partner-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (result.success) {
        // Store partner token using standard naming convention
        localStorage.setItem('woofadaar_token', result.token);
        localStorage.setItem('user_type', 'partner');
        localStorage.setItem('partner_data', JSON.stringify(result.partner));
        
        setSuccess('Login successful! Redirecting to dashboard...');
        
        // Redirect to partner dashboard
        setTimeout(() => {
          router.push('/partner/dashboard');
        }, 1500);
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fef8e8] py-12">
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-[#171717] mb-4">🏢 Partner Login</h1>
          <p className="text-lg text-[#525252] font-medium">
            Access your Woofadaar partner dashboard
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-[#f5f5f5] p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-base font-semibold text-[#171717] mb-3">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-[#d4d4d4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] text-base transition-all duration-200"
                placeholder="Enter your partner email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-base font-semibold text-[#171717] mb-3">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-[#d4d4d4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] text-base transition-all duration-200"
                placeholder="Enter your password"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border-2 border-red-200">
                <p className="text-red-600 font-medium text-center">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-4 rounded-xl bg-green-50 border-2 border-green-200">
                <p className="text-green-600 font-medium text-center">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#3bbca8] text-white px-6 py-3 rounded-xl hover:bg-[#339990] transition-all duration-200 disabled:opacity-50 font-bold text-lg shadow-lg hover:shadow-xl"
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 space-y-4 text-center">
            <p className="text-[#525252]">
              Don't have a partner account?{' '}
              <Link
                href="/partners/register"
                className="text-[#3bbca8] hover:text-[#339990] font-semibold transition-colors"
              >
                Register here
              </Link>
            </p>
            
            <p className="text-[#525252]">
              Are you a pet parent?{' '}
              <Link
                href="/login"
                className="text-[#3bbca8] hover:text-[#339990] font-semibold transition-colors"
              >
                Pet parent login
              </Link>
            </p>
          </div>
        </div>

        {/* Demo Instructions */}
        <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl">
          <h3 className="text-lg font-bold text-blue-800 mb-3">🧪 Demo Instructions</h3>
          <p className="text-blue-700 mb-3">
            To test the partner features, first register as a partner using the form above, then login with your credentials.
          </p>
          <p className="text-sm text-blue-600">
            <strong>Note:</strong> New partner accounts are auto-approved in demo mode for immediate testing.
          </p>
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-[#3bbca8] hover:text-[#339990] font-bold text-lg transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}