'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface Partner {
  id: string;
  name: string;
  partner_type: string;
  business_name: string | null;
  location: string;
  phone: string;
  website: string | null;
  bio: string | null;
  services_offered: string | null;
  consultation_fee: string | null;
  availability_hours: string | null;
  languages_spoken: string | null;
  certifications: string | null;
  profile_image_url: string | null;
  verified: boolean;
  verification_date: string | null;
  created_at: string;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

function PartnerDirectoryContent() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [filters, setFilters] = useState({
    location: searchParams.get('location') || '',
    type: searchParams.get('type') || ''
  });

  useEffect(() => {
    fetchPartners();
  }, [filters]);

  const fetchPartners = async (offset = 0) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (filters.location) params.append('location', filters.location);
      if (filters.type) params.append('type', filters.type);
      params.append('limit', '12');
      params.append('offset', offset.toString());

      const response = await fetch(`/api/partners?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch partners');
      }

      const data = await response.json();
      
      if (offset === 0) {
        setPartners(data.partners);
      } else {
        setPartners(prev => [...prev, ...data.partners]);
      }
      
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching partners:', err);
      setError('Failed to load partners. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Update URL
    const params = new URLSearchParams();
    if (newFilters.location) params.append('location', newFilters.location);
    if (newFilters.type) params.append('type', newFilters.type);
    
    router.push(`/partners/directory?${params.toString()}`);
  };

  const loadMore = () => {
    if (pagination && pagination.hasMore) {
      fetchPartners(pagination.offset + pagination.limit);
    }
  };

  const getPartnerTypeColor = (type: string) => {
    switch (type) {
      case 'veterinarian':
        return 'bg-blue-100 text-blue-800';
      case 'trainer':
        return 'bg-green-100 text-green-800';
      case 'corporate':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPartnerTypeIcon = (type: string) => {
    switch (type) {
      case 'veterinarian':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      case 'trainer':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'corporate':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Find Verified Partners</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Connect with trusted veterinarians, trainers, and corporate partners in your area
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                id="location"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                placeholder="Enter city or area"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
              />
            </div>
            
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Partner Type
              </label>
              <select
                id="type"
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="veterinarian">Veterinarians</option>
                <option value="trainer">Trainers</option>
                <option value="corporate">Corporate Partners</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ location: '', type: '' });
                  router.push('/partners/directory');
                }}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading && partners.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3bbca8] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading partners...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg max-w-md mx-auto">
              <p>{error}</p>
              <button
                onClick={() => fetchPartners()}
                className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : partners.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-50 border border-gray-200 text-gray-700 px-6 py-4 rounded-lg max-w-md mx-auto">
              <p className="text-lg font-medium mb-2">No partners found</p>
              <p className="text-sm">Try adjusting your filters or check back later for new partners in your area.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="mb-6">
              <p className="text-gray-600">
                Showing {partners.length} of {pagination?.total || 0} verified partners
              </p>
            </div>

            {/* Partner Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {partners.map((partner) => (
                <div key={partner.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-[#3bbca8] rounded-full flex items-center justify-center text-white">
                          {getPartnerTypeIcon(partner.partner_type)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{partner.name}</h3>
                          {partner.business_name && (
                            <p className="text-sm text-gray-600">{partner.business_name}</p>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPartnerTypeColor(partner.partner_type)}`}>
                        {partner.partner_type}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {partner.location}
                      </div>

                      {partner.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {partner.phone}
                        </div>
                      )}

                      {partner.services_offered && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Services:</span> {partner.services_offered}
                        </div>
                      )}

                      {partner.consultation_fee && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Consultation:</span> {partner.consultation_fee}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex space-x-3">
                      {partner.website && (
                        <a
                          href={partner.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-[#3bbca8] text-white px-4 py-2 rounded-md text-center text-sm font-medium hover:bg-[#339990] transition-colors"
                        >
                          Visit Website
                        </a>
                      )}
                      <a
                        href={`tel:${partner.phone}`}
                        className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-center text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        Call Now
                      </a>
                    </div>

                    {/* Verification Badge */}
                    {partner.verified && (
                      <div className="mt-4 flex items-center text-xs text-green-600">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified Partner
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            {pagination && pagination.hasMore && (
              <div className="text-center">
                <button
                  onClick={loadMore}
                  className="bg-[#3bbca8] text-white px-6 py-3 rounded-md hover:bg-[#339990] transition-colors"
                >
                  Load More Partners
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function PartnerDirectoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3bbca8] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PartnerDirectoryContent />
    </Suspense>
  );
}