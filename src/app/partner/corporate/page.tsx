'use client';

import { useState, useEffect } from 'react';

interface CorporateProgram {
  id: string;
  company_name: string;
  program_name: string;
  employee_count: number;
  enrolled_employees: number;
  program_type: 'wellness' | 'insurance' | 'services' | 'training';
  status: 'active' | 'pending' | 'paused' | 'expired';
  start_date: string;
  end_date?: string;
  monthly_fee: number;
  commission_rate: number;
  total_revenue: number;
  features: string[];
}

interface Employee {
  id: string;
  name: string;
  email: string;
  employee_id: string;
  department: string;
  dogs_count: number;
  enrollment_date: string;
  last_active: string;
  program_usage: {
    vet_visits: number;
    training_sessions: number;
    health_records: number;
    expert_consultations: number;
  };
}

interface CorporateStats {
  totalPrograms: number;
  activePrograms: number;
  totalEmployees: number;
  activeEmployees: number;
  monthlyRevenue: number;
  totalRevenue: number;
  averageEngagement: number;
}

export default function CorporatePartnerPortal() {
  const [programs, setPrograms] = useState<CorporateProgram[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<CorporateStats>({
    totalPrograms: 0,
    activePrograms: 0,
    totalEmployees: 0,
    activeEmployees: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
    averageEngagement: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'programs' | 'employees' | 'analytics'>('overview');
  const [selectedProgram, setSelectedProgram] = useState<CorporateProgram | null>(null);

  useEffect(() => {
    fetchCorporateData();
  }, []);

  const fetchCorporateData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('partner_token') || localStorage.getItem('woofadaar_token');
      const partnerId = localStorage.getItem('partner_id') || 'current';
      
      const [statsResponse, programsResponse, employeesResponse] = await Promise.all([
        fetch(`/api/partners/${partnerId}/corporate/stats`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`/api/partners/${partnerId}/corporate/programs`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`/api/partners/${partnerId}/corporate/employees`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
      ]);

      if (statsResponse.ok) {
        const statsResult = await statsResponse.json();
        setStats(statsResult.data);
      }

      if (programsResponse.ok) {
        const programsResult = await programsResponse.json();
        setPrograms(programsResult.data.programs);
      }

      if (employeesResponse.ok) {
        const employeesResult = await employeesResponse.json();
        setEmployees(employeesResult.data.employees);
      }
    } catch (error) {
      setError('Failed to load corporate data');
    } finally {
      setLoading(false);
    }
  };

  const createNewProgram = async (programData: any) => {
    try {
      const token = localStorage.getItem('partner_token') || localStorage.getItem('woofadaar_token');
      const response = await fetch('/api/partners/corporate/programs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(programData),
      });

      if (response.ok) {
        alert('Program created successfully!');
        fetchCorporateData();
      } else {
        const result = await response.json();
        alert(result.message || 'Failed to create program');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'paused': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading corporate data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Corporate Partnership Portal</h1>
          <p className="text-gray-600">Manage corporate wellness programs and employee benefits.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{stats.totalPrograms}</div>
            <div className="text-sm text-gray-600">Total Programs</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-green-600">{stats.activePrograms}</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-purple-600">{stats.totalEmployees}</div>
            <div className="text-sm text-gray-600">Total Employees</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-emerald-600">{stats.activeEmployees}</div>
            <div className="text-sm text-gray-600">Active Users</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-yellow-600">₹{stats.monthlyRevenue.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Monthly Revenue</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-indigo-600">₹{stats.totalRevenue.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-pink-600">{stats.averageEngagement}%</div>
            <div className="text-sm text-gray-600">Engagement</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="flex border-b">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'programs', label: 'Programs', count: programs.length },
              { key: 'employees', label: 'Employees', count: employees.length },
              { key: 'analytics', label: 'Analytics' }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                {label} {count && `(${count})`}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                    <h3 className="text-lg font-semibold mb-4">Corporate Wellness Dashboard</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Active Programs:</span>
                        <span className="font-semibold">{stats.activePrograms}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Enrolled Employees:</span>
                        <span className="font-semibold">{stats.totalEmployees}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monthly Revenue:</span>
                        <span className="font-semibold">₹{stats.monthlyRevenue.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Quick Actions</h3>
                    <div className="space-y-3">
                      <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                        Create New Program
                      </button>
                      <button className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                        Invite Employees
                      </button>
                      <button className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                        Generate Report
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Recent Activity</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl">✅</div>
                      <div>
                        <p className="font-medium text-gray-800">New employee enrolled</p>
                        <p className="text-sm text-gray-600">Tech Solutions Ltd - 2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl">📊</div>
                      <div>
                        <p className="font-medium text-gray-800">Monthly report generated</p>
                        <p className="text-sm text-gray-600">Analytics dashboard - 1 day ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl">🏢</div>
                      <div>
                        <p className="font-medium text-gray-800">Program renewal due</p>
                        <p className="text-sm text-gray-600">Digital Marketing Inc - 3 days</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Programs Tab */}
            {activeTab === 'programs' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-800">Corporate Programs</h3>
                  <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                    Create New Program
                  </button>
                </div>

                {programs.length > 0 ? (
                  programs.map((program) => (
                    <div key={program.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-800">{program.program_name}</h4>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(program.status)}`}>
                              {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                            </div>
                          </div>
                          <div className="text-gray-600 mb-2">{program.company_name}</div>
                          <div className="text-sm text-gray-600">
                            {program.enrolled_employees} / {program.employee_count} employees enrolled
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600 mb-1">
                            ₹{program.monthly_fee.toLocaleString()}/month
                          </div>
                          <div className="text-sm text-gray-600">
                            Total: ₹{program.total_revenue.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">
                            Commission: {program.commission_rate}%
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-gray-600">Program Type</div>
                          <div className="font-medium capitalize">{program.program_type}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Duration</div>
                          <div className="font-medium">
                            {formatDate(program.start_date)} - {program.end_date ? formatDate(program.end_date) : 'Ongoing'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="text-sm text-gray-600 mb-2">Program Features</div>
                        <div className="flex flex-wrap gap-2">
                          {program.features.map((feature, index) => (
                            <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex space-x-3">
                        <button
                          onClick={() => setSelectedProgram(program)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                        >
                          View Details
                        </button>
                        <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">
                          Manage Employees
                        </button>
                        <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">
                          Generate Report
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🏢</div>
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No corporate programs</h3>
                    <p className="text-gray-500 mb-4">Start by creating your first corporate wellness program</p>
                    <button className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
                      Create Program
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Employees Tab */}
            {activeTab === 'employees' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-800">Employee Directory</h3>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Search employees..."
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">
                      Export
                    </button>
                  </div>
                </div>

                {employees.length > 0 ? (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dogs</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Active</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {employees.map((employee) => (
                            <tr key={employee.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div>
                                  <div className="font-medium text-gray-800">{employee.name}</div>
                                  <div className="text-sm text-gray-600">{employee.email}</div>
                                  <div className="text-sm text-gray-500">ID: {employee.employee_id}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">{employee.department}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{employee.dogs_count}</td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-600">
                                  <div>Vet: {employee.program_usage.vet_visits}</div>
                                  <div>Training: {employee.program_usage.training_sessions}</div>
                                  <div>Health: {employee.program_usage.health_records}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {formatDate(employee.last_active)}
                              </td>
                              <td className="px-6 py-4">
                                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                  View Profile
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No employees enrolled</h3>
                    <p className="text-gray-500">Employee data will appear here once programs are active</p>
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">Advanced Analytics</h3>
                  <p className="text-gray-500">
                    Comprehensive analytics dashboard with usage metrics, engagement patterns, and revenue insights
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Program Details Modal */}
        {selectedProgram && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Program Details</h2>
                  <button
                    onClick={() => setSelectedProgram(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">Program Information</h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Name:</strong> {selectedProgram.program_name}</div>
                        <div><strong>Company:</strong> {selectedProgram.company_name}</div>
                        <div><strong>Type:</strong> {selectedProgram.program_type}</div>
                        <div><strong>Status:</strong> {selectedProgram.status}</div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-2">Financial Details</h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Monthly Fee:</strong> ₹{selectedProgram.monthly_fee.toLocaleString()}</div>
                        <div><strong>Commission:</strong> {selectedProgram.commission_rate}%</div>
                        <div><strong>Total Revenue:</strong> ₹{selectedProgram.total_revenue.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Enrollment</h3>
                    <div className="text-sm">
                      <div><strong>Total Employees:</strong> {selectedProgram.employee_count}</div>
                      <div><strong>Enrolled:</strong> {selectedProgram.enrolled_employees}</div>
                      <div><strong>Enrollment Rate:</strong> {Math.round((selectedProgram.enrolled_employees / selectedProgram.employee_count) * 100)}%</div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Program Features</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProgram.features.map((feature, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 