// Focused test to trigger email confirmation and see enhanced logging
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testEmailConfirmation() {
  console.log('🧪 TESTING EMAIL CONFIRMATION WITH ENHANCED LOGGING');
  console.log('===================================================');

  try {
    // Test 1: Check server health
    console.log('\n📋 STEP 1: Server Health Check');
    const healthResponse = await fetch(`${BASE_URL}/api/test-sendgrid-config`);
    const healthData = await healthResponse.json();
    console.log('✅ Server is running and SendGrid is configured');

    // Test 2: Create appointment with a unique time to avoid conflicts
    console.log('\n📋 STEP 2: Creating Appointment to Trigger Email Confirmation');
    
    const uniqueTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const appointmentData = {
      clientId: 1,
      serviceId: 1,
      staffId: 1,
      startTime: uniqueTime.toISOString(),
      endTime: new Date(uniqueTime.getTime() + 60 * 60 * 1000).toISOString(), // +1 hour
      status: 'confirmed',
      totalAmount: 100.00,
      locationId: null
    };

    console.log('📅 Appointment time:', uniqueTime.toISOString());
    console.log('📧 This should trigger email confirmation...');

    const appointmentResponse = await fetch(`${BASE_URL}/api/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData)
    });

    console.log('📊 Appointment creation response status:', appointmentResponse.status);
    
    if (appointmentResponse.ok) {
      const appointmentResult = await appointmentResponse.json();
      console.log('✅ Appointment created successfully!');
      console.log('📋 Appointment ID:', appointmentResult.id);
      console.log('📧 Email confirmation should have been triggered.');
      console.log('🔍 Check the server console for enhanced logging messages.');
      
    } else {
      const errorData = await appointmentResponse.text();
      console.log('❌ Appointment creation failed:');
      console.log('Status:', appointmentResponse.status);
      console.log('Error:', errorData);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test 3: Direct email test to verify the enhanced logging
async function testDirectEmail() {
  console.log('\n📋 STEP 3: Direct Email Test with Enhanced Logging');
  console.log('===================================================');

  try {
    const emailResponse = await fetch(`${BASE_URL}/api/email-marketing/send-template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateType: 'appointment_confirmation',
        recipientEmail: 'test@example.com',
        recipientName: 'Test User',
        subject: 'Direct Email Test with Enhanced Logging',
        data: {
          serviceName: 'Test Service',
          appointmentDate: new Date().toLocaleDateString(),
          appointmentTime: '10:00 AM - 11:00 AM',
          staffName: 'Test Staff'
        }
      })
    });

    console.log('📊 Direct email response status:', emailResponse.status);
    
    if (emailResponse.ok) {
      const emailResult = await emailResponse.json();
      console.log('✅ Direct email test result:', emailResult);
      console.log('🔍 Check server console for enhanced logging messages.');
    } else {
      const errorData = await emailResponse.text();
      console.log('❌ Direct email failed:');
      console.log('Status:', emailResponse.status);
      console.log('Error:', errorData);
    }

  } catch (error) {
    console.error('❌ Direct email test failed:', error.message);
  }
}

// Run the tests
(async () => {
  await testEmailConfirmation();
  await testDirectEmail();
  
  console.log('\n📋 SUMMARY');
  console.log('==========');
  console.log('The enhanced logging should show:');
  console.log('📧 SENDEMAIL CALLED - Debug Info:');
  console.log('📧 SENDEMAIL - Environment Check:');
  console.log('📧 SENDEMAIL - Final Configuration:');
  console.log('📧 SENDEMAIL - Attempting to send email with SendGrid...');
  console.log('✅ SENDEMAIL - Email sent successfully to:');
  console.log('');
  console.log('If you see these messages, the email confirmation is working.');
  console.log('If you don\'t see them, there\'s an issue in the appointment creation logic.');
})(); 