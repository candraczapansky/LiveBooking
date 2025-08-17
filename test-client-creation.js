// Test script to debug client creation issues
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testClientCreation() {
  console.log('🧪 TESTING CLIENT CREATION');
  console.log('==========================');

  try {
    // Test 1: Check if users endpoint exists
    console.log('\n📋 STEP 1: Testing Users Endpoint');
    console.log('==================================');
    
    const usersResponse = await fetch(`${BASE_URL}/api/users`);
    console.log('Users endpoint response status:', usersResponse.status);
    
    if (usersResponse.ok) {
      const users = await usersResponse.json();
      console.log('✅ Users endpoint working');
      console.log('Current users count:', users.length);
    } else {
      console.log('❌ Users endpoint not working');
      console.log('Response:', await usersResponse.text());
    }

    // Test 2: Try to create a test client
    console.log('\n📋 STEP 2: Creating Test Client');
    console.log('================================');
    
    const testClientData = {
      firstName: 'Test',
      lastName: 'Client',
      email: 'test@example.com',
      phone: '+1234567890',
      emailAppointmentReminders: true,
      smsAppointmentReminders: true,
      role: 'client',
      username: 'testclient',
      password: 'testpassword123'
    };
    
    console.log('📝 Client data to create:', JSON.stringify(testClientData, null, 2));
    
    const createResponse = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testClientData)
    });
    
    console.log('📊 Create client response status:', createResponse.status);
    console.log('📊 Create client response headers:', createResponse.headers);
    
    if (createResponse.ok) {
      const newClient = await createResponse.json();
      console.log('✅ Client created successfully!');
      console.log('📋 New client data:', JSON.stringify(newClient, null, 2));
      
      // Test 3: Verify the client was saved by fetching it
      console.log('\n📋 STEP 3: Verifying Client Was Saved');
      console.log('======================================');
      
      const verifyResponse = await fetch(`${BASE_URL}/api/users/${newClient.id}`);
      console.log('Verify response status:', verifyResponse.status);
      
      if (verifyResponse.ok) {
        const savedClient = await verifyResponse.json();
        console.log('✅ Client verified in database:');
        console.log('  - ID:', savedClient.id);
        console.log('  - Email:', savedClient.email);
        console.log('  - emailAppointmentReminders:', savedClient.emailAppointmentReminders);
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

    // Test 4: Check database connection
    console.log('\n📋 STEP 4: Testing Database Connection');
    console.log('======================================');
    
    const dbTestResponse = await fetch(`${BASE_URL}/api/test-sendgrid-config`);
    console.log('Database test response status:', dbTestResponse.status);
    
    if (dbTestResponse.ok) {
      console.log('✅ Database connection appears to be working');
    } else {
      console.log('❌ Database connection issues detected');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('This might indicate:');
    console.error('1. Server is not running');
    console.error('2. Database connection issues');
    console.error('3. Validation errors in client data');
    console.error('4. Missing required fields');
  }
}

// Test 5: Check what endpoints are available
async function checkAvailableEndpoints() {
  console.log('\n📋 STEP 5: Checking Available Endpoints');
  console.log('========================================');
  
  const endpoints = [
    '/api/users',
    '/api/services',
    '/api/appointments',
    '/api/test-sendgrid-config'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      console.log(`${endpoint}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`${endpoint}: ERROR - ${error.message}`);
    }
  }
}

// Run the tests
(async () => {
  await testClientCreation();
  await checkAvailableEndpoints();
  
  console.log('\n📋 SUMMARY');
  console.log('==========');
  console.log('If client creation is failing, check:');
  console.log('1. Database connection');
  console.log('2. Required fields in client data');
  console.log('3. Validation rules');
  console.log('4. Server logs for specific error messages');
})(); 