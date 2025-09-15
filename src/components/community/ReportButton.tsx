'use client';

import { useState } from 'react';

interface ReportButtonProps {
  contentId: string;
  contentType: 'forum_post' | 'comment' | 'question' | 'answer';
  className?: string;
  size?: 'sm' | 'md';
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or unwanted commercial content' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'inappropriate', label: 'Inappropriate or offensive content' },
  { value: 'misinformation', label: 'False or misleading information' },
  { value: 'off_topic', label: 'Off-topic or not relevant' },
  { value: 'duplicate', label: 'Duplicate content' },
  { value: 'copyright', label: 'Copyright violation' },
  { value: 'other', label: 'Other (please describe)' }
];

export default function ReportButton({
  contentId,
  contentType,
  className = '',
  size = 'sm'
}: ReportButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitReport = async () => {
    if (!selectedReason) return;

    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/community/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contentId,
          contentType,
          reason: selectedReason,
          description: description.trim() || null
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSubmitted(true);
        setTimeout(() => {
          setShowModal(false);
          setSubmitted(false);
          setSelectedReason('');
          setDescription('');
        }, 2000);
      } else {
        alert('Failed to submit report. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const buttonSize = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5';

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center ${buttonSize} text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors ${className}`}
        title="Report inappropriate content"
      >
        <span className="mr-1">🚩</span>
        Report
      </button>

      {/* Report Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            {submitted ? (
              <div className="text-center">
                <div className="text-4xl mb-4">✅</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Report Submitted</h3>
                <p className="text-gray-600">Thank you for helping keep our community safe. We'll review this content shortly.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Report Content</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Help us understand what's wrong with this content. Your report is anonymous.
                </p>

                {/* Reason Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What's the issue? *
                  </label>
                  <div className="space-y-2">
                    {REPORT_REASONS.map((reason) => (
                      <label key={reason.value} className="flex items-start">
                        <input
                          type="radio"
                          name="reason"
                          value={reason.value}
                          checked={selectedReason === reason.value}
                          onChange={(e) => setSelectedReason(e.target.value)}
                          className="mt-0.5 mr-3"
                        />
                        <span className="text-sm text-gray-700">{reason.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Additional Description */}
                {(selectedReason === 'other' || selectedReason) && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional details {selectedReason === 'other' ? '*' : '(optional)'}
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Please provide more context about this issue..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      rows={3}
                      maxLength={500}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {description.length}/500 characters
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitReport}
                    disabled={!selectedReason || (selectedReason === 'other' && !description.trim()) || submitting}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}