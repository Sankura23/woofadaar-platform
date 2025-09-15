'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, MapPin, AlertCircle } from 'lucide-react';
import { useSafeDate } from '@/utils/dateUtils';

// Type definitions
interface Appointment {
  id: string;
  dog_id: string;
  dog_name?: string;
  owner_name?: string;
  owner_phone?: string;
  scheduled_at: string | Date;
  duration_minutes?: number;
  appointment_type: string;
  reason?: string;
  status: 'scheduled' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
  qr_check_in_code?: string;
  created_at: string | Date;
}

// Safe appointment card component
const AppointmentCard = ({ appointment, onStatusChange }: { appointment: Appointment; onStatusChange?: (id: string, newStatus: string) => void }) => {
  const { formatDate, formatTime, formatDateOnly, isClient } = useSafeDate();

  // Provide fallback values for undefined data
  const safeAppointment = {
    id: appointment?.id || 'unknown',
    dog_name: appointment?.dog_name || 'Unknown Dog',
    owner_name: appointment?.owner_name || 'Unknown Owner',
    owner_phone: appointment?.owner_phone || 'No phone',
    appointment_type: appointment?.appointment_type || 'General',
    reason: appointment?.reason || 'No reason provided',
    duration_minutes: appointment?.duration_minutes || 30,
    status: appointment?.status || 'scheduled',
    scheduled_at: appointment?.scheduled_at,
    created_at: appointment?.created_at
  };

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      checked_in: 'bg-purple-100 text-purple-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 p-2 rounded-full">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900">
              {safeAppointment.dog_name}
            </h3>
            <p className="text-gray-600">
              Owner: {safeAppointment.owner_name}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(safeAppointment.status)}`}>
          {safeAppointment.status.charAt(0).toUpperCase() + safeAppointment.status.slice(1)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-gray-700">
            {/* Safe date formatting with fallback */}
            {isClient ? formatDateOnly(safeAppointment.scheduled_at) : 'Loading date...'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-gray-700">
            {/* Safe time formatting with fallback */}
            {isClient ? formatTime(safeAppointment.scheduled_at) : 'Loading time...'}
            {' '}({safeAppointment.duration_minutes} min)
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Phone className="w-4 h-4 text-gray-500" />
          <span className="text-gray-700">
            {safeAppointment.owner_phone}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-gray-500" />
          <span className="text-gray-700">
            {safeAppointment.appointment_type}
          </span>
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded-md mb-4">
        <p className="text-sm text-gray-700">
          <strong>Reason:</strong> {safeAppointment.reason}
        </p>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          Created: {isClient ? formatDate(safeAppointment.created_at) : 'Loading...'}
        </div>
        <div className="space-x-2">
          {safeAppointment.status === 'scheduled' && (
            <button 
              onClick={() => onStatusChange?.(safeAppointment.id, 'confirmed')}
              className="bg-green-500 text-white px-4 py-2 rounded-md text-sm hover:bg-green-600 transition-colors"
            >
              Confirm
            </button>
          )}
          {safeAppointment.status === 'confirmed' && (
            <button 
              onClick={() => onStatusChange?.(safeAppointment.id, 'completed')}
              className="bg-purple-500 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-600 transition-colors"
            >
              Complete
            </button>
          )}
          <button className="bg-gray-500 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-600 transition-colors">
            Details
          </button>
        </div>
      </div>
    </div>
  );
};

// Main appointments page component
const PartnerAppointmentsPage = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'completed'>('today');
  const [mounted, setMounted] = useState(false);
  const { formatDate, isClient } = useSafeDate();

  // Handle appointment status change
  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/partner/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Update the appointment status in local state
        setAppointments(prev => prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: newStatus as any }
            : apt
        ));
      } else {
        console.error('Failed to update appointment status');
        alert('Failed to update appointment status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      alert('Network error. Please try again.');
    }
  };

  // Handle client-side mounting to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Safe data fetching
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        
        // Use the working bookings API endpoint
        const response = await fetch('/api/partners/bookings', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Appointments API response:', data);
        
        // Handle bookings API response format and transform to appointment format
        let appointmentsArray = [];
        if (data && Array.isArray(data.bookings)) {
          // Transform bookings to appointments format
          appointmentsArray = data.bookings.map(booking => ({
            id: booking.id,
            dog_id: booking.dog?.id || 'unknown',
            dog_name: booking.dog?.name || 'Unknown Dog',
            owner_name: booking.user?.name || 'Unknown Owner',
            owner_phone: booking.user?.phone || 'No phone',
            scheduled_at: booking.appointment_date || booking.appointment_datetime,
            duration_minutes: booking.duration_minutes || 60,
            appointment_type: booking.service_type || 'consultation',
            reason: booking.notes || 'No notes provided',
            status: booking.status || 'scheduled',
            created_at: booking.created_at
          }));
        }
        
        // Ensure we have valid appointment objects
        const safeAppointments = appointmentsArray.filter(apt => apt && typeof apt === 'object');
        setAppointments(safeAppointments);
        setError(null); // Clear any previous errors
        
      } catch (err) {
        console.error('Error fetching appointments:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        
        // Fallback demo data for development
        const demoAppointments = [
          {
            id: '1',
            dog_id: 'dog_1',
            dog_name: 'Max',
            owner_name: 'John Doe',
            owner_phone: '+91 9876543210',
            scheduled_at: new Date().toISOString(),
            duration_minutes: 30,
            appointment_type: 'Checkup',
            reason: 'Regular health checkup',
            status: 'scheduled' as const,
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            dog_id: 'dog_2',
            dog_name: 'Bella',
            owner_name: 'Jane Smith',
            owner_phone: '+91 9876543211',
            scheduled_at: new Date(Date.now() + 86400000).toISOString(),
            duration_minutes: 45,
            appointment_type: 'Vaccination',
            reason: 'Annual vaccination',
            status: 'confirmed' as const,
            created_at: new Date().toISOString()
          }
        ];
        
        setAppointments(demoAppointments);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch when component is mounted to avoid hydration issues
    if (mounted && typeof window !== 'undefined') {
      fetchAppointments();
    }
  }, [mounted]);

  // Safe filtering function
  const getFilteredAppointments = () => {
    if (!Array.isArray(appointments)) return [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return appointments.filter(appointment => {
      if (!appointment?.scheduled_at) return false;

      try {
        const appointmentDate = new Date(appointment.scheduled_at);
        
        // Skip invalid dates
        if (isNaN(appointmentDate.getTime())) return false;

        // Debug log to see what we're filtering
        console.log('Filtering appointment:', {
          id: appointment.id,
          status: appointment.status,
          scheduled_at: appointment.scheduled_at,
          filter: filter
        });

        switch (filter) {
          case 'today':
            return appointmentDate >= today && appointmentDate < tomorrow;
          case 'upcoming':
            return appointmentDate >= tomorrow;
          case 'completed':
            return appointment.status === 'completed';
          default:
            return true;
        }
      } catch {
        return false;
      }
    });
  };

  const filteredAppointments = getFilteredAppointments();

  // Show consistent loading state to prevent hydration mismatch
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg p-6 h-48 bg-gray-200"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Appointments</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Partner Appointments
          </h1>
          <p className="text-gray-600">
            Manage your scheduled appointments with Dog ID integration
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex space-x-2">
            {(['all', 'today', 'upcoming', 'completed'] as const).map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === filterOption
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Appointments List */}
        <div className="space-y-4">
          {filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No appointments found
              </h3>
              <p className="text-gray-600">
                {filter === 'today' 
                  ? 'No appointments scheduled for today'
                  : `No ${filter} appointments found`
                }
              </p>
            </div>
          ) : (
            filteredAppointments.map((appointment) => (
              <AppointmentCard 
                key={appointment?.id || Math.random()} 
                appointment={appointment} 
                onStatusChange={handleStatusChange}
              />
            ))
          )}
        </div>

        {/* Summary Stats */}
        {isClient && Array.isArray(appointments) && appointments.length > 0 && (
          <div className="mt-8 bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Appointment Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {appointments?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {appointments?.filter(a => a?.status === 'confirmed')?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Confirmed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {appointments?.filter(a => a?.status === 'completed')?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {getFilteredAppointments()?.length || 0}
                </div>
                <div className="text-sm text-gray-600">
                  {filter?.charAt(0)?.toUpperCase() + filter?.slice(1)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerAppointmentsPage;