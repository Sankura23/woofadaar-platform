'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface TabBarProps {
  userType?: 'user' | 'partner' | 'admin';
  isAuthenticated?: boolean;
}

export default function MobileTabBar({ userType = 'user', isAuthenticated = false }: TabBarProps) {
  const [authState, setAuthState] = useState({ isAuthenticated: false, userType: 'user' });
  const pathname = usePathname();

  useEffect(() => {
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

    checkAuthState();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'woofadaar_token' || e.key === 'user_type') {
        checkAuthState();
      }
    };

    const handleAuthChange = () => {
      checkAuthState();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authStateChanged', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChanged', handleAuthChange);
    };
  }, []);

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  // Don't show tab bar if user is not authenticated
  if (!authState.isAuthenticated) {
    return null;
  }

  const userTabs = [
    { 
      name: 'Home', 
      href: '/', 
      icon: '🏠',
      activeIcon: '🏠',
      color: '#3bbca8'
    },
    { 
      name: 'Health', 
      href: '/health', 
      icon: '❤️',
      activeIcon: '💚',
      color: '#e53e3e'
    },
    { 
      name: 'Community', 
      href: '/community', 
      icon: '👥',
      activeIcon: '💬',
      color: '#76519f'
    },
    { 
      name: 'Premium', 
      href: '/premium', 
      icon: '⭐',
      activeIcon: '🌟',
      color: '#f56500'
    },
    { 
      name: 'Profile', 
      href: '/profile', 
      icon: '👤',
      activeIcon: '👤',
      color: '#319795'
    }
  ];

  const partnerTabs = [
    { 
      name: 'Dashboard', 
      href: '/partner/dashboard', 
      icon: '📊',
      activeIcon: '📈',
      color: '#3bbca8'
    },
    { 
      name: 'Bookings', 
      href: '/partner/appointments', 
      icon: '📅',
      activeIcon: '📅',
      color: '#3182ce'
    },
    { 
      name: 'Earnings', 
      href: '/partner/earnings', 
      icon: '💰',
      activeIcon: '💵',
      color: '#38a169'
    },
    { 
      name: 'Dog IDs', 
      href: '/partner/dog-id', 
      icon: '🆔',
      activeIcon: '🔍',
      color: '#d69e2e'
    },
    { 
      name: 'Profile', 
      href: '/partner/profile', 
      icon: '⚙️',
      activeIcon: '⚙️',
      color: '#718096'
    }
  ];

  const adminTabs = [
    { 
      name: 'Admin', 
      href: '/admin', 
      icon: '⚙️',
      activeIcon: '🛠️',
      color: '#e53e3e'
    },
    { 
      name: 'Analytics', 
      href: '/admin/revenue-analytics', 
      icon: '📈',
      activeIcon: '📊',
      color: '#3182ce'
    },
    { 
      name: 'Partners', 
      href: '/admin/partners', 
      icon: '👥',
      activeIcon: '👥',
      color: '#38a169'
    },
    { 
      name: 'Users', 
      href: '/admin/users', 
      icon: '👤',
      activeIcon: '👤',
      color: '#d69e2e'
    }
  ];

  const getCurrentTabs = () => {
    switch (authState.userType) {
      case 'partner':
        return partnerTabs;
      case 'admin':
        return adminTabs;
      default:
        return userTabs;
    }
  };

  const tabs = getCurrentTabs();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Tab Bar Container */}
      <div className="bg-white border-t border-gray-200 shadow-lg">
        <div className="flex items-center justify-around px-2 py-1">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px] touch-target ${
                  active 
                    ? 'bg-gray-50 scale-105 shadow-sm' 
                    : 'hover:bg-gray-50'
                }`}
              >
                {/* Icon Container */}
                <div 
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
                    active 
                      ? 'scale-110' 
                      : ''
                  }`}
                  style={{
                    backgroundColor: active ? `${tab.color}20` : 'transparent',
                  }}
                >
                  <span 
                    className={`text-lg transition-all duration-200 ${
                      active 
                        ? 'scale-110' 
                        : 'opacity-70'
                    }`}
                  >
                    {active ? tab.activeIcon : tab.icon}
                  </span>
                </div>
                
                {/* Label */}
                <span 
                  className={`text-xs font-medium mt-1 transition-all duration-200 ${
                    active 
                      ? 'font-semibold' 
                      : 'text-gray-600'
                  }`}
                  style={{
                    color: active ? tab.color : undefined
                  }}
                >
                  {tab.name}
                </span>

                {/* Active Indicator */}
                {active && (
                  <div 
                    className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-8 h-1 rounded-full"
                    style={{ backgroundColor: tab.color }}
                  />
                )}
              </Link>
            );
          })}
        </div>
        
        {/* Safe Area for iPhone X+ devices */}
        <div className="h-safe-area-inset-bottom bg-white" />
      </div>

      {/* Premium Upgrade Notification for Free Users */}
      {authState.userType === 'user' && (
        <PremiumUpgradeNotification />
      )}
    </div>
  );
}

function PremiumUpgradeNotification() {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    // Check if user has premium subscription
    const checkPremiumStatus = async () => {
      try {
        const token = localStorage.getItem('woofadaar_token');
        if (!token) return;

        const response = await fetch('/api/premium/features?check_access=true', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setIsPremium(data.user_status?.tier === 'premium' || data.user_status?.tier === 'trial');
          
          // Show upgrade notification for free users occasionally
          if (!isPremium && Math.random() < 0.3) { // 30% chance
            setTimeout(() => setShowUpgrade(true), 5000); // Show after 5 seconds
          }
        }
      } catch (error) {
        console.log('Could not check premium status:', error);
      }
    };

    checkPremiumStatus();
  }, []);

  if (isPremium || !showUpgrade) return null;

  return (
    <div className="absolute -top-16 left-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-lg shadow-lg animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">⭐</span>
          <div className="text-sm">
            <div className="font-semibold">Upgrade to Premium</div>
            <div className="text-xs opacity-90">AI insights, expert consultations & more</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Link 
            href="/premium"
            className="bg-white text-purple-600 px-3 py-1 rounded-md text-xs font-semibold hover:bg-gray-100 transition-colors"
            onClick={() => setShowUpgrade(false)}
          >
            Try Free
          </Link>
          <button 
            onClick={() => setShowUpgrade(false)}
            className="text-white opacity-70 hover:opacity-100 p-1"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}