'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Heart, Activity, Droplets, Scale } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Dog {
  id: string;
  name: string;
  breed: string;
  age_months: number;
  photo_url?: string;
}

interface HealthMetric {
  entries: number;
  trend: string | null;
  latest: number | null;
  average: number | null;
  min?: number;
  max?: number;
}

interface AnalyticsData {
  dog_info: Dog;
  period: string;
  date_range: {
    start: string;
    end: string;
    period_name: string;
    days: number;
  };
  summary: {
    overview: {
      total_health_logs: number;
      total_medical_records: number;
      total_insights: number;
      logging_frequency: number;
      last_log_date: string | null;
    };
    health_metrics: {
      weight: HealthMetric;
      exercise: {
        entries: number;
        total_minutes: number;
        average_daily: number;
        most_common_type: string | null;
        consistency: number;
      };
      mood: {
        entries: number;
        average: number;
        distribution: {
          excellent: number;
          good: number;
          okay: number;
          poor: number;
          bad: number;
        };
        trend: string | null;
        stability: number;
      };
      food: {
        entries: number;
        average_amount: number;
        most_common_type: string | null;
        consistency: number;
      };
      water: {
        entries: number;
        average_daily: number;
        total: number;
      };
      symptoms: {
        total_reported: number;
        unique_symptoms: number;
        most_common: string | null;
        frequency: number;
      };
    };
    trends: {
      weight?: string;
      exercise?: string;
      mood?: string;
    };
    achievements: Array<{
      type: string;
      title: string;
      description: string;
      icon: string;
    }>;
    recommendations: Array<{
      priority: string;
      title: string;
      description: string;
      action: string;
    }>;
  };
}

const PERIODS = [
  { value: 'week', label: 'Last Week' },
  { value: 'month', label: 'Last Month' },
  { value: 'quarter', label: 'Last 3 Months' },
  { value: 'year', label: 'Last Year' },
  { value: 'all', label: 'All Time' }
];

export default function AnalyticsPage() {
  const router = useRouter();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserDogs();
  }, []);

  useEffect(() => {
    if (selectedDog) {
      fetchAnalytics(selectedDog.id, selectedPeriod);
    }
  }, [selectedDog, selectedPeriod]);

  const fetchUserDogs = async () => {
    try {
      const response = await fetch('/api/dogs');
      if (response.ok) {
        const data = await response.json();
        setDogs(data.data?.dogs || []);
        if (data.data?.dogs?.length > 0) {
          setSelectedDog(data.data.dogs[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching dogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async (dogId: string, period: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/health/summary/${dogId}/${period}`);
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string | null) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string | null) => {
    switch (trend) {
      case 'increasing':
        return 'text-green-600';
      case 'decreasing':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading && !analyticsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (dogs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Dogs Found</h3>
              <p className="text-gray-500 mb-6">
                Add your first dog to view health analytics.
              </p>
              <Button
                onClick={() => router.push('/profile')}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Add Your Dog
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Health Analytics</h1>
            <p className="text-gray-600">Insights and trends for your dog's health</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Dog Selection */}
          <div className="flex gap-2 overflow-x-auto">
            {dogs.map((dog) => (
              <button
                key={dog.id}
                onClick={() => setSelectedDog(dog)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  selectedDog?.id === dog.id
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {dog.photo_url && (
                  <img
                    src={dog.photo_url}
                    alt={dog.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                )}
                <span className="font-medium">{dog.name}</span>
              </button>
            ))}
          </div>

          {/* Period Selection */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {PERIODS.map((period) => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  selectedPeriod === period.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {analyticsData ? (
          <div className="space-y-6">
            {/* Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-orange-500" />
                  Overview - {analyticsData.dog_info.name}
                </CardTitle>
                <p className="text-sm text-gray-600">
                  {formatDate(analyticsData.date_range.start)} - {formatDate(analyticsData.date_range.end)} ({analyticsData.date_range.days} days)
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-500">
                      {analyticsData.summary.overview.total_health_logs}
                    </div>
                    <div className="text-sm text-gray-600">Health Logs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">
                      {analyticsData.summary.overview.total_medical_records}
                    </div>
                    <div className="text-sm text-gray-600">Medical Records</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {analyticsData.summary.overview.total_insights}
                    </div>
                    <div className="text-sm text-gray-600">Health Insights</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-500">
                      {analyticsData.summary.overview.logging_frequency.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">Logs/Day</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Health Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Weight */}
              {analyticsData.summary.health_metrics.weight.entries > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-2">
                        <Scale className="h-5 w-5 text-blue-500" />
                        Weight
                      </div>
                      {getTrendIcon(analyticsData.summary.trends.weight)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current</span>
                        <span className="font-medium">{analyticsData.summary.health_metrics.weight.latest} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Average</span>
                        <span className="font-medium">{analyticsData.summary.health_metrics.weight.average?.toFixed(1)} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Range</span>
                        <span className="font-medium">
                          {analyticsData.summary.health_metrics.weight.min} - {analyticsData.summary.health_metrics.weight.max} kg
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {analyticsData.summary.health_metrics.weight.entries} entries
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Exercise */}
              {analyticsData.summary.health_metrics.exercise.entries > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-green-500" />
                        Exercise
                      </div>
                      {getTrendIcon(analyticsData.summary.trends.exercise)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Daily Average</span>
                        <span className="font-medium">{analyticsData.summary.health_metrics.exercise.average_daily.toFixed(0)} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Time</span>
                        <span className="font-medium">{analyticsData.summary.health_metrics.exercise.total_minutes} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Favorite Type</span>
                        <span className="font-medium">{analyticsData.summary.health_metrics.exercise.most_common_type || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Consistency</span>
                        <span className="font-medium">{analyticsData.summary.health_metrics.exercise.consistency.toFixed(0)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Mood */}
              {analyticsData.summary.health_metrics.mood.entries > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-red-500" />
                        Mood
                      </div>
                      {getTrendIcon(analyticsData.summary.trends.mood)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Average Score</span>
                        <span className="font-medium">{analyticsData.summary.health_metrics.mood.average.toFixed(1)}/5</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Stability</span>
                        <span className="font-medium">{analyticsData.summary.health_metrics.mood.stability.toFixed(0)}%</span>
                      </div>
                      <div className="space-y-1 mt-3">
                        <div className="text-sm text-gray-600 mb-2">Mood Distribution:</div>
                        <div className="flex justify-between text-xs">
                          <span>😊 {analyticsData.summary.health_metrics.mood.distribution.excellent}</span>
                          <span>🙂 {analyticsData.summary.health_metrics.mood.distribution.good}</span>
                          <span>😐 {analyticsData.summary.health_metrics.mood.distribution.okay}</span>
                          <span>🙁 {analyticsData.summary.health_metrics.mood.distribution.poor}</span>
                          <span>😢 {analyticsData.summary.health_metrics.mood.distribution.bad}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Water */}
              {analyticsData.summary.health_metrics.water.entries > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Droplets className="h-5 w-5 text-blue-400" />
                      Water Intake
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Daily Average</span>
                        <span className="font-medium">{analyticsData.summary.health_metrics.water.average_daily.toFixed(0)} ml</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Period</span>
                        <span className="font-medium">{analyticsData.summary.health_metrics.water.total} ml</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {analyticsData.summary.health_metrics.water.entries} entries
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Achievements */}
            {analyticsData.summary.achievements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Achievements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analyticsData.summary.achievements.map((achievement, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div className="text-2xl">{achievement.icon}</div>
                        <div>
                          <div className="font-medium text-green-800">{achievement.title}</div>
                          <div className="text-sm text-green-600">{achievement.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {analyticsData.summary.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.summary.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className={`p-4 border rounded-lg ${getPriorityColor(rec.priority)}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{rec.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {rec.priority}
                          </Badge>
                        </div>
                        <p className="text-sm mb-2">{rec.description}</p>
                        <p className="text-xs font-medium">Action: {rec.action}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-500 mb-6">
                Start logging your dog's health data to see analytics and insights.
              </p>
              <Button
                onClick={() => router.push('/health/daily-log')}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Create First Log
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}