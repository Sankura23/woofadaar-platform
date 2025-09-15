'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FeedbackOpportunity {
  contentId: string;
  contentType: string;
  contentPreview: string;
  originalAction: string;
  confidence: number;
  moderatedAt: Date;
  pointsAvailable: number;
  priority: 'low' | 'medium' | 'high';
}

interface UserStats {
  reputation: number;
  trustLevel: string;
  totalVotes: number;
  accuracy: number;
}

interface FeedbackSubmission {
  wasAccurate: boolean;
  severity: 'too_lenient' | 'accurate' | 'too_strict';
  categories: string[];
  explanation?: string;
  alternativeAction?: string;
}

const FEEDBACK_CATEGORIES = {
  spam: { label: 'Spam/Commercial', icon: '🛍️' },
  harassment: { label: 'Harassment/Abuse', icon: '😡' },
  misinformation: { label: 'Misinformation', icon: '❌' },
  inappropriate: { label: 'Inappropriate Content', icon: '🚫' },
  low_quality: { label: 'Low Quality', icon: '📉' },
  off_topic: { label: 'Off Topic', icon: '🎯' },
  false_positive: { label: 'False Positive', icon: '✅' },
  cultural_context: { label: 'Cultural Context Issue', icon: '🌏' },
  language_barrier: { label: 'Language/Translation', icon: '🗣️' },
  technical_error: { label: 'Technical Error', icon: '⚠️' }
};

const ACTION_OPTIONS = [
  { value: 'allow', label: 'Allow', icon: '✅', color: 'green' },
  { value: 'flag', label: 'Flag', icon: '🏁', color: 'yellow' },
  { value: 'review', label: 'Review', icon: '👀', color: 'orange' },
  { value: 'block', label: 'Block', icon: '🚫', color: 'red' }
];

export default function CommunityFeedback() {
  const [opportunities, setOpportunities] = useState<FeedbackOpportunity[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentItem, setCurrentItem] = useState<FeedbackOpportunity | null>(null);
  const [feedback, setFeedback] = useState<FeedbackSubmission>({
    wasAccurate: true,
    severity: 'accurate',
    categories: [],
    explanation: '',
    alternativeAction: undefined
  });
  const [submitting, setSubmitting] = useState(false);
  const [totalPointsEarned, setTotalPointsEarned] = useState(0);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [activeView, setActiveView] = useState<'opportunities' | 'stats' | 'leaderboard'>('opportunities');

  useEffect(() => {
    fetchFeedbackData();
  }, []);

  const fetchFeedbackData = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/moderation/community-feedback?action=opportunities&limit=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setOpportunities(data.data.opportunities);
        setUserStats(data.data.userStats);
      }
    } catch (error) {
      console.error('Error fetching feedback data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startFeedback = (opportunity: FeedbackOpportunity) => {
    setCurrentItem(opportunity);
    setFeedback({
      wasAccurate: true,
      severity: 'accurate',
      categories: [],
      explanation: '',
      alternativeAction: undefined
    });
  };

  const submitFeedback = async () => {
    if (!currentItem) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) {
        alert('Please log in to submit feedback');
        return;
      }

      const response = await fetch('/api/moderation/community-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'submit_feedback',
          contentId: currentItem.contentId,
          contentType: currentItem.contentType,
          feedback
        })
      });

      const data = await response.json();
      if (data.success) {
        // Remove the item from opportunities
        setOpportunities(prev => prev.filter(op => op.contentId !== currentItem.contentId));
        
        // Add points earned
        if (data.data?.pointsEarned) {
          setTotalPointsEarned(prev => prev + data.data.pointsEarned);
        }

        // Show success message
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);

        // Close feedback form
        setCurrentItem(null);
      } else {
        alert(data.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Error submitting feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCategory = (category: string) => {
    setFeedback(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'allow': return 'text-green-600 bg-green-100';
      case 'flag': return 'text-yellow-600 bg-yellow-100';
      case 'review': return 'text-orange-600 bg-orange-100';
      case 'block': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-orange-500 bg-orange-50';
      case 'low': return 'border-l-green-500 bg-green-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center">
          <svg className="w-6 h-6 text-blue-600 animate-spin mr-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading community feedback...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Success Message */}
      <AnimatePresence>
        {showSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg"
          >
            🎉 Thank you for your feedback! Points earned: +{totalPointsEarned}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              🏛️ Community Moderation Feedback
            </h3>
            <p className="text-gray-600 mt-1">
              Help improve our AI by reviewing moderation decisions
            </p>
          </div>

          {userStats && (
            <div className="flex items-center space-x-6 text-sm">
              <div className="text-center">
                <div className="font-bold text-lg">{userStats.reputation}</div>
                <div className="text-gray-500">Reputation</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{userStats.totalVotes}</div>
                <div className="text-gray-500">Total Votes</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-green-600">{Math.round(userStats.accuracy * 100)}%</div>
                <div className="text-gray-500">Accuracy</div>
              </div>
              <div className="text-center">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  userStats.trustLevel === 'expert' ? 'bg-purple-100 text-purple-800' :
                  userStats.trustLevel === 'trusted' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {userStats.trustLevel}
                </div>
                <div className="text-gray-500 mt-1">Trust Level</div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-6 mt-4">
          {[
            { id: 'opportunities', label: 'Vote on Content', icon: '🗳️' },
            { id: 'stats', label: 'Community Stats', icon: '📊' },
            { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`flex items-center space-x-2 pb-2 border-b-2 transition-colors ${
                activeView === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {activeView === 'opportunities' && (
          <div>
            {opportunities.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  All caught up!
                </h3>
                <p className="text-gray-600">
                  No feedback opportunities available right now. Check back later!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Available Feedback Opportunities ({opportunities.length})
                  </h4>
                  <p className="text-sm text-gray-600">
                    Review recent moderation decisions and help improve our AI system
                  </p>
                </div>

                {opportunities.map((opportunity) => (
                  <motion.div
                    key={opportunity.contentId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`border-l-4 rounded-lg p-6 ${getPriorityColor(opportunity.priority)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getActionColor(opportunity.originalAction)}`}>
                            {opportunity.originalAction.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">
                            {opportunity.contentType} • {Math.round(opportunity.confidence * 100)}% confidence
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            opportunity.priority === 'high' ? 'bg-red-100 text-red-800' :
                            opportunity.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {opportunity.priority} priority
                          </span>
                        </div>

                        <div className="bg-white rounded-lg p-4 mb-4">
                          <h5 className="font-medium text-gray-900 mb-2">Content Preview:</h5>
                          <p className="text-gray-700 text-sm leading-relaxed">
                            "{opportunity.contentPreview}"
                          </p>
                        </div>

                        <div className="flex items-center text-xs text-gray-500 space-x-4">
                          <span>Moderated: {new Date(opportunity.moderatedAt).toLocaleDateString()}</span>
                          <span>Points available: +{opportunity.pointsAvailable}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => startFeedback(opportunity)}
                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        📝 Provide Feedback
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'stats' && (
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-6">Community Statistics</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-blue-600">85%</div>
                <div className="text-sm text-gray-600 mt-1">Community Accuracy</div>
              </div>
              <div className="bg-green-50 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-green-600">1,247</div>
                <div className="text-sm text-gray-600 mt-1">Votes This Month</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-purple-600">156</div>
                <div className="text-sm text-gray-600 mt-1">Active Contributors</div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'leaderboard' && (
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-6">Top Contributors</h4>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((rank) => (
                <div key={rank} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      rank <= 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {rank}
                    </div>
                    <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                    <div>
                      <div className="font-medium">Anonymous User {rank}</div>
                      <div className="text-sm text-gray-500">Expert • 342 votes</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">94%</div>
                    <div className="text-xs text-gray-500">accuracy</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      <AnimatePresence>
        {currentItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setCurrentItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    📝 Provide Feedback
                  </h3>
                  <button
                    onClick={() => setCurrentItem(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                {/* Content Preview */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getActionColor(currentItem.originalAction)}`}>
                      AI Decision: {currentItem.originalAction.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">
                      {Math.round(currentItem.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm">
                    "{currentItem.contentPreview}"
                  </p>
                </div>

                {/* Accuracy Assessment */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Was the AI decision accurate?
                  </h4>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="accuracy"
                        checked={feedback.wasAccurate === true}
                        onChange={() => setFeedback(prev => ({ ...prev, wasAccurate: true }))}
                        className="text-green-600 border-gray-300 focus:ring-green-500"
                      />
                      <span className="ml-2 text-green-600">✅ Yes, accurate</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="accuracy"
                        checked={feedback.wasAccurate === false}
                        onChange={() => setFeedback(prev => ({ ...prev, wasAccurate: false }))}
                        className="text-red-600 border-gray-300 focus:ring-red-500"
                      />
                      <span className="ml-2 text-red-600">❌ No, inaccurate</span>
                    </label>
                  </div>
                </div>

                {/* Severity */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">
                    How would you rate the decision?
                  </h4>
                  <select
                    value={feedback.severity}
                    onChange={(e) => setFeedback(prev => ({ ...prev, severity: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="too_lenient">Too Lenient (Should be stricter)</option>
                    <option value="accurate">Accurate (Just right)</option>
                    <option value="too_strict">Too Strict (Should be more lenient)</option>
                  </select>
                </div>

                {/* Categories */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">
                    What categories apply? (Select all that apply)
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(FEEDBACK_CATEGORIES).map(([key, category]) => (
                      <label key={key} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={feedback.categories.includes(key)}
                          onChange={() => toggleCategory(key)}
                          className="text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-3 flex items-center">
                          <span className="mr-2">{category.icon}</span>
                          <span className="text-sm">{category.label}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Alternative Action */}
                {!feedback.wasAccurate && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">
                      What action should have been taken?
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {ACTION_OPTIONS.map((action) => (
                        <label key={action.value} className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          feedback.alternativeAction === action.value
                            ? `border-${action.color}-500 bg-${action.color}-50`
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}>
                          <input
                            type="radio"
                            name="alternativeAction"
                            value={action.value}
                            checked={feedback.alternativeAction === action.value}
                            onChange={(e) => setFeedback(prev => ({ ...prev, alternativeAction: e.target.value }))}
                            className="sr-only"
                          />
                          <span className="mr-2">{action.icon}</span>
                          <span className="font-medium">{action.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Explanation */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Additional explanation (optional)
                  </h4>
                  <textarea
                    value={feedback.explanation}
                    onChange={(e) => setFeedback(prev => ({ ...prev, explanation: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Provide context or reasoning for your feedback..."
                  />
                </div>

                {/* Submit */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    You'll earn <span className="font-medium text-green-600">+{currentItem.pointsAvailable} points</span> for this feedback
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setCurrentItem(null)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitFeedback}
                      disabled={submitting || feedback.categories.length === 0}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Submitting...' : '✅ Submit Feedback'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}