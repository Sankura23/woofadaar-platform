'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter,
  Plus,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Mail,
  ChevronDown
} from 'lucide-react';

interface Employee {
  id: string;
  employee_email: string;
  employee_name: string;
  department?: string;
  status: string;
  pet_allowance_used: number;
  pet_allowance_limit: number;
  enrollment_date: string;
  employee_user?: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
  benefit_claims: any[];
}

interface EmployeeStats {
  by_department: { department: string; _count: { _all: number } }[];
  by_status: { status: string; _count: { _all: number } }[];
}

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    per_page: 20
  });

  // New employee form
  const [newEmployee, setNewEmployee] = useState({
    employee_email: '',
    employee_name: '',
    department: '',
    pet_allowance_limit: 5000
  });

  useEffect(() => {
    fetchEmployees();
  }, [searchTerm, statusFilter, departmentFilter, pagination.current_page]);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      const params = new URLSearchParams({
        page: pagination.current_page.toString(),
        limit: pagination.per_page.toString()
      });

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (departmentFilter) params.append('department', departmentFilter);

      const response = await fetch(`/api/corporate/employees?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.data.employees || []);
        setPagination(data.data.pagination);
        setStats(data.data.statistics);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch('/api/corporate/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newEmployee)
      });

      if (response.ok) {
        setShowAddForm(false);
        setNewEmployee({
          employee_email: '',
          employee_name: '',
          department: '',
          pet_allowance_limit: 5000
        });
        fetchEmployees();
      } else {
        const error = await response.json();
        alert(error.message);
      }
    } catch (error) {
      console.error('Error adding employee:', error);
    }
  };

  const handleBulkUpload = async (csvData: string) => {
    try {
      // Parse CSV data
      const lines = csvData.split('\n');
      const headers = lines[0].split(',');
      const employees = lines.slice(1).map(line => {
        const values = line.split(',');
        return {
          employee_email: values[0]?.trim(),
          employee_name: values[1]?.trim(),
          department: values[2]?.trim() || '',
          pet_allowance_limit: parseFloat(values[3]?.trim()) || 5000
        };
      }).filter(emp => emp.employee_email && emp.employee_name);

      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch('/api/corporate/employees/bulk-enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ employees })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Bulk upload completed: ${result.data.summary.successful_count} successful, ${result.data.summary.error_count} errors`);
        setShowBulkUpload(false);
        fetchEmployees();
      }
    } catch (error) {
      console.error('Error bulk uploading:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAllowanceUtilization = (used: number, limit: number) => {
    const percentage = Math.round((used / limit) * 100);
    return { percentage, color: percentage > 80 ? 'bg-red-500' : percentage > 60 ? 'bg-yellow-500' : 'bg-green-500' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3bbca8]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
              <p className="text-gray-600">Manage corporate pet benefit enrollments</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowBulkUpload(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600">Total Employees</p>
            <p className="text-2xl font-bold text-gray-900">{pagination.total_count}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {stats?.by_status.find(s => s.status === 'active')?._count._all || 0}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {stats?.by_status.find(s => s.status === 'pending')?._count._all || 0}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600">Departments</p>
            <p className="text-2xl font-bold text-blue-600">
              {stats?.by_department.length || 0}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              <ChevronDown className={`w-4 h-4 transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                >
                  <option value="">All Departments</option>
                  {stats?.by_department.map(dept => (
                    <option key={dept.department} value={dept.department}>
                      {dept.department || 'No Department'} ({dept._count._all})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setDepartmentFilter('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Employee Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Allowance Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Claims
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employees.map((employee) => {
                  const allowanceUtilization = getAllowanceUtilization(employee.pet_allowance_used, employee.pet_allowance_limit);
                  
                  return (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            {employee.employee_user?.profile_image_url ? (
                              <img
                                src={employee.employee_user.profile_image_url}
                                alt={employee.employee_name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-gray-600 font-medium">
                                {employee.employee_name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="ml-3">
                            <p className="font-medium text-gray-900">{employee.employee_name}</p>
                            <p className="text-sm text-gray-500">{employee.employee_email}</p>
                            <p className="text-xs text-gray-400">
                              Enrolled: {new Date(employee.enrollment_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">
                          {employee.department || 'Not specified'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(employee.status)}`}>
                          {employee.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${allowanceUtilization.color}`}
                              style={{ width: `${Math.min(allowanceUtilization.percentage, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">
                            ₹{employee.pet_allowance_used.toLocaleString()}/₹{employee.pet_allowance_limit.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">{employee.benefit_claims.length}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button className="p-1 text-gray-400 hover:text-gray-600">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-gray-600">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to {Math.min(pagination.current_page * pagination.per_page, pagination.total_count)} of {pagination.total_count} employees
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={pagination.current_page === 1}
                onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page - 1 }))}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm">
                {pagination.current_page} of {pagination.total_pages}
              </span>
              <button
                disabled={pagination.current_page === pagination.total_pages}
                onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page + 1 }))}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Add Employee Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium mb-4">Add New Employee</h3>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={newEmployee.employee_email}
                    onChange={(e) => setNewEmployee({...newEmployee, employee_email: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={newEmployee.employee_name}
                    onChange={(e) => setNewEmployee({...newEmployee, employee_name: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pet Allowance Limit (₹)</label>
                  <input
                    type="number"
                    value={newEmployee.pet_allowance_limit}
                    onChange={(e) => setNewEmployee({...newEmployee, pet_allowance_limit: parseFloat(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96]"
                  >
                    Add Employee
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Upload Modal */}
        {showBulkUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-medium mb-4">Bulk Upload Employees</h3>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="font-medium text-blue-900 mb-2">CSV Format</h4>
                  <p className="text-sm text-blue-700 mb-2">Use the following CSV format:</p>
                  <code className="text-xs bg-white p-2 rounded border block">
                    employee_email,employee_name,department,pet_allowance_limit<br/>
                    john@company.com,John Smith,Engineering,5000<br/>
                    jane@company.com,Jane Doe,Marketing,4000
                  </code>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CSV Data</label>
                  <textarea
                    rows={8}
                    placeholder="Paste your CSV data here..."
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8]"
                    onChange={(e) => {
                      // Store the CSV data for processing
                      (e.target as any).csvData = e.target.value;
                    }}
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowBulkUpload(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                      if (textarea && (textarea as any).csvData) {
                        handleBulkUpload((textarea as any).csvData);
                      }
                    }}
                    className="px-4 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96]"
                  >
                    Upload Employees
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}