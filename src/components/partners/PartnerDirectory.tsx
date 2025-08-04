'use client';

import { useState, useEffect } from 'react';
import { Partner, PartnerSearchFilters, PARTNER_TYPES, INDIAN_CITIES } from '@/types/partner';

export default function PartnerDirectory() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<PartnerSearchFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPartners();
  }, [filters]);

  const fetchPartners = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.location) params.append('location', filters.location);
      if (filters.verified) params.append('verified', 'true');
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/partners?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setPartners(data.partners);
      } else {
        throw new Error(data.error || 'Failed to fetch partners');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    fetchPartners();
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  const PartnerCard = ({ partner }: { partner: Partner }) => (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{partner.name}</h3>
            {partner.verified && (
              <div className="ml-2 flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified
              </div>
            )}
          </div>
          {partner.business_name && (
            <p className="text-gray-600 font-medium">{partner.business_name}</p>
          )}
          <p className="text-sm text-gray-500 capitalize">{PARTNER_TYPES[partner.partner_type]}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center text-sm text-gray-500 mb-1">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {partner.location}
          </div>
          {partner.experience_years && (
            <div className="text-sm text-gray-500">
              {partner.experience_years} years exp.
            </div>
          )}
        </div>
      </div>

      {partner.specialization && (
        <div className="mb-3">
          <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
            {partner.specialization}
          </span>
        </div>
      )}

      {partner.bio && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{partner.bio}</p>
      )}

      <div className="space-y-2">
        {partner.services_offered && (
          <div>
            <span className="text-sm font-medium text-gray-700">Services: </span>
            <span className="text-sm text-gray-600">{partner.services_offered}</span>
          </div>
        )}
        
        {partner.consultation_fee && (
          <div>
            <span className="text-sm font-medium text-gray-700">Fee: </span>
            <span className="text-sm text-gray-600">{partner.consultation_fee}</span>
          </div>
        )}
        
        {partner.availability_hours && (
          <div>
            <span className="text-sm font-medium text-gray-700">Hours: </span>
            <span className="text-sm text-gray-600">{partner.availability_hours}</span>
          </div>
        )}
        
        {partner.languages_spoken && (
          <div>
            <span className="text-sm font-medium text-gray-700">Languages: </span>
            <span className="text-sm text-gray-600">{partner.languages_spoken}</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {partner.phone && (
            <a
              href={`tel:${partner.phone}`}
              className="flex items-center text-sm text-[#3bbca8] hover:text-[#339990]"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call
            </a>
          )}
          {partner.website && (
            <a
              href={partner.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-sm text-[#3bbca8] hover:text-[#339990]"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Website
            </a>
          )}
        </div>
        
        {partner.health_id_access && (
          <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
            </svg>
            Health ID Access
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Partner Directory</h1>
        <p className="text-gray-600">Find verified veterinarians, trainers, and corporate partners near you</p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
              placeholder="Name, business, specialization..."
            />
          </div>
          
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Partner Type
            </label>
            <select
              id="type"
              value={filters.type || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            >
              <option value="">All Types</option>
              {Object.entries(PARTNER_TYPES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              id="location"
              value={filters.location || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            >
              <option value="">All Locations</option>
              {INDIAN_CITIES.slice(0, -1).map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end space-x-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="verified"
                checked={filters.verified || false}
                onChange={(e) => setFilters(prev => ({ ...prev, verified: e.target.checked }))}
                className="h-4 w-4 text-[#3bbca8] focus:ring-[#3bbca8] border-gray-300 rounded"
              />
              <label htmlFor="verified" className="ml-2 text-sm text-gray-700">
                Verified Only
              </label>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex justify-between">
          <button
            onClick={handleSearch}
            className="bg-[#3bbca8] text-white px-6 py-2 rounded-lg hover:bg-[#339990] transition-colors"
          >
            Search Partners
          </button>
          
          <button
            onClick={clearFilters}
            className="text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:border-gray-400 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3bbca8] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading partners...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg inline-block">
            {error}
          </div>
        </div>
      ) : partners.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No partners found</h3>
          <p className="text-gray-600">Try adjusting your search criteria or check back later.</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-600">
              Found {partners.length} partner{partners.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners.map((partner) => (
              <PartnerCard key={partner.id} partner={partner} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}