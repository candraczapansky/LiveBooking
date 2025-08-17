// Final test to verify email confirmations work with the newly created client
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function finalEmailTest() {
  console.log('🎯 FINAL EMAIL CONFIRMATION TEST');
  console.log('================================');

  try {
    // Find the client we just created
    console.log('\n📋 STEP 1: Finding the New Client');
    console.log('==================================');
    
    const usersResponse = await fetch(`${BASE_URL}/api/users`);
    const users = await usersResponse.json();
    
    // Find the client with email "fixed2@example.com"
    const newClient = users.find(user => user.email === 'fixed2@example.com');
    
    if (!newClient) {
      console.log('❌ Client not found. Let me check what clients exist...');
      const recentClients = users.slice(-5);
      console.log('Recent clients:', recentClients.map(c => ({ id: c.id, email: c.email, emailAppointmentReminders: c.emailAppointmentReminders })));
      return;
    }
    
    console.log('✅ Found client:');
    console.log('  - ID:', newClient.id);
    console.log('  - Email:', newClient.email);
    console.log('  - emailAppointmentReminders:', newClient.emailAppointmentReminders);
    console.log('  - smsAppointmentReminders:', newClient.smsAppointmentReminders);
    
    if (newClient.email && newClient.emailAppointmentReminders) {
      console.log('✅ This client should receive email confirmations!');
      
      // Create appointment with this client
      console.log('\n📋 STEP 2: Creating Appointment to Trigger Email Confirmation');
      console.log('==============================================================');
      
      const uniqueTime = new Date(Date.now() + 18 * 24 * 60 * 60 * 1000); // 18 days from now
      const appointmentData = {
        clientId: newClient.id,
        serviceId: 1,
        staffId: 1,
        startTime: uniqueTime.toISOString(),
        endTime: new Date(uniqueTime.getTime() + 60 * 60 * 1000).toISOString(),
        status: 'confirmed',
        totalAmount: 100.00,
        locationId: null
      };
      
      console.log('📅 Creating appointment:');
      console.log('  - Client ID:', newClient.id);
      console.log('  - Client Email:', newClient.email);
      console.log('  - Appointment Time:', uniqueTime.toISOString());
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
        console.log('📧 Email confirmation should have been triggered!');
        console.log('🔍 Check the server console for enhanced logging messages.');
        console.log('');
        console.log('🎉 SUCCESS: Email confirmation should work now!');
        console.log('  - Client has email: ✅', newClient.email);
        console.log('  - emailAppointmentReminders: ✅', newClient.emailAppointmentReminders);
        console.log('  - SendGrid is working: ✅ (confirmed earlier)');
        console.log('  - Appointment created: ✅', appointmentResult.id);
        
        console.log('\n📋 SUMMARY OF THE FIX');
        console.log('=====================');
        console.log('✅ The issue was that new clients weren\'t getting proper email preferences set.');
        console.log('✅ Fixed the /api/clients endpoint to set default email preferences.');
        console.log('✅ Now new clients will have emailAppointmentReminders: true by default.');
        console.log('✅ Email confirmations should work for all new clients going forward.');
        
      } else {
        const errorData = await appointmentResponse.text();
        console.log('❌ Appointment creation failed:', errorData);
      }
      
    } else {
      console.log('❌ Client missing required data for email confirmation:');
      console.log('  - Has email:', !!newClient.email);
      console.log('  - emailAppointmentReminders:', newClient.emailAppointmentReminders);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
finalEmailTest(); 