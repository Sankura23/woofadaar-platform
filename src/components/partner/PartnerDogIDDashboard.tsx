'use client';

import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Search, 
  Calendar, 
  FileText, 
  Users, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Camera,
  Filter,
  RefreshCw,
  Download
} from 'lucide-react';
import QRCodeScanner from './QRCodeScanner';

interface DogVerification {
  id: string;
  dog: {
    id: string;
    name: string;
    breed: string;
    health_id: string;
    photo_url?: string;
    age_months: number;
    weight_kg: number;
    vaccination_status: string;
    User: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
      location?: string;
    };
    MedicalRecords: Array<{
      id: string;
      record_type: string;
      title: string;
      record_date: string;
    }>;
  };
  verification_type: string;
  access_level: string;
  verified_at: string;
  expires_at?: string;
  last_accessed?: string;
  access_count: number;
  is_active: boolean;
}

interface DashboardStats {
  totalVerificationsToday: number;
  totalRevenue: number;
  avgResponseTime?: number;
  totalVerifications: number;
  activeVerifications: number;
  emergencyAccesses: number;
}

export default function PartnerDogIDDashboard() {
  const [verifications, setVerifications] = useState<DogVerification[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalVerificationsToday: 0,
    totalRevenue: 0,
    totalVerifications: 0,
    activeVerifications: 0,
    emergencyAccesses: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showScanner, setShowScanner] = useState(false);
  const [selectedDog, setSelectedDog] = useState<DogVerification | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('partnerToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch verified dogs
      const response = await fetch('/api/partners/verify-dog-id', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch verified dogs');
      }

      const data = await response.json();
      
      if (data.success) {
        setVerifications(data.data.verifications || []);
        setStats({
          totalVerificationsToday: data.data.analytics?.totalVerificationsToday || 0,
          totalRevenue: data.data.analytics?.totalRevenue || 0,
          avgResponseTime: data.data.analytics?.avgResponseTime,
          totalVerifications: data.data.pagination?.total || 0,
          activeVerifications: data.data.verifications?.filter((v: any) => v.is_active).length || 0,
          emergencyAccesses: data.data.verifications?.filter((v: any) => v.verification_type === 'emergency').length || 0
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleQRScan = async (dogId: string) => {
    try {
      const token = localStorage.getItem('partnerToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Verify the scanned Dog ID
      const response = await fetch('/api/partners/verify-dog-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dogId,
          verificationReason: 'QR Code Scan',
          verificationType: 'routine'
        })
      });

      if (!response.ok) {
        throw new Error('Dog ID verification failed');
      }

      const result = await response.json();
      
      if (result.success) {
        setShowScanner(false);
        await loadDashboardData(); // Refresh data
        
        // Show success message
        alert(`Successfully verified ${result.dog.name}!`);
      }
    } catch (error) {
      console.error('QR scan verification failed:', error);
      alert('Failed to verify Dog ID. Please try again.');
    }
  };

  const handleManualSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const token = localStorage.getItem('partnerToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Manual Dog ID verification
      const response = await fetch('/api/partners/verify-dog-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dogId: searchQuery.trim(),
          verificationReason: 'Manual Search',
          verificationType: 'routine'
        })
      });

      if (!response.ok) {
        throw new Error('Dog ID not found or access denied');
      }

      const result = await response.json();
      
      if (result.success) {
        await loadDashboardData(); // Refresh data
        setSearchQuery('');
        
        // Show success message
        alert(`Successfully verified ${result.dog.name}!`);
      }
    } catch (error) {
      console.error('Manual search failed:', error);
      alert('Dog ID not found or access denied');
    }
  };

  const filteredVerifications = verifications.filter(verification => {
    const matchesSearch = verification.dog.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         verification.dog.health_id?.includes(searchQuery) ||
                         verification.dog.breed.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' || verification.verification_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (verification: DogVerification) => {
    if (!verification.is_active) return 'text-gray-400';
    if (verification.expires_at && new Date(verification.expires_at) < new Date()) return 'text-red-500';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3bbca8] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dog ID Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage and verify Dog IDs for your practice</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 bg-[#3bbca8] text-white px-4 py-2 rounded-lg hover:bg-[#339990] transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Verifications</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalVerificationsToday}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Verifications</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeVerifications}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Emergency Accesses</p>
                <p className="text-2xl font-bold text-gray-900">{stats.emergencyAccesses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          
          <div className="flex flex-col md:flex-row gap-4">
            {/* QR Scanner Button */}
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center justify-center space-x-2 bg-[#3bbca8] text-white px-6 py-3 rounded-lg hover:bg-[#339990] transition-colors"
            >
              <QrCode size={20} />
              <span>Scan QR Code</span>
            </button>

            {/* Manual Search */}
            <div className="flex-1 flex space-x-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Enter Dog ID to verify manually"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
                />
                <Search className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" />
              </div>
              <button
                onClick={handleManualSearch}
                disabled={!searchQuery.trim()}
                className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filter by type:</span>
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="appointment_only">Appointments</option>
                <option value="emergency_only">Emergency</option>
                <option value="full_access">Full Access</option>
              </select>
            </div>

            <div className="text-sm text-gray-500">
              Showing {filteredVerifications.length} of {verifications.length} verifications
            </div>
          </div>
        </div>

        {/* Verified Dogs List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Verified Dogs</h2>
            <p className="text-gray-600 mt-1">Dogs you have verified and can access</p>
          </div>

          {filteredVerifications.length === 0 ? (
            <div className="p-12 text-center">
              <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No verified dogs found</h3>
              <p className="text-gray-600 mb-6">Start by scanning a Dog ID QR code or searching manually</p>
              <button
                onClick={() => setShowScanner(true)}
                className="bg-[#3bbca8] text-white px-6 py-2 rounded-lg hover:bg-[#339990] transition-colors"
              >
                Scan Your First QR Code
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredVerifications.map((verification) => (
                <div key={verification.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      {/* Dog Photo */}
                      <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        {verification.dog.photo_url ? (
                          <img 
                            src={verification.dog.photo_url} 
                            alt={verification.dog.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        {/* Dog Info */}
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{verification.dog.name}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(verification) === 'text-green-600' ? 'bg-green-100 text-green-800' : getStatusColor(verification) === 'text-red-500' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                            {verification.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <p><span className="font-medium">Dog ID:</span> {verification.dog.health_id}</p>
                            <p><span className="font-medium">Breed:</span> {verification.dog.breed}</p>
                            <p><span className="font-medium">Age:</span> {Math.floor(verification.dog.age_months / 12)} years {verification.dog.age_months % 12} months</p>
                          </div>
                          <div>
                            <p><span className="font-medium">Owner:</span> {verification.dog.User.name}</p>
                            <p><span className="font-medium">Access Level:</span> {verification.access_level}</p>
                            <p><span className="font-medium">Verification Type:</span> {verification.verification_type}</p>
                          </div>
                        </div>

                        {/* Contact Info */}
                        <div className="flex items-center space-x-4 mt-3 text-sm">
                          {verification.dog.User.email && verification.access_level === 'full' && (
                            <div className="flex items-center space-x-1 text-gray-600">
                              <Mail size={14} />
                              <span>{verification.dog.User.email}</span>
                            </div>
                          )}
                          {verification.dog.User.phone && verification.access_level === 'full' && (
                            <div className="flex items-center space-x-1 text-gray-600">
                              <Phone size={14} />
                              <span>{verification.dog.User.phone}</span>
                            </div>
                          )}
                          {verification.dog.User.location && (
                            <div className="flex items-center space-x-1 text-gray-600">
                              <MapPin size={14} />
                              <span>{verification.dog.User.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end space-y-2 text-sm text-gray-500">
                      <p>Verified: {formatDate(verification.verified_at)}</p>
                      {verification.last_accessed && (
                        <p>Last accessed: {formatDate(verification.last_accessed)}</p>
                      )}
                      <p>Access count: {verification.access_count}</p>
                      
                      <div className="flex space-x-2 mt-3">
                        <button
                          onClick={() => setSelectedDog(verification)}
                          className="px-3 py-1 bg-[#3bbca8] text-white rounded-md hover:bg-[#339990] transition-colors text-xs"
                        >
                          View Details
                        </button>
                        {verification.dog.MedicalRecords.length > 0 && (
                          <button className="px-3 py-1 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-xs">
                            Medical Records ({verification.dog.MedicalRecords.length})
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Scanner Modal */}
      <QRCodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScan}
        onError={(error) => {
          console.error('QR Scanner error:', error);
          alert(error);
        }}
      />

      {/* Dog Details Modal */}
      {selectedDog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Dog Details: {selectedDog.dog.name}</h2>
                <button
                  onClick={() => setSelectedDog(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Basic Information</h3>
                  <div className="space-y-3 text-sm">
                    <div><span className="font-medium text-gray-700">Health ID:</span> {selectedDog.dog.health_id}</div>
                    <div><span className="font-medium text-gray-700">Breed:</span> {selectedDog.dog.breed}</div>
                    <div><span className="font-medium text-gray-700">Age:</span> {Math.floor(selectedDog.dog.age_months / 12)} years {selectedDog.dog.age_months % 12} months</div>
                    <div><span className="font-medium text-gray-700">Weight:</span> {selectedDog.dog.weight_kg} kg</div>
                    <div><span className="font-medium text-gray-700">Vaccination Status:</span> {selectedDog.dog.vaccination_status}</div>
                  </div>
                </div>

                {/* Owner Info */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Owner Information</h3>
                  <div className="space-y-3 text-sm">
                    <div><span className="font-medium text-gray-700">Name:</span> {selectedDog.dog.User.name}</div>
                    {selectedDog.access_level === 'full' && selectedDog.dog.User.email && (
                      <div><span className="font-medium text-gray-700">Email:</span> {selectedDog.dog.User.email}</div>
                    )}
                    {selectedDog.access_level === 'full' && selectedDog.dog.User.phone && (
                      <div><span className="font-medium text-gray-700">Phone:</span> {selectedDog.dog.User.phone}</div>
                    )}
                    {selectedDog.dog.User.location && (
                      <div><span className="font-medium text-gray-700">Location:</span> {selectedDog.dog.User.location}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Medical Records */}
              {selectedDog.dog.MedicalRecords.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">Recent Medical Records</h3>
                  <div className="space-y-3">
                    {selectedDog.dog.MedicalRecords.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{record.title}</div>
                          <div className="text-xs text-gray-600">{record.record_type} • {formatDate(record.record_date)}</div>
                        </div>
                        <FileText size={16} className="text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedDog(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-[#3bbca8] text-white rounded-lg hover:bg-[#339990] transition-colors">
                  Book Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}