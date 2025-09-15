'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Bell, AlertCircle, CheckCircle, X } from 'lucide-react';

interface ReminderFormData {
  title: string;
  description: string;
  reminder_type: 'vaccination' | 'medication' | 'vet_visit' | 'grooming' | 'exercise' | 'other';
  due_date: string;
  due_time: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: 'low' | 'medium' | 'high';
  dog_id: string;
}

const REMINDER_TYPES = [
  { value: 'vaccination', label: 'Vaccination', icon: '💉' },
  { value: 'medication', label: 'Medication', icon: '💊' },
  { value: 'vet_visit', label: 'Vet Visit', icon: '🏥' },
  { value: 'grooming', label: 'Grooming', icon: '✂️' },
  { value: 'exercise', label: 'Exercise', icon: '🏃' },
  { value: 'other', label: 'Other', icon: '📝' }
];

const FREQUENCIES = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-green-600 bg-green-100' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-100' },
  { value: 'high', label: 'High', color: 'text-red-600 bg-red-100' }
];

export default function CreateReminderPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ReminderFormData>({
    title: '',
    description: '',
    reminder_type: 'other',
    due_date: '',
    due_time: '',
    frequency: 'once',
    priority: 'medium',
    dog_id: ''
  });
  const [dogs, setDogs] = useState<Array<{id: string, name: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUserDogs();
  }, []);

  const fetchUserDogs = async () => {
    try {
      const response = await fetch('/api/dogs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const dogsData = data.data?.dogs || [];
        setDogs(dogsData.map((dog: any) => ({ id: dog.id, name: dog.name })));
        
        // Auto-select first dog if only one exists
        if (dogsData.length === 1) {
          setFormData(prev => ({ ...prev, dog_id: dogsData[0].id }));
        }
      }
    } catch (error) {
      console.error('Error fetching dogs:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Transform form data to match API expectations
      const apiData = {
        dog_id: formData.dog_id,
        reminder_type: formData.reminder_type,
        title: formData.title,
        description: formData.description,
        frequency: formData.frequency === 'once' ? 'one_time' : formData.frequency,
        start_date: formData.due_date,
        reminder_time: formData.due_time || null
      };

      const response = await fetch('/api/health/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        body: JSON.stringify(apiData)
      });

      if (response.ok) {
        setSuccess('Reminder created successfully!');
        setTimeout(() => {
          router.push('/health/reminders');
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create reminder');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Create Health Reminder</h1>
              <p className="text-gray-600">Set up a new health reminder for your dog</p>
            </div>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-[#3bbca8]" />
                Reminder Details
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Dog *
                  </label>
                  <select
                    name="dog_id"
                    required
                    value={formData.dog_id}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                  >
                    <option value="">Choose a dog...</option>
                    {dogs.map(dog => (
                      <option key={dog.id} value={dog.id}>
                        {dog.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reminder Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                    placeholder="e.g., Annual vaccination due"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reminder Type *
                  </label>
                  <select
                    name="reminder_type"
                    required
                    value={formData.reminder_type}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                  >
                    {REMINDER_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                  placeholder="Additional details about this reminder..."
                />
              </div>
            </div>

            {/* Schedule */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-[#3bbca8]" />
                Schedule
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    required
                    value={formData.due_date}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Time
                  </label>
                  <input
                    type="time"
                    name="due_time"
                    value={formData.due_time}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency *
                  </label>
                  <select
                    name="frequency"
                    required
                    value={formData.frequency}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                  >
                    {FREQUENCIES.map(freq => (
                      <option key={freq.value} value={freq.value}>
                        {freq.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Priority */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-[#3bbca8]" />
                Priority
              </h3>
              
              <div className="flex gap-3">
                {PRIORITIES.map(priority => (
                  <label
                    key={priority.value}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
                      formData.priority === priority.value
                        ? 'border-[#3bbca8] bg-[#3bbca8]/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={priority.value}
                      checked={formData.priority === priority.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${priority.color}`}>
                      {priority.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Error and Success Messages */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                <CheckCircle className="w-5 h-5" />
                {success}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full sm:w-auto px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 bg-[#3bbca8] text-white rounded-lg hover:bg-[#3bbca8]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Create Reminder'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 