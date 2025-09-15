'use client';

import { useState } from 'react';
import Link from 'next/link';

interface HealthLog {
  id: string;
  date: string;
  type: string;
  notes: string;
  mood_score?: number;
  activity_level?: string;
  symptoms?: string[];
}

interface MobileHealthCardProps {
  dogId: string;
  dogName: string;
  recentLogs: HealthLog[];
  isPremium?: boolean;
}

export default function MobileHealthCard({ 
  dogId, 
  dogName, 
  recentLogs, 
  isPremium = false 
}: MobileHealthCardProps) {
  const [showQuickLog, setShowQuickLog] = useState(false);

  const getHealthScore = () => {
    if (!recentLogs?.length) return { score: 85, status: 'Good' };
    
    const avgMood = recentLogs
      .filter(log => log.mood_score)
      .reduce((sum, log) => sum + (log.mood_score || 0), 0) / recentLogs.length;
    
    if (avgMood >= 4) return { score: 95, status: 'Excellent' };
    if (avgMood >= 3) return { score: 80, status: 'Good' };
    return { score: 65, status: 'Needs Attention' };
  };

  const healthScore = getHealthScore();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-lg font-semibold">
              {dogName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{dogName}'s Health</h3>
            <p className="text-sm text-gray-500">Last updated today</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center space-x-1">
            <div 
              className={`w-3 h-3 rounded-full ${
                healthScore.score >= 90 ? 'bg-green-500' :
                healthScore.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm font-medium text-gray-700">
              {healthScore.status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Score: {healthScore.score}/100
          </p>
        </div>
      </div>

      {/* Health Score Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Overall Health</span>
          <span className="font-medium">{healthScore.score}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              healthScore.score >= 90 ? 'bg-green-500' :
              healthScore.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${healthScore.score}%` }}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h4>
        <div className="space-y-2">
          {recentLogs.slice(0, 2).map((log) => (
            <div key={log.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  log.type === 'feeding' ? 'bg-orange-100 text-orange-600' :
                  log.type === 'exercise' ? 'bg-blue-100 text-blue-600' :
                  log.type === 'medication' ? 'bg-red-100 text-red-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {log.type === 'feeding' ? '🍽️' :
                   log.type === 'exercise' ? '🏃' :
                   log.type === 'medication' ? '💊' : '📝'}
                </div>
                <div>
                  <p className="text-sm font-medium capitalize">{log.type}</p>
                  <p className="text-xs text-gray-500">{log.date}</p>
                </div>
              </div>
              {log.mood_score && (
                <div className="text-right">
                  <div className="flex">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span 
                        key={i}
                        className={`text-xs ${i < log.mood_score! ? 'text-yellow-400' : 'text-gray-300'}`}
                      >
                        ⭐
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setShowQuickLog(!showQuickLog)}
          className="flex-1 bg-blue-50 text-blue-600 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
        >
          Quick Log
        </button>
        <Link 
          href={`/health/${dogId}`}
          className="flex-1 bg-gray-50 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors text-center"
        >
          View Details
        </Link>
        {isPremium && (
          <Link 
            href={`/premium/health-insights?dog_id=${dogId}`}
            className="flex-1 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-600 py-2 px-3 rounded-lg text-sm font-medium hover:from-purple-100 hover:to-pink-100 transition-all text-center"
          >
            AI Insights
          </Link>
        )}
      </div>

      {/* Quick Log Form */}
      {showQuickLog && (
        <div className="border-t pt-4 mt-4">
          <QuickLogForm 
            dogId={dogId}
            onComplete={() => setShowQuickLog(false)}
          />
        </div>
      )}

      {/* Premium Features Teaser */}
      {!isPremium && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">⭐</span>
              <div>
                <p className="text-sm font-medium text-purple-700">Premium Health Insights</p>
                <p className="text-xs text-purple-600">AI analysis, trends & predictions</p>
              </div>
            </div>
            <Link 
              href="/premium"
              className="bg-purple-600 text-white text-xs px-3 py-1 rounded-md font-medium hover:bg-purple-700 transition-colors"
            >
              Upgrade
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickLogForm({ dogId, onComplete }: { dogId: string; onComplete: () => void }) {
  const [logType, setLogType] = useState('general');
  const [notes, setNotes] = useState('');
  const [moodScore, setMoodScore] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!notes.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch('/api/health/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dog_id: dogId,
          log_type: logType,
          notes: notes,
          mood_score: moodScore,
          date: new Date().toISOString().split('T')[0]
        })
      });

      if (response.ok) {
        setNotes('');
        setMoodScore(3);
        onComplete();
        
        // Show success feedback
        const button = document.querySelector('.quick-log-submit');
        if (button) {
          button.textContent = 'Saved! ✓';
          setTimeout(() => {
            button.textContent = 'Log Entry';
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error saving health log:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex space-x-2">
        {[
          { value: 'general', label: '📝 General', color: 'gray' },
          { value: 'feeding', label: '🍽️ Feeding', color: 'orange' },
          { value: 'exercise', label: '🏃 Exercise', color: 'blue' },
          { value: 'medication', label: '💊 Medicine', color: 'red' }
        ].map((type) => (
          <button
            key={type.value}
            onClick={() => setLogType(type.value)}
            className={`flex-1 text-xs py-2 px-2 rounded-lg transition-colors ${
              logType === type.value 
                ? `bg-${type.color}-100 text-${type.color}-700 border-${type.color}-200 border`
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="How is your dog doing today?"
        className="w-full p-3 border border-gray-200 rounded-lg resize-none text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        rows={2}
      />

      <div>
        <label className="block text-xs text-gray-600 mb-1">Mood Score</label>
        <div className="flex items-center justify-between">
          <div className="flex space-x-1">
            {Array.from({ length: 5 }, (_, i) => (
              <button
                key={i}
                onClick={() => setMoodScore(i + 1)}
                className={`text-lg ${i < moodScore ? 'text-yellow-400' : 'text-gray-300'}`}
              >
                ⭐
              </button>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !notes.trim()}
            className="quick-log-submit bg-blue-600 text-white px-4 py-1 rounded-md text-sm font-medium disabled:bg-gray-300 hover:bg-blue-700 transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Log Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}