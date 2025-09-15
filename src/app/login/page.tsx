'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Building2, Shield, UserPlus, LogIn } from 'lucide-react';
import { CompactLanguageSwitcher } from '../../components/ui/LanguageSwitcher';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [userType, setUserType] = useState<'pet-parent' | 'partner' | 'admin'>('pet-parent');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  // Cache-busting effect - force fresh load
  useEffect(() => {
    // Clear any cached data
    if (typeof window !== 'undefined') {
      // Clear service worker if exists
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.unregister();
          });
        });
      }
      
      // Clear any localStorage tokens that might be stale
      const token = localStorage.getItem('woofadaar_token');
      if (token) {
        // Check if token is expired or invalid
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp * 1000 < Date.now()) {
            localStorage.removeItem('woofadaar_token');
            localStorage.removeItem('user_type');
          }
        } catch (e) {
          localStorage.removeItem('woofadaar_token');
          localStorage.removeItem('user_type');
        }
      }
    }
  }, []);

  // Login form data
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  // Registration form data (pet-parent)
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    location: '',
    experience_level: 'beginner'
  });

  // Partner registration data (inline form)
  const [partnerData, setPartnerData] = useState({
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

  const quickFillDemo = () => {
    if (mode === 'login') {
      const demoCredentials = {
        'pet-parent': { email: 'demo@user.com', password: 'demo123' },
        'partner': { email: 'demo@vet.com', password: 'demo123' },
        'admin': { email: 'admin@woofadaar.com', password: 'admin123' }
      };
      setLoginData(demoCredentials[userType]);
    } else {
      if (userType === 'partner') {
        setPartnerData(prev => ({
          ...prev,
          name: 'Dr. Demo Vet',
          email: `vet${Date.now()}@example.com`,
          phone: '9999999999',
          password: 'demo123',
          confirmPassword: 'demo123',
          business_name: 'Demo Vet Clinic',
          location: 'Mumbai, Maharashtra',
          services_offered: 'Vaccination, General Checkup',
          availability_hours: 'Mon-Fri 9AM-6PM'
        }));
      } else {
        setRegisterData({
          name: 'New User',
          email: `newuser${Date.now()}@example.com`,
          password: 'test123',
          confirmPassword: 'test123',
          location: 'Mumbai, Maharashtra',
          experience_level: 'beginner'
        });
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/working-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginData.email,
          password: loginData.password,
          userType
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user info
        localStorage.setItem('woofadaar_token', data.token);
        localStorage.setItem('user_type', data.userType);
        
        // Dispatch auth state change
        window.dispatchEvent(new Event('authStateChanged'));
        
        setSuccess(`✅ Login successful as ${data.userType}!`);
        
        // Redirect after 1 second
        setTimeout(() => {
          if (data.userType === 'partner') {
            router.push('/partner/dashboard');
          } else if (data.userType === 'admin') {
            router.push('/admin');
          } else {
            router.push('/profile');
          }
        }, 1000);
      } else {
        setError(data.message || 'Login failed');
        
        // Show available accounts if credentials are wrong
        if (data.available_accounts) {
          setError(data.message + '\n\nAvailable test accounts:\n' + 
            data.available_accounts.map((acc: any) => `${acc.email} / ${acc.password} (${acc.type})`).join('\n'));
        }
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only handles pet-parent here; partner handled by handlePartnerRegister
    if (userType === 'partner') return;
    
    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/working-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerData.name,
          email: registerData.email,
          password: registerData.password,
          location: registerData.location,
          experience_level: registerData.experience_level
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user info
        localStorage.setItem('woofadaar_token', data.token);
        localStorage.setItem('user_type', data.userType);
        
        // Dispatch auth state change
        window.dispatchEvent(new Event('authStateChanged'));
        
        setSuccess(`✅ Registration successful! Welcome to Woofadaar!`);
        
        // Redirect after 2 seconds to onboarding
        setTimeout(() => {
          router.push('/onboarding');
        }, 2000);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePartnerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (partnerData.password !== partnerData.confirmPassword) {
      setLoading(false);
      setError('Passwords do not match');
      return;
    }

    if (partnerData.password.length < 6) {
      setLoading(false);
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      const { confirmPassword, ...payload } = partnerData as any;
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (response.ok && result?.success) {
        setSuccess('✅ Partner application submitted! Our team will review your application.');
        // Clear the form
        setPartnerData({
          name: '', email: '', phone: '', password: '', confirmPassword: '',
          partner_type: 'vet', business_name: '', location: '', website: '', bio: '',
          services_offered: '', consultation_fee: '', availability_hours: '',
          languages_spoken: '', certifications: ''
        });
      } else {
        setError(result?.message || 'Failed to submit registration. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setLoginData({ email: '', password: '' });
    setRegisterData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      location: '',
      experience_level: 'beginner'
    });
    setPartnerData({
      name: '', email: '', phone: '', password: '', confirmPassword: '',
      partner_type: 'vet', business_name: '', location: '', website: '', bio: '',
      services_offered: '', consultation_fee: '', availability_hours: '',
      languages_spoken: '', certifications: ''
    });
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen bg-[#fef8e8] py-16">
      <div className="container mx-auto px-4 max-w-md">
        {/* Language Switcher and Home button */}
        <div className="flex justify-between items-center mb-8">
          <div></div>
          <div className="flex items-center space-x-4">
            <a
              href="/"
              className="bg-[#525252] text-white px-6 py-3 rounded-xl hover:bg-[#404040] transition-all duration-200 flex items-center font-semibold shadow-md"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </a>
            <CompactLanguageSwitcher />
          </div>
        </div>
        
        <div className="text-center mb-12">
          <h1 className="text-5xl sm:text-6xl font-black text-[#3bbca8] mb-4 tracking-tight">woofadaar</h1>
          <p className="text-lg text-[#525252] font-medium">
            {mode === 'login' 
              ? 'Welcome back to your pet community' 
              : userType === 'partner' ? 'Register as a Woofadaar Partner' : 'Join India\'s Dog Parent Community'
            }
          </p>
        </div>

        <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-[#f5f5f5]">
          {/* Mode Toggle */}
          <div className="mb-8">
            <div className="grid grid-cols-2 bg-[#f5f5f5] rounded-xl p-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex items-center justify-center py-3 px-4 rounded-lg transition-all touch-target font-semibold ${
                  mode === 'login'
                    ? 'bg-white text-[#3bbca8] shadow-md'
                    : 'text-[#525252] hover:text-[#171717]'
                }`}
              >
                <LogIn className="w-4 h-4 mr-1" />
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex items-center justify-center py-3 px-4 rounded-lg transition-all touch-target font-semibold ${
                  mode === 'register'
                    ? 'bg-white text-[#3bbca8] shadow-md'
                    : 'text-[#525252] hover:text-[#171717]'
                }`}
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Register
              </button>
            </div>
          </div>

          {/* User Type Toggle */}
          <div className="mb-8">
            <div className="grid grid-cols-3 bg-[#f5f5f5] rounded-xl p-2">
              <button
                type="button"
                onClick={() => setUserType('pet-parent')}
                className={`flex items-center justify-center py-3 px-2 rounded-lg transition-all touch-target text-sm font-semibold ${
                  userType === 'pet-parent'
                    ? 'bg-white text-[#3bbca8] shadow-md'
                    : 'text-[#525252] hover:text-[#171717]'
                }`}
              >
                <User className="w-4 h-4 mr-1" />
                Pet Parent
              </button>
              <button
                type="button"
                onClick={() => setUserType('partner')}
                className={`flex items-center justify-center py-3 px-2 rounded-lg transition-all touch-target text-sm font-semibold ${
                  userType === 'partner'
                    ? 'bg-white text-[#3bbca8] shadow-md'
                    : 'text-[#525252] hover:text-[#171717]'
                }`}
              >
                <Building2 className="w-4 h-4 mr-1" />
                Partner
              </button>
              <button
                type="button"
                onClick={() => setUserType('admin')}
                className={`flex items-center justify-center py-3 px-2 rounded-lg transition-all touch-target text-sm font-semibold ${
                  userType === 'admin'
                    ? 'bg-white text-[#3bbca8] shadow-md'
                    : 'text-[#525252] hover:text-[#171717]'
                }`}
              >
                <Shield className="w-4 h-4 mr-1" />
                Admin
              </button>
            </div>
          </div>

          {/* Quick Fill Demo Button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={quickFillDemo}
              className="w-full bg-[#f5f5f5] text-[#525252] py-3 px-4 rounded-xl hover:bg-[#e5e5e5] transition-all duration-200 font-semibold"
            >
              🚀 Quick Fill Demo Credentials
            </button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-[#b71c1c] text-[#b71c1c] rounded-xl font-medium whitespace-pre-line">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-green-50 border-2 border-[#099441] text-[#099441] rounded-xl font-medium">
              {success}
            </div>
          )}

          {mode === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-base font-semibold text-[#171717] mb-3">
                  Email
                </label>
                <input
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                  className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] touch-target text-base transition-all duration-200"
                  placeholder="your.email@example.com"
                  autoComplete="email"
                  inputMode="email"
                  required
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-[#171717] mb-3">
                  Password
                </label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] touch-target text-base transition-all duration-200"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#3bbca8] text-white font-bold py-4 px-6 rounded-xl hover:bg-[#339990] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-target shadow-lg hover:shadow-xl text-lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Logging in...
                  </>
                ) : (
                  `Login as ${userType === 'pet-parent' ? 'Pet Parent' : userType === 'partner' ? 'Partner' : 'Admin'}`
                )}
              </button>
            </form>
          ) : (
            userType !== 'partner' ? (
              /* Pet-parent Registration Form */
              <form onSubmit={handleRegister} className="space-y-6">
                <div>
                  <label className="block text-base font-semibold text-[#171717] mb-3">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={registerData.name}
                    onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                    className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] touch-target text-base transition-all duration-200"
                    placeholder="Enter your full name"
                    autoComplete="name"
                    inputMode="text"
                    required
                  />
                </div>

                <div>
                  <label className="block text-base font-semibold text-[#171717] mb-3">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                    className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] touch-target text-base transition-all duration-200"
                    placeholder="your.email@example.com"
                    autoComplete="email"
                    inputMode="email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-base font-semibold text-[#171717] mb-3">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                    className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] touch-target text-base transition-all duration-200"
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-base font-semibold text-[#171717] mb-3">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                    className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] touch-target text-base transition-all duration-200"
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-base font-semibold text-[#171717] mb-3">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={registerData.location}
                    onChange={(e) => setRegisterData({...registerData, location: e.target.value})}
                    className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] touch-target text-base transition-all duration-200"
                    placeholder="City, State"
                    autoComplete="address-level2"
                    inputMode="text"
                    required
                  />
                </div>

                <div>
                  <label className="block text-base font-semibold text-[#171717] mb-3">
                    Dog Parenting Experience *
                  </label>
                  <select
                    value={registerData.experience_level}
                    onChange={(e) => setRegisterData({...registerData, experience_level: e.target.value})}
                    className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] touch-target text-base transition-all duration-200 bg-white"
                    required
                  >
                    <option value="beginner">First-time dog parent</option>
                    <option value="intermediate">Experienced dog parent</option>
                    <option value="expert">Expert dog parent</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#3bbca8] text-white font-bold py-4 px-6 rounded-xl hover:bg-[#339990] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-target shadow-lg hover:shadow-xl text-lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>
            ) : (
              /* Partner Registration Form (inline) */
              <form onSubmit={handlePartnerRegister} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-base font-semibold text-[#171717] mb-3">Full Name *</label>
                    <input
                      type="text"
                      value={partnerData.name}
                      onChange={(e) => setPartnerData({...partnerData, name: e.target.value})}
                      className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] text-base"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-[#171717] mb-3">Email Address *</label>
                    <input
                      type="email"
                      value={partnerData.email}
                      onChange={(e) => setPartnerData({...partnerData, email: e.target.value})}
                      className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] text-base"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-[#171717] mb-3">Phone Number *</label>
                    <input
                      type="tel"
                      value={partnerData.phone}
                      onChange={(e) => setPartnerData({...partnerData, phone: e.target.value})}
                      className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] text-base"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-base font-semibold text-[#171717] mb-3">Password *</label>
                      <input
                        type="password"
                        value={partnerData.password}
                        onChange={(e) => setPartnerData({...partnerData, password: e.target.value})}
                        className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] text-base"
                        placeholder="Minimum 6 characters"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-base font-semibold text-[#171717] mb-3">Confirm Password *</label>
                      <input
                        type="password"
                        value={partnerData.confirmPassword}
                        onChange={(e) => setPartnerData({...partnerData, confirmPassword: e.target.value})}
                        className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] text-base"
                        placeholder="Re-enter your password"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-[#171717] mb-3">Partner Type *</label>
                    <select
                      value={partnerData.partner_type}
                      onChange={(e) => setPartnerData({...partnerData, partner_type: e.target.value})}
                      className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] text-base bg-white"
                      required
                    >
                      <option value="vet">Veterinarian</option>
                      <option value="trainer">Dog Trainer</option>
                      <option value="corporate">Corporate Partner</option>
                      <option value="kci">KCI Certified</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-[#171717] mb-3">Business Name</label>
                    <input
                      type="text"
                      value={partnerData.business_name}
                      onChange={(e) => setPartnerData({...partnerData, business_name: e.target.value})}
                      className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] text-base"
                      placeholder="Your clinic, business, or organization name"
                    />
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-[#171717] mb-3">Location *</label>
                    <input
                      type="text"
                      value={partnerData.location}
                      onChange={(e) => setPartnerData({...partnerData, location: e.target.value})}
                      className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] text-base"
                      placeholder="City, State"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-[#171717] mb-3">Website</label>
                    <input
                      type="url"
                      value={partnerData.website}
                      onChange={(e) => setPartnerData({...partnerData, website: e.target.value})}
                      className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] text-base"
                      placeholder="https://your-website.com"
                    />
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-[#171717] mb-3">Services Offered</label>
                    <textarea
                      value={partnerData.services_offered}
                      onChange={(e) => setPartnerData({...partnerData, services_offered: e.target.value})}
                      rows={3}
                      className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] text-base"
                      placeholder="Describe the services you offer..."
                    />
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-[#171717] mb-3">Availability Hours</label>
                    <input
                      type="text"
                      value={partnerData.availability_hours}
                      onChange={(e) => setPartnerData({...partnerData, availability_hours: e.target.value})}
                      className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] text-base"
                      placeholder="e.g., Mon-Fri 9 AM - 6 PM, Sat 10 AM - 4 PM"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-base font-semibold text-[#171717] mb-3">Consultation Fee</label>
                      <input
                        type="text"
                        value={partnerData.consultation_fee}
                        onChange={(e) => setPartnerData({...partnerData, consultation_fee: e.target.value})}
                        className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] text-base"
                        placeholder="e.g., ₹500 per session"
                      />
                    </div>
                    <div>
                      <label className="block text-base font-semibold text-[#171717] mb-3">Languages Spoken</label>
                      <input
                        type="text"
                        value={partnerData.languages_spoken}
                        onChange={(e) => setPartnerData({...partnerData, languages_spoken: e.target.value})}
                        className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] text-base"
                        placeholder="e.g., English, Hindi"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-[#171717] mb-3">Certifications & Qualifications</label>
                    <input
                      type="text"
                      value={partnerData.certifications}
                      onChange={(e) => setPartnerData({...partnerData, certifications: e.target.value})}
                      className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] text-base"
                      placeholder="e.g., BVSc, Certified Dog Trainer"
                    />
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-[#171717] mb-3">Bio/About You</label>
                    <textarea
                      value={partnerData.bio}
                      onChange={(e) => setPartnerData({...partnerData, bio: e.target.value})}
                      rows={4}
                      className="w-full px-6 py-4 border-2 border-[#d4d4d4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-[#3bbca8] text-base"
                      placeholder="Tell us about your experience, expertise, and what makes you unique..."
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#3bbca8] text-white font-bold py-4 px-6 rounded-xl hover:bg-[#339990] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-target shadow-lg hover:shadow-xl text-lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting Application...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </button>
              </form>
            )
          )}

          {/* Clear Form Button */}
          <div className="mt-6">
            <button
              type="button"
              onClick={clearForm}
              className="w-full bg-[#f5f5f5] text-[#525252] py-3 px-4 rounded-xl hover:bg-[#e5e5e5] transition-all duration-200 font-semibold"
            >
              Clear Form
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}