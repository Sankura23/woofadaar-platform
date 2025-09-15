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
  Plus,
  Settings,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
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
  city: string;
  state: string;
  cover_image_url?: string;
  is_free: boolean;
  price?: number;
  confirmed_attendees_count: number;
  waiting_list_count: number;
  max_participants?: number;
  user_rsvp?: {
    status: string;
    guest_count: number;
    created_at: string;
  };
  user_waiting_position?: number;
}

interface MyEventsData {
  organizing: Event[];
  attending: Event[];
  waiting_list: Event[];
}

export default function MyEventsPage() {
  const [data, setData] = useState<MyEventsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'organizing' | 'attending' | 'waiting'>('organizing');

  // Mock user ID - in real app this would come from auth context
  const userId = 'demo-user-id';

  const fetchMyEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/demo/my?user_id=${userId}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch events');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching my events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyEvents();
  }, []);

  const handleCancelEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to cancel this event? This action cannot be undone.')) return;
    
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizer_id: userId })
      });

      const result = await response.json();

      if (result.success) {
        alert('Event cancelled successfully');
        fetchMyEvents(); // Refresh data
      } else {
        alert(result.error || 'Failed to cancel event');
      }
    } catch (err) {
      console.error('Error cancelling event:', err);
      alert('Network error occurred');
    }
  };

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'text-green-700 bg-green-100';
      case 'draft': return 'text-gray-700 bg-gray-100';
      case 'cancelled': return 'text-red-700 bg-red-100';
      case 'completed': return 'text-blue-700 bg-blue-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getRsvpStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-700 bg-green-100';
      case 'pending': return 'text-yellow-700 bg-yellow-100';
      case 'cancelled': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const formatEventDateTime = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const dateStr = format(start, 'MMM do, yyyy');
    const timeStr = start.toDateString() === end.toDateString() ? 
      `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}` :
      `${format(start, 'MMM do, h:mm a')} - ${format(end, 'MMM do, h:mm a')}`;
    
    return { dateStr, timeStr };
  };

  const EventCard: React.FC<{ event: Event; type: 'organizing' | 'attending' | 'waiting' }> = ({ event, type }) => {
    const { dateStr, timeStr } = formatEventDateTime(event.start_date, event.end_date);
    const isPastEvent = new Date(event.start_date) < new Date();

    return (
      <div className="bg-white rounded-lg shadow-sm border border-orange-200 overflow-hidden hover:shadow-md transition-shadow">
        {/* Event Header */}
        <div className="relative">
          {/* Event Image */}
          <div className="relative h-32 bg-gradient-to-br from-orange-100 to-orange-200">
            {event.cover_image_url ? (
              <Image
                src={event.cover_image_url}
                alt={event.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-4xl">
                {event.event_type === 'meetup' ? '🤝' : 
                 event.event_type === 'workshop' ? '🛠️' : 
                 event.event_type === 'webinar' ? '💻' : 
                 event.event_type === 'health_camp' ? '🏥' : 
                 event.event_type === 'competition' ? '🏆' : '📅'}
              </div>
            )}
            
            {/* Status Badge */}
            <div className="absolute top-2 left-2">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getEventStatusColor(event.status)}`}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </span>
            </div>

            {/* Type Badges */}
            <div className="absolute top-2 right-2 flex gap-1">
              {event.is_virtual && (
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  Virtual
                </span>
              )}
              {event.is_featured && (
                <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Featured
                </span>
              )}
            </div>

            {/* Price */}
            <div className="absolute bottom-2 right-2">
              {event.is_free ? (
                <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  FREE
                </span>
              ) : event.price && (
                <span className="bg-gray-900 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium">
                  <IndianRupee className="h-3 w-3" />
                  {(event.price / 100).toFixed(0)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Event Content */}
        <div className="p-4">
          {/* Title and Category */}
          <div className="mb-3">
            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{event.title}</h3>
            <div className="flex gap-2">
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
              </span>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                {event.event_type.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Event Details */}
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-orange-600" />
              <span>{dateStr}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span>{timeStr}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {event.is_virtual ? (
                <Globe className="h-4 w-4 text-orange-600" />
              ) : (
                <MapPin className="h-4 w-4 text-orange-600" />
              )}
              <span className="line-clamp-1">
                {event.is_virtual ? 'Virtual Event' : `${event.venue_name || event.city}, ${event.state}`}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-600" />
              <span>
                {event.confirmed_attendees_count} attending
                {event.max_participants && ` / ${event.max_participants}`}
                {event.waiting_list_count > 0 && ` (+${event.waiting_list_count} waiting)`}
              </span>
            </div>
          </div>

          {/* RSVP Status (for attending/waiting tabs) */}
          {type !== 'organizing' && (
            <div className="mb-4">
              {type === 'attending' && event.user_rsvp && (
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRsvpStatusColor(event.user_rsvp.status)}`}>
                    {event.user_rsvp.status === 'confirmed' ? '✅ Confirmed' : 
                     event.user_rsvp.status === 'pending' ? '⏳ Pending' : 
                     event.user_rsvp.status === 'cancelled' ? '❌ Cancelled' : event.user_rsvp.status}
                  </span>
                  {event.user_rsvp.guest_count > 0 && (
                    <span className="text-xs text-gray-500">
                      +{event.user_rsvp.guest_count} guest(s)
                    </span>
                  )}
                </div>
              )}
              
              {type === 'waiting' && event.user_waiting_position && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                  #{event.user_waiting_position} on waiting list
                </span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {type === 'organizing' ? (
              <>
                <Link
                  href={`/events/${event.id}`}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                >
                  <Eye className="h-3 w-3" />
                  View
                </Link>
                
                {event.status === 'draft' && (
                  <Link
                    href={`/events/${event.id}/edit`}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </Link>
                )}
                
                <Link
                  href={`/events/${event.id}/manage`}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Settings className="h-3 w-3" />
                  Manage
                </Link>
                
                {event.status !== 'cancelled' && event.status !== 'completed' && (
                  <button
                    onClick={() => handleCancelEvent(event.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Cancel
                  </button>
                )}
              </>
            ) : (
              <Link
                href={`/events/${event.id}`}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
              >
                <Eye className="h-3 w-3" />
                View Event
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load Events</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => fetchMyEvents()}
            className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const tabCounts = {
    organizing: data?.organizing.length || 0,
    attending: data?.attending.length || 0,
    waiting: data?.waiting_list.length || 0
  };

  const activeEvents = data ? data[activeTab === 'waiting' ? 'waiting_list' : activeTab] : [];

  return (
    <div className="min-h-screen bg-orange-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Events</h1>
              <p className="text-gray-600 mt-1">
                Manage your organized events and track your RSVPs
              </p>
            </div>
            
            <Link
              href="/events/create"
              className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Create Event
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-orange-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('organizing')}
                className={`flex-1 py-4 px-6 text-sm font-medium text-center transition-colors ${
                  activeTab === 'organizing'
                    ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Organizing ({tabCounts.organizing})
              </button>
              
              <button
                onClick={() => setActiveTab('attending')}
                className={`flex-1 py-4 px-6 text-sm font-medium text-center transition-colors ${
                  activeTab === 'attending'
                    ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Attending ({tabCounts.attending})
              </button>
              
              <button
                onClick={() => setActiveTab('waiting')}
                className={`flex-1 py-4 px-6 text-sm font-medium text-center transition-colors ${
                  activeTab === 'waiting'
                    ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Waiting List ({tabCounts.waiting})
              </button>
            </nav>
          </div>
        </div>

        {/* Events Grid */}
        {activeEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeEvents.map(event => (
              <EventCard key={event.id} event={event} type={activeTab} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-12 text-center">
            <div className="text-6xl mb-4">
              {activeTab === 'organizing' ? '📅' : activeTab === 'attending' ? '🎉' : '⏳'}
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {activeTab === 'organizing' && 'No Events Organized'}
              {activeTab === 'attending' && 'No Events Attending'}
              {activeTab === 'waiting' && 'No Waiting List Events'}
            </h3>
            
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {activeTab === 'organizing' && 'Start building India\'s premier dog parent community by creating your first event!'}
              {activeTab === 'attending' && 'Discover amazing events happening in your city and connect with fellow dog parents.'}
              {activeTab === 'waiting' && 'When events you\'re interested in get full, you\'ll see your waiting list status here.'}
            </p>
            
            {activeTab === 'organizing' ? (
              <Link
                href="/events/create"
                className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Create Your First Event
              </Link>
            ) : (
              <Link
                href="/events"
                className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Browse Events
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}