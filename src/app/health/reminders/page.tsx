'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bell, Plus, Clock, CheckCircle, XCircle, Pause, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Dog {
  id: string;
  name: string;
  breed: string;
  photo_url?: string;
}

interface Reminder {
  id: string;
  title: string;
  description?: string;
  reminder_type: string;
  frequency: string;
  next_reminder: string;
  last_reminded?: string;
  is_active: boolean;
  snooze_until?: string;
  medication_name?: string;
  dosage?: string;
  dog: Dog;
}

interface ActiveReminders {
  overdue: Reminder[];
  today: Reminder[];
  upcoming: Reminder[];
  summary: {
    total_active: number;
    overdue_count: number;
    today_count: number;
    upcoming_count: number;
    by_type: { [key: string]: number };
  };
}

const REMINDER_TYPE_COLORS: { [key: string]: string } = {
  medication: 'bg-red-100 text-red-800',
  vaccination: 'bg-blue-100 text-blue-800',
  vet_visit: 'bg-green-100 text-green-800',
  grooming: 'bg-purple-100 text-purple-800',
  exercise: 'bg-orange-100 text-orange-800',
  feeding: 'bg-yellow-100 text-yellow-800',
  training: 'bg-indigo-100 text-indigo-800'
};

export default function RemindersPage() {
  const router = useRouter();
  const [activeReminders, setActiveReminders] = useState<ActiveReminders | null>(null);
  const [allReminders, setAllReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'all'>('active');

  useEffect(() => {
    fetchActiveReminders();
    fetchAllReminders();
  }, []);

  const fetchActiveReminders = async () => {
    try {
      const response = await fetch('/api/health/reminders/active');
      if (response.ok) {
        const data = await response.json();
        setActiveReminders(data.data);
      }
    } catch (error) {
      console.error('Error fetching active reminders:', error);
    }
  };

  const fetchAllReminders = async () => {
    try {
      const response = await fetch('/api/health/reminders?limit=50');
      if (response.ok) {
        const data = await response.json();
        setAllReminders(data.data?.reminders || []);
      }
    } catch (error) {
      console.error('Error fetching all reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReminderAction = async (reminderId: string, action: string, snoozeMinutes?: number) => {
    try {
      const response = await fetch('/api/health/reminders/active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reminder_id: reminderId,
          action,
          snooze_minutes: snoozeMinutes
        })
      });

      if (response.ok) {
        // Refresh data
        fetchActiveReminders();
        fetchAllReminders();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update reminder');
      }
    } catch (error) {
      console.error('Error updating reminder:', error);
      alert('Failed to update reminder');
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();

    if (isToday) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const isOverdue = (reminderDate: string) => {
    return new Date(reminderDate) < new Date();
  };

  const ReminderCard = ({ reminder, showActions = true }: { reminder: Reminder; showActions?: boolean }) => (
    <Card className={`${isOverdue(reminder.next_reminder) && reminder.is_active ? 'border-red-200 bg-red-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {reminder.dog.photo_url && (
              <img
                src={reminder.dog.photo_url}
                alt={reminder.dog.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
            <div>
              <h3 className="font-medium text-gray-900">{reminder.title}</h3>
              <p className="text-sm text-gray-600">{reminder.dog.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={REMINDER_TYPE_COLORS[reminder.reminder_type] || 'bg-gray-100 text-gray-800'}>
              {reminder.reminder_type}
            </Badge>
            {!reminder.is_active && (
              <Badge variant="outline">Inactive</Badge>
            )}
            {reminder.snooze_until && new Date(reminder.snooze_until) > new Date() && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                Snoozed
              </Badge>
            )}
          </div>
        </div>

        {reminder.description && (
          <p className="text-sm text-gray-600 mb-3">{reminder.description}</p>
        )}

        {reminder.medication_name && (
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-900">Medication: {reminder.medication_name}</p>
            {reminder.dosage && (
              <p className="text-sm text-gray-600">Dosage: {reminder.dosage}</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className={`${isOverdue(reminder.next_reminder) && reminder.is_active ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
              {formatDateTime(reminder.next_reminder)}
            </span>
            {isOverdue(reminder.next_reminder) && reminder.is_active && (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
          </div>

          {showActions && reminder.is_active && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReminderAction(reminder.id, 'snooze', 30)}
                className="text-xs"
              >
                <Pause className="h-3 w-3 mr-1" />
                Snooze
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReminderAction(reminder.id, 'complete')}
                className="text-xs text-green-600 hover:text-green-700"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Done
              </Button>
            </div>
          )}
        </div>

        <div className="mt-3 text-xs text-gray-500">
          <span>Frequency: {reminder.frequency}</span>
          {reminder.last_reminded && (
            <span className="ml-3">
              Last: {new Date(reminder.last_reminded).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reminders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Health Reminders</h1>
              <p className="text-gray-600">Manage your dog's health reminders and schedules</p>
            </div>
          </div>
          <Button
            onClick={() => router.push('/health/reminders/create')}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Reminder
          </Button>
        </div>

        {/* Summary Stats */}
        {activeReminders && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-500">{activeReminders.summary.overdue_count}</div>
                <div className="text-sm text-gray-600">Overdue</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-500">{activeReminders.summary.today_count}</div>
                <div className="text-sm text-gray-600">Today</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-500">{activeReminders.summary.upcoming_count}</div>
                <div className="text-sm text-gray-600">Upcoming</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-500">{activeReminders.summary.total_active}</div>
                <div className="text-sm text-gray-600">Total Active</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'active'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Active Reminders
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Reminders
          </button>
        </div>

        {/* Content */}
        {activeTab === 'active' && activeReminders ? (
          <div className="space-y-6">
            {/* Overdue Reminders */}
            {activeReminders.overdue.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Overdue Reminders
                </h2>
                <div className="space-y-3">
                  {activeReminders.overdue.map((reminder) => (
                    <ReminderCard key={reminder.id} reminder={reminder} />
                  ))}
                </div>
              </div>
            )}

            {/* Today's Reminders */}
            {activeReminders.today.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-orange-600 mb-3 flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Today's Reminders
                </h2>
                <div className="space-y-3">
                  {activeReminders.today.map((reminder) => (
                    <ReminderCard key={reminder.id} reminder={reminder} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Reminders */}
            {activeReminders.upcoming.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-blue-600 mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Upcoming Reminders
                </h2>
                <div className="space-y-3">
                  {activeReminders.upcoming.map((reminder) => (
                    <ReminderCard key={reminder.id} reminder={reminder} />
                  ))}
                </div>
              </div>
            )}

            {/* No Active Reminders */}
            {activeReminders.summary.total_active === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Reminders</h3>
                  <p className="text-gray-500 mb-6">
                    Create your first health reminder to stay on top of your dog's care.
                  </p>
                  <Button
                    onClick={() => router.push('/health/reminders/create')}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    Create First Reminder
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* All Reminders */
          <div className="space-y-3">
            {allReminders.length > 0 ? (
              allReminders.map((reminder) => (
                <ReminderCard key={reminder.id} reminder={reminder} showActions={reminder.is_active} />
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Reminders Found</h3>
                  <p className="text-gray-500 mb-6">
                    Create your first health reminder to get started.
                  </p>
                  <Button
                    onClick={() => router.push('/health/reminders/create')}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    Create First Reminder
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}