import { NextRequest, NextResponse } from 'next/server';
import { registerNewPartner, addAppointmentToStorage, addUserToStorage } from '@/lib/demo-storage';

export async function POST(request: NextRequest) {
  try {
    // Add Anya's partner to demo storage
    const anyaPartner = await registerNewPartner({
      name: 'Dr. Anya Veterinarian',
      email: 'a@a.com',
      password: 'demo123',
      partner_type: 'vet',
      business_name: 'Anyas Vet Clinic',
      location: 'Mumbai, Maharashtra',
      phone: '+91-9876543215',
      website: '',
      bio: 'Experienced veterinarian specializing in pet care',
      services_offered: 'General consultation, health check-ups, vaccinations',
      consultation_fee: '800',
      availability_hours: '9 AM - 6 PM',
      certifications: 'BVSc, MVSc'
    });
    
    // Override the auto-generated ID to match what we saw in logs
    anyaPartner.id = 'partner-1755770019060-cybwvukre';
    anyaPartner.status = 'approved';
    anyaPartner.verified = true;
    
    // Add a test user
    const testUser = {
      id: 'test-user-for-anya',
      name: 'Pet Parent Test',
      email: 'pet.parent@test.com',
      password: 'test123',
      barkPoints: 200,
      reputation: 50,
      createdAt: new Date().toISOString()
    };
    await addUserToStorage(testUser);
    
    // Add test appointments for Anya's clinic
    const testAppointments = [
      {
        partner_id: 'partner-1755770019060-cybwvukre',
        user_id: 'test-user-for-anya',
        dog_id: 'test-dog-1',
        dog_name: 'Buddy',
        owner_name: 'Pet Parent Test',
        owner_phone: '+91-9876543210',
        appointment_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        duration_minutes: 60,
        service_type: 'consultation',
        appointment_type: 'Health Checkup',
        reason: 'Regular health check-up for senior dog.',
        status: 'scheduled',
        consultation_fee: 800,
        payment_status: 'pending',
        meeting_type: 'in_person',
        notes: 'Real appointment booked with Anyas Vet Clinic'
      },
      {
        partner_id: 'partner-1755770019060-cybwvukre',
        user_id: 'test-user-for-anya',
        dog_id: 'test-dog-2',
        dog_name: 'Luna',
        owner_name: 'Pet Parent Test',
        owner_phone: '+91-9876543210',
        appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        duration_minutes: 90,
        service_type: 'treatment',
        appointment_type: 'Vaccination',
        reason: 'Follow-up vaccination and ear cleaning.',
        status: 'confirmed',
        consultation_fee: 1200,
        payment_status: 'paid',
        meeting_type: 'in_person',
        notes: 'Second appointment for vaccination follow-up'
      }
    ];
    
    const createdAppointments = [];
    for (const apt of testAppointments) {
      const result = await addAppointmentToStorage(apt);
      createdAppointments.push(result);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test data added successfully',
      data: {
        partner: anyaPartner,
        user: testUser,
        appointments: createdAppointments
      }
    });
    
  } catch (error) {
    console.error('Error adding test data:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to add test data',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}