'use client';

import { useState } from 'react';
import ContentAnalysis from '@/components/moderation/ContentAnalysis';
import ReportButton from '@/components/moderation/ReportButton';

export default function ModerationDemo() {
  const [testContent, setTestContent] = useState('');
  const [contentType, setContentType] = useState<'question' | 'answer' | 'comment' | 'forum_post' | 'story'>('question');
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const sampleContents = {
    spam: "BUY NOW!!! AMAZING DISCOUNT!!! CLICK HERE FOR FREE MONEY!!! GUARANTEED RESULTS!!! Don't miss this LIMITED TIME OFFER!!! Call 9999999999 NOW!!!",
    quality: "My 6-month-old Golden Retriever puppy has been experiencing some digestive issues. He occasionally vomits after meals and seems less energetic than usual. I've been feeding him premium puppy food, but I'm concerned about his symptoms. Has anyone else experienced similar issues with their Golden Retriever puppies? What should I look for when choosing the right food for sensitive stomachs?",
    toxic: "You're such an idiot for asking this question. Anyone who doesn't know this basic information shouldn't own a dog. You should abandon your pet because you're clearly too stupid to take care of it properly.",
    medical: "Never vaccinate your dog! Vaccines are poison and will kill your pet. Instead, give your dog chocolate and onions - they're actually healthy despite what vets say. Human medicine works fine for dogs too.",
    short: "help dog sick"
  };

  const handleSampleLoad = (type: string) => {
    setTestContent(sampleContents[type as keyof typeof sampleContents]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🛡️ Week 23: Content Moderation & AI Demo
          </h1>
          <p className="text-lg text-gray-600">
            Test our advanced AI-powered content analysis and reporting system
          </p>
          <div className="mt-4 text-sm text-gray-500">
            Phase 1: Enhanced Content Analysis & Reporting System ✅
          </div>
        </div>

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

            {/* Sample Content Buttons */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Load Sample Content</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => handleSampleLoad('quality')}
                  className="px-4 py-2 bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors text-sm"
                >
                  ✅ High Quality
                </button>
                <button
                  onClick={() => handleSampleLoad('spam')}
                  className="px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors text-sm"
                >
                  🚫 Spam Content
                </button>
                <button
                  onClick={() => handleSampleLoad('toxic')}
                  className="px-4 py-2 bg-orange-100 text-orange-800 rounded-md hover:bg-orange-200 transition-colors text-sm"
                >
                  ⚠️ Toxic Content
                </button>
                <button
                  onClick={() => handleSampleLoad('medical')}
                  className="px-4 py-2 bg-purple-100 text-purple-800 rounded-md hover:bg-purple-200 transition-colors text-sm"
                >
                  🏥 Medical Misinformation
                </button>
                <button
                  onClick={() => handleSampleLoad('short')}
                  className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 transition-colors text-sm"
                >
                  📝 Low Quality
                </button>
                <button
                  onClick={() => setTestContent('')}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors text-sm"
                >
                  🗑️ Clear
                </button>
              </div>
            </div>

            {/* Content Input */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Test Content</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    {testContent.length} characters
                  </span>
                  <ReportButton
                    contentType={contentType}
                    contentId="demo-content-123"
                    variant="button"
                    size="sm"
                  />
                </div>
              </div>
              <textarea
                value={testContent}
                onChange={(e) => setTestContent(e.target.value)}
                placeholder="Enter content to analyze... The AI will evaluate spam likelihood, content quality, toxicity, and provide recommendations."
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
              <div className="mt-2 text-xs text-gray-500">
                Analysis runs automatically as you type (after 1 second delay)
              </div>
            </div>

            {/* Features Implemented */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">🚀 Phase 1 Features</h3>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span>Advanced spam detection with Indian context</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span>Content quality analysis & readability scoring</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span>Toxicity detection with pet care focus</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span>Comprehensive reporting system</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span>Real-time content analysis API</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span>Database schema for moderation tracking</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Analysis Results */}
          <div className="space-y-6">
            {/* Content Analysis */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">🤖 AI Analysis Results</h3>
              <ContentAnalysis
                content={testContent}
                contentType={contentType}
                contentId="demo-content-123"
                showRecommendations={true}
                onAnalysisComplete={setAnalysisResult}
              />
            </div>

            {/* Technical Details */}
            {analysisResult && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">🔧 Technical Implementation</h4>
                <div className="space-y-4">
                  {/* Algorithm Details */}
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Detection Algorithms:</h5>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>• Pattern-based spam detection (no external AI APIs)</div>
                      <div>• Heuristic quality assessment</div>
                      <div>• Rule-based toxicity classification</div>
                      <div>• Statistical content analysis</div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Performance:</h5>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>• Processing time: {analysisResult.processingTime}ms</div>
                      <div>• Analysis confidence: {Math.round((analysisResult.spam?.confidence || 0) * 100)}%</div>
                      <div>• Memory efficient: Pure JavaScript/TypeScript</div>
                      <div>• Real-time capable: Sub-second analysis</div>
                    </div>
                  </div>

                  {/* Recommendation System */}
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">AI Recommendation:</h5>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      analysisResult.recommendation === 'approve' ? 'bg-green-100 text-green-800' :
                      analysisResult.recommendation === 'flag' ? 'bg-yellow-100 text-yellow-800' :
                      analysisResult.recommendation === 'review' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {analysisResult.recommendation?.toUpperCase() || 'ANALYZING'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Based on multi-factor analysis of spam, quality, and safety
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Next Phases Preview */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">🔮 Coming Next</h4>
              <div className="space-y-3">
                <div>
                  <h5 className="font-medium text-gray-800">Phase 2: Automated Moderation Dashboard</h5>
                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                    <div>• Enhanced moderation queue with priority sorting</div>
                    <div>• Bulk moderation actions and workflow automation</div>
                    <div>• Advanced spam detection with learning capabilities</div>
                    <div>• Moderator analytics and performance tracking</div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h5 className="font-medium text-gray-800">Phase 3: User Reputation & Advanced Rules</h5>
                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                    <div>• Dynamic user reputation scoring system</div>
                    <div>• Custom moderation rules and auto-actions</div>
                    <div>• Community feedback integration</div>
                    <div>• Advanced analytics and reporting</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}