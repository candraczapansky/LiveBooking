// Simple script to check client data and test email confirmation
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function simpleClientCheck() {
  console.log('🔍 SIMPLE CLIENT CHECK');
  console.log('======================');

  try {
    // Check the client we just created
    const clientResponse = await fetch(`${BASE_URL}/api/users/30496`);
    const client = await clientResponse.json();
    
    console.log('Client data:');
    console.log('  - ID:', client.id);
    console.log('  - Email:', client.email);
    console.log('  - emailAppointmentReminders:', client.emailAppointmentReminders);
    console.log('  - smsAppointmentReminders:', client.smsAppointmentReminders);
    
    // Test direct email sending
    console.log('\nTesting direct email sending...');
    const emailResponse = await fetch(`${BASE_URL}/api/test-sendgrid-config`);
    const emailData = await emailResponse.json();
    
    console.log('SendGrid test:', emailData.success ? '✅ Working' : '❌ Failed');
    
    // Test appointment creation with email confirmation
    console.log('\nCreating appointment to trigger email confirmation...');
    const appointmentData = {
      clientId: 30496,
      serviceId: 1,
      staffId: 1,
      startTime: "2025-08-10T10:00:00.000Z",
      endTime: "2025-08-10T11:00:00.000Z",
      status: "confirmed",
      totalAmount: 100.00,
      locationId: null
    };
    
    const appointmentResponse = await fetch(`${BASE_URL}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointmentData)
    });
    
    if (appointmentResponse.ok) {
      const appointment = await appointmentResponse.json();
      console.log('✅ Appointment created:', appointment.id);
      console.log('📧 Email confirmation should have been sent to:', client.email);
    } else {
      console.log('❌ Appointment creation failed');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

simpleClientCheck(); 