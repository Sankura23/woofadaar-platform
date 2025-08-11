'use client';

import { useState } from 'react';
import Link from 'next/link';

interface KCIBreed {
  breed_name: string;
  breed_code: string;
  group: string;
  origin_country: string;
  kci_recognized: boolean;
}

interface KCIBreedInfo {
  breed_name: string;
  breed_code: string;
  group: string;
  origin_country: string;
  kci_recognized: boolean;
  recognition_date: string;
  standard_characteristics: {
    size: string;
    weight_range: string;
    height_range: string;
    life_expectancy: string;
    temperament: string[];
    coat_colors: string[];
    coat_type: string;
  };
  health_considerations: string[];
  breeding_requirements: {
    minimum_age: string;
    health_tests_required: string[];
    registration_fee: string;
  };
  description: string;
}

export default function KCIPage() {
  const [activeTab, setActiveTab] = useState<'verify' | 'breeds' | 'info'>('verify');
  const [kciRegistrationId, setKciRegistrationId] = useState('');
  const [breed, setBreed] = useState('');
  const [dogName, setDogName] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [breedSearch, setBreedSearch] = useState('');
  const [breedInfo, setBreedInfo] = useState<KCIBreedInfo | null>(null);
  const [isLoadingBreed, setIsLoadingBreed] = useState(false);

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const response = await fetch('/api/kci/verify-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kci_registration_id: kciRegistrationId,
          breed,
          dog_name: dogName,
        }),
      });

      const result = await response.json();
      setVerificationResult(result);
    } catch (error) {
      setVerificationResult({
        success: false,
        message: 'Failed to verify KCI registration. Please try again.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBreedSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!breedSearch.trim()) return;

    setIsLoadingBreed(true);
    setBreedInfo(null);

    try {
      const response = await fetch(`/api/kci/breed-info/${encodeURIComponent(breedSearch)}`);
      const result = await response.json();
      
      if (result.success) {
        setBreedInfo(result.data);
      } else {
        setBreedInfo(null);
      }
    } catch (error) {
      console.error('Error fetching breed info:', error);
    } finally {
      setIsLoadingBreed(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🏆 KCI Verification Center</h1>
          <p className="text-lg text-gray-600">
            Verify your dog's KCI registration and access comprehensive breed information
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('verify')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'verify'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Verify Registration
              </button>
              <button
                onClick={() => setActiveTab('breeds')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'breeds'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Breed Information
              </button>
              <button
                onClick={() => setActiveTab('info')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'info'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                About KCI
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Verify Registration Tab */}
            {activeTab === 'verify' && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Verify KCI Registration</h2>
                
                <form onSubmit={handleVerification} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="kci_registration_id" className="block text-sm font-medium text-gray-700 mb-2">
                        KCI Registration ID *
                      </label>
                      <input
                        type="text"
                        id="kci_registration_id"
                        value={kciRegistrationId}
                        onChange={(e) => setKciRegistrationId(e.target.value)}
                        placeholder="e.g., KCI001234"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="breed" className="block text-sm font-medium text-gray-700 mb-2">
                        Breed *
                      </label>
                      <input
                        type="text"
                        id="breed"
                        value={breed}
                        onChange={(e) => setBreed(e.target.value)}
                        placeholder="e.g., Labrador Retriever"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="dog_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Dog Name (Optional)
                    </label>
                    <input
                      type="text"
                      id="dog_name"
                      value={dogName}
                      onChange={(e) => setDogName(e.target.value)}
                      placeholder="e.g., Buddy"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full bg-primary text-white px-6 py-3 rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50"
                  >
                    {isVerifying ? 'Verifying...' : 'Verify Registration'}
                  </button>
                </form>

                {/* Verification Result */}
                {verificationResult && (
                  <div className={`mt-6 p-4 rounded-lg ${
                    verificationResult.success 
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    <h3 className="font-semibold mb-2">
                      {verificationResult.success ? '✅ Verification Successful' : '❌ Verification Failed'}
                    </h3>
                    <p>{verificationResult.message}</p>
                    
                    {verificationResult.data && (
                      <div className="mt-4 p-3 bg-white rounded border">
                        <h4 className="font-medium mb-2">Verification Details:</h4>
                        <div className="text-sm space-y-1">
                          <p><strong>Registration ID:</strong> {verificationResult.data.kci_registration_id}</p>
                          <p><strong>Breed:</strong> {verificationResult.data.breed}</p>
                          <p><strong>Status:</strong> {verificationResult.data.verification_status}</p>
                          {verificationResult.data.verified_at && (
                            <p><strong>Verified At:</strong> {new Date(verificationResult.data.verified_at).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Breed Information Tab */}
            {activeTab === 'breeds' && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Breed Information</h2>
                
                <form onSubmit={handleBreedSearch} className="mb-6">
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={breedSearch}
                      onChange={(e) => setBreedSearch(e.target.value)}
                      placeholder="Search for a breed (e.g., Labrador Retriever)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <button
                      type="submit"
                      disabled={isLoadingBreed}
                      className="bg-primary text-white px-6 py-2 rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50"
                    >
                      {isLoadingBreed ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </form>

                {isLoadingBreed && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-gray-600">Searching breed information...</p>
                  </div>
                )}

                {breedInfo && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">{breedInfo.breed_name}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Basic Information</h4>
                        <div className="space-y-2 text-sm">
                          <p><strong>Breed Code:</strong> {breedInfo.breed_code}</p>
                          <p><strong>Group:</strong> {breedInfo.group}</p>
                          <p><strong>Origin:</strong> {breedInfo.origin_country}</p>
                          <p><strong>KCI Recognized:</strong> {breedInfo.kci_recognized ? 'Yes' : 'No'}</p>
                          <p><strong>Recognition Date:</strong> {breedInfo.recognition_date}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Characteristics</h4>
                        <div className="space-y-2 text-sm">
                          <p><strong>Size:</strong> {breedInfo.standard_characteristics.size}</p>
                          <p><strong>Weight:</strong> {breedInfo.standard_characteristics.weight_range}</p>
                          <p><strong>Height:</strong> {breedInfo.standard_characteristics.height_range}</p>
                          <p><strong>Life Expectancy:</strong> {breedInfo.standard_characteristics.life_expectancy}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Temperament</h4>
                      <div className="flex flex-wrap gap-2">
                        {breedInfo.standard_characteristics.temperament.map((trait, index) => (
                          <span key={index} className="bg-primary text-white px-2 py-1 rounded-full text-xs">
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Health Considerations</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {breedInfo.health_considerations.map((condition, index) => (
                          <li key={index}>{condition}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Breeding Requirements</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Minimum Age:</strong> {breedInfo.breeding_requirements.minimum_age}</p>
                        <p><strong>Registration Fee:</strong> {breedInfo.breeding_requirements.registration_fee}</p>
                        <p><strong>Health Tests Required:</strong></p>
                        <ul className="list-disc list-inside ml-4">
                          {breedInfo.breeding_requirements.health_tests_required.map((test, index) => (
                            <li key={index}>{test}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Description</h4>
                      <p className="text-gray-700">{breedInfo.description}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* About KCI Tab */}
            {activeTab === 'info' && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">About KCI</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">What is KCI?</h3>
                    <p className="text-gray-700">
                      The Kennel Club of India (KCI) is the premier organization for dog registration and pedigree certification in India. 
                      It maintains official records of purebred dogs and ensures breed standards are maintained.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Benefits of KCI Registration</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700">
                      <li>Official pedigree documentation</li>
                      <li>Breed authenticity verification</li>
                      <li>Eligibility for dog shows and competitions</li>
                      <li>Enhanced breeding value</li>
                      <li>International recognition</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">How to Register Your Dog</h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Registration Process:</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                        <li>Submit application with required documents</li>
                        <li>Complete health testing requirements</li>
                        <li>Pay registration fees</li>
                        <li>Wait for KCI verification (7-14 days)</li>
                      </ol>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="space-y-2 text-sm">
                        <p><strong>Phone:</strong> +91-11-2xxx-xxxx</p>
                        <p><strong>Email:</strong> registration@kci.org.in</p>
                        <p><strong>Website:</strong> <a href="https://kci.org.in" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://kci.org.in</a></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 