'use client';

import { useState } from 'react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: string;
  contentId: string;
}

const REPORT_CATEGORIES = [
  {
    id: 'spam',
    label: 'Spam or Promotional Content',
    description: 'Unwanted promotional content, repetitive posts, or commercial spam',
    icon: '🚫'
  },
  {
    id: 'inappropriate',
    label: 'Inappropriate Content',
    description: 'Content that violates community guidelines or is not suitable for the platform',
    icon: '⚠️'
  },
  {
    id: 'harassment',
    label: 'Harassment or Bullying',
    description: 'Personal attacks, threats, or harassment of other users',
    icon: '🛡️'
  },
  {
    id: 'misinformation',
    label: 'Misinformation',
    description: 'False or misleading information about pet care, health, or safety',
    icon: '❌'
  },
  {
    id: 'fake',
    label: 'Fake or Misleading',
    description: 'False claims, impersonation, or intentionally misleading content',
    icon: '🎭'
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Other policy violations or concerns not covered above',
    icon: '📝'
  }
];

const COMMON_REASONS = {
  spam: [
    'Promotional/commercial content',
    'Repeated posting of same content',
    'Irrelevant links or advertisements',
    'Soliciting for business/services'
  ],
  inappropriate: [
    'Explicit or disturbing content',
    'Off-topic or irrelevant content',
    'Inappropriate language',
    'Not suitable for pet community'
  ],
  harassment: [
    'Personal attacks or insults',
    'Threatening behavior',
    'Cyberbullying',
    'Discrimination or hate speech'
  ],
  misinformation: [
    'False medical/health advice',
    'Dangerous pet care recommendations',
    'Misleading product claims',
    'Unsubstantiated health claims'
  ],
  fake: [
    'Impersonation of experts',
    'Fake credentials or qualifications',
    'False personal stories',
    'Misleading before/after claims'
  ],
  other: [
    'Privacy violation',
    'Copyright infringement',
    'Underage user',
    'Other policy violation'
  ]
};

export default function ReportModal({ isOpen, onClose, contentType, contentId }: ReportModalProps) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory || !selectedReason) {
      setSubmitError('Please select a category and reason');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) {
        setSubmitError('Please log in to report content');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/moderation/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contentType,
          contentId,
          reportCategory: selectedCategory,
          reportReason: selectedReason,
          description: description.trim() || null,
          evidenceUrls: evidenceUrls.split('\n').filter(url => url.trim()).map(url => url.trim())
        })
      });

      const data = await response.json();

      if (data.success) {
        setSubmitSuccess(true);
        setTimeout(() => {
          onClose();
          // Reset form
          setSelectedCategory('');
          setSelectedReason('');
          setDescription('');
          setEvidenceUrls('');
          setSubmitSuccess(false);
        }, 2000);
      } else {
        setSubmitError(data.error || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      setSubmitError('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  if (submitSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Report Submitted</h3>
          <p className="text-gray-600 mb-4">
            Thank you for helping keep our community safe. We'll review your report and take appropriate action.
          </p>
          <div className="text-sm text-gray-500">Closing automatically...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Report Content
          </h3>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Category Selection */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Why are you reporting this {contentType}?
            </h4>
            <div className="space-y-3">
              {REPORT_CATEGORIES.map((category) => (
                <label key={category.id} className="flex items-start cursor-pointer group">
                  <input
                    type="radio"
                    name="category"
                    value={category.id}
                    checked={selectedCategory === category.id}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="mt-1 text-red-600 border-gray-300 focus:ring-red-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center">
                      <span className="mr-2">{category.icon}</span>
                      <span className="font-medium text-gray-900 group-hover:text-red-600">
                        {category.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Specific Reason */}
          {selectedCategory && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Specific reason (select one):
              </h4>
              <div className="space-y-2">
                {COMMON_REASONS[selectedCategory as keyof typeof COMMON_REASONS]?.map((reason) => (
                  <label key={reason} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="text-red-600 border-gray-300 focus:ring-red-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{reason}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Additional Details */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">
              Additional details (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Provide any additional context that might help our moderation team..."
            />
          </div>

          {/* Evidence URLs */}
          <div className="mb-6">
            <label htmlFor="evidence" className="block text-sm font-medium text-gray-900 mb-2">
              Evidence URLs (optional)
            </label>
            <textarea
              id="evidence"
              value={evidenceUrls}
              onChange={(e) => setEvidenceUrls(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="https://example.com/screenshot1&#10;https://example.com/screenshot2&#10;(One URL per line)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Links to screenshots or other evidence supporting your report
            </p>
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Reports are anonymous. False reports may result in account restrictions.
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedCategory || !selectedReason}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}