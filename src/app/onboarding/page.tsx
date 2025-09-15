'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Plus, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function OnboardingPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [dogs, setDogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('woofadaar_token');
    if (!token) {
      router.push('/login');
      return;
    }

    Promise.all([fetchUserData(), fetchDogs()]);
  }, [router]);

  // Refresh data when page becomes visible
  useEffect(() => {
    const handleFocus = () => {
      fetchDogs();
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchDogs();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/working-user', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserData(data.user);
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDogs = async () => {
    try {
      const response = await fetch(`/api/auth/working-dogs?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        setDogs(data.data?.dogs || []);
      }
    } catch (error) {
      console.error('Error fetching dogs:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fef8e8] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3bbca8] mx-auto mb-4"></div>
          <p className="text-[#525252]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fef8e8] py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-black text-[#171717] mb-4">
            Welcome to Woofadaar, {userData?.name}! 🎉
          </h1>
          <p className="text-xl text-[#525252] font-medium">
            Let's get you set up to make the most of your dog parent community
          </p>
        </div>

        {/* Onboarding Steps */}
        <div className="bg-white rounded-2xl shadow-xl border border-[#f5f5f5] p-8 sm:p-10">
          <h2 className="text-2xl font-bold text-[#171717] mb-8 text-center">
            Quick Setup - Just 2 Steps!
          </h2>
          
          <div className="space-y-8">
            {/* Step 1: Add Your First Dog */}
            <div className={`border-2 rounded-2xl p-6 ${
              dogs.length > 0 
                ? 'border-[#099441] bg-[#099441] bg-opacity-5' 
                : 'border-[#3bbca8] bg-[#3bbca8] bg-opacity-5'
            }`}>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                    dogs.length > 0 ? 'bg-[#099441]' : 'bg-[#3bbca8]'
                  }`}>
                    {dogs.length > 0 ? <CheckCircle className="w-6 h-6" /> : '1'}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#171717] mb-3">
                    {dogs.length > 0 ? `Great! You have ${dogs.length} dog${dogs.length > 1 ? 's' : ''} 🎉` : 'Add Your First Dog 🐕'}
                  </h3>
                  <p className="text-base text-[#525252] mb-6 leading-relaxed">
                    {dogs.length > 0 
                      ? `Your furry friend${dogs.length > 1 ? 's' : ''} ${dogs.map(d => d.name).join(', ')} ${dogs.length > 1 ? 'are' : 'is'} all set up! You can add more dogs or manage existing ones anytime.`
                      : 'Create a profile for your furry family member. This helps you track their health, connect with other dog parents, and access personalized recommendations.'
                    }
                  </p>
                  {dogs.length > 0 ? (
                    <Link
                      href="/profile/dogs"
                      className="inline-flex items-center px-6 py-3 bg-[#099441] text-white rounded-xl hover:bg-[#087d35] transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
                    >
                      <Heart className="w-5 h-5 mr-2" />
                      Manage Dogs
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  ) : (
                    <Link
                      href="/profile/dogs/add"
                      className="inline-flex items-center px-6 py-3 bg-[#3bbca8] text-white rounded-xl hover:bg-[#339990] transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add My First Dog
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Complete Your Profile */}
            <div className="border-2 border-[#e5e5e5] rounded-2xl p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-[#525252] rounded-full flex items-center justify-center text-white font-bold text-lg">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#171717] mb-3">
                    Complete Your Profile 👤
                  </h3>
                  <p className="text-base text-[#525252] mb-6 leading-relaxed">
                    Add more details about yourself to connect better with the community. 
                    You can always update this later from your profile settings.
                  </p>
                  <Link
                    href="/profile?settings=account"
                    className="inline-flex items-center px-6 py-3 bg-[#525252] text-white rounded-xl hover:bg-[#404040] transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
                  >
                    <Heart className="w-5 h-5 mr-2" />
                    Complete Profile
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Skip Option or Completion */}
          <div className="mt-10 pt-8 border-t border-[#e5e5e5] text-center">
            {dogs.length > 0 ? (
              <div>
                <p className="text-[#525252] mb-4">
                  🎉 You're all set up! Ready to explore your dashboard?
                </p>
                <Link
                  href="/profile"
                  className="inline-flex items-center px-8 py-4 bg-[#3bbca8] text-white rounded-xl hover:bg-[#339990] transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl"
                >
                  Go to My Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-[#525252] mb-4">
                  Want to explore first? You can always add your dog later.
                </p>
                <Link
                  href="/profile"
                  className="text-[#3bbca8] hover:text-[#339990] font-semibold transition-colors"
                >
                  Skip for now and go to dashboard →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <div className="bg-[#f5f5f5] border-2 border-[#d4d4d4] rounded-2xl p-6 max-w-2xl mx-auto">
            <h3 className="font-bold text-[#171717] mb-4 text-lg">💡 Why Add Your Dog?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div className="bg-white p-4 rounded-xl border border-[#e5e5e5]">
                <div className="flex items-center mb-2">
                  <span className="text-[#3bbca8] mr-2">🏥</span>
                  <span className="font-semibold text-[#171717]">Health Tracking</span>
                </div>
                <p className="text-[#525252] text-sm">Track vaccinations and health records</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#e5e5e5]">
                <div className="flex items-center mb-2">
                  <span className="text-[#3bbca8] mr-2">🐕</span>
                  <span className="font-semibold text-[#171717]">Breed Tips</span>
                </div>
                <p className="text-[#525252] text-sm">Get breed-specific tips and advice</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#e5e5e5]">
                <div className="flex items-center mb-2">
                  <span className="text-[#3bbca8] mr-2">👥</span>
                  <span className="font-semibold text-[#171717]">Community</span>
                </div>
                <p className="text-[#525252] text-sm">Connect with other dog parents</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#e5e5e5]">
                <div className="flex items-center mb-2">
                  <span className="text-[#3bbca8] mr-2">📅</span>
                  <span className="font-semibold text-[#171717]">Appointments</span>
                </div>
                <p className="text-[#525252] text-sm">Book with verified vets</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}