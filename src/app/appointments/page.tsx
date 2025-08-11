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
        setPartners(data.partners || []);
      }
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/appointments/book');
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
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
      const response = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partner_id: selectedPartner,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          meeting_type: meetingType,
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
    <div className="min-h-screen bg-gradient-to-br from-milk-white via-gray-50 to-gray-100 py-8">
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
                
                <form onSubmit={handleBooking} className="space-y-6">
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
                          {partner.business_name || partner.name} - {partner.partner_type} ({partner.location})
                        </option>
                      ))}
                    </select>
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

                  <button
                    type="submit"
                    disabled={isBooking}
                    className="w-full bg-primary text-white px-6 py-3 rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50"
                  >
                    {isBooking ? 'Booking...' : 'Book Appointment'}
                  </button>
                </form>

                {/* Booking Result */}
                {bookingResult && (
                  <div className={`mt-6 p-4 rounded-lg ${
                    bookingResult.success 
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    <h3 className="font-semibold mb-2">
                      {bookingResult.success ? '✅ Appointment Booked Successfully' : '❌ Booking Failed'}
                    </h3>
                    <p>{bookingResult.message}</p>
                    
                    {bookingResult.data && (
                      <div className="mt-4 p-3 bg-white rounded border">
                        <h4 className="font-medium mb-2">Appointment Details:</h4>
                        <div className="text-sm space-y-1">
                          <p><strong>Appointment ID:</strong> {bookingResult.data.id}</p>
                          <p><strong>Date:</strong> {new Date(bookingResult.data.appointment_date).toLocaleDateString()}</p>
                          <p><strong>Time:</strong> {bookingResult.data.appointment_time}</p>
                          <p><strong>Meeting Type:</strong> {bookingResult.data.meeting_type}</p>
                          <p><strong>Status:</strong> {bookingResult.data.status}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Appointment History Tab */}
            {activeTab === 'history' && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Appointment History</h2>
                
                {appointments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📅</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments yet</h3>
                    <p className="text-gray-600">Book your first appointment to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((appointment) => (
                      <div key={appointment.id} className="bg-gray-50 rounded-lg p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{getMeetingTypeIcon(appointment.meeting_type)}</span>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{appointment.partner_name}</h3>
                              <p className="text-sm text-gray-600">
                                {new Date(appointment.appointment_date).toLocaleDateString()} at {appointment.appointment_time}
                              </p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                            {appointment.status}
                          </span>
                        </div>
                        
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Meeting Type:</span>
                            <p className="text-gray-600 capitalize">{appointment.meeting_type.replace('-', ' ')}</p>
                          </div>
                          <div>
                            <span className="font-medium">Consultation Fee:</span>
                            <p className="text-gray-600">₹{appointment.consultation_fee}</p>
                          </div>
                          <div>
                            <span className="font-medium">Booked On:</span>
                            <p className="text-gray-600">{new Date(appointment.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        {appointment.notes && (
                          <div className="mt-4">
                            <span className="font-medium text-sm">Notes:</span>
                            <p className="text-gray-600 text-sm mt-1">{appointment.notes}</p>
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