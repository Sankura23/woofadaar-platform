'use client';

import { useState, useEffect } from 'react';

interface Partner {
  id: string;
  name: string;
  business_name: string | null;
  partner_type: string;
  location: string;
  consultation_fee: string | null;
  services_offered: string | null;
}

interface Appointment {
  id: string;
  partner_id: string;
  partner_name: string;
  appointment_date: string;
  appointment_time: string;
  meeting_type: string;
  consultation_fee: number;
  status: string;
  notes: string | null;
  created_at: string;
}

export default function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState<'book' | 'history'>('book');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [meetingType, setMeetingType] = useState('in-person');
  const [serviceType, setServiceType] = useState('consultation');
  const [notes, setNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);

  useEffect(() => {
    fetchPartners();
    fetchAppointments();
  }, []);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/partners?limit=50');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.partners) {
          setPartners(data.partners);
        } else if (data.partners) {
          setPartners(data.partners);
        } else {
          setPartners([]);
        }
      } else {
        setPartners([]);
      }
    } catch (error) {
      console.error('Error fetching partners:', error);
      setPartners([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) return;
      
      const response = await fetch('/api/auth/working-appointments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.data?.appointments || []);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBooking(true);
    setBookingResult(null);

    try {
      // Get the authentication token
      const token = localStorage.getItem('woofadaar_token') || sessionStorage.getItem('woofadaar_token');
      
      if (!token) {
        setBookingResult({
          success: false,
          message: 'Please login to book appointments. You will be redirected to the login page.',
        });
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }
      
      const response = await fetch('/api/auth/working-appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          partner_id: selectedPartner,
          appointment_date: `${appointmentDate}T${appointmentTime}:00.000Z`,
          service_type: serviceType,
          meeting_type: meetingType === 'in-person' ? 'in_person' : 
                       meetingType === 'video' ? 'video_call' : 
                       meetingType === 'phone' ? 'phone_call' : meetingType,
          notes,
        }),
      });

      const result = await response.json();
      setBookingResult(result);

      if (result.success) {
        // Reset form
        setSelectedPartner('');
        setAppointmentDate('');
        setAppointmentTime('');
        setMeetingType('in-person');
        setServiceType('consultation');
        setNotes('');
        // Refresh appointments
        fetchAppointments();
      }
    } catch (error) {
      setBookingResult({
        success: false,
        message: 'Failed to book appointment. Please try again.',
      });
    } finally {
      setIsBooking(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case 'in-person':
        return '🏥';
      case 'video':
        return '📹';
      case 'phone':
        return '📞';
      default:
        return '📅';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">📅 Appointments</h1>
          <p className="text-lg text-gray-600">
            Book appointments with verified partners and manage your schedule
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('book')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'book'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Book Appointment
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Appointment History
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Book Appointment Tab */}
            {activeTab === 'book' && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Book New Appointment</h2>
                
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading partners...</p>
                  </div>
                ) : (
                  <form onSubmit={handleBooking} className="space-y-6">
                    {/* Partner Selection */}
                    <div>
                      <label htmlFor="partner" className="block text-sm font-medium text-gray-700 mb-2">
                        Select Partner *
                      </label>
                      {loading ? (
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                          Loading partners...
                        </div>
                      ) : partners.length === 0 ? (
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-yellow-50 text-yellow-700">
                          No partners available. Please check back later or contact support.
                        </div>
                      ) : (
                        <>
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
                                {partner.business_name || `${partner.name}'s ${partner.partner_type === 'vet' ? 'Clinic' : partner.partner_type === 'trainer' ? 'Training' : partner.partner_type === 'groomer' ? 'Grooming' : partner.partner_type === 'corporate' ? 'Services' : 'Practice'}`} - {partner.partner_type.charAt(0).toUpperCase() + partner.partner_type.slice(1)} ({partner.location})
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                      {partners.length > 0 && (
                        <p className="mt-1 text-sm text-gray-500">
                          Found {partners.length} partner(s) available for appointments
                        </p>
                      )}
                    </div>

                  {/* Date and Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="appointment_date" className="block text-sm font-medium text-gray-700 mb-2">
                        Appointment Date *
                      </label>
                      <input
                        type="date"
                        id="appointment_date"
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="appointment_time" className="block text-sm font-medium text-gray-700 mb-2">
                        Appointment Time *
                      </label>
                      <input
                        type="time"
                        id="appointment_time"
                        value={appointmentTime}
                        onChange={(e) => setAppointmentTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  {/* Service Type */}
                  <div>
                    <label htmlFor="service_type" className="block text-sm font-medium text-gray-700 mb-2">
                      Service Type *
                    </label>
                    <select
                      id="service_type"
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    >
                      <option value="consultation">🩺 General Consultation</option>
                      <option value="treatment">💊 Treatment Session</option>
                      <option value="training">🎾 Training Session</option>
                      <option value="emergency">🚨 Emergency Consultation</option>
                    </select>
                  </div>

                  {/* Meeting Type */}
                  <div>
                    <label htmlFor="meeting_type" className="block text-sm font-medium text-gray-700 mb-2">
                      Meeting Type *
                    </label>
                    <select
                      id="meeting_type"
                      value={meetingType}
                      onChange={(e) => setMeetingType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    >
                      <option value="in-person">🏥 In-Person Consultation</option>
                      <option value="video">📹 Video Call</option>
                      <option value="phone">📞 Phone Call</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Any specific concerns or questions you'd like to discuss..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isBooking}
                    className="w-full bg-primary text-white px-6 py-3 rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50"
                  >
                    {isBooking ? 'Booking...' : 'Book Appointment'}
                  </button>

                  {/* Booking Result */}
                  {bookingResult && (
                    <div className={`p-4 rounded-md ${
                      bookingResult.success 
                        ? 'bg-green-50 border border-green-200 text-green-800' 
                        : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                      {bookingResult.message}
                    </div>
                  )}
                </form>
                )}
              </div>
            )}

            {/* Appointment History Tab */}
            {activeTab === 'history' && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Appointment History</h2>
                
                {appointments.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-800 mb-2">No Appointments Found</h3>
                      <p className="text-gray-600">
                        You haven't booked any appointments yet. Book your first appointment above!
                      </p>
                    </div>
                  </div>
                ) : (
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {appointment.partner_name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {new Date(appointment.appointment_date).toLocaleDateString()} at{' '}
                            {appointment.appointment_time}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            appointment.status
                          )}`}
                        >
                          {appointment.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>{getMeetingTypeIcon(appointment.meeting_type)} {appointment.meeting_type}</span>
                        <span>₹{appointment.consultation_fee}</span>
                      </div>
                      
                      {appointment.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-sm text-gray-700">{appointment.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
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