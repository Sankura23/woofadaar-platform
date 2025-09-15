'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ExpertNotification {
  id: string;
  question_id: string;
  notification_type: 'new_question' | 'urgent_question' | 'follow_up';
  priority_score: number;
  is_read: boolean;
  created_at: string;
  response_deadline?: string;
  question: {
    id: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    user: {
      id: string;
      name: string;
    };
    dog?: {
      id: string;
      name: string;
      breed: string;
    };
  };
}

export default function ExpertNotificationPanel() {
  const [notifications, setNotifications] = useState<ExpertNotification[]>([]);
  const [stats, setStats] = useState({
    unread_count: 0,
    high_priority_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');

  useEffect(() => {
    fetchNotifications();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) return;

      const response = await fetch('/api/experts/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(data.data.notifications || []);
          setStats({
            unread_count: data.data.unread_count || 0,
            high_priority_count: data.data.high_priority_count || 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching expert notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) return;

      await fetch('/api/experts/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notificationId,
          action: 'mark_read'
        })
      });

      // Update local state
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, is_read: true }
          : notif
      ));
      
      setStats(prev => ({
        ...prev,
        unread_count: Math.max(0, prev.unread_count - 1)
      }));

    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons = {
      new_question: '💬',
      urgent_question: '🚨',
      follow_up: '🔄'
    };
    return icons[type as keyof typeof icons] || '📢';
  };

  const getPriorityColor = (score: number) => {
    if (score > 0.8) return 'border-red-500 bg-red-50';
    if (score > 0.6) return 'border-orange-500 bg-orange-50';
    if (score > 0.4) return 'border-yellow-500 bg-yellow-50';
    return 'border-gray-300 bg-white';
  };

  const getTimeUntilDeadline = (deadline?: string) => {
    if (!deadline) return null;
    
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffInMinutes = Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 0) return 'Overdue';
    if (diffInMinutes < 60) return `${diffInMinutes}m left`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h left`;
    return `${Math.floor(diffInMinutes / 1440)}d left`;
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.is_read;
    if (filter === 'urgent') return notif.priority_score > 0.7;
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Expert Notifications</h2>
          <div className="flex items-center space-x-2">
            {stats.unread_count > 0 && (
              <span className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                {stats.unread_count} unread
              </span>
            )}
            {stats.high_priority_count > 0 && (
              <span className="bg-orange-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                {stats.high_priority_count} urgent
              </span>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1">
          {['all', 'unread', 'urgent'].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === filterType
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              {filterType === 'unread' && stats.unread_count > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs px-1 rounded-full">
                  {stats.unread_count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-6xl mb-4">📬</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Notifications</h3>
            <p className="text-gray-600">
              {filter === 'all' ? 'No notifications at this time.' :
               filter === 'unread' ? 'All caught up! No unread notifications.' :
               'No urgent notifications requiring immediate attention.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`border-l-4 rounded-lg p-4 transition-all ${
                  getPriorityColor(notification.priority_score)
                } ${!notification.is_read ? 'ring-2 ring-blue-200' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {getNotificationIcon(notification.notification_type)}
                    </span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 capitalize">
                          {notification.notification_type.replace('_', ' ')}
                        </span>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        Priority: {Math.round(notification.priority_score * 100)}% • 
                        {formatDate(notification.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  {notification.response_deadline && (
                    <div className="text-right">
                      <div className="text-xs font-medium text-gray-700">Deadline</div>
                      <div className={`text-sm font-medium ${
                        getTimeUntilDeadline(notification.response_deadline) === 'Overdue'
                          ? 'text-red-600'
                          : 'text-orange-600'
                      }`}>
                        {getTimeUntilDeadline(notification.response_deadline)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <h3 className="font-medium text-gray-900 mb-1">
                    {notification.question.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {notification.question.content}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <span className="mr-1">👤</span>
                      {notification.question.user.name}
                    </span>
                    {notification.question.dog && (
                      <span className="flex items-center">
                        <span className="mr-1">🐕</span>
                        {notification.question.dog.name} ({notification.question.dog.breed})
                      </span>
                    )}
                    <span className="flex items-center">
                      <span className="mr-1">🏷️</span>
                      {notification.question.category}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        Mark Read
                      </button>
                    )}
                    <Link
                      href={`/community/questions/${notification.question.id}`}
                      className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                    >
                      Answer Question
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}