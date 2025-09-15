'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface Dog {
  id: string;
  name: string;
  breed: string;
}

interface HealthPrediction {
  id: string;
  type: string;
  condition?: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  recommendations: string[];
  created_at: string;
}

interface AIRecommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action_url?: string;
  expires_at: string;
}

interface AnalysisStatus {
  last_analysis?: string;
  days_since_last_analysis?: number;
  analysis_recommended: boolean;
  health_logs_available: boolean;
}

export default function AIHealthAnalytics() {
  const { t } = useTranslation();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDog, setSelectedDog] = useState<string>('');
  const [predictions, setPredictions] = useState<HealthPrediction[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDogs();
  }, []);

  useEffect(() => {
    if (selectedDog) {
      fetchAnalysisStatus();
    }
  }, [selectedDog]);

  const fetchDogs = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch('/api/dogs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDogs(data.dogs || []);
        if (data.dogs?.length > 0 && !selectedDog) {
          setSelectedDog(data.dogs[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching dogs:', error);
    }
  };

  const fetchAnalysisStatus = async () => {
    if (!selectedDog) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch(`/api/ai/analyze-health-patterns?dog_id=${selectedDog}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysisStatus(data.data.analysis_status);
        setPredictions(data.data.recent_predictions || []);
        setRecommendations(data.data.active_recommendations || []);
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch analysis status');
      }
    } catch (error) {
      console.error('Error fetching analysis status:', error);
      setError('Failed to connect to analysis service');
    } finally {
      setLoading(false);
    }
  };

  const runHealthAnalysis = async () => {
    if (!selectedDog) return;

    setAnalyzing(true);
    setError('');

    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch('/api/ai/analyze-health-patterns', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dog_id: selectedDog,
          analysis_period_days: 30
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPredictions(data.data.predictions || []);
        setRecommendations(data.data.recommendations || []);
        setError('');
        
        // Show success message
        alert(t('AI health analysis completed successfully!'));
        
        // Refresh status
        fetchAnalysisStatus();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to run health analysis');
      }
    } catch (error) {
      console.error('Error running health analysis:', error);
      setError('Failed to run health analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const dismissRecommendation = async (recommendationId: string) => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch('/api/ai/recommendations', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recommendation_id: recommendationId,
          action: 'dismiss'
        })
      });

      if (response.ok) {
        setRecommendations(prev => prev.filter(r => r.id !== recommendationId));
      }
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (dogs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('No Dogs Found')}
          </h3>
          <p className="text-gray-600 mb-4">
            {t('Add a dog profile to start using AI health analytics')}
          </p>
          <a
            href="/profile/dogs"
            className="bg-[#3bbca8] text-white px-6 py-2 rounded-md hover:bg-[#339990] transition-colors"
          >
            {t('Add Dog Profile')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              🤖 {t('AI Health Analytics')}
            </h2>
            <p className="text-gray-600 mt-1">
              {t('AI-powered health insights and predictions for your dog')}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedDog}
              onChange={(e) => setSelectedDog(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
            >
              {dogs.map(dog => (
                <option key={dog.id} value={dog.id}>
                  {dog.name} ({dog.breed})
                </option>
              ))}
            </select>
            
            <button
              onClick={runHealthAnalysis}
              disabled={analyzing || !analysisStatus?.health_logs_available}
              className="bg-[#3bbca8] text-white px-6 py-2 rounded-md hover:bg-[#339990] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {analyzing ? t('Analyzing...') : t('Run Analysis')}
            </button>
          </div>
        </div>

        {/* Analysis Status */}
        {analysisStatus && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">{t('Last Analysis')}:</span>
                <p className="text-gray-900">
                  {analysisStatus.last_analysis 
                    ? new Date(analysisStatus.last_analysis).toLocaleDateString()
                    : t('Never')
                  }
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">{t('Days Since')}:</span>
                <p className="text-gray-900">
                  {analysisStatus.days_since_last_analysis || t('N/A')}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">{t('Status')}:</span>
                <p className={analysisStatus.analysis_recommended ? 'text-orange-600' : 'text-green-600'}>
                  {analysisStatus.analysis_recommended ? t('Analysis Recommended') : t('Up to Date')}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">{t('Data Available')}:</span>
                <p className={analysisStatus.health_logs_available ? 'text-green-600' : 'text-red-600'}>
                  {analysisStatus.health_logs_available ? t('Sufficient') : t('Need More Logs')}
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-4">
            {error}
          </div>
        )}
      </div>

      {/* Health Predictions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          📊 {t('Health Predictions')}
        </h3>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3bbca8] mx-auto"></div>
            <p className="mt-2 text-gray-600">{t('Loading predictions...')}</p>
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">
              {t('No predictions available. Run an analysis to get AI-powered health insights.')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {predictions.map(prediction => (
              <div key={prediction.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {prediction.condition || prediction.type.replace('_', ' ')}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {t('Confidence')}: {Math.round(prediction.confidence * 100)}%
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRiskLevelColor(prediction.risk_level)}`}>
                    {prediction.risk_level.toUpperCase()}
                  </span>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">{t('Recommendations')}:</h5>
                  <ul className="list-disc list-inside space-y-1">
                    {prediction.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-gray-700">{rec}</li>
                    ))}
                  </ul>
                </div>
                
                <p className="text-xs text-gray-500 mt-3">
                  {t('Generated on')}: {new Date(prediction.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Recommendations */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          💡 {t('AI Recommendations')}
        </h3>
        
        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">
              {t('No active recommendations. Run an analysis to get personalized suggestions.')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map(recommendation => (
              <div key={recommendation.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900">{recommendation.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(recommendation.priority)}`}>
                        {recommendation.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{recommendation.description}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {recommendation.action_url && (
                      <a
                        href={recommendation.action_url}
                        className="bg-[#3bbca8] text-white px-3 py-1 rounded text-sm hover:bg-[#339990] transition-colors"
                      >
                        {t('Take Action')}
                      </a>
                    )}
                    <button
                      onClick={() => dismissRecommendation(recommendation.id)}
                      className="text-gray-400 hover:text-gray-600"
                      title={t('Dismiss')}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                <p className="text-xs text-gray-500">
                  {t('Expires on')}: {new Date(recommendation.expires_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-medium text-blue-900 mb-2">
          ℹ️ {t('How AI Health Analytics Works')}
        </h4>
        <div className="text-sm text-blue-800 space-y-2">
          <p>• {t('Analyzes your dog\'s health logs, behavior patterns, and breed-specific data')}</p>
          <p>• {t('Uses advanced AI to identify potential health risks and trends')}</p>
          <p>• {t('Provides personalized recommendations based on your dog\'s unique profile')}</p>
          <p>• {t('Updates predictions as you log more health data over time')}</p>
        </div>
        
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>{t('Note')}:</strong> {t('AI predictions are for informational purposes only. Always consult with a qualified veterinarian for medical advice.')}
          </p>
        </div>
      </div>
    </div>
  );
}