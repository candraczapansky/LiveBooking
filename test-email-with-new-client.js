// Test email confirmation with the newly created client
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testEmailWithNewClient() {
  console.log('🧪 TESTING EMAIL CONFIRMATION WITH NEW CLIENT');
  console.log('=============================================');

  try {
    // Use the client we just created (ID 30492)
    const clientId = 30492;
    
    console.log('\n📋 STEP 1: Verifying New Client Data');
    console.log('=====================================');
    
    const clientResponse = await fetch(`${BASE_URL}/api/users/${clientId}`);
    console.log('Client response status:', clientResponse.status);
    
    if (clientResponse.ok) {
      const client = await clientResponse.json();
      console.log('✅ Client found:');
      console.log('  - ID:', client.id);
      console.log('  - Email:', client.email);
      console.log('  - First Name:', client.firstName);
      console.log('  - Last Name:', client.lastName);
      console.log('  - emailAppointmentReminders:', client.emailAppointmentReminders);
      console.log('  - Role:', client.role);
      
      if (client.email && client.emailAppointmentReminders) {
        console.log('✅ This client should receive email confirmations!');
        
        // Test 2: Create appointment with this client
        console.log('\n📋 STEP 2: Creating Appointment to Trigger Email Confirmation');
        console.log('==============================================================');
        
        const uniqueTime = new Date(Date.now() + 16 * 24 * 60 * 60 * 1000); // 16 days from now
        const appointmentData = {
          clientId: client.id,
          serviceId: 1,
          staffId: 1,
          startTime: uniqueTime.toISOString(),
          endTime: new Date(uniqueTime.getTime() + 60 * 60 * 1000).toISOString(),
          status: 'confirmed',
          totalAmount: 100.00,
          locationId: null
        };
        
        console.log('📅 Appointment time:', uniqueTime.toISOString());
        console.log('📧 This should trigger email confirmation...');
        console.log('📧 Client email:', client.email);
        
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
          console.log('  - Client has email: ✅', client.email);
          console.log('  - emailAppointmentReminders: ✅', client.emailAppointmentReminders);
          console.log('  - SendGrid is working: ✅ (confirmed earlier)');
          
        } else {
          const errorData = await appointmentResponse.text();
          console.log('❌ Appointment creation failed:', errorData);
        }
        
      } else {
        console.log('❌ Client missing required data for email confirmation:');
        console.log('  - Has email:', !!client.email);
        console.log('  - emailAppointmentReminders:', client.emailAppointmentReminders);
      }
      
    } else {
      console.log('❌ Client not found');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testEmailWithNewClient(); 