'use client';

import React, { useState, useEffect } from 'react';
import { 
  Dog, 
  Heart, 
  FileText, 
  DollarSign, 
  Calendar,
  Plus,
  Upload,
  Eye,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  Building2
} from 'lucide-react';

interface Pet {
  id: string;
  name: string;
  breed: string;
  age_months: number;
  health_id: string;
  weight_kg?: number;
  gender: string;
  vaccination_status: string;
  corporate_benefits_active: boolean;
  profile_image_url?: string;
  created_at: string;
}

interface BenefitClaim {
  id: string;
  claim_type: string;
  claim_amount: number;
  approved_amount?: number;
  approval_status: string;
  claim_description: string;
  claim_date: string;
  receipt_url?: string;
  rejection_reason?: string;
  processed_at?: string;
}

interface Employee {
  id: string;
  employee_name: string;
  employee_email: string;
  department?: string;
  pet_allowance_used: number;
  pet_allowance_limit: number;
  company: {
    name: string;
    subscription_tier: string;
    logo_url?: string;
  };
}

export default function EmployeePetPortal() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [claims, setClaims] = useState<BenefitClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddPetForm, setShowAddPetForm] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);

  // New pet form
  const [newPet, setNewPet] = useState({
    name: '',
    breed: '',
    age_months: 0,
    weight_kg: 0,
    gender: 'male',
    vaccination_status: 'up_to_date'
  });

  // New claim form
  const [newClaim, setNewClaim] = useState({
    pet_id: '',
    claim_type: 'veterinary',
    claim_amount: 0,
    claim_description: '',
    receipt_file: null as File | null
  });

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) {
        setError('Please log in to access your pet benefits');
        return;
      }

      // Fetch employee profile and benefits info
      const employeeResponse = await fetch('/api/auth/employee-me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!employeeResponse.ok) {
        throw new Error('Failed to fetch employee data');
      }

      const employeeData = await employeeResponse.json();
      setEmployee(employeeData.data.employee);

      // Fetch employee pets
      const petsResponse = await fetch('/api/employee/pets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (petsResponse.ok) {
        const petsData = await petsResponse.json();
        setPets(petsData.data.pets || []);
      }

      // Fetch benefit claims
      const claimsResponse = await fetch('/api/employee/claims', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (claimsResponse.ok) {
        const claimsData = await claimsResponse.json();
        setClaims(claimsData.data.claims || []);
      }

    } catch (error) {
      console.error('Error fetching employee data:', error);
      setError('Failed to load pet benefit information');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch('/api/employee/pets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newPet)
      });

      if (response.ok) {
        setShowAddPetForm(false);
        setNewPet({
          name: '',
          breed: '',
          age_months: 0,
          weight_kg: 0,
          gender: 'male',
          vaccination_status: 'up_to_date'
        });
        fetchEmployeeData();
      } else {
        const error = await response.json();
        alert(error.message);
      }
    } catch (error) {
      console.error('Error adding pet:', error);
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('woofadaar_token');
      
      // For now, submit without file upload (can be enhanced with file handling)
      const claimData = {
        ...newClaim,
        receipt_file: undefined // Remove file for JSON submission
      };

      const response = await fetch('/api/employee/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(claimData)
      });

      if (response.ok) {
        setShowClaimForm(false);
        setNewClaim({
          pet_id: '',
          claim_type: 'veterinary',
          claim_amount: 0,
          claim_description: '',
          receipt_file: null
        });
        fetchEmployeeData();
      } else {
        const error = await response.json();
        alert(error.message);
      }
    } catch (error) {
      console.error('Error submitting claim:', error);
    }
  };

  const getClaimStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getClaimStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getAllowancePercentage = () => {
    if (!employee) return 0;
    return Math.round((employee.pet_allowance_used / employee.pet_allowance_limit) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3bbca8] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your pet benefits...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={fetchEmployeeData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {employee?.company?.logo_url && (
                <img 
                  src={employee.company.logo_url} 
                  alt={employee.company.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {employee?.company?.name} Pet Benefits
                </h1>
                <p className="text-sm text-gray-600">
                  Welcome back, {employee?.employee_name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{employee?.department}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: Heart },
              { id: 'pets', name: 'My Pets', icon: Dog },
              { id: 'claims', name: 'Benefit Claims', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-2 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-[#3bbca8] text-[#3bbca8]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Benefit Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pet Allowance Used</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₹{employee?.pet_allowance_used?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-gray-500">
                      of ₹{employee?.pet_allowance_limit?.toLocaleString() || 0} limit
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        getAllowancePercentage() > 80 ? 'bg-red-500' : 
                        getAllowancePercentage() > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(getAllowancePercentage(), 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {getAllowancePercentage()}% utilized
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Registered Pets</p>
                    <p className="text-2xl font-bold text-gray-900">{pets.length}</p>
                    <p className="text-xs text-green-600">
                      {pets.filter(p => p.corporate_benefits_active).length} with active benefits
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <Dog className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Claims</p>
                    <p className="text-2xl font-bold text-gray-900">{claims.length}</p>
                    <p className="text-xs text-blue-600">
                      {claims.filter(c => c.approval_status === 'approved').length} approved
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <FileText className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Claims */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">Recent Claims</h3>
              </div>
              <div className="p-6">
                {claims.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No benefit claims submitted yet</p>
                ) : (
                  <div className="space-y-4">
                    {claims.slice(0, 5).map((claim) => (
                      <div key={claim.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${
                            claim.approval_status === 'approved' ? 'bg-green-100' :
                            claim.approval_status === 'rejected' ? 'bg-red-100' : 'bg-yellow-100'
                          }`}>
                            {getClaimStatusIcon(claim.approval_status)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 capitalize">
                              {claim.claim_type.replace('_', ' ')}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(claim.claim_date).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-400">
                              {claim.claim_description.substring(0, 60)}...
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">₹{claim.claim_amount.toLocaleString()}</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getClaimStatusColor(claim.approval_status)}`}>
                            {claim.approval_status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pets Tab */}
        {activeTab === 'pets' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">My Pets</h2>
              <button
                onClick={() => setShowAddPetForm(true)}
                className="inline-flex items-center px-4 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Pet
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pets.map((pet) => (
                <div key={pet.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      {pet.profile_image_url ? (
                        <img
                          src={pet.profile_image_url}
                          alt={pet.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <Dog className="w-6 h-6 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{pet.name}</h3>
                      <p className="text-sm text-gray-500">{pet.breed}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Age:</span>
                      <span className="text-gray-900">{Math.floor(pet.age_months / 12)}y {pet.age_months % 12}m</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Gender:</span>
                      <span className="text-gray-900 capitalize">{pet.gender}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Health ID:</span>
                      <span className="text-gray-900 font-mono text-xs">{pet.health_id}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Benefits:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        pet.corporate_benefits_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {pet.corporate_benefits_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Claims Tab */}
        {activeTab === 'claims' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Benefit Claims</h2>
              <button
                onClick={() => setShowClaimForm(true)}
                className="inline-flex items-center px-4 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Submit Claim
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Claim Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {claims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900 capitalize">
                              {claim.claim_type.replace('_', ' ')}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(claim.claim_date).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {claim.claim_description}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">₹{claim.claim_amount.toLocaleString()}</p>
                            {claim.approved_amount && (
                              <p className="text-sm text-green-600">
                                Approved: ₹{claim.approved_amount.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getClaimStatusColor(claim.approval_status)}`}>
                            {claim.approval_status}
                          </span>
                          {claim.rejection_reason && (
                            <p className="text-xs text-red-600 mt-1">{claim.rejection_reason}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button className="p-1 text-gray-400 hover:text-gray-600">
                              <Eye className="w-4 h-4" />
                            </button>
                            {claim.receipt_url && (
                              <button className="p-1 text-gray-400 hover:text-gray-600">
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Add Pet Modal */}
        {showAddPetForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium mb-4">Add New Pet</h3>
              <form onSubmit={handleAddPet} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pet Name</label>
                  <input
                    type="text"
                    required
                    value={newPet.name}
                    onChange={(e) => setNewPet({...newPet, name: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
                  <input
                    type="text"
                    required
                    value={newPet.breed}
                    onChange={(e) => setNewPet({...newPet, breed: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age (months)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newPet.age_months}
                    onChange={(e) => setNewPet({...newPet, age_months: parseInt(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newPet.weight_kg}
                    onChange={(e) => setNewPet({...newPet, weight_kg: parseFloat(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={newPet.gender}
                    onChange={(e) => setNewPet({...newPet, gender: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddPetForm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96]"
                  >
                    Add Pet
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Submit Claim Modal */}
        {showClaimForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium mb-4">Submit Benefit Claim</h3>
              <form onSubmit={handleSubmitClaim} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pet</label>
                  <select
                    required
                    value={newClaim.pet_id}
                    onChange={(e) => setNewClaim({...newClaim, pet_id: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                  >
                    <option value="">Select a pet</option>
                    {pets.filter(p => p.corporate_benefits_active).map(pet => (
                      <option key={pet.id} value={pet.id}>{pet.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Claim Type</label>
                  <select
                    value={newClaim.claim_type}
                    onChange={(e) => setNewClaim({...newClaim, claim_type: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                  >
                    <option value="veterinary">Veterinary Care</option>
                    <option value="medication">Medication</option>
                    <option value="emergency">Emergency Care</option>
                    <option value="preventive">Preventive Care</option>
                    <option value="grooming">Grooming</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newClaim.claim_amount}
                    onChange={(e) => setNewClaim({...newClaim, claim_amount: parseFloat(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    required
                    rows={3}
                    value={newClaim.claim_description}
                    onChange={(e) => setNewClaim({...newClaim, claim_description: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                    placeholder="Describe the treatment or service..."
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowClaimForm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96]"
                  >
                    Submit Claim
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}