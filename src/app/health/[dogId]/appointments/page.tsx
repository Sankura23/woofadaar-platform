'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, MapPin, Plus, User, Phone, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface VetAppointment {
  id: string;
  appointment_datetime: string;
  appointment_type: string;
  reason: string;
  status: string;
  notes?: string;
  veterinarian?: string;
  clinic_name?: string;
  clinic_address?: string;
  clinic_phone?: string;
  reminder_sent: boolean;
  created_at: string;
}

interface Dog {
  id: string;
  name: string;
  breed: string;
  photo_url?: string;
}

export default function AppointmentsPage({ params }: { params: { dogId: string } }) {
  const [appointments, setAppointments] = useState<VetAppointment[]>([]);
  const [dog, setDog] = useState<Dog | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const router = useRouter();

  const dogId = params.dogId;

  useEffect(() => {
    if (dogId) {
      fetchDogAndAppointments();
    }
  }, [dogId]);

  const fetchDogAndAppointments = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      
      // Fetch dog details
      const dogResponse = await fetch(`/api/dogs/${dogId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (dogResponse.ok) {
        const dogData = await dogResponse.json();
        setDog(dogData.dog);
      }

      // For now, we'll show a placeholder since the vet appointments API needs to be implemented
      // In a full implementation, this would fetch from /api/vet-appointments/${dogId}
      setAppointments([]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-milk-white via-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3bbca8] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appointments...</p>
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
              {dog?.name}'s Vet Appointments
            </h1>
            <p className="text-gray-600">Manage veterinary appointments and visits</p>
          </div>
          <Link
            href="/appointments"
            className="flex items-center px-4 py-2 bg-[#3bbca8] text-white rounded-lg hover:bg-[#2daa96] transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Book Appointment
          </Link>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all' 
                  ? 'bg-[#3bbca8] text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'upcoming' 
                  ? 'bg-[#3bbca8] text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'completed' 
                  ? 'bg-[#3bbca8] text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Appointments List */}
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center shadow-sm">
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Appointments</h3>
              <p className="text-gray-500 mb-6">
                No vet appointments have been scheduled for {dog?.name} yet.
              </p>
              <div className="space-y-3">
                <Link
                  href="/appointments"
                  className="inline-flex items-center px-6 py-3 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Book Appointment
                </Link>
                <p className="text-sm text-gray-500">
                  Use our partner directory to find and book with local veterinarians
                </p>
              </div>
            </div>
          ) : (
            appointments.map((appointment) => {
              const { date, time } = formatDateTime(appointment.appointment_datetime);
              return (
                <div key={appointment.id} className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <Calendar className="w-5 h-5 text-[#3bbca8] mr-2" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {appointment.appointment_type}
                        </h3>
                        <span className={`ml-3 px-2 py-1 text-xs rounded-full ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-gray-600 mb-2">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>{date} at {time}</span>
                      </div>

                      {appointment.clinic_name && (
                        <div className="flex items-center text-gray-600 mb-2">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span>{appointment.clinic_name}</span>
                        </div>
                      )}

                      {appointment.veterinarian && (
                        <div className="flex items-center text-gray-600 mb-2">
                          <User className="w-4 h-4 mr-2" />
                          <span>Dr. {appointment.veterinarian}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {appointment.reason && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-1">Reason:</p>
                      <p className="text-gray-800">{appointment.reason}</p>
                    </div>
                  )}

                  {appointment.notes && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-1">Notes:</p>
                      <p className="text-gray-800">{appointment.notes}</p>
                    </div>
                  )}

                  {appointment.clinic_address && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-1">Address:</p>
                      <p className="text-gray-800">{appointment.clinic_address}</p>
                    </div>
                  )}

                  {appointment.clinic_phone && (
                    <div className="flex items-center text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      <span>{appointment.clinic_phone}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                Book Appointments Through Partners
              </h4>
              <p className="text-sm text-blue-700">
                Use our "Book Appointments" feature to find and schedule with verified veterinary partners in your area. 
                Appointments booked through partners will automatically appear here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}