'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Pill, Calendar, AlertCircle, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  start_date: string;
  end_date?: string;
  prescribed_by?: string;
  is_active: boolean;
  created_at: string;
}

interface Dog {
  id: string;
  name: string;
  breed: string;
  photo_url?: string;
}

export default function MedicationsPage({ params }: { params: { dogId: string } }) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [dog, setDog] = useState<Dog | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  const dogId = params.dogId;

  useEffect(() => {
    if (dogId) {
      fetchDogAndMedications();
    }
  }, [dogId]);

  const fetchDogAndMedications = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      
      // Fetch dog details and medications in parallel
      const [dogResponse, medicationsResponse] = await Promise.all([
        fetch(`/api/dogs/${dogId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/medications/${dogId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (dogResponse.ok) {
        const dogData = await dogResponse.json();
        setDog(dogData.dog);
      }

      if (medicationsResponse.ok) {
        const medicationsData = await medicationsResponse.json();
        setMedications(medicationsData.data?.medications || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-milk-white via-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3bbca8] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading medications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-milk-white via-gray-50 to-gray-100 px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Link 
            href={`/health/${dogId}`}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {dog?.name}'s Medications
            </h1>
            <p className="text-gray-600">Manage medications and treatments</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-[#3bbca8] text-white rounded-lg hover:bg-[#2daa96] transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Medication
          </button>
        </div>

        {/* Medications List */}
        <div className="space-y-4">
          {medications.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center shadow-sm">
              <Pill className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Medications</h3>
              <p className="text-gray-500 mb-6">
                No medications have been added for {dog?.name} yet.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-6 py-3 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Medication
              </button>
            </div>
          ) : (
            medications.map((medication) => (
              <div key={medication.id} className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Pill className="w-5 h-5 text-[#3bbca8] mr-2" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {medication.name}
                      </h3>
                      {!medication.is_active && (
                        <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Dosage</p>
                        <p className="font-medium">{medication.dosage}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Frequency</p>
                        <p className="font-medium">{medication.frequency}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Start Date</p>
                        <p className="font-medium">
                          {new Date(medication.start_date).toLocaleDateString()}
                        </p>
                      </div>
                      {medication.end_date && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">End Date</p>
                          <p className="font-medium">
                            {new Date(medication.end_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {medication.instructions && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-1">Instructions</p>
                        <p className="text-gray-800">{medication.instructions}</p>
                      </div>
                    )}

                    {medication.prescribed_by && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-1">Prescribed By</p>
                        <p className="font-medium">{medication.prescribed_by}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Medication Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">Add New Medication</h2>
              <p className="text-gray-600 mb-4">
                This feature will be available soon. You can track medications manually for now.
              </p>
              <button
                onClick={() => setShowForm(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}