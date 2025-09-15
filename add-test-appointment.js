const { addAppointmentToStorage, addUserToStorage } = require('./src/lib/demo-storage.js');

async function addTestAppointment() {
  try {
    // Add a test user first
    const testUser = {
      id: 'test-user-1',
      name: 'Test User',
      email: 'test@example.com'
    };
    await addUserToStorage(testUser);
    
    // Add a test appointment for Anya's partner
    const testAppointment = {
      partner_id: 'partner-1755770019060-cybwvukre', // Anya's partner ID from logs
      user_id: 'test-user-1',
      dog_id: 'test-dog-1',
      dog_name: 'Buddy',
      owner_name: 'Test User',
      owner_phone: '+91-9876543210',
      appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      duration_minutes: 60,
      service_type: 'consultation',
      appointment_type: 'Health Checkup',
      reason: 'Regular health check-up for pet.',
      status: 'scheduled',
      consultation_fee: 800,
      payment_status: 'pending',
      meeting_type: 'in_person',
      notes: 'Test appointment booked for Anya\'s clinic'
    };
    
    const result = await addAppointmentToStorage(testAppointment);
    console.log('Test appointment added:', result.id);
    
  } catch (error) {
    console.error('Error adding test appointment:', error);
  }
}

addTestAppointment();