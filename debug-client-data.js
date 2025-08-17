// Debug script to check client data and understand email confirmation issues
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function debugClientData() {
  console.log('🔍 DEBUGGING CLIENT DATA AND EMAIL CONFIRMATION ISSUES');
  console.log('======================================================');

  try {
    // Test 1: Check if client ID 1 exists and has email
    console.log('\n📋 STEP 1: Checking Client Data');
    console.log('================================');
    
    const clientResponse = await fetch(`${BASE_URL}/api/users/1`);
    console.log('Client response status:', clientResponse.status);
    
    if (clientResponse.ok) {
      const client = await clientResponse.json();
      console.log('✅ Client found:');
      console.log('  - ID:', client.id);
      console.log('  - Email:', client.email || '❌ NO EMAIL');
      console.log('  - First Name:', client.firstName);
      console.log('  - Last Name:', client.lastName);
      console.log('  - emailAppointmentReminders:', client.emailAppointmentReminders);
      console.log('  - smsAppointmentReminders:', client.smsAppointmentReminders);
      console.log('  - Phone:', client.phone);
      
      if (!client.email) {
        console.log('❌ ISSUE FOUND: Client has no email address');
        console.log('🔧 SOLUTION: Add an email address to the client');
      }
      
      if (client.emailAppointmentReminders === false) {
        console.log('❌ ISSUE FOUND: emailAppointmentReminders is false');
        console.log('🔧 SOLUTION: Set emailAppointmentReminders to true');
      }
      
      if (client.email && client.emailAppointmentReminders !== false) {
        console.log('✅ Client should receive email confirmations');
      } else {
        console.log('❌ Client will NOT receive email confirmations');
      }
      
    } else {
      console.log('❌ Client not found - this is the issue!');
      console.log('🔧 SOLUTION: Create a client with ID 1 or use a different client ID');
    }

    // Test 2: Check if service ID 1 exists
    console.log('\n📋 STEP 2: Checking Service Data');
    console.log('==================================');
    
    const serviceResponse = await fetch(`${BASE_URL}/api/services/1`);
    console.log('Service response status:', serviceResponse.status);
    
    if (serviceResponse.ok) {
      const service = await serviceResponse.json();
      console.log('✅ Service found:');
      console.log('  - ID:', service.id);
      console.log('  - Name:', service.name);
    } else {
      console.log('❌ Service not found - this could cause issues');
    }

    // Test 3: Check if staff ID 1 exists
    console.log('\n📋 STEP 3: Checking Staff Data');
    console.log('================================');
    
    const staffResponse = await fetch(`${BASE_URL}/api/users/1`);
    console.log('Staff response status:', staffResponse.status);
    
    if (staffResponse.ok) {
      const staff = await staffResponse.json();
      console.log('✅ Staff found:');
      console.log('  - ID:', staff.id);
      console.log('  - First Name:', staff.firstName);
      console.log('  - Last Name:', staff.lastName);
      console.log('  - Role:', staff.role);
    } else {
      console.log('❌ Staff not found - this could cause issues');
    }

    // Test 4: Create a test client with email if needed
    console.log('\n📋 STEP 4: Creating Test Client with Email (if needed)');
    console.log('=======================================================');
    
    const testClientData = {
      firstName: 'Test',
      lastName: 'Client',
      email: 'test@example.com',
      phone: '+1234567890',
      emailAppointmentReminders: true,
      smsAppointmentReminders: true,
      role: 'client'
    };
    
    const createClientResponse = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testClientData)
    });
    
    if (createClientResponse.ok) {
      const newClient = await createClientResponse.json();
      console.log('✅ Test client created:');
      console.log('  - ID:', newClient.id);
      console.log('  - Email:', newClient.email);
      console.log('  - emailAppointmentReminders:', newClient.emailAppointmentReminders);
      
      // Test 5: Create appointment with the new client
      console.log('\n📋 STEP 5: Testing Appointment Creation with New Client');
      console.log('==========================================================');
      
      const uniqueTime = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days from now
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
        console.log('📋 Appointment ID:', appointmentResult.id);
        console.log('📧 Email confirmation should have been triggered for this client.');
        console.log('🔍 Check the server console for enhanced logging messages.');
      } else {
        const errorData = await appointmentResponse.text();
        console.log('❌ Appointment creation failed:', errorData);
      }
      
    } else {
      console.log('❌ Failed to create test client');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug
debugClientData(); 