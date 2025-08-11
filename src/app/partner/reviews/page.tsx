'use client';

import { useState, useEffect } from 'react';

interface Review {
  id: string;
  rating: number;
  review_text?: string;
  service_quality?: number;
  communication?: number;
  timeliness?: number;
  would_recommend?: boolean;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
  booking?: {
    id: string;
    service_type: string;
    appointment_datetime: string;
    status: string;
  };
}

interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

interface ReviewResponse {
  id: string;
  response_text: string;
  responded_at: string;
}

export default function PartnerReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating_high' | 'rating_low'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [responding, setResponding] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    fetchReviews();
  }, [filter, sortBy, currentPage]);

  const fetchReviews = async () => {
    setLoading(true);
    setError('');

    try {
      const partnerId = localStorage.getItem('partner_id'); // Assume partner ID is stored after login
      const token = localStorage.getItem('partner_token');
      
      if (!partnerId || !token) {
        setError('Please login as a partner to view reviews');
        return;
      }

      const params = new URLSearchParams({
        partnerId,
        page: currentPage.toString(),
        limit: '10',
        sortBy: sortBy === 'newest' ? 'created_at' : sortBy === 'oldest' ? 'created_at' : 'rating',
        sortOrder: sortBy === 'oldest' || sortBy === 'rating_low' ? 'asc' : 'desc',
      });

      if (filter !== 'all') {
        params.set('rating', filter);
      }

      const response = await fetch(`/api/reviews?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setReviews(result.data.reviews);
        setStats(result.data.rating_stats);
        setTotalPages(result.data.pagination.totalPages);
      } else {
        setError(result.error || 'Failed to fetch reviews');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (reviewId: string) => {
    if (!responseText.trim()) return;

    setResponding(reviewId);

    try {
      const token = localStorage.getItem('partner_token');
      const response = await fetch(`/api/reviews/${reviewId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          response_text: responseText.trim(),
        }),
      });

      if (response.ok) {
        setResponseText('');
        fetchReviews(); // Refresh reviews
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to respond to review');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setResponding(null);
    }
  };

  const renderStars = (rating: number, size = 'text-lg') => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`${size} ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
        ★
      </span>
    ));
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading reviews...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Partner Reviews</h1>
          <p className="text-gray-600">Manage and respond to customer reviews.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Review Stats */}
        {stats && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Review Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Average Rating */}
              <div className="text-center">
                <div className={`text-5xl font-bold ${getRatingColor(stats.average_rating)} mb-2`}>
                  {stats.average_rating.toFixed(1)}
                </div>
                <div className="flex justify-center mb-2">
                  {renderStars(stats.average_rating, 'text-2xl')}
                </div>
                <p className="text-gray-600">
                  Based on {stats.total_reviews} review{stats.total_reviews !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Rating Distribution */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Rating Distribution</h3>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center">
                      <span className="text-sm font-medium text-gray-600 w-8">
                        {rating}★
                      </span>
                      <div className="flex-1 mx-3 bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-yellow-400 h-3 rounded-full"
                          style={{
                            width: `${stats.total_reviews > 0 ? (stats.rating_distribution[rating as keyof typeof stats.rating_distribution] / stats.total_reviews) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8">
                        {stats.rating_distribution[rating as keyof typeof stats.rating_distribution]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Sorting */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Rating Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Filter by rating:</span>
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value as typeof filter);
                  setCurrentPage(1);
                }}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as typeof sortBy);
                  setCurrentPage(1);
                }}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="rating_high">Highest Rating</option>
                <option value="rating_low">Lowest Rating</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {reviews.length > 0 ? (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {/* Review Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                      {review.user.profile_image_url ? (
                        <img
                          src={review.user.profile_image_url}
                          alt={review.user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">
                          👤
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">{review.user.name}</h4>
                      <div className="flex items-center space-x-2">
                        {renderStars(review.rating)}
                        <span className="text-sm text-gray-500 ml-2">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {review.booking && (
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-700 capitalize">
                        {review.booking.service_type.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(review.booking.appointment_datetime)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Review Content */}
                {review.review_text && (
                  <div className="mb-4">
                    <p className="text-gray-700 leading-relaxed">{review.review_text}</p>
                  </div>
                )}

                {/* Detailed Ratings */}
                {(review.service_quality || review.communication || review.timeliness) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    {review.service_quality && (
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600">{review.service_quality}/5</div>
                        <div className="text-sm text-gray-600">Service Quality</div>
                      </div>
                    )}
                    {review.communication && (
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600">{review.communication}/5</div>
                        <div className="text-sm text-gray-600">Communication</div>
                      </div>
                    )}
                    {review.timeliness && (
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600">{review.timeliness}/5</div>
                        <div className="text-sm text-gray-600">Timeliness</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Recommendation */}
                {review.would_recommend !== null && (
                  <div className="mb-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      review.would_recommend
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {review.would_recommend ? '👍 Recommends' : '👎 Doesn\'t recommend'}
                    </span>
                  </div>
                )}

                {/* Response Section */}
                <div className="pt-4 border-t border-gray-100">
                  {responding === review.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        rows={3}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Write your response to this review..."
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleResponse(review.id)}
                          disabled={!responseText.trim()}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                        >
                          Post Response
                        </button>
                        <button
                          onClick={() => {
                            setResponding(null);
                            setResponseText('');
                          }}
                          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setResponding(review.id)}
                      className="px-4 py-2 border border-blue-600 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50"
                    >
                      Respond to Review
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No reviews yet</h3>
            <p className="text-gray-500">
              {filter !== 'all' 
                ? `No reviews with ${filter} star${filter !== '1' ? 's' : ''} found`
                : 'Your reviews will appear here once customers start leaving feedback'
              }
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + Math.max(1, currentPage - 2);
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-4 py-2 rounded-lg ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}