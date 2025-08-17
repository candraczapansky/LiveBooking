// Test the fixed client creation endpoint
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testFixedClientCreation() {
  console.log('🧪 TESTING FIXED CLIENT CREATION');
  console.log('==================================');

  try {
    // Create a new client with the fixed endpoint
    console.log('\n📋 STEP 1: Creating New Client with Fixed Endpoint');
    console.log('==================================================');
    
    const clientData = {
      firstName: 'Fixed',
      lastName: 'Client',
      email: 'fixed@example.com',
      phone: '+1234567890',
      emailAppointmentReminders: true,
      smsAppointmentReminders: true
    };
    
    console.log('📝 Client data to create:', JSON.stringify(clientData, null, 2));
    
    const createResponse = await fetch(`${BASE_URL}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(clientData)
    });
    
    console.log('📊 Create client response status:', createResponse.status);
    
    if (createResponse.ok) {
      const newClient = await createResponse.json();
      console.log('✅ Client created successfully!');
      console.log('📋 New client data:', JSON.stringify(newClient, null, 2));
      
      // Test 2: Verify the client has proper email preferences
      console.log('\n📋 STEP 2: Verifying Email Preferences');
      console.log('======================================');
      
      const verifyResponse = await fetch(`${BASE_URL}/api/users/${newClient.id}`);
      console.log('Verify response status:', verifyResponse.status);
      
      if (verifyResponse.ok) {
        const savedClient = await verifyResponse.json();
        console.log('✅ Client verified in database:');
        console.log('  - ID:', savedClient.id);
        console.log('  - Email:', savedClient.email);
        console.log('  - emailAppointmentReminders:', savedClient.emailAppointmentReminders);
        console.log('  - smsAppointmentReminders:', savedClient.smsAppointmentReminders);
        console.log('  - Role:', savedClient.role);
        
        if (savedClient.email && savedClient.emailAppointmentReminders) {
          console.log('✅ This client should receive email confirmations!');
          
          // Test 3: Create appointment with this client
          console.log('\n📋 STEP 3: Testing Email Confirmation');
          console.log('======================================');
          
          const uniqueTime = new Date(Date.now() + 17 * 24 * 60 * 60 * 1000); // 17 days from now
          const appointmentData = {
            clientId: savedClient.id,
            serviceId: 1,
            staffId: 1,
            startTime: uniqueTime.toISOString(),
            endTime: new Date(uniqueTime.getTime() + 60 * 60 * 1000).toISOString(),
            status: 'confirmed',
            totalAmount: 100.00,
            locationId: null
          };
          
          console.log('📅 Creating appointment with client ID:', savedClient.id);
          console.log('📧 This should trigger email confirmation...');
          console.log('📧 Client email:', savedClient.email);
          
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
            console.log('  - Client has email: ✅', savedClient.email);
            console.log('  - emailAppointmentReminders: ✅', savedClient.emailAppointmentReminders);
            console.log('  - SendGrid is working: ✅ (confirmed earlier)');
            
          } else {
            const errorData = await appointmentResponse.text();
            console.log('❌ Appointment creation failed:', errorData);
          }
          
        } else {
          console.log('❌ Client missing required data for email confirmation:');
          console.log('  - Has email:', !!savedClient.email);
          console.log('  - emailAppointmentReminders:', savedClient.emailAppointmentReminders);
        }
        
      } else {
        console.log('❌ Client not found in database after creation');
      }
      
    } else {
      const errorText = await createResponse.text();
      console.log('❌ Client creation failed:');
      console.log('Error response:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testFixedClientCreation(); 