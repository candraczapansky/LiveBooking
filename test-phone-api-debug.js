import fetch from 'node-fetch';

async function testPhoneApiDebug() {
  console.log('🧪 Testing Phone API Debug\n');

  try {
    // Test 1: Check the API response structure
    console.log('1. 📊 Testing API response structure...');
    const apiResponse = await fetch('http://localhost:5000/api/users?role=client');
    
    if (apiResponse.ok) {
      const clients = await apiResponse.json();
      
      if (clients.length > 0) {
        console.log('   First client object keys:', Object.keys(clients[0]));
        console.log('   First client object:', clients[0]);
        
        // Check if phone field exists
        const hasPhone = 'phone' in clients[0];
        console.log(`   Has phone field: ${hasPhone}`);
        
        if (hasPhone) {
          console.log(`   Phone value: "${clients[0].phone}"`);
        } else {
          console.log('   ❌ Phone field is missing from API response');
        }
      } else {
        console.log('   No clients found in API response');
      }
    } else {
      console.log(`   ❌ API request failed: ${apiResponse.status}`);
    }

    // Test 2: Check a specific client that we know has a phone number
    console.log('\n2. 📱 Testing specific client with phone...');
    const specificClient = clients.find(client => 
      client.email.includes('testuser1234@example.com')
    );
    
    if (specificClient) {
      console.log('   Found test client:', specificClient.firstName, specificClient.lastName);
      console.log('   Client object keys:', Object.keys(specificClient));
      console.log('   Has phone field:', 'phone' in specificClient);
      
      if ('phone' in specificClient) {
        console.log(`   Phone value: "${specificClient.phone}"`);
      }
    } else {
      console.log('   Test client not found in API response');
    }

    // Test 3: Check all clients for phone field
    console.log('\n3. 📋 Checking all clients for phone field...');
    const clientsWithPhone = clients.filter(client => 'phone' in client && client.phone);
    const clientsWithoutPhone = clients.filter(client => !('phone' in client) || !client.phone);
    
    console.log(`   Clients with phone: ${clientsWithPhone.length}`);
    console.log(`   Clients without phone: ${clientsWithoutPhone.length}`);
    
    if (clientsWithPhone.length > 0) {
      console.log('   Sample client with phone:', clientsWithPhone[0]);
    }

  } catch (error) {
    console.error('❌ Error testing phone API debug:', error.message);
  }
}

testPhoneApiDebug(); 