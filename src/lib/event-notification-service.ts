import { PrismaClient } from '@prisma/client';
import logger from './logger';

const prisma = new PrismaClient();

export interface NotificationData {
  title: string;
  body: string;
  data?: any;
  priority?: 'normal' | 'high';
  action?: string;
}

export class EventNotificationService {
  // Send push notification (placeholder - integrate with your push service)
  private static async sendPushNotification(userId: string, notification: NotificationData) {
    try {
      // This would integrate with your existing push notification service
      logger.info('Push notification sent', {
        userId,
        title: notification.title,
        body: notification.body,
        priority: notification.priority || 'normal'
      });
      
      // For now, we'll just log it. In a real implementation:
      // - Get user's push tokens from database
      // - Send via Firebase/APNs/etc.
      // - Handle delivery failures and retries
      
      return { success: true };
    } catch (error) {
      logger.error('Failed to send push notification:', error);
      return { success: false, error };
    }
  }

  // Send email notification (placeholder - integrate with your email service)
  private static async sendEmailNotification(userId: string, subject: string, content: string, data?: any) {
    try {
      // Get user email
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true }
      });

      if (!user?.email) {
        logger.warn('User email not found for notification', { userId });
        return { success: false, error: 'No email found' };
      }

      // This would integrate with your email service (SendGrid, SES, etc.)
      logger.info('Email notification sent', {
        userId,
        email: user.email,
        subject,
        contentPreview: content.substring(0, 100)
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to send email notification:', error);
      return { success: false, error };
    }
  }

  // RSVP Confirmation
  static async sendRsvpConfirmation(rsvpId: string) {
    try {
      const rsvp = await prisma.eventRSVP.findUnique({
        where: { id: rsvpId },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          event: {
            select: {
              id: true,
              title: true,
              start_date: true,
              end_date: true,
              venue_name: true,
              city: true,
              is_virtual: true,
              virtual_link: true
            }
          }
        }
      });

      if (!rsvp) {
        logger.error('RSVP not found for confirmation', { rsvpId });
        return;
      }

      const eventDate = rsvp.event.start_date.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const eventTime = rsvp.event.start_date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Push notification
      if (rsvp.push_reminders) {
        await this.sendPushNotification(rsvp.user_id, {
          title: '🎉 RSVP Confirmed!',
          body: `You're all set for ${rsvp.event.title} on ${eventDate}`,
          data: {
            eventId: rsvp.event_id,
            type: 'rsvp_confirmation',
            action: 'view_event'
          },
          priority: 'normal'
        });
      }

      // Email notification
      if (rsvp.email_reminders) {
        const location = rsvp.event.is_virtual ? 
          'Virtual Event (link will be shared closer to the date)' :
          `${rsvp.event.venue_name}, ${rsvp.event.city}`;

        const emailContent = `
          Hi ${rsvp.user.name}! 🐕
          
          Your RSVP for "${rsvp.event.title}" has been confirmed!
          
          📅 Date: ${eventDate}
          ⏰ Time: ${eventTime}
          📍 Location: ${location}
          ${rsvp.guest_count > 0 ? `👥 Guests: ${rsvp.guest_count}` : ''}
          
          We're excited to see you there! Don't forget to bring your furry friend.
          
          Need to make changes? Visit: https://woofadaar.com/events/${rsvp.event_id}
          
          Tail wags,
          Team Woofadaar 🐾
        `;

        await this.sendEmailNotification(
          rsvp.user_id,
          `🎉 RSVP Confirmed: ${rsvp.event.title}`,
          emailContent,
          { eventId: rsvp.event_id, rsvpId }
        );
      }

      logger.info('RSVP confirmation sent', {
        rsvpId,
        userId: rsvp.user_id,
        eventId: rsvp.event_id
      });

    } catch (error) {
      logger.error('Error sending RSVP confirmation:', error);
    }
  }

  // Waiting List Confirmation
  static async sendWaitingListConfirmation(waitingListId: string) {
    try {
      const waitingEntry = await prisma.eventWaitingList.findUnique({
        where: { id: waitingListId },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          event: {
            select: {
              id: true,
              title: true,
              start_date: true
            }
          }
        }
      });

      if (!waitingEntry) {
        logger.error('Waiting list entry not found', { waitingListId });
        return;
      }

      // Push notification
      await this.sendPushNotification(waitingEntry.user_id, {
        title: '⏳ Added to Waiting List',
        body: `You're #${waitingEntry.position} for ${waitingEntry.event.title}. We'll notify you if a spot opens!`,
        data: {
          eventId: waitingEntry.event_id,
          type: 'waiting_list_confirmation',
          position: waitingEntry.position
        },
        priority: 'normal'
      });

      logger.info('Waiting list confirmation sent', {
        waitingListId,
        userId: waitingEntry.user_id,
        position: waitingEntry.position
      });

    } catch (error) {
      logger.error('Error sending waiting list confirmation:', error);
    }
  }

  // Waiting List Promotion
  static async notifyWaitingListPromotion(waitingListId: string) {
    try {
      const waitingEntry = await prisma.eventWaitingList.findUnique({
        where: { id: waitingListId },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          event: {
            select: {
              id: true,
              title: true,
              start_date: true,
              venue_name: true,
              city: true,
              is_virtual: true
            }
          }
        }
      });

      if (!waitingEntry) {
        logger.error('Waiting list entry not found for promotion', { waitingListId });
        return;
      }

      const eventDate = waitingEntry.event.start_date.toLocaleDateString('en-IN');

      // High priority push notification
      await this.sendPushNotification(waitingEntry.user_id, {
        title: '🎉 You\'re in!',
        body: `A spot opened up for ${waitingEntry.event.title}! Confirm your attendance now.`,
        data: {
          eventId: waitingEntry.event_id,
          type: 'waitlist_promotion',
          action: 'confirm_rsvp',
          urgency: 'high'
        },
        priority: 'high'
      });

      // Email with confirmation link
      const emailContent = `
        Great news, ${waitingEntry.user.name}! 🎉
        
        A spot has opened up for "${waitingEntry.event.title}" on ${eventDate}.
        
        You have 24 hours to confirm your attendance before we offer it to the next person.
        
        👆 Confirm your spot: https://woofadaar.com/events/${waitingEntry.event_id}
        
        Don't miss out!
        
        Team Woofadaar 🐾
      `;

      await this.sendEmailNotification(
        waitingEntry.user_id,
        `🚨 Spot Available: ${waitingEntry.event.title}`,
        emailContent,
        { eventId: waitingEntry.event_id, waitingListId, urgent: true }
      );

      // Update notified_at timestamp
      await prisma.eventWaitingList.update({
        where: { id: waitingListId },
        data: { notified_at: new Date() }
      });

      logger.info('Waiting list promotion notification sent', {
        waitingListId,
        userId: waitingEntry.user_id,
        eventId: waitingEntry.event_id
      });

    } catch (error) {
      logger.error('Error sending waiting list promotion notification:', error);
    }
  }

  // Event Reminder (24h, 1h, 30min before)
  static async sendEventReminders(eventId: string, reminderType: '24h' | '1h' | '30m') {
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          rsvps: {
            where: { status: 'confirmed' },
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        }
      });

      if (!event) {
        logger.error('Event not found for reminders', { eventId });
        return;
      }

      const reminderConfig = {
        '24h': { title: 'Event Tomorrow! 📅', timeText: 'is tomorrow' },
        '1h': { title: 'Event Starting Soon! ⏰', timeText: 'starts in 1 hour' },
        '30m': { title: 'Event Starting Now! 🚀', timeText: 'starts in 30 minutes' }
      };

      const config = reminderConfig[reminderType];
      const eventTime = event.start_date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Send to all confirmed attendees
      for (const rsvp of event.rsvps) {
        // Push notification
        if (rsvp.push_reminders) {
          await this.sendPushNotification(rsvp.user_id, {
            title: config.title,
            body: `${event.title} ${config.timeText} at ${eventTime}`,
            data: {
              eventId: event.id,
              type: 'event_reminder',
              reminderType,
              action: 'view_event'
            },
            priority: reminderType === '30m' ? 'high' : 'normal'
          });
        }

        // Email reminder (only for 24h and important 1h reminders)
        if (rsvp.email_reminders && (reminderType === '24h' || reminderType === '1h')) {
          const location = event.is_virtual ? 
            'Virtual Event' : 
            `${event.venue_name}, ${event.city}`;

          const emailContent = `
            Hi ${rsvp.user.name}! 👋
            
            This is a friendly reminder that "${event.title}" ${config.timeText}.
            
            📅 Time: ${eventTime}
            📍 Location: ${location}
            ${rsvp.guest_count > 0 ? `👥 You're bringing ${rsvp.guest_count} guest(s)` : ''}
            ${event.is_virtual && event.virtual_link ? `\n🔗 Join here: ${event.virtual_link}` : ''}
            
            See you there! 🐕
            
            Team Woofadaar 🐾
          `;

          await this.sendEmailNotification(
            rsvp.user_id,
            `⏰ Reminder: ${event.title} ${config.timeText}`,
            emailContent,
            { eventId: event.id, reminderType }
          );
        }
      }

      logger.info('Event reminders sent', {
        eventId,
        reminderType,
        attendeeCount: event.rsvps.length
      });

    } catch (error) {
      logger.error('Error sending event reminders:', error);
    }
  }

  // Event Update Notification
  static async notifyEventUpdate(updateId: string) {
    try {
      const update = await prisma.eventUpdate.findUnique({
        where: { id: updateId },
        include: {
          event: {
            include: {
              rsvps: {
                where: { status: 'confirmed' },
                include: {
                  user: {
                    select: { id: true, name: true, email: true }
                  }
                }
              },
              waiting_list: {
                where: { status: 'waiting' },
                include: {
                  user: {
                    select: { id: true, name: true, email: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!update) {
        logger.error('Event update not found', { updateId });
        return;
      }

      // Determine recipients based on sent_to setting
      let recipients: any[] = [];
      
      if (update.sent_to === 'all' || update.sent_to === 'rsvp_only') {
        recipients.push(...update.event.rsvps.map(rsvp => rsvp.user));
      }
      
      if (update.sent_to === 'all' || update.sent_to === 'waiting_list') {
        recipients.push(...update.event.waiting_list.map(waiting => waiting.user));
      }

      // Remove duplicates
      recipients = recipients.filter((user, index, self) => 
        index === self.findIndex(u => u.id === user.id)
      );

      const priority = update.update_type === 'important' || update.update_type === 'cancellation' ? 'high' : 'normal';

      // Send notifications
      for (const user of recipients) {
        await this.sendPushNotification(user.id, {
          title: `📢 Event Update: ${update.event.title}`,
          body: update.title,
          data: {
            eventId: update.event_id,
            updateId: update.id,
            type: 'event_update',
            updateType: update.update_type,
            action: 'view_event'
          },
          priority
        });
      }

      logger.info('Event update notifications sent', {
        updateId,
        eventId: update.event_id,
        recipientCount: recipients.length,
        updateType: update.update_type
      });

    } catch (error) {
      logger.error('Error sending event update notifications:', error);
    }
  }

  // Organizer Notification for New RSVP
  static async notifyOrganizerNewRsvp(organizerId: string, rsvpId: string) {
    try {
      const rsvp = await prisma.eventRSVP.findUnique({
        where: { id: rsvpId },
        include: {
          user: {
            select: { id: true, name: true }
          },
          event: {
            select: { id: true, title: true, current_participants: true, max_participants: true }
          }
        }
      });

      if (!rsvp) return;

      await this.sendPushNotification(organizerId, {
        title: '🎉 New RSVP!',
        body: `${rsvp.user.name} just RSVP'd to ${rsvp.event.title}${rsvp.guest_count > 0 ? ` (+ ${rsvp.guest_count} guests)` : ''}`,
        data: {
          eventId: rsvp.event_id,
          rsvpId: rsvp.id,
          type: 'organizer_new_rsvp',
          action: 'view_attendees'
        },
        priority: 'normal'
      });

      logger.info('Organizer notified of new RSVP', {
        organizerId,
        rsvpId,
        eventId: rsvp.event_id
      });

    } catch (error) {
      logger.error('Error notifying organizer of new RSVP:', error);
    }
  }

  // Schedule event reminders (called by cron job or scheduler)
  static async scheduleEventReminders() {
    try {
      const now = new Date();
      
      // Find events for different reminder windows
      const eventsFor24h = await prisma.event.findMany({
        where: {
          status: 'published',
          start_date: {
            gte: new Date(now.getTime() + 23 * 60 * 60 * 1000), // 23 hours from now
            lte: new Date(now.getTime() + 25 * 60 * 60 * 1000)  // 25 hours from now
          },
          send_reminders: true
        },
        select: { id: true }
      });

      const eventsFor1h = await prisma.event.findMany({
        where: {
          status: 'published',
          start_date: {
            gte: new Date(now.getTime() + 50 * 60 * 1000), // 50 minutes from now
            lte: new Date(now.getTime() + 70 * 60 * 1000)  // 70 minutes from now
          },
          send_reminders: true
        },
        select: { id: true }
      });

      const eventsFor30m = await prisma.event.findMany({
        where: {
          status: 'published',
          start_date: {
            gte: new Date(now.getTime() + 25 * 60 * 1000), // 25 minutes from now
            lte: new Date(now.getTime() + 35 * 60 * 1000)  // 35 minutes from now
          },
          send_reminders: true
        },
        select: { id: true }
      });

      // Send reminders
      for (const event of eventsFor24h) {
        await this.sendEventReminders(event.id, '24h');
      }

      for (const event of eventsFor1h) {
        await this.sendEventReminders(event.id, '1h');
      }

      for (const event of eventsFor30m) {
        await this.sendEventReminders(event.id, '30m');
      }

      logger.info('Scheduled event reminders processed', {
        reminders24h: eventsFor24h.length,
        reminders1h: eventsFor1h.length,
        reminders30m: eventsFor30m.length
      });

    } catch (error) {
      logger.error('Error scheduling event reminders:', error);
    }
  }
}