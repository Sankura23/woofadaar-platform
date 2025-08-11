'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  User, 
  Building2, 
  Calendar, 
  DollarSign, 
  Star, 
  Settings, 
  LogOut,
  Phone,
  Mail,
  MapPin,
  Globe,
  Clock,
  Award
} from 'lucide-react';

interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string;
  partner_type: string;
  business_name: string | null;
  location: string;
  website: string | null;
  bio: string | null;
  services_offered: string | null;
  consultation_fee: string | null;
  availability_hours: string | null;
  languages_spoken: string | null;
  certifications: string | null;
  status: string;
  verified: boolean;
  health_id_access: boolean;
  profile_image_url: string | null;
  created_at: string;
  verification_date: string | null;
}

export default function PartnerDashboard() {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPartnerData();
  }, []);

  const fetchPartnerData = async () => {
    try {
      const response = await fetch('/api/auth/partner-me');
      const data = await response.json();

      if (data.success) {
        setPartner(data.partner);
      } else {
        setError(data.message);
        // If not authenticated, redirect to login
        if (response.status === 401) {
          window.location.href = '/login';
        }
      }
    } catch (err) {
      setError('Failed to load partner data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/partner-logout', { method: 'POST' });
      localStorage.removeItem('user_type');
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout failed:', err);
      // Force redirect anyway
      window.location.href = '/login';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">{error || 'Unable to load dashboard'}</p>
          <Link
            href="/login"
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90"
          >
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl font-bold text-primary">
                woofadaar
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">Partner Dashboard</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {partner.name}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Banner */}
        <div className={`mb-8 p-4 rounded-lg ${
          partner.status === 'approved' 
            ? 'bg-green-50 border border-green-200'
            : partner.status === 'pending'
            ? 'bg-yellow-50 border border-yellow-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-semibold ${
                partner.status === 'approved' ? 'text-green-800'
                : partner.status === 'pending' ? 'text-yellow-800'
                : 'text-red-800'
              }`}>
                Account Status: {partner.status.charAt(0).toUpperCase() + partner.status.slice(1)}
              </h3>
              <p className={`text-sm ${
                partner.status === 'approved' ? 'text-green-600'
                : partner.status === 'pending' ? 'text-yellow-600'
                : 'text-red-600'
              }`}>
                {partner.status === 'approved' 
                  ? 'Your partner account is active and verified'
                  : partner.status === 'pending'
                  ? 'Your application is under review. You\'ll be notified once approved.'
                  : 'There was an issue with your application. Please contact support.'
                }
              </p>
            </div>
            {partner.verified && (
              <div className="flex items-center space-x-2 text-green-600">
                <Award className="w-5 h-5" />
                <span className="text-sm font-medium">Verified Partner</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Info */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                <button className="flex items-center space-x-2 text-primary hover:text-opacity-80">
                  <Settings className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <p className="text-gray-900">{partner.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Partner Type</label>
                  <p className="text-gray-900 capitalize">{partner.partner_type}</p>
                </div>

                {partner.business_name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                    <p className="text-gray-900">{partner.business_name}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{partner.location}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{partner.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{partner.phone}</p>
                  </div>
                </div>

                {partner.website && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {partner.website}
                      </a>
                    </div>
                  </div>
                )}

                {partner.consultation_fee && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee</label>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{partner.consultation_fee}</p>
                    </div>
                  </div>
                )}

                {partner.availability_hours && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{partner.availability_hours}</p>
                    </div>
                  </div>
                )}

                {partner.languages_spoken && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Languages</label>
                    <p className="text-gray-900">{partner.languages_spoken}</p>
                  </div>
                )}

                {partner.certifications && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Certifications</label>
                    <p className="text-gray-900">{partner.certifications}</p>
                  </div>
                )}
              </div>

              {partner.bio && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                  <p className="text-gray-900 leading-relaxed">{partner.bio}</p>
                </div>
              )}

              {partner.services_offered && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Services Offered</label>
                  <p className="text-gray-900 leading-relaxed">{partner.services_offered}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Bookings</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Rating</span>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="font-semibold">N/A</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Health ID Access</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    partner.health_id_access 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {partner.health_id_access ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href="/partners/bookings"
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <Calendar className="w-5 h-5 text-primary" />
                  <span>View Bookings</span>
                </Link>
                
                <Link
                  href="/partners/profile/edit"
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <User className="w-5 h-5 text-primary" />
                  <span>Edit Profile</span>
                </Link>
                
                <Link
                  href="/partners/analytics"
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <DollarSign className="w-5 h-5 text-primary" />
                  <span>View Analytics</span>
                </Link>
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Info</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Member since:</span>
                  <span className="ml-2 font-medium">
                    {new Date(partner.created_at).toLocaleDateString()}
                  </span>
                </div>
                {partner.verification_date && (
                  <div>
                    <span className="text-gray-600">Verified on:</span>
                    <span className="ml-2 font-medium">
                      {new Date(partner.verification_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}