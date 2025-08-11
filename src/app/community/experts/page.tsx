'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface Expert {
  id: string;
  expertise_areas: string[];
  bio: string | null;
  years_experience: number | null;
  certifications: string[];
  specializations: string[];
  verification_status: string;
  is_featured: boolean;
  answer_count: number;
  total_points: number;
  created_at: string;
  user: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
  partner: {
    id: string;
    name: string;
    business_name: string;
    partner_type: string;
    verified: boolean;
  } | null;
}

export default function ExpertsPage() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpertise, setSelectedExpertise] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const expertiseAreas = [
    { value: 'veterinary', label: 'Veterinary', icon: '🏥' },
    { value: 'training', label: 'Training', icon: '📚' },
    { value: 'nutrition', label: 'Nutrition', icon: '🍖' },
    { value: 'behavior', label: 'Behavior', icon: '🎾' },
    { value: 'grooming', label: 'Grooming', icon: '✂️' },
    { value: 'breeding', label: 'Breeding', icon: '🐕' },
    { value: 'rescue', label: 'Rescue', icon: '❤️' },
    { value: 'health', label: 'Health', icon: '🏥' }
  ];

  useEffect(() => {
    fetchExperts();
  }, [selectedExpertise, searchQuery]);

  const fetchExperts = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        status: 'verified',
        limit: '20'
      });
      
      if (selectedExpertise) params.append('expertise', selectedExpertise);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await fetch(`/api/community/experts?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setExperts(data.data.experts);
      }
    } catch (error) {
      console.error('Error fetching experts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getExpertiseIcon = (area: string) => {
    const expertise = expertiseAreas.find(e => e.value === area);
    return expertise?.icon || '🔹';
  };

  const getExpertiseLabel = (area: string) => {
    const expertise = expertiseAreas.find(e => e.value === area);
    return expertise?.label || area;
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-milk-white via-gray-50 to-gray-100 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-3 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="bg-gradient-to-br from-milk-white via-gray-50 to-gray-100 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/community"
              className="inline-flex items-center text-[#e05a37] hover:text-[#d04a27] mb-4"
            >
              ← Back to Community
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Experts</h1>
            <p className="text-gray-600">Connect with verified dog care professionals and experienced community members</p>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="search"
                placeholder="Search experts by name, bio, or specialization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e05a37] focus:border-transparent min-h-[44px]"
                autoComplete="off"
                inputMode="search"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
            </div>

            {/* Expertise Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedExpertise('')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedExpertise === ''
                    ? 'bg-[#e05a37] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                All Expertise
              </button>
              {expertiseAreas.map((area) => (
                <button
                  key={area.value}
                  onClick={() => setSelectedExpertise(area.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    selectedExpertise === area.value
                      ? 'bg-[#e05a37] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <span>{area.icon}</span>
                  {area.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedExpertise 
                      ? `${getExpertiseLabel(selectedExpertise)} Experts`
                      : 'All Verified Experts'
                    } ({experts.length})
                  </h2>
                </div>
                
                {experts.length === 0 ? (
                  <div className="bg-white rounded-lg p-8 text-center shadow-sm">
                    <div className="text-4xl mb-4">👨‍⚕️</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No experts found</h3>
                    <p className="text-gray-600 mb-4">
                      {selectedExpertise || searchQuery
                        ? 'Try adjusting your search criteria or browse all experts.'
                        : 'We\'re building our expert network. Check back soon!'
                      }
                    </p>
                    {(selectedExpertise || searchQuery) && (
                      <button
                        onClick={() => {
                          setSelectedExpertise('');
                          setSearchQuery('');
                        }}
                        className="inline-flex items-center px-4 py-2 bg-[#e05a37] text-white rounded-md hover:bg-[#d04a27] transition-colors"
                      >
                        Show All Experts
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {experts.map((expert) => (
                      <div key={expert.id} className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-200">
                        <div className="flex items-start space-x-4">
                          {/* Profile Image */}
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center relative">
                              {expert.user.profile_image_url ? (
                                <img 
                                  src={expert.user.profile_image_url} 
                                  alt={expert.user.name}
                                  className="w-16 h-16 rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-gray-500 text-2xl">👤</span>
                              )}
                              {expert.is_featured && (
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#ffa602] rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">⭐</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                  {expert.user.name}
                                  {expert.verification_status === 'verified' && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      ✓ Verified
                                    </span>
                                  )}
                                </h3>
                                {expert.partner && (
                                  <p className="text-sm text-gray-600">
                                    {expert.partner.business_name} • {expert.partner.partner_type}
                                  </p>
                                )}
                              </div>
                              {expert.is_featured && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#ffa602] text-white">
                                  Featured
                                </span>
                              )}
                            </div>

                            {/* Expertise Areas */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              {expert.expertise_areas.map((area) => (
                                <span 
                                  key={area}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#e05a37]/10 text-[#e05a37] border border-[#e05a37]/20"
                                >
                                  <span className="mr-1">{getExpertiseIcon(area)}</span>
                                  {getExpertiseLabel(area)}
                                </span>
                              ))}
                            </div>

                            {/* Bio */}
                            {expert.bio && (
                              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                {expert.bio}
                              </p>
                            )}

                            {/* Stats */}
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                              {expert.years_experience && (
                                <span>{expert.years_experience} years experience</span>
                              )}
                              <span>{expert.answer_count} answers</span>
                              <span>{expert.total_points} points</span>
                              {expert.certifications.length > 0 && (
                                <span>{expert.certifications.length} certifications</span>
                              )}
                            </div>

                            {/* Specializations */}
                            {expert.specializations.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {expert.specializations.slice(0, 3).map((spec) => (
                                  <span 
                                    key={spec}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                                  >
                                    {spec}
                                  </span>
                                ))}
                                {expert.specializations.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{expert.specializations.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center space-x-3">
                              <button className="px-4 py-2 bg-[#e05a37] text-white rounded-md hover:bg-[#d04a27] transition-colors text-sm font-medium">
                                View Profile
                              </button>
                              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium">
                                Message
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Become an Expert */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Become an Expert</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Share your knowledge and help fellow dog parents. Apply to become a verified expert.
                </p>
                <button className="w-full px-4 py-2 bg-[#e05a37] text-white rounded-md hover:bg-[#d04a27] transition-colors text-sm font-medium">
                  Apply Now
                </button>
              </div>

              {/* Expertise Areas */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Expertise Areas</h3>
                <div className="space-y-2">
                  {expertiseAreas.map((area) => (
                    <button
                      key={area.value}
                      onClick={() => setSelectedExpertise(area.value)}
                      className={`w-full text-left flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                        selectedExpertise === area.value
                          ? 'bg-[#e05a37]/10 text-[#e05a37]'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="text-xl">{area.icon}</span>
                      <span className="font-medium">{area.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Link 
                    href="/community/ask"
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span>❓</span>
                    <span className="text-gray-700">Ask a Question</span>
                  </Link>
                  <Link 
                    href="/community/forums"
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span>💬</span>
                    <span className="text-gray-700">Browse Forums</span>
                  </Link>
                  <Link 
                    href="/community"
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span>🏠</span>
                    <span className="text-gray-700">Community Home</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}