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

interface AdminData {
  entries: WaitlistEntry[];
  stats: WaitlistStats;
}

export default function WaitlistDashboard() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [entriesPerPage] = useState(20);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const response = await fetch('/api/waitlist?type=admin', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admin data');
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

  const exportToCSV = () => {
    if (!data) return;

    const headers = [
      'Name', 'Email', 'Location', 'Phone', 'Dog Owner', 'Language', 
      'Referral Source', 'Interests', 'Position', 'Signup Date'
    ];

    const csvData = data.entries.map(entry => [
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
  };

  const deleteEntry = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from the waitlist? This action cannot be undone.`)) {
      return;
    }

    // Set loading state for this specific entry
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
      fetchAdminData();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete entry. Please try again.');
    } finally {
      // Clear loading state for this entry
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

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
  const currentEntries = data.entries.slice(indexOfFirstEntry, indexOfLastEntry);
  const totalPages = Math.ceil(data.entries.length / entriesPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Waitlist Dashboard</h1>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">{data.stats.total}</div>
            <div className="text-gray-600">Total Signups</div>
            <div className="text-sm text-green-600 mt-1">
              +{data.stats.growth_this_week} this week
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">{data.stats.dog_owners}</div>
            <div className="text-gray-600">Current Dog Parents</div>
            <div className="text-sm text-gray-500 mt-1">
              {Math.round((data.stats.dog_owners / data.stats.total) * 100)}% of total
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">{data.stats.new_parents}</div>
            <div className="text-gray-600">Future Dog Parents</div>
            <div className="text-sm text-gray-500 mt-1">
              {Math.round((data.stats.new_parents / data.stats.total) * 100)}% of total
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">
              {data.stats.top_cities.length > 0 ? data.stats.top_cities[0].city : 'N/A'}
            </div>
            <div className="text-gray-600">Top City</div>
            <div className="text-sm text-gray-500 mt-1">
              {data.stats.top_cities.length > 0 ? `${data.stats.top_cities[0].count} signups` : ''}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">All Signups</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name & Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dog Parent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
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
                    {currentEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{entry.name}</div>
                            <div className="text-sm text-gray-500">{entry.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.location || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            entry.dog_owner 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {entry.dog_owner ? 'Current' : 'Future'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          #{entry.position}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => deleteEntry(entry.id, entry.email)}
                            disabled={deletingIds.has(entry.id)}
                            className={`transition-colors ${
                              deletingIds.has(entry.id) 
                                ? 'text-gray-400 cursor-not-allowed' 
                                : 'text-red-600 hover:text-red-900'
                            }`}
                            title="Remove from waitlist"
                          >
                            {deletingIds.has(entry.id) ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
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
              
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Showing {indexOfFirstEntry + 1} to {Math.min(indexOfLastEntry, data.entries.length)} of {data.entries.length} entries
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
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Cities</h3>
              <div className="space-y-3">
                {data.stats.top_cities.map((city, index) => (
                  <div key={city.city} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {index + 1}. {city.city}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{city.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Signups</h3>
              <div className="space-y-3">
                {data.stats.recent_signups.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                    <div className="text-sm font-medium text-gray-900">{entry.name}</div>
                    <div className="text-sm text-gray-500">{entry.email}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}