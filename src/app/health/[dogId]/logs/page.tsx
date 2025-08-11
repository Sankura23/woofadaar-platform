'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, TrendingUp, Filter, Download, Eye, Plus } from 'lucide-react';
import Link from 'next/link';

interface HealthLog {
  id: string;
  log_date: string;
  food_amount?: number;
  food_type?: string;
  water_intake?: number;
  exercise_duration?: number;
  exercise_type?: string;
  mood_score?: number;
  bathroom_frequency?: number;
  weight_kg?: number;
  temperature_celsius?: number;
  notes?: string;
  symptoms: string[];
  energy_level?: number;
  appetite_level?: number;
  created_at: string;
}

interface Dog {
  id: string;
  name: string;
  breed: string;
  photo_url?: string;
}

export default function HealthLogsPage({ params }: { params: { dogId: string } }) {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [dog, setDog] = useState<Dog | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedType, setSelectedType] = useState('all');
  const router = useRouter();

  const dogId = params.dogId;

  useEffect(() => {
    if (dogId) {
      fetchDogAndLogs();
    }
  }, [dogId, selectedPeriod, selectedType]);

  const fetchDogAndLogs = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      
      // Fetch dog details
      const dogResponse = await fetch(`/api/dogs/${dogId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (dogResponse.ok) {
        const dogData = await dogResponse.json();
        setDog(dogData.dog);
      }

      // Fetch health logs
      const params = new URLSearchParams({
        limit: '50',
        offset: '0'
      });

      if (selectedType !== 'all') {
        params.append('type', selectedType);
      }

      const logsResponse = await fetch(`/api/health/logs/${dogId}?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setLogs(logsData.data?.logs || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getMoodEmoji = (score?: number) => {
    if (!score) return '😐';
    if (score >= 4) return '😊';
    if (score >= 3) return '🙂';
    if (score >= 2) return '😐';
    return '😔';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-milk-white via-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3bbca8] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading health logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-milk-white via-gray-50 to-gray-100 px-4 py-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Link 
            href={`/health/${dogId}`}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {dog?.name}'s Health Logs
            </h1>
            <p className="text-gray-600">View and track health history</p>
          </div>
          <Link
            href={`/health/${dogId}/log`}
            className="flex items-center px-4 py-2 bg-[#3bbca8] text-white rounded-lg hover:bg-[#2daa96] transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
              >
                <option value="all">All entries</option>
                <option value="weight">Weight only</option>
                <option value="exercise">Exercise only</option>
                <option value="mood">Mood only</option>
                <option value="symptoms">With symptoms</option>
              </select>
            </div>
          </div>
        </div>

        {/* Health Logs */}
        <div className="space-y-4">
          {logs.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center shadow-sm">
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Health Logs</h3>
              <p className="text-gray-500 mb-6">
                No health entries have been recorded for {dog?.name} yet.
              </p>
              <Link
                href={`/health/${dogId}/log`}
                className="inline-flex items-center px-6 py-3 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Entry
              </Link>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {formatDate(log.log_date)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Logged {formatDate(log.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {log.mood_score && (
                      <div className="flex items-center">
                        <span className="text-2xl mr-1">{getMoodEmoji(log.mood_score)}</span>
                        <span className="text-sm text-gray-600">Mood</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {log.weight_kg && (
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600 mb-1">Weight</p>
                      <p className="font-semibold text-blue-800">{log.weight_kg} kg</p>
                    </div>
                  )}
                  
                  {log.exercise_duration && (
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600 mb-1">Exercise</p>
                      <p className="font-semibold text-green-800">{log.exercise_duration} min</p>
                      {log.exercise_type && (
                        <p className="text-xs text-green-600">{log.exercise_type}</p>
                      )}
                    </div>
                  )}

                  {log.energy_level && (
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-600 mb-1">Energy</p>
                      <p className="font-semibold text-yellow-800">{log.energy_level}/5</p>
                    </div>
                  )}

                  {log.appetite_level && (
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <p className="text-sm text-orange-600 mb-1">Appetite</p>
                      <p className="font-semibold text-orange-800">{log.appetite_level}/5</p>
                    </div>
                  )}
                </div>

                {log.symptoms && log.symptoms.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Symptoms:</p>
                    <div className="flex flex-wrap gap-2">
                      {log.symptoms.map((symptom, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-red-100 text-red-800 text-sm rounded-full"
                        >
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {log.notes && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Notes:</p>
                    <p className="text-gray-800">{log.notes}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}