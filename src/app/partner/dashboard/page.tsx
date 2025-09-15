'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardWidgets, { QuickActions, RecentActivity } from '@/components/partner/DashboardWidgets';
import PartnerDashboard from '@/components/partner/PartnerDashboard';

interface PartnerProfile {
  id: string;
  name: string;
  email: string;
  partner_type: string;
  business_name?: string;
  verified: boolean;
  status: string;
}

export default function PartnerDashboard() {
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Prevent hydration issues by ensuring client-side only rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      checkAuth();
    }
  }, [mounted]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      const userType = localStorage.getItem('user_type');
      
      if (!token || userType !== 'partner') {
        setTimeout(() => router.push('/login'), 100);
        return;
      }

      const response = await fetch('/api/auth/partner-me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPartner(data.partner);
      } else {
        localStorage.removeItem('woofadaar_token');
        localStorage.removeItem('user_type');
        setTimeout(() => router.push('/login'), 100);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setPartner({
        id: 'demo-partner',
        name: 'Dr. Demo Veterinarian',
        email: 'demo@vet.com',
        partner_type: 'vet',
        business_name: 'Demo Vet Clinic',
        verified: true,
        status: 'approved'
      });
    } finally {
      setLoading(false);
    }
  };

  // Show consistent loading state to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3bbca8] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3bbca8] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  const getPartnerTypeLabel = (type: string) => {
    const types = {
      'vet': 'Veterinarian',
      'trainer': 'Dog Trainer', 
      'corporate': 'Corporate Partner',
      'kci': 'KCI Certified'
    };
    return types[type as keyof typeof types] || type;
  };

  const getStatusBadge = (status: string, verified: boolean) => {
    if (status === 'approved' && verified) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">✓ Verified</span>;
    } else if (status === 'approved') {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Approved</span>;
    } else if (status === 'pending') {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending Review</span>;
    } else {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {partner.name}!
              </h1>
              <p className="mt-2 text-gray-600">
                {getPartnerTypeLabel(partner.partner_type)}
                {partner.business_name && ` • ${partner.business_name}`}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {getStatusBadge(partner.status, partner.verified)}
              <div className="text-sm text-gray-500">
                Partner ID: {partner.id.slice(-8)}
              </div>
            </div>
          </div>
        </div>

        {/* Status Alert */}
        {partner.status === 'pending' && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Application Under Review</h3>
                <p className="mt-2 text-sm text-yellow-700">
                  Your partner application is currently being reviewed by our team. We'll notify you once it's approved and you can start accepting bookings.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Widgets */}
        <DashboardWidgets className="mb-8" />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions - Takes up 2/3 width */}
          <div className="lg:col-span-2">
            <QuickActions />
          </div>

          {/* Recent Activity - Takes up 1/3 width */}
          <div className="lg:col-span-1">
            <RecentActivity />
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Getting Started</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-blue-50">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">📋</span>
              </div>
              <h4 className="font-medium text-gray-800 mb-2">Complete Profile</h4>
              <p className="text-sm text-gray-600">Add your services, pricing, and availability</p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-green-50">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">✅</span>
              </div>
              <h4 className="font-medium text-gray-800 mb-2">Get Verified</h4>
              <p className="text-sm text-gray-600">Submit documents for verification badge</p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-purple-50">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">🐕</span>
              </div>
              <h4 className="font-medium text-gray-800 mb-2">Access Dog IDs</h4>
              <p className="text-sm text-gray-600">Request health record access</p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-orange-50">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">📱</span>
              </div>
              <h4 className="font-medium text-gray-800 mb-2">Mobile App</h4>
              <p className="text-sm text-gray-600">Download partner app for easy management</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}