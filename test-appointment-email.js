// Test script to simulate appointment creation and test email confirmation
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testAppointmentCreation() {
  console.log('🧪 TESTING APPOINTMENT CREATION AND EMAIL CONFIRMATION');
  console.log('=====================================================');

  try {
    // Test 1: Check if server is running
    console.log('\n📋 STEP 1: Server Health Check');
    const healthResponse = await fetch(`${BASE_URL}/api/test-sendgrid-config`);
    const healthData = await healthResponse.json();
    console.log('Server status:', healthResponse.status);
    console.log('SendGrid config:', healthData.success ? '✅ Working' : '❌ Failed');

    // Test 2: Create a test appointment
    console.log('\n📋 STEP 2: Creating Test Appointment');
    
    const appointmentData = {
      clientId: 1, // Assuming client ID 1 exists
      serviceId: 1, // Assuming service ID 1 exists  
      staffId: 1,   // Assuming staff ID 1 exists
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
      status: 'confirmed',
      totalAmount: 100.00,
      locationId: null
    };

    console.log('Appointment data:', JSON.stringify(appointmentData, null, 2));

    const appointmentResponse = await fetch(`${BASE_URL}/api/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData)
    });

    console.log('Appointment creation response status:', appointmentResponse.status);
    
    if (appointmentResponse.ok) {
      const appointmentResult = await appointmentResponse.json();
      console.log('✅ Appointment created successfully!');
      console.log('Appointment ID:', appointmentResult.id);
      
      // Test 3: Check if email confirmation was triggered
      console.log('\n📋 STEP 3: Email Confirmation Check');
      console.log('The appointment creation should have triggered email confirmation.');
      console.log('Check the server logs above for email-related messages.');
      console.log('Look for messages like:');
      console.log('- "Sending email confirmation"');
      console.log('- "Email confirmation sent successfully"');
      console.log('- "Failed to send email confirmation"');
      
    } else {
      const errorData = await appointmentResponse.text();
      console.log('❌ Appointment creation failed:');
      console.log('Status:', appointmentResponse.status);
      console.log('Error:', errorData);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('This might indicate:');
    console.error('1. Server is not running');
    console.error('2. Database connection issues');
    console.error('3. Missing required data (clients, services, staff)');
  }
}

// Test 4: Direct email test using the email service
async function testDirectEmailService() {
  console.log('\n📋 STEP 4: Direct Email Service Test');
  console.log('=====================================');

  try {
    const emailData = {
      to: 'test@example.com',
      from: 'hello@headspaglo.com',
      subject: 'Direct Email Service Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Direct Email Service Test</h2>
          <p>This is a test of the email service directly.</p>
          <p>If you receive this email, the email service is working correctly.</p>
        </div>
      `,
      text: 'Direct Email Service Test - This is a test of the email service directly.'
    };

    const emailResponse = await fetch(`${BASE_URL}/api/email-marketing/send-template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateType: 'appointment_confirmation',
        recipientEmail: 'test@example.com',
        recipientName: 'Test User',
        subject: 'Direct Email Service Test',
        data: {
          serviceName: 'Test Service',
          appointmentDate: new Date().toLocaleDateString(),
          appointmentTime: '10:00 AM - 11:00 AM',
          staffName: 'Test Staff'
        }
      })
    });

    console.log('Direct email service response status:', emailResponse.status);
    
    if (emailResponse.ok) {
      const emailResult = await emailResponse.json();
      console.log('✅ Direct email service test result:', emailResult);
    } else {
      const errorData = await emailResponse.text();
      console.log('❌ Direct email service failed:');
      console.log('Status:', emailResponse.status);
      console.log('Error:', errorData);
    }

  } catch (error) {
    console.error('❌ Direct email service test failed:', error.message);
  }
}

// Run the tests
(async () => {
  await testAppointmentCreation();
  await testDirectEmailService();
  
  console.log('\n📋 STEP 5: Summary');
  console.log('==================');
  console.log('If the tests above show:');
  console.log('✅ SendGrid is working (confirmed by our earlier test)');
  console.log('✅ Server is running and responding');
  console.log('❌ But email confirmations are not being sent');
  console.log('');
  console.log('Then the issue is likely:');
  console.log('1. Client data missing or incorrect');
  console.log('2. emailAppointmentReminders setting is false');
  console.log('3. Exception in the email sending code');
  console.log('4. Database connection issues');
  console.log('');
  console.log('Check the server logs for specific error messages.');
})(); 