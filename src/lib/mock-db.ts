// Mock database service for development/testing when real database is unavailable
export interface MockPartner {
  id: string;
  name: string;
  email: string;
  business_name: string;
  partner_type: string;
  status: string;
  verified: boolean;
}

export interface MockAppointment {
  id: string;
  partner_id: string;
  user_id: string;
  appointment_date: string;
  service_type: string;
  status: string;
  consultation_fee: number;
  meeting_type: string;
  notes?: string;
  created_at: string;
}

export interface MockPartnerBooking {
  id: string;
  partner_id: string;
  user_id: string;
  service_type: string;
  booking_type: string;
  appointment_datetime: string;
  duration_minutes: number;
  status: string;
  price: number;
  notes?: string;
  created_at: string;
}

// Mock data
const mockPartners: MockPartner[] = [
  {
    id: 'mock_partner_1',
    name: 'Dr. Sarah Johnson',
    email: 'dr.sarah@vetclinic.com',
    business_name: 'Happy Paws Veterinary Clinic',
    partner_type: 'vet',
    status: 'approved',
    verified: true
  },
  {
    id: 'mock_partner_2',
    name: 'Mike Trainer',
    email: 'mike@dogtraining.com',
    business_name: 'Pawsome Training Academy',
    partner_type: 'trainer',
    status: 'approved',
    verified: true
  }
];

const mockAppointments: MockAppointment[] = [
  {
    id: 'mock_appointment_1',
    partner_id: 'mock_partner_1',
    user_id: 'mock_user_1',
    appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    service_type: 'consultation',
    status: 'scheduled',
    consultation_fee: 800,
    meeting_type: 'in_person',
    notes: 'Regular checkup for Max',
    created_at: new Date().toISOString()
  },
  {
    id: 'mock_appointment_2',
    partner_id: 'mock_partner_2',
    user_id: 'mock_user_1',
    appointment_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
    service_type: 'training',
    status: 'confirmed',
    consultation_fee: 600,
    meeting_type: 'in_person',
    notes: 'Basic obedience training',
    created_at: new Date().toISOString()
  }
];

const mockPartnerBookings: MockPartnerBooking[] = [
  {
    id: 'mock_booking_1',
    partner_id: 'mock_partner_1',
    user_id: 'mock_user_1',
    service_type: 'consultation',
    booking_type: 'in_person',
    appointment_datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 60,
    status: 'pending',
    price: 800,
    notes: 'Regular checkup for Max',
    created_at: new Date().toISOString()
  },
  {
    id: 'mock_booking_2',
    partner_id: 'mock_partner_2',
    user_id: 'mock_user_1',
    service_type: 'training',
    booking_type: 'in_person',
    appointment_datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 60,
    status: 'confirmed',
    price: 600,
    notes: 'Basic obedience training',
    created_at: new Date().toISOString()
  }
];

// Mock database functions
export const mockDb = {
  // Partner functions
  findPartners: () => mockPartners,
  findPartnerById: (id: string) => mockPartners.find(p => p.id === id),
  
  // Appointment functions
  findAppointments: (where?: any) => {
    if (!where) return mockAppointments;
    return mockAppointments.filter(apt => {
      if (where.partner_id && apt.partner_id !== where.partner_id) return false;
      if (where.status && apt.status !== where.status) return false;
      return true;
    });
  },
  countAppointments: (where?: any) => mockDb.findAppointments(where).length,
  
  // PartnerBooking functions
  findPartnerBookings: (where?: any) => {
    if (!where) return mockPartnerBookings;
    return mockPartnerBookings.filter(booking => {
      if (where.partner_id && booking.partner_id !== where.partner_id) return false;
      if (where.status && booking.status !== where.status) return false;
      return true;
    });
  },
  countPartnerBookings: (where?: any) => mockDb.findPartnerBookings(where).length,
  
  // Create new appointment
  createAppointment: (data: Omit<MockAppointment, 'id' | 'created_at'>) => {
    const newAppointment: MockAppointment = {
      ...data,
      id: `mock_appointment_${Date.now()}`,
      created_at: new Date().toISOString()
    };
    mockAppointments.push(newAppointment);
    return newAppointment;
  },
  
  // Create new partner booking
  createPartnerBooking: (data: Omit<MockPartnerBooking, 'id' | 'created_at'>) => {
    const newBooking: MockPartnerBooking = {
      ...data,
      id: `mock_booking_${Date.now()}`,
      created_at: new Date().toISOString()
    };
    mockPartnerBookings.push(newBooking);
    return newBooking;
  }
};

