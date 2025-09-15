'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Bell, 
  BellOff, 
  CheckCircle, 
  AlertCircle, 
  Settings,
  Smartphone,
  Clock,
  MessageSquare,
  Heart,
  Calendar,
  Shield,
  Zap
} from 'lucide-react';
import PushNotificationService from '@/lib/push-notification-service';

interface NotificationPreferences {
  health_reminders: boolean;
  appointment_reminders: boolean;
  community_responses: boolean;
  ai_insights: boolean;
  emergency_alerts: boolean;
  partner_messages: boolean;
  system_updates: boolean;
  marketing_notifications: boolean;
}

interface SubscriptionStatus {
  subscribed: boolean;
  permission: NotificationPermission;
  subscription?: any;
}

const NotificationSettings: React.FC = () => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    permission: 'default'
  });
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    health_reminders: true,
    appointment_reminders: true,
    community_responses: true,
    ai_insights: true,
    emergency_alerts: true,
    partner_messages: true,
    system_updates: false,
    marketing_notifications: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<string | null>(null);

  const pushService = PushNotificationService.getInstance();

  // Check subscription status on component mount
  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const userId = 'user_1754717307657_9nc4safdq'; // In real app, get from auth context
      const status = await pushService.getSubscriptionStatus(userId);
      setSubscriptionStatus(status);
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const userId = 'user_1754717307657_9nc4safdq'; // In real app, get from auth context
      const subscription = await pushService.subscribe(userId);
      
      if (subscription) {
        setSubscriptionStatus({
          subscribed: true,
          permission: 'granted',
          subscription
        });
      }
    } catch (error: any) {
      console.error('Subscription failed:', error);
      alert(`Subscription failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      const success = await pushService.unsubscribe();
      
      if (success) {
        setSubscriptionStatus({
          subscribed: false,
          permission: 'granted'
        });
      }
    } catch (error: any) {
      console.error('Unsubscribe failed:', error);
      alert(`Unsubscribe failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setIsLoading(true);
    try {
      const userId = 'user_1754717307657_9nc4safdq'; // In real app, get from auth context
      await pushService.sendTestNotification(userId);
      setLastTestResult('Test notification sent successfully! Check your notifications.');
      
      // Clear the message after 5 seconds
      setTimeout(() => {
        setLastTestResult(null);
      }, 5000);
    } catch (error: any) {
      console.error('Test notification failed:', error);
      setLastTestResult(`Test failed: ${error.message}`);
      
      setTimeout(() => {
        setLastTestResult(null);
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
    
    // In a real app, you would save this to the backend
    console.log('Updating notification preference:', key, value);
  };

  const getPermissionIcon = () => {
    switch (subscriptionStatus.permission) {
      case 'granted': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'denied': return <BellOff className="h-4 w-4 text-red-600" />;
      default: return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getPermissionText = () => {
    switch (subscriptionStatus.permission) {
      case 'granted': return 'Notifications Enabled';
      case 'denied': return 'Notifications Blocked';
      default: return 'Permission Not Requested';
    }
  };

  const getPermissionColor = () => {
    switch (subscriptionStatus.permission) {
      case 'granted': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const notificationTypes = [
    {
      key: 'health_reminders' as keyof NotificationPreferences,
      title: 'Health Reminders',
      description: 'Get reminded to log your dog\'s health information',
      icon: <Heart className="h-5 w-5 text-red-500" />,
      critical: false
    },
    {
      key: 'appointment_reminders' as keyof NotificationPreferences,
      title: 'Appointment Reminders',
      description: 'Never miss a vet or training appointment',
      icon: <Calendar className="h-5 w-5 text-blue-500" />,
      critical: true
    },
    {
      key: 'community_responses' as keyof NotificationPreferences,
      title: 'Community Responses',
      description: 'Get notified when experts respond to your questions',
      icon: <MessageSquare className="h-5 w-5 text-purple-500" />,
      critical: false
    },
    {
      key: 'ai_insights' as keyof NotificationPreferences,
      title: 'AI Health Insights',
      description: 'Receive personalized AI-powered health recommendations',
      icon: <Zap className="h-5 w-5 text-yellow-500" />,
      critical: false
    },
    {
      key: 'emergency_alerts' as keyof NotificationPreferences,
      title: 'Emergency Alerts',
      description: 'Critical health alerts that require immediate attention',
      icon: <Shield className="h-5 w-5 text-red-600" />,
      critical: true
    },
    {
      key: 'partner_messages' as keyof NotificationPreferences,
      title: 'Expert Messages',
      description: 'Messages from vets, trainers, and other professionals',
      icon: <MessageSquare className="h-5 w-5 text-green-500" />,
      critical: false
    },
    {
      key: 'system_updates' as keyof NotificationPreferences,
      title: 'App Updates',
      description: 'Notifications about new features and improvements',
      icon: <Settings className="h-5 w-5 text-gray-500" />,
      critical: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notification Settings</h2>
          <p className="text-gray-600 mt-1">Manage your push notification preferences</p>
        </div>
        <Badge className={getPermissionColor()}>
          <div className="flex items-center space-x-1">
            {getPermissionIcon()}
            <span>{getPermissionText()}</span>
          </div>
        </Badge>
      </div>

      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>Push Notification Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {subscriptionStatus.subscribed ? (
                  <Bell className="h-6 w-6 text-green-600" />
                ) : (
                  <BellOff className="h-6 w-6 text-gray-400" />
                )}
                <div>
                  <h3 className="font-medium">
                    {subscriptionStatus.subscribed ? 'Subscribed' : 'Not Subscribed'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {subscriptionStatus.subscribed 
                      ? 'You will receive push notifications'
                      : 'Enable notifications to stay updated'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {!subscriptionStatus.subscribed ? (
                  <Button
                    onClick={handleSubscribe}
                    disabled={isLoading || subscriptionStatus.permission === 'denied'}
                  >
                    {isLoading ? 'Subscribing...' : 'Enable Notifications'}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestNotification}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Sending...' : 'Test'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleUnsubscribe}
                      disabled={isLoading}
                    >
                      Unsubscribe
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Test notification result */}
            {lastTestResult && (
              <div className={`p-3 rounded-lg text-sm ${
                lastTestResult.includes('failed') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                {lastTestResult}
              </div>
            )}

            {/* Permission blocked message */}
            {subscriptionStatus.permission === 'denied' && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <h4 className="font-medium text-yellow-800">Notifications Blocked</h4>
                </div>
                <p className="text-sm text-yellow-700 mt-2">
                  Notifications are blocked in your browser settings. To enable them:
                </p>
                <ol className="list-decimal list-inside text-sm text-yellow-700 mt-2 space-y-1">
                  <li>Click the lock icon in your browser's address bar</li>
                  <li>Select "Allow" for notifications</li>
                  <li>Reload the page and try again</li>
                </ol>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <p className="text-sm text-gray-600">
            Choose which types of notifications you want to receive
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notificationTypes.map((type) => (
              <div key={type.key} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {type.icon}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{type.title}</h4>
                      {type.critical && (
                        <Badge variant="secondary" className="text-xs">
                          Important
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </div>
                </div>
                
                <Switch
                  checked={preferences[type.key]}
                  onCheckedChange={(checked) => updatePreference(type.key, checked)}
                  disabled={!subscriptionStatus.subscribed || (type.critical && type.key === 'emergency_alerts')}
                />
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Emergency alerts cannot be disabled as they are critical for your dog's health and safety.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Notification Schedule</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Quiet Hours</h4>
                <p className="text-sm text-gray-600">
                  Don't send non-urgent notifications during these hours
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From
                </label>
                <input
                  type="time"
                  defaultValue="22:00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Until
                </label>
                <input
                  type="time"
                  defaultValue="08:00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;