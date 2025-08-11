'use client';

import { useState } from 'react';
import Link from 'next/link';

interface VerificationForm {
  partner_id: string;
  health_id: string;
  verification_level: string;
  notes: string;
}

export default function PartnerVerificationPage() {
  const [formData, setFormData] = useState<VerificationForm>({
    partner_id: '',
    health_id: '',
    verification_level: 'basic',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const response = await fetch('/api/health-id/partner-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      setSubmitResult(result);

      if (result.success) {
        // Reset form on success
        setFormData({
          partner_id: '',
          health_id: '',
          verification_level: 'basic',
          notes: ''
        });
      }
    } catch (error) {
      setSubmitResult({
        success: false,
        message: 'Failed to verify partner. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof VerificationForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">✅ Partner Verification</h1>
          <p className="text-lg text-gray-600">
            Verify partner access to health ID information
          </p>
        </div>

        {/* Verification Form */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Health ID Partner Verification</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Partner ID */}
              <div>
                <label htmlFor="partner_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Partner ID *
                </label>
                <input
                  type="text"
                  id="partner_id"
                  value={formData.partner_id}
                  onChange={(e) => handleInputChange('partner_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter partner ID"
                  required
                />
              </div>

              {/* Health ID */}
              <div>
                <label htmlFor="health_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Health ID *
                </label>
                <input
                  type="text"
                  id="health_id"
                  value={formData.health_id}
                  onChange={(e) => handleInputChange('health_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter health ID to verify"
                  required
                />
              </div>

              {/* Verification Level */}
              <div>
                <label htmlFor="verification_level" className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Level *
                </label>
                <select
                  id="verification_level"
                  value={formData.verification_level}
                  onChange={(e) => handleInputChange('verification_level', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  <option value="basic">Basic - Basic health information</option>
                  <option value="bronze">Bronze - Health records and history</option>
                  <option value="silver">Silver - Complete health profile</option>
                  <option value="gold">Gold - Full access with analytics</option>
                  <option value="platinum">Platinum - Premium access with priority</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Notes
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Add any notes about the verification process..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white px-6 py-3 rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Verifying...' : 'Verify Partner Access'}
              </button>
            </form>

            {/* Submission Result */}
            {submitResult && (
              <div className={`mt-6 p-4 rounded-lg ${
                submitResult.success 
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <h3 className="font-semibold mb-2">
                  {submitResult.success ? '✅ Verification Successful' : '❌ Verification Failed'}
                </h3>
                <p>{submitResult.message}</p>
                
                {submitResult.data && (
                  <div className="mt-4 p-3 bg-white rounded border">
                    <h4 className="font-medium mb-2">Verification Details:</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Partner ID:</strong> {submitResult.data.partner_id}</p>
                      <p><strong>Health ID:</strong> {submitResult.data.health_id}</p>
                      <p><strong>Verification Level:</strong> {submitResult.data.verification_level}</p>
                      <p><strong>Verified At:</strong> {new Date(submitResult.data.verified_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Back to Home */}
            <div className="mt-8 text-center">
              <Link
                href="/"
                className="text-primary hover:underline font-medium"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}