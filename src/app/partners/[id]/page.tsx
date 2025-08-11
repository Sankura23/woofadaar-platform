'use client';

import React, { useState, useEffect, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  phone?: string;
  website?: string;
  address?: string;
  services_offered?: any;
  availability_schedule?: any;
  business_hours?: any;
  cancellation_policy?: string;
  refund_policy?: string;
}

interface Review {
  id: string;
  rating: number;
  review_text?: string;
  service_quality?: number;
  communication?: number;
  timeliness?: number;
  would_recommend?: boolean;
  created_at: string;
  user: {
    name: string;
    profile_image_url?: string;
  };
  booking?: {
    service_type: string;
    appointment_datetime: string;
  };
}

interface BookingForm {
  service_type: string;
  booking_type: string;
  appointment_datetime: string;
  duration_minutes: number;
  dog_id?: string;
  notes?: string;
  user_notes?: string;
  emergency_level?: string;
  symptoms?: string[];
  preferred_language?: string;
  special_requirements?: string;
}

const PartnerProfilePage: React.FC = () => {
  const { translations, currentLanguage } = useContext(LanguageContext);
  const t = translations[currentLanguage];
  const params = useParams();
  const router = useRouter();
  const partnerId = params.id as string;

  const [partner, setPartner] = useState<Partner | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'book'>('overview');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');

  const [bookingForm, setBookingForm] = useState<BookingForm>({
    service_type: 'consultation',
    booking_type: 'in_person',
    appointment_datetime: '',
    duration_minutes: 60,
  });

  useEffect(() => {
    fetchPartner();
    fetchReviews();
  }, [partnerId]);

  const fetchPartner = async () => {
    try {
      const response = await fetch(`/api/partners/${partnerId}`);
      const result = await response.json();

      if (response.ok && result.success) {
        setPartner(result.data.partner);
      } else {
        setError(result.error || 'Partner not found');
      }
    } catch (error) {
      setError('Failed to load partner information');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    setReviewsLoading(true);
    try {
      const response = await fetch(`/api/reviews?partnerId=${partnerId}&limit=10`);
      const result = await response.json();

      if (response.ok && result.success) {
        setReviews(result.data.reviews);
      }
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingLoading(true);
    setBookingError('');
    setBookingSuccess('');

    const token = localStorage.getItem('woofadaar_token');
    if (!token) {
      setBookingError('Please login to book an appointment');
      setBookingLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...bookingForm,
          partner_id: partnerId,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setBookingSuccess('Booking created successfully! The partner will confirm your appointment soon.');
        setShowBookingForm(false);
        setBookingForm({
          service_type: 'consultation',
          booking_type: 'in_person',
          appointment_datetime: '',
          duration_minutes: 60,
        });
      } else {
        setBookingError(result.error || 'Failed to create booking');
      }
    } catch (error) {
      setBookingError('Network error. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const formatSpecialization = (spec: any) => {
    try {
      const parsed = typeof spec === 'string' ? JSON.parse(spec) : spec;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const formatServices = (services: any) => {
    try {
      const parsed = typeof services === 'string' ? JSON.parse(services) : services;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const formatPricing = (pricing: any) => {
    try {
      const parsed = typeof pricing === 'string' ? JSON.parse(pricing) : pricing;
      return parsed || {};
    } catch {
      return {};
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`text-lg ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
        ★
      </span>
    ));
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading partner profile...</p>
        </div>
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😞</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Partner Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Partner Image */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 bg-gray-100 rounded-full overflow-hidden">
                {partner.profile_image_url ? (
                  <img
                    src={partner.profile_image_url}
                    alt={partner.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
                    👨‍⚕️
                  </div>
                )}
              </div>
            </div>

            {/* Partner Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-800">
                  {partner.business_name || partner.name}
                </h1>
                {partner.verified && (
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                )}
              </div>

              <p className="text-lg text-gray-600 mb-3">
                {formatPartnerType(partner.partner_type)}
              </p>

              <div className="flex items-center gap-2 mb-4">
                {renderStars(partner.rating_average)}
                <span className="text-lg font-medium text-gray-700 ml-2">
                  {partner.rating_average.toFixed(1)}
                </span>
                <span className="text-gray-500">
                  ({partner.total_reviews} reviews)
                </span>
              </div>

              <div className="flex flex-wrap gap-3 mb-4">
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                  📍 {partner.location}
                </span>
                {partner.experience_years && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                    {partner.experience_years} years experience
                  </span>
                )}
                {partner.response_time_hours && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                    Responds in {partner.response_time_hours}h
                  </span>
                )}
              </div>

              {/* Service Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {partner.emergency_available && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full">
                    Emergency Services
                  </span>
                )}
                {partner.home_visit_available && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                    Home Visits
                  </span>
                )}
                {partner.online_consultation && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                    Online Consultations
                  </span>
                )}
                {partner.partnership_tier === 'premium' && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                    Premium Partner
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowBookingForm(true)}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Book Appointment
                </button>
                {partner.phone && (
                  <a
                    href={`tel:${partner.phone}`}
                    className="px-6 py-3 border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Call Now
                  </a>
                )}
                {partner.website && (
                  <a
                    href={partner.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Visit Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {bookingSuccess && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {bookingSuccess}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {(['overview', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
                {tab === 'reviews' && ` (${partner.total_reviews})`}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* About */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">About</h2>
                <p className="text-gray-600 leading-relaxed">
                  {partner.bio || 'No description available.'}
                </p>
              </div>

              {/* Specializations */}
              {partner.specialization && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Specializations</h2>
                  <div className="flex flex-wrap gap-2">
                    {formatSpecialization(partner.specialization).map((spec: string, index: number) => (
                      <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Services */}
              {partner.services_offered && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Services Offered</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {formatServices(partner.services_offered).map((service: string, index: number) => (
                      <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-blue-600 mr-3">✓</span>
                        <span className="text-gray-700">{service}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {partner.certifications.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Certifications</h2>
                  <div className="space-y-2">
                    {partner.certifications.map((cert, index) => (
                      <div key={index} className="flex items-center p-3 bg-yellow-50 rounded-lg">
                        <span className="text-yellow-600 mr-3">🏆</span>
                        <span className="text-gray-700">{cert}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h3>
                <div className="space-y-3">
                  {partner.phone && (
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-3">📞</span>
                      <a href={`tel:${partner.phone}`} className="text-blue-600 hover:underline">
                        {partner.phone}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-3">📍</span>
                    <span className="text-gray-700">{partner.location}</span>
                  </div>
                  {partner.address && (
                    <div className="flex items-start">
                      <span className="text-gray-500 mr-3 mt-1">🏠</span>
                      <span className="text-gray-700">{partner.address}</span>
                    </div>
                  )}
                  {partner.languages_spoken.length > 0 && (
                    <div className="flex items-start">
                      <span className="text-gray-500 mr-3 mt-1">🗣️</span>
                      <span className="text-gray-700">{partner.languages_spoken.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Pricing</h3>
                <div className="space-y-3">
                  {Object.entries(formatPricing(partner.pricing_info)).map(([service, price]) => (
                    <div key={service} className="flex justify-between">
                      <span className="text-gray-600 capitalize">{service.replace('_', ' ')}</span>
                      <span className="font-medium text-gray-800">₹{price}</span>
                    </div>
                  ))}
                  {Object.keys(formatPricing(partner.pricing_info)).length === 0 && (
                    <p className="text-gray-500 text-center">Contact for pricing</p>
                  )}
                </div>
              </div>

              {/* Service Area */}
              {partner.service_radius_km && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Service Area</h3>
                  <p className="text-gray-600">
                    Services available within {partner.service_radius_km} km radius
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-6">
            {reviewsLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading reviews...</p>
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden">
                          {review.user.profile_image_url ? (
                            <img
                              src={review.user.profile_image_url}
                              alt={review.user.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              👤
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800">{review.user.name}</h4>
                          <div className="flex items-center space-x-2">
                            {renderStars(review.rating)}
                            <span className="text-sm text-gray-500">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      {review.booking && (
                        <div className="text-sm text-gray-500">
                          {review.booking.service_type}
                        </div>
                      )}
                    </div>

                    {review.review_text && (
                      <p className="text-gray-600 mb-4">{review.review_text}</p>
                    )}

                    {(review.service_quality || review.communication || review.timeliness) && (
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                        {review.service_quality && (
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-700">Service Quality</div>
                            <div className="text-lg font-semibold text-blue-600">{review.service_quality}/5</div>
                          </div>
                        )}
                        {review.communication && (
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-700">Communication</div>
                            <div className="text-lg font-semibold text-blue-600">{review.communication}/5</div>
                          </div>
                        )}
                        {review.timeliness && (
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-700">Timeliness</div>
                            <div className="text-lg font-semibold text-blue-600">{review.timeliness}/5</div>
                          </div>
                        )}
                      </div>
                    )}

                    {review.would_recommend !== null && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <span className={`px-3 py-1 text-sm rounded-full ${
                          review.would_recommend 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {review.would_recommend ? '👍 Recommends' : '👎 Doesn\'t recommend'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No reviews yet</h3>
                <p className="text-gray-500">Be the first to leave a review for this partner</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Book Appointment</h2>
                <button
                  onClick={() => setShowBookingForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {bookingError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{bookingError}</p>
                </div>
              )}

              <form onSubmit={handleBooking} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Type *
                  </label>
                  <select
                    value={bookingForm.service_type}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, service_type: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="consultation">Consultation</option>
                    <option value="vaccination">Vaccination</option>
                    <option value="grooming">Grooming</option>
                    <option value="training">Training</option>
                    <option value="emergency">Emergency</option>
                    <option value="checkup">Health Checkup</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Booking Type *
                  </label>
                  <select
                    value={bookingForm.booking_type}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, booking_type: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="in_person">In Person</option>
                    {partner.home_visit_available && (
                      <option value="home_visit">Home Visit</option>
                    )}
                    {partner.online_consultation && (
                      <option value="online">Online</option>
                    )}
                    <option value="phone">Phone</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Appointment Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={bookingForm.appointment_datetime}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, appointment_datetime: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <select
                    value={bookingForm.duration_minutes}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={bookingForm.notes || ''}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Any specific requirements or notes..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBookingForm(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                  >
                    {bookingLoading ? 'Booking...' : 'Book Appointment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerProfilePage;