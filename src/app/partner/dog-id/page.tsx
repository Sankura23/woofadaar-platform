'use client';

import { useState, useEffect } from 'react';

interface DogProfile {
  id: string;
  name: string;
  breed: string;
  age_years?: number;
  age_months?: number;
  weight_kg?: number;
  gender: 'male' | 'female';
  color: string;
  vaccination_status: 'up_to_date' | 'overdue' | 'unknown';
  spay_neuter_status: 'yes' | 'no' | 'unknown';
  microchip_id?: string;
  emergency_contact: string;
  special_needs?: string;
  medications?: string;
  allergies?: string;
  behavioral_notes?: string;
  last_vet_visit?: string;
  owner: {
    id: string;
    name: string;
    phone: string;
    email: string;
    location: string;
  };
  health_records: HealthRecord[];
}

interface HealthRecord {
  id: string;
  date: string;
  type: 'checkup' | 'vaccination' | 'treatment' | 'emergency' | 'surgery';
  title: string;
  description: string;
  vet_notes?: string;
  medications_prescribed?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;
}

interface DogSearchResult {
  id: string;
  name: string;
  breed: string;
  owner_name: string;
  dog_id: string;
  qr_code_url?: string;
}

export default function PartnerDogIdAccess() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DogSearchResult[]>([]);
  const [selectedDog, setSelectedDog] = useState<DogProfile | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [accessLevel, setAccessLevel] = useState<'basic' | 'health' | 'full'>('basic');
  const [recentAccesses, setRecentAccesses] = useState<DogSearchResult[]>([]);

  useEffect(() => {
    fetchRecentAccesses();
    checkAccessLevel();
  }, []);

  const checkAccessLevel = async () => {
    try {
      const token = localStorage.getItem('partner_token') || localStorage.getItem('woofadaar_token');
      const response = await fetch('/api/partners/access-level', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const result = await response.json();
        setAccessLevel(result.data.access_level || 'basic');
      }
    } catch (error) {
      console.error('Failed to check access level:', error);
    }
  };

  const fetchRecentAccesses = async () => {
    try {
      const token = localStorage.getItem('partner_token') || localStorage.getItem('woofadaar_token');
      const response = await fetch('/api/partners/recent-dog-accesses', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const result = await response.json();
        setRecentAccesses(result.data.recent_accesses || []);
      }
    } catch (error) {
      console.error('Failed to fetch recent accesses:', error);
    }
  };

  const searchDogs = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a Dog ID, QR code, or owner name');
      return;
    }

    setSearchLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('partner_token') || localStorage.getItem('woofadaar_token');
      const response = await fetch(`/api/partners/search-dogs?q=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setSearchResults(result.data.dogs);
      } else {
        setError(result.message || 'Search failed');
        setSearchResults([]);
      }
    } catch (error) {
      setError('Network error. Please try again.');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchDogDetails = async (dogId: string) => {
    setDetailLoading(true);
    setSelectedDog(null);
    
    try {
      const token = localStorage.getItem('partner_token') || localStorage.getItem('woofadaar_token');
      const response = await fetch(`/api/partners/dog-details/${dogId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setSelectedDog(result.data.dog);
        // Track the access
        fetchRecentAccesses();
      } else {
        setError(result.message || 'Failed to fetch dog details');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setDetailLoading(false);
    }
  };

  const addHealthNote = async (dogId: string, note: string) => {
    try {
      const token = localStorage.getItem('partner_token') || localStorage.getItem('woofadaar_token');
      const response = await fetch(`/api/partners/add-health-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          dog_id: dogId,
          note: note,
          type: 'partner_observation',
        }),
      });

      if (response.ok) {
        alert('Health note added successfully');
        fetchDogDetails(dogId); // Refresh dog details
      } else {
        const result = await response.json();
        alert(result.message || 'Failed to add health note');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchDogs();
    }
  };

  const getAccessLevelBadge = () => {
    const badges = {
      basic: { color: 'bg-blue-100 text-blue-800', text: 'Basic Access' },
      health: { color: 'bg-green-100 text-green-800', text: 'Health Access' },
      full: { color: 'bg-purple-100 text-purple-800', text: 'Full Access' },
    };
    
    return badges[accessLevel];
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Dog ID Access Portal</h1>
              <p className="text-gray-600">Access dog profiles and health information for your clients.</p>
            </div>
            <div className={`px-4 py-2 rounded-lg text-sm font-medium ${getAccessLevelBadge().color}`}>
              {getAccessLevelBadge().text}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Search Dogs</h2>
          
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter Dog ID (WD123456), QR code, or owner name..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={searchDogs}
              disabled={searchLoading}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
            >
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </div>

          <div className="text-sm text-gray-600">
            <strong>Search by:</strong> Dog ID, QR code data, owner name, phone number, or email
          </div>
        </div>

        {/* Recent Accesses */}
        {recentAccesses.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Accesses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentAccesses.slice(0, 6).map((dog) => (
                <button
                  key={dog.id}
                  onClick={() => fetchDogDetails(dog.id)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left transition-colors"
                >
                  <div className="font-medium text-gray-800">{dog.name}</div>
                  <div className="text-sm text-gray-600">{dog.breed}</div>
                  <div className="text-sm text-gray-500">Owner: {dog.owner_name}</div>
                  <div className="text-xs text-blue-600 mt-1">ID: {dog.dog_id}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Search Results</h2>
            <div className="space-y-3">
              {searchResults.map((dog) => (
                <div
                  key={dog.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium text-gray-800">{dog.name}</div>
                        <div className="text-sm text-gray-600">{dog.breed}</div>
                        <div className="text-sm text-gray-500">Owner: {dog.owner_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-blue-600 font-mono">ID: {dog.dog_id}</div>
                        {dog.qr_code_url && (
                          <div className="text-xs text-gray-500">QR Available</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => fetchDogDetails(dog.id)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dog Details */}
        {detailLoading && (
          <div className="bg-white rounded-lg shadow-sm border p-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading dog details...</p>
            </div>
          </div>
        )}

        {selectedDog && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Dog Profile</h2>
              <button
                onClick={() => setSelectedDog(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{selectedDog.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Breed:</span>
                    <span className="font-medium">{selectedDog.breed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Age:</span>
                    <span className="font-medium">
                      {selectedDog.age_years ? `${selectedDog.age_years} years` : ''}
                      {selectedDog.age_months ? ` ${selectedDog.age_months} months` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Weight:</span>
                    <span className="font-medium">
                      {selectedDog.weight_kg ? `${selectedDog.weight_kg} kg` : 'Not specified'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gender:</span>
                    <span className="font-medium capitalize">{selectedDog.gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Color:</span>
                    <span className="font-medium">{selectedDog.color}</span>
                  </div>
                </div>

                {/* Owner Info */}
                <h3 className="text-lg font-semibold text-gray-800 mb-4 mt-8">Owner Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{selectedDog.owner.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">
                      <a href={`tel:${selectedDog.owner.phone}`} className="text-blue-600 hover:underline">
                        {selectedDog.owner.phone}
                      </a>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">
                      <a href={`mailto:${selectedDog.owner.email}`} className="text-blue-600 hover:underline">
                        {selectedDog.owner.email}
                      </a>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium">{selectedDog.owner.location}</span>
                  </div>
                </div>
              </div>

              {/* Health Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Health Information</h3>
                
                {accessLevel === 'basic' ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                      Health information requires elevated access. Contact admin for health access permissions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Vaccination Status</div>
                        <div className={`text-sm font-medium ${
                          selectedDog.vaccination_status === 'up_to_date' ? 'text-green-600' :
                          selectedDog.vaccination_status === 'overdue' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {selectedDog.vaccination_status.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Spay/Neuter</div>
                        <div className="text-sm font-medium capitalize">
                          {selectedDog.spay_neuter_status}
                        </div>
                      </div>
                    </div>

                    {selectedDog.microchip_id && (
                      <div>
                        <div className="text-sm text-gray-600">Microchip ID</div>
                        <div className="text-sm font-mono">{selectedDog.microchip_id}</div>
                      </div>
                    )}

                    <div>
                      <div className="text-sm text-gray-600">Emergency Contact</div>
                      <div className="text-sm font-medium">
                        <a href={`tel:${selectedDog.emergency_contact}`} className="text-blue-600 hover:underline">
                          {selectedDog.emergency_contact}
                        </a>
                      </div>
                    </div>

                    {selectedDog.allergies && (
                      <div>
                        <div className="text-sm text-gray-600">Allergies</div>
                        <div className="text-sm p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                          {selectedDog.allergies}
                        </div>
                      </div>
                    )}

                    {selectedDog.medications && (
                      <div>
                        <div className="text-sm text-gray-600">Current Medications</div>
                        <div className="text-sm p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          {selectedDog.medications}
                        </div>
                      </div>
                    )}

                    {selectedDog.special_needs && (
                      <div>
                        <div className="text-sm text-gray-600">Special Needs</div>
                        <div className="text-sm p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          {selectedDog.special_needs}
                        </div>
                      </div>
                    )}

                    {selectedDog.behavioral_notes && (
                      <div>
                        <div className="text-sm text-gray-600">Behavioral Notes</div>
                        <div className="text-sm p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          {selectedDog.behavioral_notes}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Health Records */}
            {accessLevel !== 'basic' && selectedDog.health_records.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Health Records</h3>
                <div className="space-y-4">
                  {selectedDog.health_records.slice(0, 5).map((record) => (
                    <div key={record.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-gray-800">{record.title}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(record.date).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                      <div className={`inline-block px-2 py-1 rounded text-xs font-medium mb-2 ${
                        record.type === 'emergency' ? 'bg-red-100 text-red-800' :
                        record.type === 'vaccination' ? 'bg-green-100 text-green-800' :
                        record.type === 'surgery' ? 'bg-purple-100 text-purple-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {record.type.toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">{record.description}</div>
                      {record.vet_notes && (
                        <div className="text-sm p-2 bg-gray-50 rounded">
                          <strong>Vet Notes:</strong> {record.vet_notes}
                        </div>
                      )}
                      {record.follow_up_required && (
                        <div className="text-sm text-orange-600 mt-2">
                          ⚠️ Follow-up required
                          {record.follow_up_date && ` by ${new Date(record.follow_up_date).toLocaleDateString('en-IN')}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Note Section */}
            {accessLevel === 'full' && (
              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Health Note</h3>
                <div className="space-y-4">
                  <textarea
                    id="health-note"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Add your professional observations or notes about this dog..."
                  />
                  <button
                    onClick={() => {
                      const note = (document.getElementById('health-note') as HTMLTextAreaElement).value;
                      if (note.trim()) {
                        addHealthNote(selectedDog.id, note);
                        (document.getElementById('health-note') as HTMLTextAreaElement).value = '';
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    Add Note
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Access Level Info */}
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Access Level Information</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <div><strong>Basic Access:</strong> View dog basic info and owner contact details</div>
            <div><strong>Health Access:</strong> View health information, vaccination status, medical notes</div>
            <div><strong>Full Access:</strong> View complete health records and add professional notes</div>
          </div>
        </div>
      </div>
    </div>
  );
} 