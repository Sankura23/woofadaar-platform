'use client';

import { useState } from 'react';
import { Search, Shield, AlertTriangle, CheckCircle, Clock, Phone, Heart, MapPin, FileText } from 'lucide-react';

interface DogProfile {
  id: string;
  health_id: string;
  name: string;
  breed: string;
  age_months: number;
  weight_kg: number;
  gender: string;
  vaccination_status: string;
  spayed_neutered: boolean;
  microchip_id?: string;
  photo_url?: string;
  medical_notes?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  owner: {
    name: string;
    email: string;
    location?: string;
  };
  medical_records?: Array<{
    id: string;
    record_type: string;
    title: string;
    description?: string;
    record_date: string;
    vet_name?: string;
    vet_clinic?: string;
    medications?: any;
    next_due_date?: string;
  }>;
  current_medications?: Array<{
    id: string;
    name: string;
    dosage?: string;
    frequency: string;
    start_date: string;
    end_date?: string;
    instructions?: string;
    side_effects?: string;
  }>;
  critical_medical_info?: Array<{
    id: string;
    record_type: string;
    title: string;
    description?: string;
    record_date: string;
  }>;
}

interface VerificationResult {
  success: boolean;
  verification_id: string;
  dog: DogProfile;
  access_level: string;
  verification_timestamp: string;
  partner_info: {
    name: string;
    type: string;
  };
}

export default function DogIdVerificationForm() {
  const [dogId, setDogId] = useState('');
  const [verificationReason, setVerificationReason] = useState('');
  const [verificationType, setVerificationType] = useState<'routine' | 'appointment' | 'emergency' | 'insurance'>('routine');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dogId.trim() || !verificationReason.trim()) {
      setError('Dog ID and verification reason are required');
      return;
    }

    setIsLoading(true);
    setError('');
    setVerificationResult(null);

    try {
      const token = localStorage.getItem('woofadaar_partner_token');
      if (!token) {
        throw new Error('Authentication required. Please login again.');
      }

      const response = await fetch('/api/partners/verify-dog-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          dogId: dogId.trim(),
          verificationReason: verificationReason.trim(),
          verificationType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setVerificationResult(data);
      setDogId('');
      setVerificationReason('');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during verification');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAge = (months: number) => {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years === 0) return `${months} months`;
    if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`;
    return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Verification Form */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Dog ID Verification</h2>
            <p className="text-sm text-gray-600">Securely access Dog ID information for authorized purposes</p>
          </div>
        </div>

        <form onSubmit={handleVerification} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dog ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={dogId}
                  onChange={(e) => setDogId(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter Dog ID (e.g., DOG123456)"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Type <span className="text-red-500">*</span>
              </label>
              <select
                value={verificationType}
                onChange={(e) => setVerificationType(e.target.value as any)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="routine">Routine Check</option>
                <option value="appointment">Appointment</option>
                <option value="emergency">Emergency</option>
                <option value="insurance">Insurance</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verification Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={verificationReason}
              onChange={(e) => setVerificationReason(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Please provide the reason for accessing this Dog ID (e.g., scheduled vaccination, emergency treatment, insurance claim verification)"
              required
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              verificationType === 'emergency'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying...
              </div>
            ) : (
              'Verify Dog ID'
            )}
          </button>
        </form>
      </div>

      {/* Verification Result */}
      {verificationResult && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Success Header */}
          <div className="bg-green-50 border-b border-green-200 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-900">Verification Successful</h3>
                <p className="text-sm text-green-700">
                  Verification ID: {verificationResult.verification_id} • 
                  Access Level: {verificationResult.access_level} • 
                  {formatDate(verificationResult.verification_timestamp)}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Dog Profile Header */}
            <div className="flex items-start gap-4 mb-6">
              {verificationResult.dog.photo_url && (
                <img
                  src={verificationResult.dog.photo_url}
                  alt={verificationResult.dog.name}
                  className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-2xl font-bold text-gray-900">{verificationResult.dog.name}</h4>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {verificationResult.dog.health_id}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Breed:</span>
                    <div className="font-medium">{verificationResult.dog.breed}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Age:</span>
                    <div className="font-medium">{formatAge(verificationResult.dog.age_months)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Weight:</span>
                    <div className="font-medium">{verificationResult.dog.weight_kg} kg</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Gender:</span>
                    <div className="font-medium capitalize">{verificationResult.dog.gender}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Owner Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Owner Information
                </h5>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <span className="ml-2 font-medium">{verificationResult.dog.owner.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <span className="ml-2 font-medium">{verificationResult.dog.owner.email}</span>
                  </div>
                  {verificationResult.dog.owner.location && (
                    <div>
                      <span className="text-gray-500">Location:</span>
                      <span className="ml-2 font-medium">{verificationResult.dog.owner.location}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Health Status
                </h5>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Vaccination:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      verificationResult.dog.vaccination_status === 'up_to_date' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {verificationResult.dog.vaccination_status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Spayed/Neutered:</span>
                    <span className="ml-2 font-medium">
                      {verificationResult.dog.spayed_neutered ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {verificationResult.dog.microchip_id && (
                    <div>
                      <span className="text-gray-500">Microchip:</span>
                      <span className="ml-2 font-medium">{verificationResult.dog.microchip_id}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Contacts */}
            {(verificationResult.dog.emergency_contact || verificationResult.dog.emergency_phone) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h5 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Emergency Contacts
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {verificationResult.dog.emergency_contact && (
                    <div>
                      <span className="text-red-700">Contact:</span>
                      <span className="ml-2 font-medium">{verificationResult.dog.emergency_contact}</span>
                    </div>
                  )}
                  {verificationResult.dog.emergency_phone && (
                    <div>
                      <span className="text-red-700">Phone:</span>
                      <span className="ml-2 font-medium">{verificationResult.dog.emergency_phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Current Medications */}
            {verificationResult.dog.current_medications && verificationResult.dog.current_medications.length > 0 && (
              <div className="mb-6">
                <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Current Medications
                </h5>
                <div className="space-y-3">
                  {verificationResult.dog.current_medications.map((med) => (
                    <div key={med.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h6 className="font-medium text-blue-900">{med.name}</h6>
                        <span className="text-xs text-blue-600">
                          {formatDate(med.start_date)} - {med.end_date ? formatDate(med.end_date) : 'Ongoing'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                        {med.dosage && (
                          <div>
                            <span className="font-medium">Dosage:</span> {med.dosage}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Frequency:</span> {med.frequency}
                        </div>
                      </div>
                      {med.instructions && (
                        <div className="mt-2 text-sm text-blue-800">
                          <span className="font-medium">Instructions:</span> {med.instructions}
                        </div>
                      )}
                      {med.side_effects && (
                        <div className="mt-2 text-sm text-red-600">
                          <span className="font-medium">Side Effects:</span> {med.side_effects}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Critical Medical Information (Emergency Access) */}
            {verificationResult.dog.critical_medical_info && verificationResult.dog.critical_medical_info.length > 0 && (
              <div className="mb-6">
                <h5 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Critical Medical Information
                </h5>
                <div className="space-y-3">
                  {verificationResult.dog.critical_medical_info.map((record) => (
                    <div key={record.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h6 className="font-medium text-red-900">{record.title}</h6>
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                          {record.record_type.replace('_', ' ')}
                        </span>
                      </div>
                      {record.description && (
                        <p className="text-sm text-red-800">{record.description}</p>
                      )}
                      <div className="text-xs text-red-600 mt-2">
                        {formatDate(record.record_date)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Medical Notes */}
            {verificationResult.dog.medical_notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h5 className="font-semibold text-yellow-900 mb-2">Medical Notes</h5>
                <p className="text-sm text-yellow-800">{verificationResult.dog.medical_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}