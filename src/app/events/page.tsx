'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { 
  CalendarDays, 
  MapPin, 
  Users, 
  Clock, 
  Filter,
  Search,
  Plus,
  Star,
  Globe,
  IndianRupee,
  Video
} from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string;
  event_type: string;
  category: string;
  status: string;
  is_virtual: boolean;
  is_premium_only: boolean;
  is_featured: boolean;
  start_date: string;
  end_date: string;
  venue_name?: string;
  address?: string;
  city: string;
  state: string;
  cover_image_url?: string;
  is_free: boolean;
  price?: number;
  organizer: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
  confirmed_rsvps: number;
  waiting_list_count: number;
  is_full: boolean;
  max_participants?: number;
}

const EVENT_CATEGORIES = [
  { value: 'educational', label: 'Educational', icon: '📚' },
  { value: 'social', label: 'Social', icon: '🤝' },
  { value: 'health', label: 'Health', icon: '🏥' },
  { value: 'competition', label: 'Competition', icon: '🏆' },
  { value: 'virtual', label: 'Virtual', icon: '💻' },
  { value: 'festival', label: 'Festival', icon: '🎉' }
];

const EVENT_TYPES = [
  { value: 'meetup', label: 'Meetup' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'health_camp', label: 'Health Camp' },
  { value: 'competition', label: 'Competition' }
];

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 
  'Pune', 'Ahmedabad', 'Surat', 'Jaipur', 'Lucknow', 'Kanpur'
];

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showVirtualOnly, setShowVirtualOnly] = useState(false);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchEvents = async (page = 1) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12'
      });
      
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedCity) params.append('city', selectedCity);
      if (selectedType) params.append('event_type', selectedType);
      if (showVirtualOnly) params.append('is_virtual', 'true');
      if (showFreeOnly) params.append('is_free', 'true');
      if (showFeaturedOnly) params.append('featured_only', 'true');
      
      const response = await fetch(`/api/events/demo?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setEvents(data.data.events);
        setTotalPages(data.data.pagination.totalPages);
        setTotalCount(data.data.pagination.totalCount);
        setCurrentPage(page);
      } else {
        setError(data.error || 'Failed to fetch events');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(1);
  }, [selectedCategory, selectedCity, selectedType, showVirtualOnly, showFreeOnly, showFeaturedOnly]);

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEventTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      meetup: '🤝',
      workshop: '🛠️',
      webinar: '💻',
      health_camp: '🏥',
      competition: '🏆'
    };
    return icons[type] || '📅';
  };

  const formatEventDate = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.toDateString() === end.toDateString()) {
      return `${format(start, 'MMM dd, yyyy')} • ${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
    } else {
      return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
    }
  };

  if (loading && events.length === 0) {
    return (
      <div className="min-h-screen bg-orange-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">🐕 Woofadaar Events</h1>
            <p className="text-xl text-orange-100 mb-6">
              Join India's Premier Dog Parent Community Events
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/events/create"
                className="bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Create Event
              </Link>
              <div className="text-sm text-orange-200">
                {totalCount} upcoming events • Join the community!
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filter Events</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Category */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {EVENT_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>

            {/* City */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">All Cities</option>
              {INDIAN_CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>

            {/* Type */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              {EVENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showVirtualOnly}
                onChange={(e) => setShowVirtualOnly(e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">Virtual Only</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showFreeOnly}
                onChange={(e) => setShowFreeOnly(e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">Free Events</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showFeaturedOnly}
                onChange={(e) => setShowFeaturedOnly(e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">Featured Only</span>
            </label>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDays className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No events found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? 'Try adjusting your search or filters' : 'Be the first to create an event!'}
            </p>
            <Link
              href="/events/create"
              className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Create First Event
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="bg-white rounded-lg shadow-sm border border-orange-200 overflow-hidden hover:shadow-md transition-shadow group"
                >
                  {/* Event Image */}
                  <div className="relative h-48 bg-gradient-to-br from-orange-100 to-orange-200">
                    {event.cover_image_url ? (
                      <Image
                        src={event.cover_image_url}
                        alt={event.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-6xl">
                        {getEventTypeIcon(event.event_type)}
                      </div>
                    )}
                    
                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {event.is_featured && (
                        <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          Featured
                        </span>
                      )}
                      {event.is_virtual && (
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <Video className="h-3 w-3" />
                          Virtual
                        </span>
                      )}
                      {event.is_premium_only && (
                        <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                          Premium
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="absolute top-3 right-3">
                      {event.is_free ? (
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                          FREE
                        </span>
                      ) : event.price && (
                        <span className="bg-gray-900 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <IndianRupee className="h-3 w-3" />
                          {(event.price / 100).toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Event Content */}
                  <div className="p-6">
                    {/* Category & Type */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                        {EVENT_CATEGORIES.find(c => c.value === event.category)?.label || event.category}
                      </span>
                      <span className="text-xs text-gray-500">
                        {EVENT_TYPES.find(t => t.value === event.event_type)?.label || event.event_type}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                      {event.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {event.description}
                    </p>

                    {/* Date & Time */}
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <CalendarDays className="h-4 w-4" />
                      <span>{formatEventDate(event.start_date, event.end_date)}</span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                      {event.is_virtual ? (
                        <Globe className="h-4 w-4" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                      <span>
                        {event.is_virtual ? 'Virtual Event' : `${event.venue_name || event.city}, ${event.state}`}
                      </span>
                    </div>

                    {/* Organizer */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center">
                        {event.organizer.profile_image_url ? (
                          <Image
                            src={event.organizer.profile_image_url}
                            alt={event.organizer.name}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        ) : (
                          <span className="text-xs text-orange-700 font-semibold">
                            {event.organizer.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{event.organizer.name}</p>
                        <p className="text-xs text-gray-500">Organizer</p>
                      </div>
                    </div>

                    {/* RSVP Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          {event.confirmed_rsvps} attending
                          {event.max_participants && ` / ${event.max_participants}`}
                        </span>
                      </div>
                      
                      {event.is_full ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                          Full ({event.waiting_list_count} waiting)
                        </span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          Available
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <button
                  onClick={() => fetchEvents(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => fetchEvents(page)}
                    className={`px-4 py-2 rounded-lg ${
                      currentPage === page
                        ? 'bg-orange-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => fetchEvents(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}