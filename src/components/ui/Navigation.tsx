'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CompactLanguageSwitcher } from './LanguageSwitcher';

interface NavigationProps {
  userType?: 'user' | 'partner' | 'admin';
  isAuthenticated?: boolean;
}

export default function Navigation({ userType = 'user', isAuthenticated = false }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authState, setAuthState] = useState({ isAuthenticated: false, userType: 'user' });
  const pathname = usePathname();

  useEffect(() => {
    // Check authentication state from localStorage
    const checkAuthState = () => {
      const token = localStorage.getItem('woofadaar_token');
      const storedUserType = localStorage.getItem('user_type');
      
      if (token) {
        setAuthState({
          isAuthenticated: true,
          userType: storedUserType === 'partner' ? 'partner' : 'user'
        });
      } else {
        setAuthState({
          isAuthenticated: false,
          userType: 'user'
        });
      }
    };

    // Check initial state
    checkAuthState();

    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'woofadaar_token' || e.key === 'user_type') {
        checkAuthState();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Listen for custom events (when user logs in/out in same tab)
    const handleAuthChange = () => {
      checkAuthState();
    };

    window.addEventListener('authStateChanged', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChanged', handleAuthChange);
    };
  }, []);

  const isActive = (path: string) => pathname === path;

  const userMenuItems = [
    { name: 'My Profile', href: '/profile', icon: '👤' },
    { name: 'My Dogs', href: '/profile/dogs', icon: '🐕' },
    { name: 'Health Tracking', href: '/health', icon: '❤️' },
    { name: 'Dog Diary', href: '/diary', icon: '📖' },
    { name: 'Events', href: '/events', icon: '📅' },
    { name: 'My Events', href: '/events/my', icon: '🗓️' },
    { name: 'Premium', href: '/premium', icon: '⭐' },
    { name: 'Find Partners', href: '/partners/directory', icon: '🔍' },
    { name: 'Book Appointments', href: '/appointments', icon: '⏰' },
    { name: 'Dog ID', href: '/dog-id', icon: '🏥' },
  ];

  const communityItem = { name: 'Community', href: '/community', icon: '💬' };

  const partnerMenuItems = [
    { name: 'Partner Dashboard', href: '/partner/dashboard', icon: '📊' },
    { name: 'Appointments', href: '/partner/appointments', icon: '📅' },
    { name: 'Reviews', href: '/partner/reviews', icon: '⭐' },
    { name: 'Earnings', href: '/partner/earnings', icon: '💰' },
    { name: 'Dog ID Access', href: '/partner/dog-id', icon: '🆔' },
    { name: 'Corporate', href: '/partner/corporate', icon: '🏢' }
  ];

  const adminMenuItems = [
    { name: 'Admin Dashboard', href: '/admin', icon: '⚙️' },
    { name: 'Partner Management', href: '/admin/partners', icon: '👥' },
    { name: 'Waitlist', href: '/admin/waitlist', icon: '📋' },
    { name: 'Revenue Analytics', href: '/admin/revenue-analytics', icon: '📈' },
    { name: 'KCI Management', href: '/admin/kci', icon: '🏆' },
    { name: 'Corporate Management', href: '/admin/corporate', icon: '🏢' },
  ];

  const getMenuItems = () => {
    switch (authState.userType) {
      case 'partner':
        return partnerMenuItems;
      case 'admin':
        return adminMenuItems;
      default:
        return userMenuItems;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('woofadaar_token');
    localStorage.removeItem('user_type');
    setAuthState({ isAuthenticated: false, userType: 'user' });
    window.location.href = '/';
  };

  return (
    <nav className="bg-[#3bbca8] shadow-lg border-b border-[#2daa96]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 md:h-16">
          {/* Logo - Fixed to far left */}
          <div className="flex items-center flex-shrink-0 mr-12 pr-8">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity p-3">
              <img src="/Final Icon-14.jpg" alt="Woofadaar" className="h-12 w-12 md:h-14 md:w-14" />
            </Link>
          </div>
          
          {/* Rest of navigation */}
          <div className="flex-1 flex justify-between">
          
          {/* Desktop Navigation - Hidden on mobile */}
          <div className="hidden lg:flex items-center space-x-4">
            {authState.isAuthenticated ? (
              <>
                {/* Regular menu items */}
                <div className="flex items-center space-x-2">
                  {getMenuItems().map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 min-h-[44px] ${
                        isActive(item.href)
                          ? 'bg-white text-[#3bbca8] shadow-md'
                          : 'text-white hover:text-white hover:bg-[#2daa96] hover:shadow-sm border border-white/20 hover:border-white/40'
                      }`}
                    >
                      <span className="text-sm">{item.icon}</span>
                      <span className="hidden md:inline">{item.name}</span>
                    </Link>
                  ))}
                </div>

                {/* Community button - special styling */}
                <div className="flex items-center space-x-2">
                  <Link
                    href={communityItem.href}
                    className={`group flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] ${
                      isActive(communityItem.href)
                        ? 'bg-[#76519f] text-white shadow-lg'
                        : 'bg-[#76519f] hover:bg-[#6a4a8f] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200'
                    }`}
                  >
                    <span className="text-sm">{communityItem.icon}</span>
                    <span className="hidden lg:inline">{communityItem.name}</span>
                  </Link>

                  {/* Logout button */}
                  <button
                    onClick={handleLogout}
                    className="text-white hover:text-[#e05a37] px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[#2daa96]"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/partners/directory"
                  className="text-white hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[#2daa96] border border-white/30 hover:border-white/50"
                >
                  Find Partners
                </Link>
                <Link
                  href="/employee/login"
                  className="flex items-center space-x-2 text-white hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[#2daa96] border border-blue-400/50 hover:border-blue-300 bg-blue-500/20 hover:bg-blue-500/30"
                >
                  <span>🏢</span>
                  <span>Employee Portal</span>
                </Link>
                <Link
                  href="/login"
                  className="text-white hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[#2daa96] border border-white/30 hover:border-white/50"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-white text-[#3bbca8] px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors shadow-md hover:shadow-lg border border-gray-200"
                >
                  Register
                </Link>
              </>
            )}
            
            {/* Language switcher - moved to far right */}
            <div className="ml-4 hidden lg:block">
              <CompactLanguageSwitcher />
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center space-x-2">
            <div className="block lg:hidden">
              <CompactLanguageSwitcher />
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white hover:text-white p-2 border border-white rounded-md touch-target"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-[#3bbca8] border-t border-[#2daa96]">
            {authState.isAuthenticated ? (
              <>
                {/* Regular menu items */}
                {getMenuItems().map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-3 rounded-lg text-base font-medium transition-colors touch-target ${
                      isActive(item.href)
                        ? 'bg-white text-[#3bbca8]'
                        : 'text-white hover:text-white hover:bg-[#2daa96] border border-white/20 hover:border-white/40'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                ))}
                
                {/* Community button - special styling for mobile */}
                <Link
                  href={communityItem.href}
                  className={`group flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 touch-target ${
                    isActive(communityItem.href)
                      ? 'bg-[#76519f] text-white shadow-lg'
                      : 'bg-[#76519f] hover:bg-[#6a4a8f] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="text-lg">{communityItem.icon}</span>
                  <span>{communityItem.name}</span>
                </Link>
                
                {/* Logout button */}
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 px-3 py-3 rounded-lg text-base font-medium text-white hover:text-[#e05a37] hover:bg-[#2daa96] transition-colors w-full text-left touch-target"
                >
                  <span>🚪</span>
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/partners/directory"
                  className="flex items-center space-x-2 px-3 py-3 rounded-md text-base font-medium text-white hover:text-white hover:bg-[#2daa96] touch-target border border-white/20 hover:border-white/40"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>🔍</span>
                  <span>Find Partners</span>
                </Link>
                <Link
                  href="/employee/login"
                  className="flex items-center space-x-2 px-3 py-3 rounded-md text-base font-medium text-white hover:text-white hover:bg-[#2daa96] touch-target border border-blue-400/50 hover:border-blue-300 bg-blue-500/20 hover:bg-blue-500/30"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>🏢</span>
                  <span>Employee Portal</span>
                </Link>
                <Link
                  href="/login"
                  className="flex items-center space-x-2 px-3 py-3 rounded-md text-base font-medium text-white hover:text-white hover:bg-[#2daa96] touch-target border border-white/20 hover:border-white/40"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>🔑</span>
                  <span>Login</span>
                </Link>
                <Link
                  href="/register"
                  className="flex items-center space-x-2 px-3 py-3 rounded-md text-base font-medium bg-white text-[#3bbca8] touch-target border border-gray-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>👋</span>
                  <span>Join Community</span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
} 