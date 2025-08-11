'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Activity, 
  Heart, 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  Plus,
  Pill,
  Stethoscope,
  Camera,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import HealthInsights from './HealthInsights';

interface HealthDashboardProps {
  dogId: string;
}

interface HealthOverview {
  dog: {
    id: string;
    name: string;
    breed: string;
    age_months: number;
    weight_kg: number;
  };
  recentLogs: any[];
  activeMedications: any[];
  upcomingAppointments: any[];
  recentInsights: any[];
  trends: any;
  summary: {
    totalLogs: number;
    activeMedicationsCount: number;
    upcomingAppointmentsCount: number;
    unreadInsights: number;
  };
}

export default function HealthDashboard({ dogId }: HealthDashboardProps) {
  const [healthData, setHealthData] = useState<HealthOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const router = useRouter();

  useEffect(() => {
    fetchHealthData();
  }, [dogId, selectedPeriod]);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('woofadaar_token');
      
      const response = await fetch(`/api/health/${dogId}?days=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHealthData(data.data);
      }
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthScore = () => {
    if (!healthData?.trends) return 0;
    
    const { mood, exercise, appetite } = healthData.trends;
    let score = 50; // Base score
    
    if (mood.average >= 4) score += 15;
    else if (mood.average >= 3) score += 5;
    else if (mood.average < 2) score -= 15;
    
    if (exercise.average >= 30) score += 15;
    else if (exercise.average >= 15) score += 5;
    else if (exercise.average < 10) score -= 10;
    
    if (appetite.average >= 4) score += 10;
    else if (appetite.average < 2) score -= 10;
    
    return Math.min(100, Math.max(0, score));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Health Data</h3>
        <p className="text-gray-600 mb-4">Start tracking your dog's health journey</p>
        <Link 
          href={`/health/${dogId}/log`}
          className="inline-flex items-center px-4 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Health Log
        </Link>
      </div>
    );
  }

  const healthScore = getHealthScore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{healthData.dog.name}'s Health</h1>
            <p className="text-gray-600">{healthData.dog.breed} • {Math.floor(healthData.dog.age_months / 12)} years old</p>
          </div>
          <div className="flex items-center space-x-2">
            <select 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
            </select>
          </div>
        </div>

        {/* Health Score */}
        <div className="bg-gradient-to-r from-[#3bbca8] to-[#2daa96] rounded-lg p-4 text-white mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Health Score</h3>
              <p className="text-sm opacity-90">Based on recent activity</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{healthScore}</div>
              <div className="text-sm">
                {healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Needs Attention'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Health Logs</p>
              <p className="text-2xl font-bold text-gray-900">{healthData.summary.totalLogs}</p>
            </div>
            <Activity className="w-8 h-8 text-[#3bbca8]" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Medications</p>
              <p className="text-2xl font-bold text-gray-900">{healthData.summary.activeMedicationsCount}</p>
            </div>
            <Pill className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Upcoming Visits</p>
              <p className="text-2xl font-bold text-gray-900">{healthData.summary.upcomingAppointmentsCount}</p>
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Health Insights</p>
              <p className="text-2xl font-bold text-gray-900">{healthData.summary.unreadInsights}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link 
          href={`/health/${dogId}/log`}
          className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border-l-4 border-[#3bbca8] group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Plus className="w-6 h-6 text-[#3bbca8]" />
              <div>
                <h3 className="font-semibold text-gray-900">Log Today's Health</h3>
                <p className="text-sm text-gray-600">Quick daily health tracking</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#3bbca8] transition-colors" />
          </div>
        </Link>

        <Link 
          href={`/health/${dogId}/medications`}
          className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border-l-4 border-blue-500 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Pill className="w-6 h-6 text-blue-500" />
              <div>
                <h3 className="font-semibold text-gray-900">Manage Medications</h3>
                <p className="text-sm text-gray-600">Add reminders and track doses</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>
        </Link>

        <Link 
          href={`/health/${dogId}/appointments`}
          className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border-l-4 border-purple-500 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Stethoscope className="w-6 h-6 text-purple-500" />
              <div>
                <h3 className="font-semibold text-gray-900">Book Vet Visit</h3>
                <p className="text-sm text-gray-600">Schedule appointments</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
          </div>
        </Link>
      </div>

      {/* Health Trends */}
      {healthData.trends && (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Health Trends</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl mb-2">😊</div>
              <div className="text-sm text-gray-600 mb-1">Average Mood</div>
              <div className="text-xl font-semibold text-gray-900">
                {healthData.trends.mood.average}/5
              </div>
              <div className="text-xs text-gray-500">
                {healthData.trends.mood.dataPoints} entries
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl mb-2">🏃</div>
              <div className="text-sm text-gray-600 mb-1">Daily Exercise</div>
              <div className="text-xl font-semibold text-gray-900">
                {healthData.trends.exercise.average} min
              </div>
              <div className="text-xs text-gray-500">
                {healthData.trends.exercise.dataPoints} entries
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl mb-2">🍖</div>
              <div className="text-sm text-gray-600 mb-1">Appetite Level</div>
              <div className="text-xl font-semibold text-gray-900">
                {healthData.trends.appetite.average}/5
              </div>
              <div className="text-xs text-gray-500">
                {healthData.trends.appetite.dataPoints} entries
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Health Insights */}
      {healthData.recentInsights.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Health Insights</h3>
            <Link 
              href={`/health/${dogId}/insights`}
              className="text-[#3bbca8] hover:text-[#2daa96] text-sm font-medium"
            >
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {healthData.recentInsights.slice(0, 3).map((insight) => (
              <div key={insight.id} className={`p-3 rounded-lg border-l-4 ${
                insight.severity === 'critical' ? 'bg-red-50 border-red-500' :
                insight.severity === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                'bg-blue-50 border-blue-500'
              }`}>
                <div className="flex items-start space-x-3">
                  <AlertCircle className={`w-5 h-5 mt-0.5 ${
                    insight.severity === 'critical' ? 'text-red-500' :
                    insight.severity === 'warning' ? 'text-yellow-500' :
                    'text-blue-500'
                  }`} />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{insight.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Health Insights */}
      <HealthInsights dogId={dogId} autoRefresh={true} />

      {/* Recent Activity */}
      {healthData.recentLogs.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Health Logs</h3>
            <Link 
              href={`/health/${dogId}/logs`}
              className="text-[#3bbca8] hover:text-[#2daa96] text-sm font-medium"
            >
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {healthData.recentLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#3bbca8] rounded-full"></div>
                  <div>
                    <div className="font-medium text-gray-900">{formatDate(log.log_date)}</div>
                    <div className="text-sm text-gray-600">
                      {log.notes ? log.notes.substring(0, 50) + '...' : 'Daily health log'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  {log.weight_kg && <span>⚖️ {log.weight_kg}kg</span>}
                  {log.exercise_duration && <span>🏃 {log.exercise_duration}min</span>}
                  {log.mood_rating && <span>😊 {log.mood_rating}/5</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}