import React from 'react';
import NotificationSettings from '@/components/settings/NotificationSettings';

export default function NotificationSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NotificationSettings />
      </div>
    </div>
  );
}