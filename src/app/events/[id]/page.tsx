'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { 
  ArrowLeft,
  CalendarDays, 
  MapPin, 
  Users, 
  Clock, 
  Share2,
  Heart,
  MessageCircle,
  Camera,
  Star,
  Globe,
  IndianRupee,
  Video,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserPlus,
  Edit,
  Settings
} from 'lucide-react';
import CalendarExport from '@/components/events/CalendarExport';
import PhotoGallery from '@/components/events/PhotoGallery';

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
  requirements: string[];
  tags: string[];
  agenda?: any;
  organizer: {
    id: string;
    name: string;
    profile_image_url?: string;
    location?: string;
  };
  confirmed_attendees_count: number;
  waiting_list_count: number;
  comments_count: number;
  photos_count: number;
  is_full: boolean;
  spots_remaining?: number;
  registration_open: boolean;
  user_rsvp_status?: string;
  user_waiting_position?: number;
  can_user_rsvp: boolean;
  can_user_join_waitlist: boolean;
  max_participants?: number;
  rsvps: Array<{
    user: {
      id: string;
      name: string;
      profile_image_url?: string;
    };
  }>;
  waiting_list: Array<{
    user: {
      id: string;
      name: string;
      profile_image_url?: string;
    };
    position: number;
  }>;
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [guestCount, setGuestCount] = useState(0);
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [specialRequirements, setSpecialRequirements] = useState('');

  // Mock user ID - in real app this would come from auth context
  const userId = 'demo-user-id';

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/demo/${eventId}?user_id=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setEvent(data.data);
      } else {
        setError(data.error || 'Failed to fetch event');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching event:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRsvp = async () => {
    if (!event) return;
    
    setRsvpLoading(true);
    
    try {
      const rsvpData = {
        user_id: userId,
        guest_count: guestCount,
        guest_names: guestNames.filter(name => name.trim()),
        special_requirements: specialRequirements.trim() || null
      };

      const response = await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rsvpData)
      });

      const result = await response.json();

      if (result.success) {
        // Refresh event data
        await fetchEvent();
        
        // Show success message
        if (result.data.status === 'waiting_list') {
          alert(`Added to waiting list! You are #${result.data.position} in line.`);
        } else {
          alert('RSVP confirmed! See you at the event! 🐕');
        }
      } else {
        alert(result.error || 'Failed to RSVP');
      }
    } catch (err) {
      console.error('Error creating RSVP:', err);
      alert('Network error occurred');
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    setRsvpLoading(true);
    
    try {
      const response = await fetch(`/api/events/${eventId}/waiting-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });

      const result = await response.json();

      if (result.success) {
        await fetchEvent();
        alert(`Added to waiting list! You are #${result.data.position} in line.`);
      } else {
        alert(result.error || 'Failed to join waiting list');
      }
    } catch (err) {
      console.error('Error joining waiting list:', err);
      alert('Network error occurred');
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleCancelRsvp = async () => {
    if (!confirm('Are you sure you want to cancel your RSVP?')) return;
    
    setRsvpLoading(true);
    
    try {
      const response = await fetch(`/api/events/${eventId}/rsvp?user_id=${userId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        await fetchEvent();
        alert('RSVP cancelled successfully');
      } else {
        alert(result.error || 'Failed to cancel RSVP');
      }
    } catch (err) {
      console.error('Error cancelling RSVP:', err);
      alert('Network error occurred');
    } finally {
      setRsvpLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'This event does not exist or has been removed.'}</p>
          <Link
            href="/events"
            className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
          >
            Browse Events
          </Link>
        </div>
      </div>
    );
  }

  const formatEventDateTime = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const dateStr = format(start, 'EEEE, MMMM do, yyyy');
    const timeStr = start.toDateString() === end.toDateString() ? 
      `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}` :
      `${format(start, 'MMM do, h:mm a')} - ${format(end, 'MMM do, h:mm a')}`;
    
    return { dateStr, timeStr };
  };

  const { dateStr, timeStr } = formatEventDateTime(event.start_date, event.end_date);

  const getRsvpButtonContent = () => {
    if (event.user_rsvp_status === 'confirmed') {
      return {
        text: '✅ You\'re Attending',
        className: 'bg-green-600 hover:bg-green-700 text-white',
        action: handleCancelRsvp,
        disabled: false
      };
    }
    
    if (event.user_rsvp_status === 'pending') {
      return {
        text: '⏳ RSVP Pending Approval',
        className: 'bg-yellow-500 text-white cursor-default',
        action: () => {},
        disabled: true
      };
    }
    
    if (event.user_waiting_position) {
      return {
        text: `⏳ #${event.user_waiting_position} on Waiting List`,
        className: 'bg-gray-500 text-white cursor-default',
        action: () => {},
        disabled: true
      };
    }
    
    if (!event.registration_open) {
      return {
        text: 'Registration Closed',
        className: 'bg-gray-400 text-white cursor-default',
        action: () => {},
        disabled: true
      };
    }
    
    if (event.can_user_rsvp) {
      return {
        text: `🎉 RSVP Now${event.is_free ? ' (Free)' : event.price ? ` (₹${(event.price / 100).toFixed(0)})` : ''}`,
        className: 'bg-orange-600 hover:bg-orange-700 text-white',
        action: handleRsvp,
        disabled: false
      };
    }
    
    if (event.can_user_join_waitlist) {
      return {
        text: '📝 Join Waiting List',
        className: 'bg-blue-600 hover:bg-blue-700 text-white',
        action: handleJoinWaitlist,
        disabled: false
      };
    }
    
    return {
      text: 'Event Full',
      className: 'bg-gray-400 text-white cursor-default',
      action: () => {},
      disabled: true
    };
  };

  const rsvpButton = getRsvpButtonContent();

  return (
    <div className="min-h-screen bg-orange-50">
      {/* Header */}
      <div className="bg-white border-b border-orange-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Events
            </button>
            
            <div className="flex items-center gap-2">
              <CalendarExport event={event} />
              <button className="p-2 text-gray-600 hover:text-gray-900 transition-colors">
                <Share2 className="h-5 w-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-red-600 transition-colors">
                <Heart className="h-5 w-5" />
              </button>
              {event.organizer.id === userId && (
                <Link
                  href={`/events/${eventId}/edit`}
                  className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Edit className="h-5 w-5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Hero */}
        <div className="bg-white rounded-lg shadow-sm border border-orange-200 overflow-hidden mb-8">
          {/* Event Image */}
          <div className="relative h-64 sm:h-80 bg-gradient-to-br from-orange-100 to-orange-200">
            {event.cover_image_url ? (
              <Image
                src={event.cover_image_url}
                alt={event.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-8xl">
                {event.event_type === 'meetup' ? '🤝' : 
                 event.event_type === 'workshop' ? '🛠️' : 
                 event.event_type === 'webinar' ? '💻' : 
                 event.event_type === 'health_camp' ? '🏥' : 
                 event.event_type === 'competition' ? '🏆' : '📅'}
              </div>
            )}
            
            {/* Badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              {event.is_featured && (
                <span className="bg-yellow-500 text-white text-sm px-3 py-1 rounded-full flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  Featured
                </span>
              )}
              {event.is_virtual && (
                <span className="bg-blue-500 text-white text-sm px-3 py-1 rounded-full flex items-center gap-1">
                  <Video className="h-4 w-4" />
                  Virtual
                </span>
              )}
              {event.is_premium_only && (
                <span className="bg-purple-500 text-white text-sm px-3 py-1 rounded-full">
                  Premium Only
                </span>
              )}
            </div>

            {/* Price */}
            <div className="absolute top-4 right-4">
              {event.is_free ? (
                <span className="bg-green-500 text-white text-sm px-3 py-1 rounded-full font-medium">
                  FREE
                </span>
              ) : event.price && (
                <span className="bg-gray-900 text-white text-sm px-3 py-1 rounded-full flex items-center gap-1 font-medium">
                  <IndianRupee className="h-4 w-4" />
                  {(event.price / 100).toFixed(0)}
                </span>
              )}
            </div>
          </div>

          {/* Event Info */}
          <div className="p-6">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
              </span>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                {event.event_type.replace('_', ' ')}
              </span>
              {event.tags.map(tag => (
                <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Date & Time */}
              <div className="flex items-start gap-3">
                <CalendarDays className="h-5 w-5 text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-gray-900">{dateStr}</p>
                  <p className="text-gray-600">{timeStr}</p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3">
                {event.is_virtual ? (
                  <Globe className="h-5 w-5 text-orange-600 flex-shrink-0 mt-1" />
                ) : (
                  <MapPin className="h-5 w-5 text-orange-600 flex-shrink-0 mt-1" />
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {event.is_virtual ? 'Virtual Event' : event.venue_name}
                  </p>
                  <p className="text-gray-600">
                    {event.is_virtual ? 'Online' : `${event.city}, ${event.state}`}
                  </p>
                  {event.address && !event.is_virtual && (
                    <p className="text-sm text-gray-500 mt-1">{event.address}</p>
                  )}
                </div>
              </div>

              {/* Capacity */}
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-gray-900">
                    {event.confirmed_attendees_count} attending
                    {event.max_participants && ` / ${event.max_participants}`}
                  </p>
                  {event.is_full ? (
                    <div className="flex items-center gap-2">
                      <span className="text-red-600 font-medium">Event Full</span>
                      {event.waiting_list_count > 0 && (
                        <span className="text-sm text-gray-500">
                          ({event.waiting_list_count} waiting)
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-green-600">
                      {event.spots_remaining ? `${event.spots_remaining} spots remaining` : 'Spots available'}
                    </p>
                  )}
                </div>
              </div>

              {/* Organizer */}
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-orange-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  {event.organizer.profile_image_url ? (
                    <Image
                      src={event.organizer.profile_image_url}
                      alt={event.organizer.name}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  ) : (
                    <span className="text-xs text-orange-700 font-semibold">
                      {event.organizer.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{event.organizer.name}</p>
                  <p className="text-gray-600">Organizer</p>
                  {event.organizer.location && (
                    <p className="text-sm text-gray-500">{event.organizer.location}</p>
                  )}
                </div>
              </div>
            </div>

            {/* RSVP Button */}
            <div className="border-t border-gray-200 pt-6">
              <button
                onClick={rsvpButton.action}
                disabled={rsvpButton.disabled || rsvpLoading}
                className={`w-full px-6 py-4 rounded-lg font-semibold text-lg transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${rsvpButton.className}`}
              >
                {rsvpLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  rsvpButton.text
                )}
              </button>

              {event.can_user_rsvp && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">RSVP Options</h3>
                  
                  {/* Guest Count */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of guests (optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={guestCount}
                      onChange={(e) => {
                        const count = parseInt(e.target.value) || 0;
                        setGuestCount(count);
                        setGuestNames(Array(count).fill(''));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  {/* Guest Names */}
                  {guestCount > 0 && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Guest names
                      </label>
                      <div className="space-y-2">
                        {Array.from({ length: guestCount }, (_, i) => (
                          <input
                            key={i}
                            type="text"
                            placeholder={`Guest ${i + 1} name`}
                            value={guestNames[i] || ''}
                            onChange={(e) => {
                              const newNames = [...guestNames];
                              newNames[i] = e.target.value;
                              setGuestNames(newNames);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Special Requirements */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Special requirements or dietary restrictions (optional)
                    </label>
                    <textarea
                      value={specialRequirements}
                      onChange={(e) => setSpecialRequirements(e.target.value)}
                      rows={2}
                      placeholder="Any special needs we should know about..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Event Description & Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Description */}
            <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About This Event</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
              </div>
            </div>

            {/* Requirements */}
            {event.requirements.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">What to Bring</h2>
                <ul className="space-y-2">
                  {event.requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Agenda */}
            {event.agenda && (
              <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Agenda</h2>
                <div className="text-gray-700">
                  {/* Render agenda based on structure */}
                  <p className="text-sm text-gray-500">Detailed agenda will be shared with attendees</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Confirmed Attendees */}
            {event.rsvps.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Attendees ({event.confirmed_attendees_count})
                </h3>
                
                <div className="space-y-3">
                  {event.rsvps.slice(0, 8).map((rsvp, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center">
                        {rsvp.user.profile_image_url ? (
                          <Image
                            src={rsvp.user.profile_image_url}
                            alt={rsvp.user.name}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        ) : (
                          <span className="text-xs text-orange-700 font-semibold">
                            {rsvp.user.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-700">{rsvp.user.name}</span>
                    </div>
                  ))}
                  
                  {event.confirmed_attendees_count > 8 && (
                    <p className="text-sm text-gray-500 text-center pt-2">
                      +{event.confirmed_attendees_count - 8} more attending
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Waiting List */}
            {event.waiting_list.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Waiting List ({event.waiting_list_count})
                </h3>
                
                <div className="space-y-2">
                  {event.waiting_list.slice(0, 5).map((waiting, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm">
                      <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                        {waiting.position}
                      </span>
                      <span className="text-gray-700">{waiting.user.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Event Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Activity</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Interested</span>
                  <span className="font-medium">{event.confirmed_attendees_count + event.waiting_list_count}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Comments</span>
                  <span className="font-medium">{event.comments_count}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Photos</span>
                  <span className="font-medium">{event.photos_count}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Photo Gallery */}
        <PhotoGallery 
          eventId={eventId}
          allowPhotos={true} // This would come from event.allow_photos in real implementation
          userCanUpload={event.user_rsvp_status === 'confirmed' || event.organizer.id === userId}
          className="mt-8"
        />
      </div>
    </div>
  );
}