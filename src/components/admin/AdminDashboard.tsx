'use client';

import { useState, useEffect } from 'react';

interface WaitlistEntry {
  id: string;
  email: string;
  name: string;
  location: string | null;
  phone: string | null;
  dog_owner: boolean;
  preferred_language: string;
  referral_source: string | null;
  interests: string | null;
  status: string;
  position: number | null;
  created_at: string;
}

interface WaitlistStats {
  total: number;
  dog_owners: number;
  new_parents: number;
  top_cities: { city: string; count: number }[];
  recent_signups: WaitlistEntry[];
  growth_this_week: number;
}

interface WaitlistData {
  entries: WaitlistEntry[];
  stats: WaitlistStats;
}

interface PartnerEntry {
  id: string;
  email: string;
  name: string;
  partner_type: string;
  business_name: string | null;
  location: string;
  phone: string;
  status: string;
  verified: boolean;
  created_at: string;
}

interface PartnerStats {
  total: number;
  pending: number;
  approved: number;
  veterinarians: number;
  trainers: number;
  corporate: number;
}

interface PartnerData {
  partners: PartnerEntry[];
  stats: PartnerStats;
}

type TabType = 'waitlist' | 'partners';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('waitlist');
  const [waitlistData, setWaitlistData] = useState<WaitlistData | null>(null);
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [entriesPerPage] = useState(20);

  useEffect(() => {
    console.log('AdminDashboard: useEffect triggered, activeTab:', activeTab);
    fetchData();
  }, [activeTab]);

  // Fetch both datasets on initial load
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch both waitlist and partner data
      const [waitlistResponse, partnerResponse] = await Promise.all([
        fetch('/api/waitlist?type=admin', {
          headers: { 'Authorization': 'Bearer admin-token' }
        }),
        fetch('/api/partners/contact', {
          headers: { 'Authorization': 'Bearer admin-token' }
        })
      ]);

      if (waitlistResponse.ok) {
        const waitlistData = await waitlistResponse.json();
        setWaitlistData(waitlistData);
      }

      if (partnerResponse.ok) {
        const partnerData = await partnerResponse.json();
        setPartnerData(partnerData);
      }
    } catch (err) {
      console.error('AdminDashboard: Error in fetchAllData:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    console.log('AdminDashboard: fetchData called for tab:', activeTab);
    setLoading(true);
    setError('');
    
    try {
      if (activeTab === 'waitlist') {
        console.log('AdminDashboard: Fetching waitlist data...');
        const response = await fetch('/api/waitlist?type=admin', {
          headers: {
            'Authorization': 'Bearer admin-token'
          }
        });

        console.log('AdminDashboard: Waitlist response status:', response.status);

        if (!response.ok) {
          throw new Error(`Failed to fetch waitlist data: ${response.status}`);
        }

        const data = await response.json();
        console.log('AdminDashboard: Waitlist data received:', data);
        setWaitlistData(data);
      } else {
        console.log('AdminDashboard: Fetching partner data...');
        const response = await fetch('/api/partners/contact', {
          headers: {
            'Authorization': 'Bearer admin-token'
          }
        });

        console.log('AdminDashboard: Partner response status:', response.status);

        if (!response.ok) {
          throw new Error(`Failed to fetch partner data: ${response.status}`);
        }

        const data = await response.json();
        console.log('AdminDashboard: Partner data received:', data);
        setPartnerData(data);
      }
    } catch (err) {
      console.error('AdminDashboard: Error in fetchData:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      console.log('AdminDashboard: Setting loading to false');
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (activeTab === 'waitlist' && waitlistData) {
      const headers = [
        'Name', 'Email', 'Location', 'Phone', 'Dog Owner', 'Language', 
        'Referral Source', 'Interests', 'Position', 'Signup Date'
      ];

      const csvData = waitlistData.entries.map(entry => [
        entry.name,
        entry.email,
        entry.location || '',
        entry.phone || '',
        entry.dog_owner ? 'Yes' : 'No',
        entry.preferred_language,
        entry.referral_source || '',
        entry.interests || '',
        entry.position || '',
        new Date(entry.created_at).toLocaleDateString()
      ]);

      const csvContent = [headers, ...csvData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `woofadaar-waitlist-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (activeTab === 'partners' && partnerData) {
      const headers = [
        'Name', 'Email', 'Partner Type', 'Business Name', 'Location', 'Phone', 
        'Status', 'Verified', 'Application Date'
      ];

      const csvData = partnerData.partners.map(partner => [
        partner.name,
        partner.email,
        partner.partner_type,
        partner.business_name || '',
        partner.location,
        partner.phone,
        partner.status,
        partner.verified ? 'Yes' : 'No',
        new Date(partner.created_at).toLocaleDateString()
      ]);

      const csvContent = [headers, ...csvData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `woofadaar-partners-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const deleteEntry = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from the waitlist? This action cannot be undone.`)) {
      return;
    }

    setDeletingIds(prev => new Set(prev).add(id));

    try {
      const response = await fetch(`/api/waitlist/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete entry');
      }

      // Refresh the data after successful deletion
      fetchData();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete entry. Please try again.');
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const updatePartnerStatus = async (id: string, status: string) => {
    try {
      // Use central partners PUT endpoint used elsewhere in the app
      const response = await fetch('/api/partners', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer admin-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ partner_id: id, status })
      });

      if (!response.ok) {
        throw new Error('Failed to update partner status');
      }

      // Refresh the data after successful update
      fetchData();
    } catch (err) {
      console.error('Update partner status error:', err);
      alert('Failed to update partner status. Please try again.');
    }
  };

  const deletePartner = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/partners/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete partner');
      }

      // Refresh the data after successful deletion
      fetchData();
    } catch (err) {
      console.error('Delete partner error:', err);
      alert('Failed to delete partner. Please try again.');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3bbca8] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg max-w-md text-center">
          <div className="mb-4">
            <svg className="w-12 h-12 mx-auto text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-lg font-semibold mb-2">Connection Error</h3>
            <p className="text-sm mb-4">{error}</p>
          </div>
          <button
            onClick={fetchData}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex space-x-3">
              <a
                href="/"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </a>
              <button
                onClick={exportToCSV}
                className="bg-[#3bbca8] text-white px-4 py-2 rounded-lg hover:bg-[#339990] transition-colors"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('waitlist')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'waitlist'
                  ? 'border-[#3bbca8] text-[#3bbca8]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Waitlist ({waitlistData?.stats.total || 0})
            </button>
            <button
              onClick={() => setActiveTab('partners')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'partners'
                  ? 'border-[#3bbca8] text-[#3bbca8]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Partners ({partnerData?.stats.total || 0})
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'waitlist' && waitlistData && (
          <div className="space-y-6">
            {/* Waitlist Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Signups</p>
                  <p className="text-2xl font-semibold text-gray-900">{waitlistData.stats.total}</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Dog Parents</p>
                  <p className="text-2xl font-semibold text-gray-900">{waitlistData.stats.dog_owners}</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Future Parents</p>
                  <p className="text-2xl font-semibold text-gray-900">{waitlistData.stats.new_parents}</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">This Week</p>
                  <p className="text-2xl font-semibold text-gray-900">+{waitlistData.stats.growth_this_week}</p>
                </div>
              </div>
            </div>

            {/* Waitlist Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Signups</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dog Owner
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {waitlistData.entries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{entry.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{entry.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{entry.location || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            entry.dog_owner
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {entry.dog_owner ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => deleteEntry(entry.id, entry.email)}
                            disabled={deletingIds.has(entry.id)}
                            className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
                            title="Remove from waitlist"
                          >
                            {deletingIds.has(entry.id) ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'partners' && partnerData && (
          <div className="space-y-6">
            {/* Partner Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Partners</p>
                  <p className="text-2xl font-semibold text-gray-900">{partnerData.stats.total}</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending</p>
                  <p className="text-2xl font-semibold text-gray-900">{partnerData.stats.pending}</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Approved</p>
                  <p className="text-2xl font-semibold text-gray-900">{partnerData.stats.approved}</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Veterinarians</p>
                  <p className="text-2xl font-semibold text-gray-900">{partnerData.stats.veterinarians}</p>
                </div>
              </div>
            </div>

            {/* Partner Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Partner Applications</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {partnerData.partners.map((partner) => (
                      <tr key={partner.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{partner.name}</div>
                          {partner.business_name && (
                            <div className="text-sm text-gray-500">{partner.business_name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{partner.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {partner.partner_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{partner.location}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            partner.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : partner.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : partner.status === 'suspended'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {partner.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(partner.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            {partner.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => updatePartnerStatus(partner.id, 'approved')}
                                  className="text-green-600 hover:text-green-900 transition-colors"
                                  title="Approve"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => updatePartnerStatus(partner.id, 'rejected')}
                                  className="text-red-600 hover:text-red-900 transition-colors"
                                  title="Reject"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => deletePartner(partner.id, partner.email)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}