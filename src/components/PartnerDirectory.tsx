'use client';

import React, { useState, useEffect, useContext } from 'react';
import { LanguageContext } from '@/contexts/LanguageContext';

interface Partner {
  id: string;
  name: string;
  business_name?: string;
  partner_type: string;
  location: string;
  bio?: string;
  profile_image_url?: string;
  rating_average: number;
  rating_count: number;
  total_reviews: number;
  verified: boolean;
  verification_date?: string;
  partnership_tier: string;
  emergency_available: boolean;
  home_visit_available: boolean;
  online_consultation: boolean;
  response_time_hours?: number;
  service_radius_km?: number;
  languages_spoken: string[];
  languages_primary: string;
  pricing_info?: any;
  consultation_fee_range?: any;
  specialization?: any;
  experience_years?: number;
  certifications: string[];
  last_active_at?: string;
  created_at: string;
}

interface SearchFilters {
  search: string;
  type: string;
  location: string;
  specialization: string;
  verified: string;
  emergency: string;
  homeVisit: string;
  online: string;
  minRating: string;
  sortBy: string;
  sortOrder: string;
}

const PartnerDirectory: React.FC = () => {
  const { translations, currentLanguage } = useContext(LanguageContext);
  const t = translations[currentLanguage];

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    type: '',
    location: '',
    specialization: '',
    verified: '',
    emergency: '',
    homeVisit: '',
    online: '',
    minRating: '',
    sortBy: 'rating_average',
    sortOrder: 'desc',
  });

  const [showFilters, setShowFilters] = useState(false);

  const partnerTypes = [
    { value: 'vet', label: 'Veterinarians', icon: '🏥' },
    { value: 'trainer', label: 'Trainers', icon: '🎾' },
    { value: 'corporate', label: 'Corporate', icon: '🏢' },
    { value: 'kci', label: 'KCI Certified', icon: '🏆' },
  ];

  const sortOptions = [
    { value: 'rating_average', label: 'Rating' },
    { value: 'total_reviews', label: 'Reviews' },
    { value: 'created_at', label: 'Newest' },
    { value: 'last_active', label: 'Recently Active' },
    { value: 'name', label: 'Name' },
  ];

  const fetchPartners = async (resetPage = false) => {
    setLoading(true);
    setError('');

    try {
      const currentPage = resetPage ? 1 : pagination.page;
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pagination.limit.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });

      // Add filters
      if (filters.search) params.set('search', filters.search);
      if (filters.type) params.set('type', filters.type);
      if (filters.location) params.set('location', filters.location);
      if (filters.specialization) params.set('specialization', filters.specialization);
      if (filters.verified) params.set('verified', filters.verified);
      if (filters.emergency) params.set('emergency', filters.emergency);
      if (filters.homeVisit) params.set('homeVisit', filters.homeVisit);
      if (filters.online) params.set('online', filters.online);
      if (filters.minRating) params.set('minRating', filters.minRating);

      const response = await fetch(`/api/partners?${params}`);
      const result = await response.json();

      if (response.ok && result.success) {
        if (resetPage) {
          setPartners(result.data.partners);
          setPagination({ ...result.data.pagination, page: 1 });
        } else {
          if (currentPage === 1) {
            setPartners(result.data.partners);
          } else {
            setPartners(prev => [...prev, ...result.data.partners]);
          }
          setPagination(result.data.pagination);
        }
      } else {
        setError(result.error || 'Failed to fetch partners');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners(true);
  }, [filters]);

  const updateFilter = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      type: '',
      location: '',
      specialization: '',
      verified: '',
      emergency: '',
      homeVisit: '',
      online: '',
      minRating: '',
      sortBy: 'rating_average',
      sortOrder: 'desc',
    });
  };

  const loadMore = () => {
    if (!loading && pagination.hasNextPage) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
      fetchPartners();
    }
  };

  const formatPartnerType = (type: string) => {
    const typeMap: { [key: string]: string } = {
      vet: 'Veterinarian',
      trainer: 'Dog Trainer',
      corporate: 'Corporate Partner',
      kci: 'KCI Certified',
    };
    return typeMap[type] || type;
  };

  const formatSpecialization = (spec: any) => {
    try {
      const parsed = typeof spec === 'string' ? JSON.parse(spec) : spec;
      return Array.isArray(parsed) ? parsed.slice(0, 3).join(', ') : '';
    } catch {
      return '';
    }
  };

  const formatPricing = (pricing: any) => {
    try {
      const parsed = typeof pricing === 'string' ? JSON.parse(pricing) : pricing;
      if (parsed?.consultation_fee) {
        return `₹${parsed.consultation_fee}`;
      }
      return 'Pricing available';
    } catch {
      return '';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`text-sm ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
        ★
      </span>
    ));
  };

  const PartnerCard: React.FC<{ partner: Partner }> = ({ partner }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Partner Header */}
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className="w-16 h-16 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
            {partner.profile_image_url ? (
              <img
                src={partner.profile_image_url}
                alt={partner.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">
                👨‍⚕️
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-semibold text-gray-800 truncate">
                {partner.business_name || partner.name}
              </h3>
              {partner.verified && (
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-1">
              {formatPartnerType(partner.partner_type)}
            </p>
            
            <div className="flex items-center space-x-1 mb-2">
              {renderStars(partner.rating_average)}
              <span className="text-sm text-gray-600 ml-1">
                {partner.rating_average.toFixed(1)} ({partner.total_reviews} reviews)
              </span>
            </div>
            
            <p className="text-sm text-gray-500 mb-2">📍 {partner.location}</p>
          </div>
        </div>

        {/* Specializations */}
        {partner.specialization && (
          <div className="mt-3">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Specializes in:</span> {formatSpecialization(partner.specialization)}
            </p>
          </div>
        )}

        {/* Services */}
        <div className="flex flex-wrap gap-2 mt-3">
          {partner.emergency_available && (
            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
              Emergency
            </span>
          )}
          {partner.home_visit_available && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              Home Visit
            </span>
          )}
          {partner.online_consultation && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
              Online
            </span>
          )}
          {partner.partnership_tier === 'premium' && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
              Premium
            </span>
          )}
        </div>

        {/* Bio */}
        {partner.bio && (
          <p className="text-sm text-gray-600 mt-3 line-clamp-2">
            {partner.bio}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <div className="text-sm text-gray-600">
            {partner.experience_years && (
              <span>{partner.experience_years} years exp</span>
            )}
            {partner.response_time_hours && (
              <span className="ml-3">Responds in {partner.response_time_hours}h</span>
            )}
          </div>
          
          <div className="text-sm font-medium text-gray-800">
            {formatPricing(partner.pricing_info)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 mt-4">
          <button className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            View Profile
          </button>
          <button className="px-4 py-2 border border-blue-600 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors">
            Book Now
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Find Partners</h1>
              <p className="text-gray-600">Discover trusted professionals for your pet</p>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors lg:hidden"
            >
              Filters
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Search by name, location, or specialization..."
              className="w-full p-4 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              🔍
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className={`lg:w-80 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-6">
                {/* Partner Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Partner Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {partnerTypes.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => updateFilter('type', filters.type === type.value ? '' : type.value)}
                        className={`p-3 text-sm rounded-lg border transition-colors ${
                          filters.type === type.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-lg mb-1">{type.icon}</div>
                        <div className="text-xs">{type.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={filters.location}
                    onChange={(e) => updateFilter('location', e.target.value)}
                    placeholder="Enter city or area"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Services */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Services
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.emergency === 'true'}
                        onChange={(e) => updateFilter('emergency', e.target.checked ? 'true' : '')}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">Emergency Services</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.homeVisit === 'true'}
                        onChange={(e) => updateFilter('homeVisit', e.target.checked ? 'true' : '')}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">Home Visits</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.online === 'true'}
                        onChange={(e) => updateFilter('online', e.target.checked ? 'true' : '')}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">Online Consultations</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.verified === 'true'}
                        onChange={(e) => updateFilter('verified', e.target.checked ? 'true' : '')}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">Verified Only</span>
                    </label>
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Rating
                  </label>
                  <select
                    value={filters.minRating}
                    onChange={(e) => updateFilter('minRating', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Any Rating</option>
                    <option value="4.5">4.5+ Stars</option>
                    <option value="4">4+ Stars</option>
                    <option value="3.5">3.5+ Stars</option>
                    <option value="3">3+ Stars</option>
                  </select>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => updateFilter('sortBy', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                {pagination.totalCount} partners found
              </p>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Order:</span>
                <button
                  onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {filters.sortOrder === 'asc' ? 'Low to High' : 'High to Low'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Partners Grid */}
            {partners.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {partners.map((partner) => (
                  <PartnerCard key={partner.id} partner={partner} />
                ))}
              </div>
            ) : !loading && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No partners found</h3>
                <p className="text-gray-500">Try adjusting your filters or search terms</p>
              </div>
            )}

            {/* Load More */}
            {pagination.hasNextPage && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}

            {/* Loading */}
            {loading && partners.length === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="animate-pulse">
                      <div className="flex items-start space-x-3 mb-4">
                        <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-300 rounded mb-2"></div>
                          <div className="h-3 bg-gray-300 rounded mb-2 w-2/3"></div>
                          <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                        </div>
                      </div>
                      <div className="h-12 bg-gray-300 rounded mb-4"></div>
                      <div className="flex space-x-2">
                        <div className="flex-1 h-10 bg-gray-300 rounded"></div>
                        <div className="w-20 h-10 bg-gray-300 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerDirectory;