'use client';

import { useState, useEffect } from 'react';
import { Partner, PartnerStats, PARTNER_TYPES, PARTNER_STATUSES } from '@/types/partner';

interface AdminPartnerData {
  partners: Partner[];
  stats: PartnerStats;
}

export default function PartnerManagement() {
  const [data, setData] = useState<AdminPartnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [updatingPartner, setUpdatingPartner] = useState<string | null>(null);
  const [entriesPerPage] = useState(20);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const response = await fetch('/api/partners/contact', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch partner data');
      }

      const adminData = await response.json();
      setData(adminData);
    } catch (err) {
      console.error('Admin dashboard error:', err);
      setError('Unable to connect to database. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const updatePartner = async (partnerId: string, updates: any) => {
    setUpdatingPartner(partnerId);
    try {
      const response = await fetch('/api/partners', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({
          partner_id: partnerId,
          ...updates
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update partner');
      }

      // Refresh data
      fetchAdminData();
      setSelectedPartner(null);
    } catch (err) {
      console.error('Update error:', err);
      alert('Failed to update partner. Please try again.');
    } finally {
      setUpdatingPartner(null);
    }
  };

  const exportToCSV = () => {
    if (!data) return;

    const headers = [
      'Name', 'Email', 'Partner Type', 'Business Name', 'Location', 'Phone', 
      'Status', 'Verified', 'Health ID Access', 'License Number', 'Specialization', 
      'Experience Years', 'Registration Date'
    ];

    const csvData = data.partners.map(partner => [
      partner.name,
      partner.email,
      PARTNER_TYPES[partner.partner_type],
      partner.business_name || '',
      partner.location,
      partner.phone,
      PARTNER_STATUSES[partner.status],
      partner.verified ? 'Yes' : 'No',
      partner.health_id_access ? 'Yes' : 'No',
      partner.license_number || '',
      partner.specialization || '',
      partner.experience_years || '',
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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3bbca8] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading partner dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg max-w-md text-center">
          <div className="mb-4">
            <svg className="w-12 h-12 mx-auto text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-lg font-semibold mb-2">Database Connection Error</h3>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={() => {
              setError('');
              setLoading(true);
              fetchAdminData();
            }}
            className="bg-[#3bbca8] text-white px-4 py-2 rounded-lg hover:bg-[#339990] transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = data.partners.slice(indexOfFirstEntry, indexOfLastEntry);
  const totalPages = Math.ceil(data.partners.length / entriesPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Partner Management</h1>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">{data.stats.total}</div>
            <div className="text-gray-600">Total Partners</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-yellow-600">{data.stats.pending}</div>
            <div className="text-gray-600">Pending Review</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-green-600">{data.stats.approved}</div>
            <div className="text-gray-600">Approved</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-blue-600">{data.stats.veterinarians}</div>
            <div className="text-gray-600">Veterinarians</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-purple-600">{data.stats.trainers}</div>
            <div className="text-gray-600">Trainers</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-orange-600">{data.stats.corporate}</div>
            <div className="text-gray-600">Corporate</div>
          </div>
        </div>

        {/* Partners Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">All Partners</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Partner Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type & Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Access
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
                {currentEntries.map((partner) => (
                  <tr key={partner.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{partner.name}</div>
                        <div className="text-sm text-gray-500">{partner.email}</div>
                        {partner.business_name && (
                          <div className="text-sm text-gray-500">{partner.business_name}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{PARTNER_TYPES[partner.partner_type]}</div>
                        <div className="text-sm text-gray-500">{partner.location}</div>
                        {partner.specialization && (
                          <div className="text-sm text-gray-500">{partner.specialization}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(partner.status)}`}>
                        {PARTNER_STATUSES[partner.status]}
                      </span>
                      {partner.verified && (
                        <div className="mt-1">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Verified
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {partner.health_id_access ? (
                        <span className="text-green-600">Health ID ✓</span>
                      ) : (
                        <span className="text-gray-400">No Access</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(partner.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => setSelectedPartner(partner)}
                        disabled={updatingPartner === partner.id}
                        className="text-[#3bbca8] hover:text-[#339990] disabled:opacity-50"
                      >
                        {updatingPartner === partner.id ? 'Updating...' : 'Manage'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-700">
                Showing {indexOfFirstEntry + 1} to {Math.min(indexOfLastEntry, data.partners.length)} of {data.partners.length} partners
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Partner Detail Modal */}
        {selectedPartner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Manage Partner</h3>
                  <button
                    onClick={() => setSelectedPartner(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={selectedPartner.status}
                      onChange={(e) => {
                        updatePartner(selectedPartner.id, { status: e.target.value });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                    >
                      {Object.entries(PARTNER_STATUSES).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Verification</label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedPartner.verified}
                          onChange={(e) => {
                            updatePartner(selectedPartner.id, { verified: e.target.checked });
                          }}
                          className="mr-2"
                        />
                        Verified Partner
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedPartner.health_id_access}
                          onChange={(e) => {
                            updatePartner(selectedPartner.id, { health_id_access: e.target.checked });
                          }}
                          className="mr-2"
                        />
                        Health ID Access
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes</label>
                  <textarea
                    value={selectedPartner.admin_notes || ''}
                    onChange={(e) => {
                      setSelectedPartner(prev => prev ? { ...prev, admin_notes: e.target.value } : null);
                    }}
                    onBlur={(e) => {
                      updatePartner(selectedPartner.id, { admin_notes: e.target.value });
                    }}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                    placeholder="Internal notes about this partner..."
                  />
                </div>

                {/* Partner Information Display */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Partner Information</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Name:</span> {selectedPartner.name}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {selectedPartner.email}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {selectedPartner.phone}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span> {PARTNER_TYPES[selectedPartner.partner_type]}
                    </div>
                    {selectedPartner.business_name && (
                      <div>
                        <span className="font-medium">Business:</span> {selectedPartner.business_name}
                      </div>
                    )}
                    {selectedPartner.license_number && (
                      <div>
                        <span className="font-medium">License:</span> {selectedPartner.license_number}
                      </div>
                    )}
                    {selectedPartner.specialization && (
                      <div>
                        <span className="font-medium">Specialization:</span> {selectedPartner.specialization}
                      </div>
                    )}
                    {selectedPartner.experience_years && (
                      <div>
                        <span className="font-medium">Experience:</span> {selectedPartner.experience_years} years
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}