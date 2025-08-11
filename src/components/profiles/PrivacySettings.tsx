'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Bell, BellOff, Shield, Users, Save, CheckCircle } from 'lucide-react';

interface PrivacySettingsProps {
  onClose?: () => void;
}

interface NotificationPrefs {
  email_notifications: boolean;
  push_notifications: boolean;
  community_updates: boolean;
  health_reminders: boolean;
  partner_requests: boolean;
}

export default function PrivacySettings({ onClose }: PrivacySettingsProps) {
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'private'>('public');
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({
    email_notifications: true,
    push_notifications: true,
    community_updates: true,
    health_reminders: true,
    partner_requests: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPrivacySettings();
  }, []);

  const fetchPrivacySettings = async () => {
    try {
      const response = await fetch('/api/users/profile/privacy', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfileVisibility(data.settings.profile_visibility);
        setNotificationPrefs(data.settings.notification_prefs || {
          email_notifications: true,
          push_notifications: true,
          community_updates: true,
          health_reminders: true,
          partner_requests: true
        });
      } else {
        setError('Failed to load privacy settings');
      }
    } catch (error) {
      setError('Network error loading privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/users/profile/privacy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        body: JSON.stringify({
          profile_visibility: profileVisibility,
          notification_prefs: notificationPrefs
        })
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to save privacy settings');
      }
    } catch (error) {
      setError('Network error saving privacy settings');
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationToggle = (key: keyof NotificationPrefs) => {
    setNotificationPrefs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Privacy Settings</h2>
          <p className="text-gray-600">Manage your profile visibility and notifications</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Profile Visibility */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-primary" />
          Profile Visibility
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="radio"
              id="public"
              name="visibility"
              value="public"
              checked={profileVisibility === 'public'}
              onChange={(e) => setProfileVisibility(e.target.value as 'public' | 'private')}
              className="mr-3"
            />
            <label htmlFor="public" className="flex items-center cursor-pointer">
              <Users className="w-5 h-5 mr-3 text-green-600" />
              <div>
                <div className="font-medium text-gray-900">Public Profile</div>
                <div className="text-sm text-gray-600">
                  Your profile and dog information can be viewed by other community members
                </div>
              </div>
            </label>
          </div>

          <div className="flex items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="radio"
              id="private"
              name="visibility"
              value="private"
              checked={profileVisibility === 'private'}
              onChange={(e) => setProfileVisibility(e.target.value as 'public' | 'private')}
              className="mr-3"
            />
            <label htmlFor="private" className="flex items-center cursor-pointer">
              <EyeOff className="w-5 h-5 mr-3 text-gray-600" />
              <div>
                <div className="font-medium text-gray-900">Private Profile</div>
                <div className="text-sm text-gray-600">
                  Only you and approved partners can view your profile information
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Bell className="w-5 h-5 mr-2 text-primary" />
          Notification Preferences
        </h3>
        
        <div className="space-y-4">
          {Object.entries(notificationPrefs).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium text-gray-900">
                  {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </div>
                <div className="text-sm text-gray-600">
                  {key === 'email_notifications' && 'Receive notifications via email'}
                  {key === 'push_notifications' && 'Receive push notifications'}
                  {key === 'community_updates' && 'Get updates about community activities'}
                  {key === 'health_reminders' && 'Receive health and vaccination reminders'}
                  {key === 'partner_requests' && 'Get notified about partner requests'}
                </div>
              </div>
              <button
                onClick={() => handleNotificationToggle(key as keyof NotificationPrefs)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors min-h-[44px] min-w-[44px] p-2 ${
                  value ? 'bg-primary' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    value ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center px-6 py-3 rounded-lg font-semibold transition-colors min-h-[44px] ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-primary text-white hover:bg-opacity-90'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </button>
      </div>

      {/* Privacy Tips */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Privacy Tips</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Public profiles help you connect with other dog parents</li>
          <li>• Private profiles are recommended for sensitive information</li>
          <li>• You can change these settings anytime</li>
          <li>• Partners can still access your Dog IDs for verification</li>
        </ul>
      </div>
    </div>
  );
} 