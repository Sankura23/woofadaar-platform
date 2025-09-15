'use client';

import { useState, useEffect } from 'react';

interface DogID {
  id: string;
  dog_id: string;
  dog_name: string;
  dog_id_number: string;
  verification_level: string;
  created_at: string;
  last_updated: string;
  is_active: boolean;
}

interface Partner {
  id: string;
  name: string;
  business_name: string | null;
  partner_type: string;
  verification_level: string;
  access_granted: boolean;
}

export default function DogIDPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'partners' | 'access' | 'kci'>('overview');
  const [dogIDs, setDogIDs] = useState<DogID[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDogID, setSelectedDogID] = useState('');
  const [selectedPartner, setSelectedPartner] = useState('');
  const [accessLevel, setAccessLevel] = useState('basic');
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);
  const [accessResult, setAccessResult] = useState<any>(null);
  
  // KCI verification states
  const [kciRegistrationId, setKciRegistrationId] = useState('');
  const [breed, setBreed] = useState('');
  const [dogName, setDogName] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [breedSearch, setBreedSearch] = useState('');
  const [breedInfo, setBreedInfo] = useState<any>(null);
  const [isLoadingBreed, setIsLoadingBreed] = useState(false);
  const [kciSubTab, setKciSubTab] = useState<'verify' | 'breeds' | 'info'>('verify');

  useEffect(() => {
    fetchDogIDs();
    fetchPartners();
  }, []);

  const fetchDogIDs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch('/api/dog-id/access', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDogIDs(data.data.dog_ids || []);
      }
    } catch (error) {
      console.error('Error fetching dog IDs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const response = await fetch('/api/partners?limit=50');
      if (response.ok) {
        const data = await response.json();
        setPartners(data.partners || []);
      }
    } catch (error) {
      console.error('Error fetching partners:', error);
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGrantingAccess(true);
    setAccessResult(null);

    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch('/api/dog-id/partner-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          dog_id: selectedDogID,
          partner_id: selectedPartner,
          access_level: accessLevel,
        }),
      });

      const result = await response.json();
      setAccessResult(result);

      if (result.success) {
        // Reset form
        setSelectedDogID('');
        setSelectedPartner('');
        setAccessLevel('basic');
        // Refresh data
        fetchDogIDs();
      }
    } catch (error) {
      setAccessResult({
        success: false,
        message: 'Failed to grant access. Please try again.',
      });
    } finally {
      setIsGrantingAccess(false);
    }
  };

  // KCI verification handlers
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

  const getVerificationLevelColor = (level: string) => {
    switch (level) {
      case 'platinum':
        return 'bg-purple-100 text-purple-800';
      case 'gold':
        return 'bg-yellow-100 text-yellow-800';
      case 'silver':
        return 'bg-gray-100 text-gray-800';
      case 'bronze':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'full':
        return 'bg-green-100 text-green-800';
      case 'limited':
        return 'bg-yellow-100 text-yellow-800';
      case 'basic':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🏥 Dog ID Center</h1>
          <p className="text-lg text-gray-600">
            Manage your dog's ID and control partner access to dog information
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Dog ID Overview
              </button>
              <button
                onClick={() => setActiveTab('partners')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'partners'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Partner Access
              </button>
              <button
                onClick={() => setActiveTab('access')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'access'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Grant Access
              </button>
              <button
                onClick={() => setActiveTab('kci')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'kci'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🏆 KCI Verification
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Dog ID Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Dog ID Overview</h2>
                
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading dog IDs...</p>
                  </div>
                ) : dogIDs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">🏥</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Dog IDs found</h3>
                    <p className="text-gray-600">Add your dogs to generate dog IDs</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dogIDs.map((dogID) => (
                      <div key={dogID.id} className="bg-gray-50 rounded-lg p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                              🏥
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{dogID.dog_name}</h3>
                              <p className="text-sm text-gray-600">Dog ID: {dogID.dog_id_number}</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getVerificationLevelColor(dogID.verification_level)}`}>
                            {dogID.verification_level}
                          </span>
                        </div>
                        
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Status:</span>
                            <p className={`text-sm ${dogID.is_active ? 'text-green-600' : 'text-red-600'}`}>
                              {dogID.is_active ? 'Active' : 'Inactive'}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Created:</span>
                            <p className="text-gray-600">{new Date(dogID.created_at).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="font-medium">Last Updated:</span>
                            <p className="text-gray-600">{new Date(dogID.last_updated).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Partner Access Tab */}
            {activeTab === 'partners' && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Partner Access Management</h2>
                
                {partners.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">👥</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No partners found</h3>
                    <p className="text-gray-600">Partners will appear here once they request access</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {partners.map((partner) => (
                      <div key={partner.id} className="bg-gray-50 rounded-lg p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-white font-bold">
                              {partner.partner_type.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {partner.business_name || partner.name}
                              </h3>
                              <p className="text-sm text-gray-600 capitalize">{partner.partner_type}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAccessLevelColor(partner.verification_level)}`}>
                              {partner.verification_level}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              partner.access_granted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {partner.access_granted ? 'Access Granted' : 'No Access'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Grant Access Tab */}
            {activeTab === 'access' && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Grant Partner Access</h2>
                
                <form onSubmit={handleGrantAccess} className="space-y-6">
                  {/* Dog ID Selection */}
                  <div>
                    <label htmlFor="dog_id" className="block text-sm font-medium text-gray-700 mb-2">
                      Select Dog ID *
                    </label>
                    <select
                      id="dog_id"
                      value={selectedDogID}
                      onChange={(e) => setSelectedDogID(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    >
                      <option value="">Choose a dog ID...</option>
                      {dogIDs.map((dogID) => (
                        <option key={dogID.id} value={dogID.dog_id_number}>
                          {dogID.dog_name} - {dogID.dog_id_number}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Partner Selection */}
                  <div>
                    <label htmlFor="partner" className="block text-sm font-medium text-gray-700 mb-2">
                      Select Partner *
                    </label>
                    <select
                      id="partner"
                      value={selectedPartner}
                      onChange={(e) => setSelectedPartner(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    >
                      <option value="">Choose a partner...</option>
                      {partners.map((partner) => (
                        <option key={partner.id} value={partner.id}>
                          {partner.business_name || partner.name} - {partner.partner_type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Access Level */}
                  <div>
                    <label htmlFor="access_level" className="block text-sm font-medium text-gray-700 mb-2">
                      Access Level *
                    </label>
                    <select
                      id="access_level"
                      value={accessLevel}
                      onChange={(e) => setAccessLevel(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    >
                      <option value="basic">Basic Access - Basic dog information</option>
                      <option value="limited">Limited Access - Dog records and history</option>
                      <option value="full">Full Access - Complete dog profile</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isGrantingAccess}
                    className="w-full bg-primary text-white px-6 py-3 rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50"
                  >
                    {isGrantingAccess ? 'Granting Access...' : 'Grant Access'}
                  </button>
                </form>

                {/* Access Result */}
                {accessResult && (
                  <div className={`mt-6 p-4 rounded-lg ${
                    accessResult.success 
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    <h3 className="font-semibold mb-2">
                      {accessResult.success ? '✅ Access Granted Successfully' : '❌ Access Grant Failed'}
                    </h3>
                    <p>{accessResult.message}</p>
                    
                    {accessResult.data && (
                      <div className="mt-4 p-3 bg-white rounded border">
                        <h4 className="font-medium mb-2">Access Details:</h4>
                        <div className="text-sm space-y-1">
                          <p><strong>Dog ID:</strong> {accessResult.data.dog_id}</p>
                          <p><strong>Partner:</strong> {accessResult.data.partner_name}</p>
                          <p><strong>Access Level:</strong> {accessResult.data.access_level}</p>
                          <p><strong>Granted At:</strong> {new Date(accessResult.data.granted_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* KCI Verification Tab */}
            {activeTab === 'kci' && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">🏆 KCI Verification Center</h2>
                
                {/* KCI Sub-tabs */}
                <div className="mb-6">
                  <div className="flex space-x-4 border-b border-gray-200">
                    <button
                      onClick={() => setKciSubTab('verify')}
                      className={`py-2 px-4 border-b-2 font-medium text-sm ${
                        kciSubTab === 'verify'
                          ? 'border-yellow-500 text-yellow-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Verify Registration
                    </button>
                    <button
                      onClick={() => setKciSubTab('breeds')}
                      className={`py-2 px-4 border-b-2 font-medium text-sm ${
                        kciSubTab === 'breeds'
                          ? 'border-yellow-500 text-yellow-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Breed Information
                    </button>
                    <button
                      onClick={() => setKciSubTab('info')}
                      className={`py-2 px-4 border-b-2 font-medium text-sm ${
                        kciSubTab === 'info'
                          ? 'border-yellow-500 text-yellow-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      About KCI
                    </button>
                  </div>
                </div>

                {/* Verify Registration Sub-tab */}
                {kciSubTab === 'verify' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">Verify KCI Registration</h3>
                    
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

                {/* Breed Information Sub-tab */}
                {kciSubTab === 'breeds' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">Breed Information</h3>
                    
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
                              <p><strong>Size:</strong> {breedInfo.standard_characteristics?.size}</p>
                              <p><strong>Weight:</strong> {breedInfo.standard_characteristics?.weight_range}</p>
                              <p><strong>Height:</strong> {breedInfo.standard_characteristics?.height_range}</p>
                              <p><strong>Life Expectancy:</strong> {breedInfo.standard_characteristics?.life_expectancy}</p>
                            </div>
                          </div>
                        </div>

                        {breedInfo.standard_characteristics?.temperament && (
                          <div className="mt-6">
                            <h4 className="font-semibold text-gray-900 mb-3">Temperament</h4>
                            <div className="flex flex-wrap gap-2">
                              {breedInfo.standard_characteristics.temperament.map((trait: string, index: number) => (
                                <span key={index} className="bg-primary text-white px-2 py-1 rounded-full text-xs">
                                  {trait}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {breedInfo.health_considerations && (
                          <div className="mt-6">
                            <h4 className="font-semibold text-gray-900 mb-3">Health Considerations</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              {breedInfo.health_considerations.map((condition: string, index: number) => (
                                <li key={index}>{condition}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {breedInfo.breeding_requirements && (
                          <div className="mt-6">
                            <h4 className="font-semibold text-gray-900 mb-3">Breeding Requirements</h4>
                            <div className="space-y-2 text-sm">
                              <p><strong>Minimum Age:</strong> {breedInfo.breeding_requirements.minimum_age}</p>
                              <p><strong>Registration Fee:</strong> {breedInfo.breeding_requirements.registration_fee}</p>
                              {breedInfo.breeding_requirements.health_tests_required && (
                                <>
                                  <p><strong>Health Tests Required:</strong></p>
                                  <ul className="list-disc list-inside ml-4">
                                    {breedInfo.breeding_requirements.health_tests_required.map((test: string, index: number) => (
                                      <li key={index}>{test}</li>
                                    ))}
                                  </ul>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {breedInfo.description && (
                          <div className="mt-6">
                            <h4 className="font-semibold text-gray-900 mb-3">Description</h4>
                            <p className="text-gray-700">{breedInfo.description}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* About KCI Sub-tab */}
                {kciSubTab === 'info' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">About KCI</h3>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">What is KCI?</h4>
                        <p className="text-gray-700">
                          The Kennel Club of India (KCI) is the premier organization for dog registration and pedigree certification in India. 
                          It maintains official records of purebred dogs and ensures breed standards are maintained.
                        </p>
                      </div>

                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Benefits of KCI Registration</h4>
                        <ul className="list-disc list-inside space-y-2 text-gray-700">
                          <li>Official pedigree documentation</li>
                          <li>Breed authenticity verification</li>
                          <li>Eligibility for dog shows and competitions</li>
                          <li>Enhanced breeding value</li>
                          <li>International recognition</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">How to Register Your Dog</h4>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h5 className="font-medium text-blue-900 mb-2">Registration Process:</h5>
                          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                            <li>Submit application with required documents</li>
                            <li>Complete health testing requirements</li>
                            <li>Pay registration fees</li>
                            <li>Wait for KCI verification (7-14 days)</li>
                          </ol>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h4>
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 