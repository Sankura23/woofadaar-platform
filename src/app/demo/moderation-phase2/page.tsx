'use client';

import { useState } from 'react';
import EnhancedModerationDashboard from '@/components/moderation/EnhancedModerationDashboard';

export default function ModerationPhase2Demo() {
  const [testContent, setTestContent] = useState('');
  const [contentType, setContentType] = useState<'question' | 'answer' | 'comment' | 'forum_post' | 'story'>('question');
  const [processingResult, setProcessingResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeDemo, setActiveDemo] = useState('dashboard');

  const sampleContents = {
    allowable: "My Golden Retriever puppy seems to be teething and is chewing everything. What are some safe, effective teething toys you'd recommend? I want to make sure he has appropriate outlets for his chewing behavior while protecting our furniture and his health.",
    flagged: "URGENT SALE! Buy now and get FREE dog food! Special discount offer expires today! Don't miss this amazing deal - click here to order immediately! Limited time offer for premium pet products at lowest prices ever!!!",
    blocked: "You idiots don't know anything about dogs. Anyone asking basic questions shouldn't own pets. These animals should be abandoned because their owners are too stupid to take proper care of them. Stop wasting everyone's time with your ignorant questions.",
    review: "Never vaccinate your dogs - vaccines are dangerous poison that will kill your pet. Instead, give them chocolate milk and onions for health. Human antibiotics work better than expensive vet treatments. Trust me, I've cured many dogs this way."
  };

  const handleTestProcessing = async (contentKey: string) => {
    const content = sampleContents[contentKey as keyof typeof sampleContents];
    setTestContent(content);
    await processContent(content);
  };

  const processContent = async (content: string) => {
    if (!content.trim()) return;

    setIsProcessing(true);
    setProcessingResult(null);

    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) {
        setProcessingResult({ error: 'Please log in to test automated moderation' });
        return;
      }

      const response = await fetch('/api/moderation/auto-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content,
          contentType,
          contentId: `demo-${Date.now()}`,
          action: 'process'
        })
      });

      const data = await response.json();
      setProcessingResult(data);

    } catch (error) {
      console.error('Processing error:', error);
      setProcessingResult({ error: 'Failed to process content' });
    } finally {
      setIsProcessing(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'allow': return 'text-green-600';
      case 'flag': return 'text-yellow-600';
      case 'review': return 'text-orange-600';
      case 'block': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'allow': return '✅';
      case 'flag': return '🏴';
      case 'review': return '👀';
      case 'block': return '🚫';
      default: return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🚀 Week 23 Phase 2: Automated Moderation & Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Advanced automated moderation with machine learning and comprehensive admin dashboard
          </p>
          <div className="mt-4 text-sm text-gray-500">
            Phase 2: Automated Spam Detection & Moderation Dashboard ✅
          </div>
        </div>

        {/* Demo Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow-sm p-1 inline-flex">
            <button
              onClick={() => setActiveDemo('dashboard')}
              className={`px-6 py-2 rounded-md transition-colors ${
                activeDemo === 'dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📊 Moderation Dashboard
            </button>
            <button
              onClick={() => setActiveDemo('automation')}
              className={`px-6 py-2 rounded-md transition-colors ${
                activeDemo === 'automation'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🤖 Automated Processing
            </button>
          </div>
        </div>

        {activeDemo === 'dashboard' && (
          <div className="space-y-8">
            {/* Phase 2 Features Overview */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">🎯 Phase 2 Features Implemented</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl mb-2">📊</div>
                  <h4 className="font-medium text-gray-900">Enhanced Dashboard</h4>
                  <p className="text-sm text-gray-600 mt-1">Real-time analytics and bulk actions</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl mb-2">🤖</div>
                  <h4 className="font-medium text-gray-900">Smart Automation</h4>
                  <p className="text-sm text-gray-600 mt-1">Context-aware auto-moderation</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl mb-2">📈</div>
                  <h4 className="font-medium text-gray-900">Learning System</h4>
                  <p className="text-sm text-gray-600 mt-1">Adaptive thresholds and feedback</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl mb-2">⚡</div>
                  <h4 className="font-medium text-gray-900">Queue Management</h4>
                  <p className="text-sm text-gray-600 mt-1">Priority routing and assignments</p>
                </div>
              </div>
            </div>

            {/* Enhanced Dashboard */}
            <EnhancedModerationDashboard />
          </div>
        )}

        {activeDemo === 'automation' && (
          <div className="space-y-8">
            {/* Automated Processing Test */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Input and Controls */}
              <div className="space-y-6">
                {/* Content Type Selection */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Content Type</h3>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="question">Question</option>
                    <option value="answer">Answer</option>
                    <option value="comment">Comment</option>
                    <option value="forum_post">Forum Post</option>
                    <option value="story">Story</option>
                  </select>
                </div>

                {/* Test Scenarios */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">🧪 Test Scenarios</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => handleTestProcessing('allowable')}
                      disabled={isProcessing}
                      className="px-4 py-3 bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors text-sm text-left disabled:opacity-50"
                    >
                      <div className="font-medium">✅ Allowable Content</div>
                      <div className="text-xs opacity-75">High-quality pet care question</div>
                    </button>
                    <button
                      onClick={() => handleTestProcessing('flagged')}
                      disabled={isProcessing}
                      className="px-4 py-3 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 transition-colors text-sm text-left disabled:opacity-50"
                    >
                      <div className="font-medium">🏴 Flagged Content</div>
                      <div className="text-xs opacity-75">Promotional spam content</div>
                    </button>
                    <button
                      onClick={() => handleTestProcessing('review')}
                      disabled={isProcessing}
                      className="px-4 py-3 bg-orange-100 text-orange-800 rounded-md hover:bg-orange-200 transition-colors text-sm text-left disabled:opacity-50"
                    >
                      <div className="font-medium">👀 Review Required</div>
                      <div className="text-xs opacity-75">Dangerous misinformation</div>
                    </button>
                    <button
                      onClick={() => handleTestProcessing('blocked')}
                      disabled={isProcessing}
                      className="px-4 py-3 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors text-sm text-left disabled:opacity-50"
                    >
                      <div className="font-medium">🚫 Blocked Content</div>
                      <div className="text-xs opacity-75">Toxic harassment content</div>
                    </button>
                  </div>
                </div>

                {/* Manual Input */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Manual Input</h3>
                  <textarea
                    value={testContent}
                    onChange={(e) => setTestContent(e.target.value)}
                    placeholder="Enter content to test automated moderation..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                  <button
                    onClick={() => processContent(testContent)}
                    disabled={isProcessing || !testContent.trim()}
                    className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <svg className="w-4 h-4 mr-2 animate-spin inline" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </>
                    ) : (
                      '🤖 Process with Auto-Moderation'
                    )}
                  </button>
                </div>

                {/* System Features */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">⚙️ Advanced Features</h3>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <span className="text-green-500 mr-2">✅</span>
                      <span>Context-aware user reputation scoring</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-green-500 mr-2">✅</span>
                      <span>Learning-based threshold adjustments</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-green-500 mr-2">✅</span>
                      <span>Automated queue priority assignment</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-green-500 mr-2">✅</span>
                      <span>Real-time bulk moderation actions</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-green-500 mr-2">✅</span>
                      <span>Multi-factor decision engine</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-green-500 mr-2">✅</span>
                      <span>Comprehensive analytics tracking</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Results */}
              <div className="space-y-6">
                {/* Processing Results */}
                {processingResult && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">🤖 Automated Decision</h3>
                    
                    {processingResult.error ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-red-700">{processingResult.error}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Decision Summary */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{getActionIcon(processingResult.data?.action)}</span>
                              <div>
                                <span className={`text-lg font-semibold ${getActionColor(processingResult.data?.action)}`}>
                                  {processingResult.data?.action?.toUpperCase()}
                                </span>
                                <div className="text-sm text-gray-600">{processingResult.data?.message}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold">
                                {Math.round((processingResult.data?.confidence || 0) * 100)}%
                              </div>
                              <div className="text-xs text-gray-500">confidence</div>
                            </div>
                          </div>
                        </div>

                        {/* Decision Reasons */}
                        {processingResult.data?.reasons && processingResult.data.reasons.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-800 mb-2">Decision Factors:</h4>
                            <ul className="space-y-1">
                              {processingResult.data.reasons.map((reason: string, index: number) => (
                                <li key={index} className="flex items-start text-sm">
                                  <span className="text-blue-500 mr-2">•</span>
                                  <span>{reason}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Auto Actions */}
                        {processingResult.data?.autoActions && processingResult.data.autoActions.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-800 mb-2">Automated Actions:</h4>
                            <div className="space-y-2">
                              {processingResult.data.autoActions.map((action: any, index: number) => (
                                <div key={index} className="flex items-center justify-between bg-blue-50 rounded p-2 text-sm">
                                  <span className="font-medium">{action.type}</span>
                                  <span className="text-gray-600">{action.reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Processing Stats */}
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                          <div className="text-center">
                            <div className="text-lg font-bold">{processingResult.data?.processingTime || 0}ms</div>
                            <div className="text-xs text-gray-500">processing time</div>
                          </div>
                          {processingResult.data?.queuePosition && (
                            <div className="text-center">
                              <div className="text-lg font-bold">#{processingResult.data.queuePosition}</div>
                              <div className="text-xs text-gray-500">queue position</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Algorithm Details */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">🧠 AI Decision Engine</h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">Multi-Factor Analysis:</h5>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>• Content analysis (spam, toxicity, quality)</div>
                        <div>• User reputation and trust level</div>
                        <div>• Historical violation patterns</div>
                        <div>• Context-aware threshold adjustments</div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">Learning Capabilities:</h5>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>• Adaptive threshold tuning based on feedback</div>
                        <div>• Pattern recognition for emerging threats</div>
                        <div>• Cultural context awareness (Indian pet care)</div>
                        <div>• Performance metrics tracking</div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">Automated Actions:</h5>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>• Content hiding/blocking</div>
                        <div>• User warnings and restrictions</div>
                        <div>• Queue prioritization</div>
                        <div>• Moderator notifications</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Next Phase Preview */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">🔮 Phase 3 Preview</h4>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <span className="text-blue-500 mr-2">🔄</span>
                      <span>Dynamic user reputation scoring system</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-blue-500 mr-2">⚙️</span>
                      <span>Custom moderation rules and auto-actions</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-blue-500 mr-2">🏆</span>
                      <span>Community feedback integration</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-blue-500 mr-2">📊</span>
                      <span>Advanced analytics and reporting dashboard</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}