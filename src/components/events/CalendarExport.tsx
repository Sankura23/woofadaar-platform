'use client';

import React, { useState } from 'react';
import { CalendarService, CalendarEvent } from '@/lib/calendar-service';
import { 
  Calendar, 
  Download, 
  ExternalLink, 
  ChevronDown, 
  Clock,
  Globe,
  MapPin
} from 'lucide-react';

interface CalendarExportProps {
  event: {
    id: string;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    venue_name?: string;
    address?: string;
    city: string;
    state: string;
    is_virtual: boolean;
    virtual_link?: string;
    organizer?: {
      name: string;
    };
  };
  className?: string;
}

export default function CalendarExport({ event, className = '' }: CalendarExportProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Convert event data to CalendarEvent format
  const calendarEvent: CalendarEvent = {
    id: event.id,
    title: event.title,
    description: event.description,
    start_date: new Date(event.start_date),
    end_date: new Date(event.end_date),
    location: event.is_virtual 
      ? (event.virtual_link || 'Virtual Event')
      : event.venue_name 
        ? `${event.venue_name}, ${event.city}, ${event.state}`
        : `${event.city}, ${event.state}`,
    organizer: event.organizer?.name,
    url: `${window.location.origin}/events/${event.id}`,
    is_virtual: event.is_virtual,
    virtual_link: event.virtual_link
  };

  const exportOptions = CalendarService.getCalendarExportOptions(calendarEvent);
  const timezoneInfo = CalendarService.getTimezoneInfo(calendarEvent.start_date);

  const handleExport = (option: any) => {
    if (option.url) {
      // Open in new tab
      window.open(option.url, '_blank', 'noopener,noreferrer');
    } else if (option.action) {
      // Execute action (e.g., download file)
      option.action();
    }
    setIsDropdownOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Main Export Button */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium"
      >
        <Calendar className="h-4 w-4" />
        Add to Calendar
        <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsDropdownOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            {/* Event Info Header */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-lg">
              <h4 className="font-medium text-gray-900 text-sm mb-2 line-clamp-1">
                {event.title}
              </h4>
              
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>
                    {calendarEvent.start_date.toLocaleDateString('en-IN', {
                      weekday: 'short',
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                    {', '}
                    {calendarEvent.start_date.toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {' - '}
                    {calendarEvent.end_date.toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {event.is_virtual ? (
                    <Globe className="h-3 w-3" />
                  ) : (
                    <MapPin className="h-3 w-3" />
                  )}
                  <span className="line-clamp-1">
                    {event.is_virtual ? 'Virtual Event' : `${event.city}, ${event.state}`}
                  </span>
                </div>
                
                <div className="text-orange-600 font-medium">
                  Timezone: {timezoneInfo.timezone} ({timezoneInfo.offset})
                </div>
              </div>
            </div>

            {/* Calendar Options */}
            <div className="p-2">
              {Object.entries(exportOptions).map(([key, option]) => (
                <button
                  key={key}
                  onClick={() => handleExport(option)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <span className="text-base">{option.icon}</span>
                  <span className="flex-1 text-left">{option.name}</span>
                  {option.url ? (
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Download className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-lg">
              <p className="text-xs text-gray-500">
                💡 Tip: Adding to your calendar helps you never miss an event!
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Standalone quick export button for compact spaces
export function QuickCalendarExport({ event, variant = 'button' }: CalendarExportProps & { variant?: 'button' | 'icon' }) {
  const calendarEvent: CalendarEvent = {
    id: event.id,
    title: event.title,
    description: event.description,
    start_date: new Date(event.start_date),
    end_date: new Date(event.end_date),
    location: event.is_virtual 
      ? (event.virtual_link || 'Virtual Event')
      : event.venue_name 
        ? `${event.venue_name}, ${event.city}, ${event.state}`
        : `${event.city}, ${event.state}`,
    organizer: event.organizer?.name,
    url: `${window.location.origin}/events/${event.id}`,
    is_virtual: event.is_virtual,
    virtual_link: event.virtual_link
  };

  const handleQuickExport = () => {
    // Default to Google Calendar for quick export
    const googleUrl = CalendarService.generateGoogleCalendarUrl(calendarEvent);
    window.open(googleUrl, '_blank', 'noopener,noreferrer');
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleQuickExport}
        className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
        title="Add to Google Calendar"
      >
        <Calendar className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      onClick={handleQuickExport}
      className="flex items-center gap-2 px-3 py-1.5 text-xs bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
    >
      <Calendar className="h-3 w-3" />
      Add to Calendar
    </button>
  );
}