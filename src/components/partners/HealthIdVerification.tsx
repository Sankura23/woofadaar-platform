'use client';

import { useState } from 'react';
import { HealthIdVerificationResponse } from '@/types/partner';

interface HealthIdVerificationProps {
  partnerEmail?: string;
}

export default function HealthIdVerification({ partnerEmail }: HealthIdVerificationProps) {
  const [healthId, setHealthId] = useState('');
  const [email, setEmail] = useState(partnerEmail || '');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationResult, setVerificationResult] = useState<HealthIdVerificationResponse | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setVerificationResult(null);

    try {
      const response = await fetch(`/api/health-id/${healthId}/verify?partner_email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setVerificationResult(data);

      // If purpose or notes provided, log additional verification
      if (purpose || notes) {
        await fetch(`/api/health-id/${healthId}/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            partner_email: email,
            purpose,
            notes
          }),
        });
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setVerificationResult(null);
    setHealthId('');
    setPurpose('');
    setNotes('');
    setError('');
  };

  if (verificationResult) {
    const { dog, partner, verification_timestamp } = verificationResult;
    
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Health ID Verified</h3>
              <p className="text-sm text-gray-500">Verification completed at {new Date(verification_timestamp).toLocaleString()}</p>
            </div>
          </div>
          <button
            onClick={resetForm}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Verify Another
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Dog Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2 text-[#3bbca8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Dog Information
            </h4>
            <div className="space-y-2">
              <div>
                <span className="font-medium text-gray-700">Name:</span>
                <span className="ml-2 text-gray-900">{dog.name}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Breed:</span>
                <span className="ml-2 text-gray-900">{dog.breed}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Age:</span>
                <span className="ml-2 text-gray-900">{Math.floor(dog.age_months / 12)} years {dog.age_months % 12} months</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Gender:</span>
                <span className="ml-2 text-gray-900">{dog.gender}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Weight:</span>
                <span className="ml-2 text-gray-900">{dog.weight_kg} kg</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Vaccination Status:</span>
                <span className="ml-2 text-gray-900">{dog.vaccination_status}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Spayed/Neutered:</span>
                <span className="ml-2 text-gray-900">{dog.spayed_neutered ? 'Yes' : 'No'}</span>
              </div>
              {dog.microchip_id && (
                <div>
                  <span className="font-medium text-gray-700">Microchip ID:</span>
                  <span className="ml-2 text-gray-900">{dog.microchip_id}</span>
                </div>
              )}
            </div>
          </div>

          {/* Owner Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2 text-[#e05a37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Owner Information
            </h4>
            <div className="space-y-2">
              <div>
                <span className="font-medium text-gray-700">Name:</span>
                <span className="ml-2 text-gray-900">{dog.owner.name}</span>
              </div>
              {dog.owner.location && (
                <div>
                  <span className="font-medium text-gray-700">Location:</span>
                  <span className="ml-2 text-gray-900">{dog.owner.location}</span>
                </div>
              )}
            </div>

            {/* Emergency Contact */}
            {(dog.emergency_contact || dog.emergency_phone) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h5 className="font-medium text-gray-900 mb-2">Emergency Contact</h5>
                <div className="space-y-1">
                  {dog.emergency_contact && (
                    <div>
                      <span className="font-medium text-gray-700">Contact:</span>
                      <span className="ml-2 text-gray-900">{dog.emergency_contact}</span>
                    </div>
                  )}
                  {dog.emergency_phone && (
                    <div>
                      <span className="font-medium text-gray-700">Phone:</span>
                      <span className="ml-2 text-gray-900">{dog.emergency_phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Medical Information */}
          {(dog.medical_history || dog.medical_notes || dog.personality_traits) && (
            <div className="md:col-span-2 bg-blue-50 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Medical & Behavioral Information
              </h4>
              <div className="space-y-3">
                {dog.medical_history && (
                  <div>
                    <span className="font-medium text-gray-700">Medical History:</span>
                    <p className="mt-1 text-gray-900 bg-white p-2 rounded border">{dog.medical_history}</p>
                  </div>
                )}
                {dog.medical_notes && (
                  <div>
                    <span className="font-medium text-gray-700">Medical Notes:</span>
                    <p className="mt-1 text-gray-900 bg-white p-2 rounded border">{dog.medical_notes}</p>
                  </div>
                )}
                {dog.personality_traits && (
                  <div>
                    <span className="font-medium text-gray-700">Personality Traits:</span>
                    <p className="mt-1 text-gray-900 bg-white p-2 rounded border">{dog.personality_traits}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Partner Information */}
        <div className="mt-6 bg-gradient-to-r from-[#3bbca8] to-[#339990] rounded-lg p-4 text-white">
          <h4 className="text-lg font-semibold mb-2">Verified By</h4>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{partner.name}</p>
              <p className="text-sm opacity-90">{partner.business_name}</p>
              <p className="text-sm opacity-90">{partner.type}</p>
            </div>
            {partner.verified && (
              <div className="flex items-center bg-white bg-opacity-20 rounded-full px-3 py-1">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Verified Partner</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg mx-auto">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Health ID Verification</h2>
        <p className="text-gray-600">Enter Health ID to access dog&apos;s medical information</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label htmlFor="healthId" className="block text-sm font-medium text-gray-700 mb-1">
            Health ID *
          </label>
          <input
            type="text"
            id="healthId"
            value={healthId}
            onChange={(e) => setHealthId(e.target.value.toUpperCase())}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent font-mono"
            placeholder="Enter Health ID (e.g., WD12345)"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Partner Email *
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="your.email@example.com"
          />
        </div>

        <div>
          <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-1">
            Purpose of Access
          </label>
          <select
            id="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
          >
            <option value="">Select purpose</option>
            <option value="consultation">Medical Consultation</option>
            <option value="treatment">Treatment</option>
            <option value="training">Training Session</option>
            <option value="emergency">Emergency Care</option>
            <option value="routine_check">Routine Check-up</option>
            <option value="vaccination">Vaccination</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="Any additional notes about this verification..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#3bbca8] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#339990] focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Verifying...' : 'Verify Health ID'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          Only verified partners with Health ID access permissions can use this feature.
          All verifications are logged for security purposes.
        </p>
      </div>
    </div>
  );
}