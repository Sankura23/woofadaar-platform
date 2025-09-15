// Week 10: Push Notification Service for PWA
// Handles subscription management and push notification delivery

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  url?: string;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  data?: any;
  urgent?: boolean;
  silent?: boolean;
  requireInteraction?: boolean;
  timestamp?: number;
}

export interface NotificationTemplate {
  type: 'health_reminder' | 'appointment_reminder' | 'community_response' | 'ai_insight' | 'emergency_alert' | 'partner_message' | 'system_update';
  title: string;
  body: string;
  icon?: string;
  url?: string;
  actions?: Array<{
    action: string;
    title: string;
  }>;
  urgent?: boolean;
}

class PushNotificationService {
  private static instance: PushNotificationService;
  private vapidPublicKey: string;
  private vapidPrivateKey: string;
  private isSupported: boolean = false;
  private subscription: PushSubscription | null = null;

  private constructor() {
    // Initialize VAPID keys (in production, these should be environment variables)
    this.vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BNxKGK8KvGFzQRyFYcC_QvD2ZVaUuYkRJUJO4EjJ7O3ZPhQDJNxk4lF_oAbH8rWU2UQkl1QJ3wJNK0sKvzfV-vE';
    this.vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'private-key-placeholder';
    
    if (typeof window !== 'undefined') {
      this.checkSupport();
    }
  }

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  private checkSupport(): void {
    this.isSupported = 
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      throw new Error('Push notifications not supported');
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  }

  public async subscribe(userId: string): Promise<PushSubscription | null> {
    if (!this.isSupported) {
      throw new Error('Push notifications not supported');
    }

    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        this.subscription = existingSubscription;
        await this.saveSubscription(userId, existingSubscription);
        return existingSubscription;
      }

      // Create new subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      this.subscription = subscription;
      await this.saveSubscription(userId, subscription);
      
      console.log('Push subscription successful:', subscription);
      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      throw error;
    }
  }

  public async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      return false;
    }

    try {
      const result = await this.subscription.unsubscribe();
      if (result) {
        this.subscription = null;
        console.log('Push unsubscription successful');
      }
      return result;
    } catch (error) {
      console.error('Push unsubscription failed:', error);
      return false;
    }
  }

  private async saveSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    try {
      const subscriptionData = {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.getKey('p256dh') ? this.arrayBufferToBase64(subscription.getKey('p256dh')!) : null,
        auth_key: subscription.getKey('auth') ? this.arrayBufferToBase64(subscription.getKey('auth')!) : null,
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString()
      };

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionData),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }
    } catch (error) {
      console.error('Error saving push subscription:', error);
      throw error;
    }
  }

  public async sendNotification(
    userId: string | string[], 
    payload: NotificationPayload
  ): Promise<{ success: boolean; results: any[] }> {
    try {
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_ids: Array.isArray(userId) ? userId : [userId],
          payload: {
            ...payload,
            timestamp: payload.timestamp || Date.now()
          }
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to send notification');
      }

      return result;
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  public getNotificationTemplates(): { [key: string]: NotificationTemplate } {
    return {
      health_reminder: {
        type: 'health_reminder',
        title: '🩺 Health Check Reminder',
        body: 'Time for {dogName}\'s health log! Keep track of their wellbeing.',
        icon: '/woofadaar-logo.svg',
        url: '/health?reminder=true',
        actions: [
          { action: 'log_now', title: 'Log Now' },
          { action: 'remind_later', title: 'Remind Later' }
        ]
      },
      appointment_reminder: {
        type: 'appointment_reminder',
        title: '📅 Appointment Reminder',
        body: 'You have an upcoming appointment with {partnerName} at {time}.',
        icon: '/woofadaar-logo.svg',
        url: '/appointments',
        actions: [
          { action: 'view_details', title: 'View Details' },
          { action: 'reschedule', title: 'Reschedule' }
        ],
        urgent: true
      },
      community_response: {
        type: 'community_response',
        title: '💬 New Response',
        body: '{expertName} responded to your question: "{questionPreview}"',
        icon: '/woofadaar-logo.svg',
        url: '/community/question/{questionId}',
        actions: [
          { action: 'view_response', title: 'View Response' },
          { action: 'reply', title: 'Reply' }
        ]
      },
      ai_insight: {
        type: 'ai_insight',
        title: '🤖 AI Health Insight',
        body: 'New personalized health insights available for {dogName}!',
        icon: '/woofadaar-logo.svg',
        url: '/ai-insights',
        actions: [
          { action: 'view_insights', title: 'View Insights' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      },
      emergency_alert: {
        type: 'emergency_alert',
        title: '🚨 Emergency Alert',
        body: 'Urgent health alert detected for {dogName}. Please review immediately.',
        icon: '/woofadaar-logo.svg',
        url: '/health/emergency',
        urgent: true,
        requireInteraction: true,
        actions: [
          { action: 'view_alert', title: 'View Alert' },
          { action: 'contact_vet', title: 'Contact Vet' }
        ]
      },
      partner_message: {
        type: 'partner_message',
        title: '👨‍⚕️ Message from Expert',
        body: 'New message from {partnerName}: {messagePreview}',
        icon: '/woofadaar-logo.svg',
        url: '/messages/{partnerId}',
        actions: [
          { action: 'read_message', title: 'Read Message' },
          { action: 'reply', title: 'Reply' }
        ]
      },
      system_update: {
        type: 'system_update',
        title: '🔄 Woofadaar Update',
        body: 'New features available! Update now to get the latest improvements.',
        icon: '/woofadaar-logo.svg',
        url: '/',
        actions: [
          { action: 'update_now', title: 'Update Now' },
          { action: 'later', title: 'Later' }
        ]
      }
    };
  }

  public createNotificationFromTemplate(
    templateType: string,
    variables: { [key: string]: string }
  ): NotificationPayload {
    const templates = this.getNotificationTemplates();
    const template = templates[templateType];
    
    if (!template) {
      throw new Error(`Unknown notification template: ${templateType}`);
    }

    // Replace variables in title and body
    let title = template.title;
    let body = template.body;
    let url = template.url || '/';

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      title = title.replace(new RegExp(placeholder, 'g'), value);
      body = body.replace(new RegExp(placeholder, 'g'), value);
      url = url.replace(new RegExp(placeholder, 'g'), value);
    });

    return {
      title,
      body,
      icon: template.icon,
      url,
      actions: template.actions,
      urgent: template.urgent || false,
      requireInteraction: template.urgent || false,
      tag: templateType,
      timestamp: Date.now()
    };
  }

  public async scheduleNotification(
    userId: string,
    payload: NotificationPayload,
    scheduleTime: Date
  ): Promise<void> {
    try {
      const response = await fetch('/api/push/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          payload,
          scheduled_for: scheduleTime.toISOString()
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to schedule notification');
      }
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  public async getSubscriptionStatus(userId: string): Promise<{
    subscribed: boolean;
    subscription?: any;
    permission: NotificationPermission;
  }> {
    const permission = this.isSupported ? Notification.permission : 'denied';
    
    if (permission !== 'granted') {
      return { subscribed: false, permission };
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      return {
        subscribed: !!subscription,
        subscription: subscription ? {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.getKey('p256dh') ? this.arrayBufferToBase64(subscription.getKey('p256dh')!) : null,
            auth: subscription.getKey('auth') ? this.arrayBufferToBase64(subscription.getKey('auth')!) : null
          }
        } : undefined,
        permission
      };
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return { subscribed: false, permission };
    }
  }

  // Utility methods
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    let binary = '';
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Test notification method for development
  public async sendTestNotification(userId: string): Promise<void> {
    const testPayload: NotificationPayload = {
      title: '🧪 Test Notification',
      body: 'This is a test notification from Woofadaar PWA!',
      icon: '/woofadaar-logo.svg',
      url: '/',
      actions: [
        { action: 'open_app', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      tag: 'test_notification'
    };

    await this.sendNotification(userId, testPayload);
  }
}

export default PushNotificationService;