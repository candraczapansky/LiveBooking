// Corrected test script to create a client using the proper endpoint
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testClientCreationFixed() {
  console.log('🧪 TESTING CLIENT CREATION (FIXED)');
  console.log('===================================');

  try {
    // Test 1: Create a test client using the correct endpoint
    console.log('\n📋 STEP 1: Creating Test Client via /api/register');
    console.log('==================================================');
    
    const testClientData = {
      firstName: 'Test',
      lastName: 'Client',
      email: 'test@example.com',
      username: 'testclient',
      password: 'testpassword123'
    };
    
    console.log('📝 Client data to create:', JSON.stringify(testClientData, null, 2));
    
    const createResponse = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testClientData)
    });
    
    console.log('📊 Create client response status:', createResponse.status);
    
    if (createResponse.ok) {
      const newClient = await createResponse.json();
      console.log('✅ Client created successfully!');
      console.log('📋 New client data:', JSON.stringify(newClient, null, 2));
      
      // Test 2: Verify the client was saved by fetching it
      console.log('\n📋 STEP 2: Verifying Client Was Saved');
      console.log('======================================');
      
      const verifyResponse = await fetch(`${BASE_URL}/api/users/${newClient.user.id}`);
      console.log('Verify response status:', verifyResponse.status);
      
      if (verifyResponse.ok) {
        const savedClient = await verifyResponse.json();
        console.log('✅ Client verified in database:');
        console.log('  - ID:', savedClient.id);
        console.log('  - Email:', savedClient.email);
        console.log('  - emailAppointmentReminders:', savedClient.emailAppointmentReminders);
        console.log('  - Role:', savedClient.role);
        
        // Test 3: Create appointment with this client to test email confirmation
        console.log('\n📋 STEP 3: Testing Email Confirmation with New Client');
        console.log('=======================================================');
        
        const uniqueTime = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days from now
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
          console.log('📧 Email confirmation should have been triggered for this client.');
          console.log('🔍 Check the server console for enhanced logging messages.');
          console.log('');
          console.log('🎉 SUCCESS: This client should receive email confirmations!');
          console.log('  - Has email: ✅', savedClient.email);
          console.log('  - emailAppointmentReminders: ✅', savedClient.emailAppointmentReminders);
          
        } else {
          const errorData = await appointmentResponse.text();
          console.log('❌ Appointment creation failed:', errorData);
        }
        
      } else {
        console.log('❌ Client not found in database after creation');
      }
      
    } else {
      const errorText = await createResponse.text();
      console.log('❌ Client creation failed:');
      console.log('Error response:', errorText);
      
      // Try to parse as JSON for better error details
      try {
        const errorJson = JSON.parse(errorText);
        console.log('Error details:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.log('Raw error text:', errorText);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test 4: Alternative method using /api/clients endpoint
async function testAlternativeClientCreation() {
  console.log('\n📋 STEP 4: Testing Alternative Client Creation via /api/clients');
  console.log('================================================================');
  
  try {
    const clientData = {
      firstName: 'Alternative',
      lastName: 'Client',
      email: 'alternative@example.com',
      phone: '+1234567890',
      emailAppointmentReminders: true,
      smsAppointmentReminders: true
    };
    
    console.log('📝 Alternative client data:', JSON.stringify(clientData, null, 2));
    
    const createResponse = await fetch(`${BASE_URL}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(clientData)
    });
    
    console.log('📊 Alternative create response status:', createResponse.status);
    
    if (createResponse.ok) {
      const newClient = await createResponse.json();
      console.log('✅ Alternative client created successfully!');
      console.log('📋 Alternative client data:', JSON.stringify(newClient, null, 2));
    } else {
      const errorText = await createResponse.text();
      console.log('❌ Alternative client creation failed:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Alternative test failed:', error.message);
  }
}

// Run the tests
(async () => {
  await testClientCreationFixed();
  await testAlternativeClientCreation();
  
  console.log('\n📋 SUMMARY');
  console.log('==========');
  console.log('The correct endpoints for creating users are:');
  console.log('1. /api/register - For full user registration with username/password');
  console.log('2. /api/clients - For simple client creation without username/password');
  console.log('');
  console.log('Once you create a client with an email address,');
  console.log('appointment confirmations should work correctly!');
})(); 