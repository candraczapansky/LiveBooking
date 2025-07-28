import fetch from 'node-fetch';

async function testClientUpdate() {
  console.log('🧪 Testing Client Update Functionality\n');
  
  try {
    // Step 1: Get all clients
    console.log('1. 📊 Fetching all clients...');
    const response = await fetch('http://localhost:5000/api/users?role=client');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch clients: ${response.status}`);
    }
    
    const clients = await response.json();
    console.log(`   ✓ Found ${clients.length} clients`);
    
    if (clients.length === 0) {
      console.log('   ❌ No clients found to test with');
      return;
    }
    
    // Step 2: Select a test client
    const testClient = clients[0];
    console.log(`\n2. 🎯 Testing with client: ${testClient.firstName} ${testClient.lastName} (ID: ${testClient.id})`);
    console.log(`   Email: ${testClient.email}`);
    console.log(`   Phone: ${testClient.phone}`);
    
    // Step 3: Test updating with a unique email
    const uniqueEmail = `test.${Date.now()}@example.com`;
    console.log(`\n3. 🔄 Testing update with unique email: ${uniqueEmail}`);
    
    const updateData = {
      first_name: testClient.firstName,
      last_name: testClient.lastName,
      email: uniqueEmail,
      phone: testClient.phone || '555-123-4567',
      address: testClient.address || '123 Test St',
      city: testClient.city || 'Test City',
      state: testClient.state || 'TS',
      zip_code: testClient.zipCode || '12345',
      email_account_management: true,
      email_appointment_reminders: true,
      email_promotions: false,
      sms_account_management: false,
      sms_appointment_reminders: true,
      sms_promotions: false,
    };
    
    const updateResponse = await fetch(`http://localhost:5000/api/users/${testClient.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    console.log(`   Response status: ${updateResponse.status}`);
    
    if (updateResponse.ok) {
      const updatedClient = await updateResponse.json();
      console.log('   ✅ Update successful!');
      console.log(`   New email: ${updatedClient.email}`);
      console.log(`   New phone: ${updatedClient.phone}`);
    } else {
      const errorData = await updateResponse.json();
      console.log('   ❌ Update failed:');
      console.log(`   Error: ${errorData.error}`);
    }
    
    // Step 4: Test updating with an email that belongs to another user
    if (clients.length > 1) {
      const otherClient = clients[1];
      console.log(`\n4. 🚫 Testing update with existing email: ${otherClient.email}`);
      
      const conflictData = {
        ...updateData,
        email: otherClient.email,
      };
      
      const conflictResponse = await fetch(`http://localhost:5000/api/users/${testClient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conflictData),
      });
      
      console.log(`   Response status: ${conflictResponse.status}`);
      
      if (conflictResponse.status === 409) {
        const errorData = await conflictResponse.json();
        console.log('   ✅ Correctly blocked duplicate email:');
        console.log(`   Error: ${errorData.error}`);
      } else {
        console.log('   ❌ Should have blocked duplicate email but didn\'t');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testClientUpdate(); 