import { format } from 'date-fns';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_date: Date;
  end_date: Date;
  location?: string;
  organizer?: string;
  url?: string;
  is_virtual: boolean;
  virtual_link?: string;
}

export class CalendarService {
  /**
   * Generate iCal (.ics) format for calendar export
   */
  static generateICalendar(event: CalendarEvent): string {
    const formatICalDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const escapeText = (text: string): string => {
      return text
        .replace(/\\/g, '\\\\')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
    };

    const now = new Date();
    const dtstamp = formatICalDate(now);
    const dtstart = formatICalDate(event.start_date);
    const dtend = formatICalDate(event.end_date);
    
    const location = event.is_virtual 
      ? (event.virtual_link || 'Virtual Event')
      : event.location || '';

    const description = event.description + 
      (event.is_virtual && event.virtual_link ? `\\n\\nJoin here: ${event.virtual_link}` : '') +
      (event.url ? `\\n\\nEvent Details: ${event.url}` : '') +
      '\\n\\nOrganized by Woofadaar - India\'s Premier Dog Parent Community';

    const icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Woofadaar//Event Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${event.id}@woofadaar.com`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${escapeText(event.title)}`,
      `DESCRIPTION:${escapeText(description)}`,
      ...(location ? [`LOCATION:${escapeText(location)}`] : []),
      ...(event.organizer ? [`ORGANIZER;CN=${escapeText(event.organizer)}:mailto:noreply@woofadaar.com`] : []),
      ...(event.url ? [`URL:${event.url}`] : []),
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'CATEGORIES:EVENT,DOG COMMUNITY,SOCIAL',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    return icalContent;
  }

  /**
   * Generate Google Calendar URL for adding event
   */
  static generateGoogleCalendarUrl(event: CalendarEvent): string {
    const formatGoogleDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const startDate = formatGoogleDate(event.start_date);
    const endDate = formatGoogleDate(event.end_date);
    
    const location = event.is_virtual 
      ? (event.virtual_link || 'Virtual Event')
      : event.location || '';

    const details = event.description + 
      (event.is_virtual && event.virtual_link ? `\n\nJoin here: ${event.virtual_link}` : '') +
      (event.url ? `\n\nEvent Details: ${event.url}` : '') +
      '\n\nOrganized by Woofadaar - India\'s Premier Dog Parent Community';

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${startDate}/${endDate}`,
      details: details,
      ...(location && { location }),
      ctz: 'Asia/Kolkata',
      sf: 'true',
      output: 'xml'
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  /**
   * Generate Outlook Calendar URL for adding event
   */
  static generateOutlookCalendarUrl(event: CalendarEvent): string {
    const formatOutlookDate = (date: Date): string => {
      return date.toISOString();
    };

    const startDate = formatOutlookDate(event.start_date);
    const endDate = formatOutlookDate(event.end_date);
    
    const location = event.is_virtual 
      ? (event.virtual_link || 'Virtual Event')
      : event.location || '';

    const body = event.description + 
      (event.is_virtual && event.virtual_link ? `\n\nJoin here: ${event.virtual_link}` : '') +
      (event.url ? `\n\nEvent Details: ${event.url}` : '') +
      '\n\nOrganized by Woofadaar - India\'s Premier Dog Parent Community';

    const params = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: event.title,
      startdt: startDate,
      enddt: endDate,
      body: body,
      ...(location && { location })
    });

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  }

  /**
   * Generate Yahoo Calendar URL for adding event
   */
  static generateYahooCalendarUrl(event: CalendarEvent): string {
    const formatYahooDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const startDate = formatYahooDate(event.start_date);
    const endDate = formatYahooDate(event.end_date);
    
    const location = event.is_virtual 
      ? (event.virtual_link || 'Virtual Event')
      : event.location || '';

    const desc = event.description + 
      (event.is_virtual && event.virtual_link ? `\n\nJoin here: ${event.virtual_link}` : '') +
      (event.url ? `\n\nEvent Details: ${event.url}` : '') +
      '\n\nOrganized by Woofadaar - India\'s Premier Dog Parent Community';

    const params = new URLSearchParams({
      v: '60',
      title: event.title,
      st: startDate,
      et: endDate,
      desc: desc,
      ...(location && { in_loc: location })
    });

    return `https://calendar.yahoo.com/?${params.toString()}`;
  }

  /**
   * Download iCal file
   */
  static downloadICalFile(event: CalendarEvent, filename?: string): void {
    const icalContent = this.generateICalendar(event);
    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get all calendar export options for an event
   */
  static getCalendarExportOptions(event: CalendarEvent) {
    return {
      google: {
        name: 'Google Calendar',
        url: this.generateGoogleCalendarUrl(event),
        icon: '📅'
      },
      outlook: {
        name: 'Outlook',
        url: this.generateOutlookCalendarUrl(event),
        icon: '📆'
      },
      yahoo: {
        name: 'Yahoo Calendar',
        url: this.generateYahooCalendarUrl(event),
        icon: '📋'
      },
      ical: {
        name: 'Download iCal',
        action: () => this.downloadICalFile(event),
        icon: '💾'
      },
      apple: {
        name: 'Apple Calendar',
        action: () => this.downloadICalFile(event),
        icon: '🍎'
      }
    };
  }

  /**
   * Generate calendar reminder suggestions based on event type
   */
  static getDefaultReminders(eventType: string): Array<{ minutes: number; label: string }> {
    const reminderTemplates = {
      meetup: [
        { minutes: 60, label: '1 hour before' },
        { minutes: 1440, label: '1 day before' }
      ],
      workshop: [
        { minutes: 30, label: '30 minutes before' },
        { minutes: 60, label: '1 hour before' },
        { minutes: 1440, label: '1 day before' }
      ],
      webinar: [
        { minutes: 15, label: '15 minutes before' },
        { minutes: 60, label: '1 hour before' }
      ],
      health_camp: [
        { minutes: 120, label: '2 hours before' },
        { minutes: 1440, label: '1 day before' },
        { minutes: 2880, label: '2 days before' }
      ],
      competition: [
        { minutes: 60, label: '1 hour before' },
        { minutes: 1440, label: '1 day before' },
        { minutes: 10080, label: '1 week before' }
      ],
      default: [
        { minutes: 60, label: '1 hour before' },
        { minutes: 1440, label: '1 day before' }
      ]
    };

    return reminderTemplates[eventType as keyof typeof reminderTemplates] || reminderTemplates.default;
  }

  /**
   * Check if event conflicts with existing calendar events (placeholder for future implementation)
   */
  static async checkEventConflicts(event: CalendarEvent, userCalendarEvents: CalendarEvent[] = []): Promise<CalendarEvent[]> {
    // This would integrate with user's calendar APIs in the future
    // For now, return empty array indicating no conflicts
    const conflicts = userCalendarEvents.filter(existingEvent => {
      const eventStart = event.start_date.getTime();
      const eventEnd = event.end_date.getTime();
      const existingStart = existingEvent.start_date.getTime();
      const existingEnd = existingEvent.end_date.getTime();

      // Check for overlap
      return (eventStart < existingEnd && eventEnd > existingStart);
    });

    return conflicts;
  }

  /**
   * Generate event timezone information
   */
  static getTimezoneInfo(date: Date): { timezone: string; offset: string; localTime: string } {
    const timezone = 'Asia/Kolkata';
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    
    const parts = formatter.formatToParts(date);
    const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value || 'IST';
    
    return {
      timezone: timeZoneName,
      offset: '+05:30',
      localTime: format(date, 'h:mm a \'IST\' (\'GMT\' xxx)')
    };
  }

  /**
   * Convert event to different timezone (utility function)
   */
  static convertToTimezone(date: Date, timezone: string): Date {
    // This is a simplified implementation
    // In production, you'd use a library like date-fns-tz or moment-timezone
    return new Date(date.toLocaleString("en-US", {timeZone: timezone}));
  }
}