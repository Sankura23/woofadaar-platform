'use client';

import { useState, useEffect } from 'react';

interface WaitlistStats {
  total_signups: number;
  dog_owners: number;
  new_parents: number;
}

export default function WaitlistStats() {
  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      console.log('Fetching waitlist stats...');
      const response = await fetch(`/api/waitlist?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Stats received:', data);
        setStats(data);
      } else {
        // If API fails, show default stats to prevent crashes
        console.warn('Failed to fetch waitlist stats, using defaults');
        setStats({
          total_signups: 0,
          dog_owners: 0,
          new_parents: 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default stats on error
      setStats({
        total_signups: 0,
        dog_owners: 0,
        new_parents: 0
      });
    } finally {
      // Add a small delay to ensure loading state is visible
      setTimeout(() => setLoading(false), 500);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-[#3bbca8] to-[#339990] rounded-lg p-6 text-white">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold mb-2">Join the Growing Pack!</h3>
          <p className="text-white text-opacity-90">
            Dog parents across India are already waiting for launch
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center bg-white bg-opacity-20 rounded-lg p-4 transform hover:scale-105 transition-transform duration-200">
            <div className="text-3xl font-bold mb-1 text-white animate-pulse bg-white bg-opacity-30 rounded">--</div>
            <div className="text-sm text-white text-opacity-90">Total Signups</div>
            <div className="mt-2">
              <svg className="w-6 h-6 mx-auto text-white text-opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>

          <div className="text-center bg-white bg-opacity-20 rounded-lg p-4 transform hover:scale-105 transition-transform duration-200">
            <div className="text-3xl font-bold mb-1 text-white animate-pulse bg-white bg-opacity-30 rounded">--</div>
            <div className="text-sm text-white text-opacity-90">Current Dog Parents</div>
            <div className="mt-2">
              <svg className="w-6 h-6 mx-auto text-white text-opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>

          <div className="text-center bg-white bg-opacity-20 rounded-lg p-4 transform hover:scale-105 transition-transform duration-200">
            <div className="text-3xl font-bold mb-1 text-white animate-pulse bg-white bg-opacity-30 rounded">--</div>
            <div className="text-sm text-white text-opacity-90">Future Dog Parents</div>
            <div className="mt-2">
              <svg className="w-6 h-6 mx-auto text-white text-opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
        </div>

        {/* Community Features Preview */}
        <div className="mt-6 bg-white bg-opacity-20 rounded-lg p-4">
          <h4 className="text-lg font-semibold mb-3 text-center">Community Features</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center">
              <div className="w-12 h-12 bg-white bg-opacity-30 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-xs text-white text-opacity-90">Expert Q&A</div>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-white bg-opacity-30 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="text-xs text-white text-opacity-90">Health Tracking</div>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-white bg-opacity-30 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="text-xs text-white text-opacity-90">Local Groups</div>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-white bg-opacity-30 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="text-xs text-white text-opacity-90">Training Tips</div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-white text-opacity-90">
            🎉 Be part of India&apos;s first comprehensive dog parent community
          </p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const dogOwnerPercentage = stats.total_signups > 0 
    ? Math.round((stats.dog_owners / stats.total_signups) * 100) 
    : 0;

  return (
    <div className="bg-gradient-to-r from-[#3bbca8] to-[#339990] rounded-lg p-6 text-white">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2">Join the Growing Pack!</h3>
        <p className="text-white text-opacity-90">
          Dog parents across India are already waiting for launch
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center bg-white bg-opacity-20 rounded-lg p-4 transform hover:scale-105 transition-transform duration-200">
          <div className="text-3xl font-bold mb-1 text-white">{stats.total_signups}</div>
          <div className="text-sm text-white text-opacity-90">Total Signups</div>
          <div className="mt-2">
            <svg className="w-6 h-6 mx-auto text-white text-opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        <div className="text-center bg-white bg-opacity-20 rounded-lg p-4 transform hover:scale-105 transition-transform duration-200">
          <div className="text-3xl font-bold mb-1 text-white">{stats.dog_owners}</div>
          <div className="text-sm text-white text-opacity-90">Current Dog Parents</div>
          <div className="mt-2">
            <svg className="w-6 h-6 mx-auto text-white text-opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        </div>

        <div className="text-center bg-white bg-opacity-20 rounded-lg p-4 transform hover:scale-105 transition-transform duration-200">
          <div className="text-3xl font-bold mb-1 text-white">{stats.new_parents}</div>
          <div className="text-sm text-white text-opacity-90">Future Dog Parents</div>
          <div className="mt-2">
            <svg className="w-6 h-6 mx-auto text-white text-opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>
      </div>

      {/* Community Features Preview */}
      <div className="mt-6 bg-white bg-opacity-20 rounded-lg p-4">
        <h4 className="text-lg font-semibold mb-3 text-center">Community Features</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-30 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-xs text-white text-opacity-90">Expert Q&A</div>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-30 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-xs text-white text-opacity-90">Health Tracking</div>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-30 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="text-xs text-white text-opacity-90">Local Groups</div>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-30 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="text-xs text-white text-opacity-90">Training Tips</div>
          </div>
        </div>
      </div>

      {stats.total_signups > 0 && (
        <div className="mt-6 text-center">
          <div className="bg-white bg-opacity-20 rounded-lg p-4">
            <div className="text-lg font-semibold mb-3">Community Mix</div>
            <div className="flex items-center justify-center space-x-6">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-[#e05a37] rounded-full mr-2 shadow-sm"></div>
                <span className="text-sm font-medium">{dogOwnerPercentage}% Current Parents</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-[#fef8e8] rounded-full mr-2 shadow-sm"></div>
                <span className="text-sm font-medium">{100 - dogOwnerPercentage}% Future Parents</span>
              </div>
            </div>
            <div className="mt-3 w-full bg-white bg-opacity-30 rounded-full h-2">
              <div 
                className="bg-[#e05a37] h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${dogOwnerPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-sm text-white text-opacity-90">
          🎉 Be part of India&apos;s first comprehensive dog parent community
        </p>
      </div>
    </div>
  );
}