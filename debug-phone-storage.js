import fetch from 'node-fetch';

async function debugPhoneStorage() {
  console.log('🔍 Debugging Phone Number Storage\n');
  
  try {
    // Test with the exact phone format from user: 9185048902
    console.log('1. 📤 Testing phone number storage: 9185048902');
    const testClient = {
      lastName: 'Debug',
      firstName: 'Phone',
      email: 'phone.debug@example.com',
      phone: '9185048902'
    };
    
    console.log('   📤 Sending to backend:', testClient);
    
    const importResponse = await fetch('http://localhost:5003/api/clients/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clients: [testClient] })
    });
    
    if (importResponse.ok) {
      const result = await importResponse.json();
      console.log(`   ✓ Import result: ${result.imported} imported, ${result.skipped} skipped`);
      if (result.errors && result.errors.length > 0) {
        console.log(`   ⚠️  Import errors: ${result.errors.join(', ')}`);
      }
    } else {
      const errorText = await importResponse.text();
      console.log(`   ❌ Import failed: ${importResponse.status} - ${errorText}`);
      return;
    }
    
    // Wait and check results
    console.log('\n2. ⏳ Waiting for database update...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n3. 🔍 Checking database directly...');
    const response = await fetch('http://localhost:5003/api/users?role=client');
    
    if (response.ok) {
      const clients = await response.json();
      
      // Find our test client
      const debugClient = clients.find(client => 
        client.firstName === 'Phone' && client.lastName === 'Debug'
      );
      
      if (debugClient) {
        console.log(`   ✅ Debug client found: ${debugClient.firstName} ${debugClient.lastName}`);
        console.log(`   📱 Phone number: "${debugClient.phone}"`);
        console.log(`   📧 Email: ${debugClient.email}`);
        console.log(`   🆔 ID: ${debugClient.id}`);
        
        // Check if phone is undefined, null, or empty
        if (debugClient.phone === undefined) {
          console.log(`   ❌ Phone is undefined`);
        } else if (debugClient.phone === null) {
          console.log(`   ❌ Phone is null`);
        } else if (debugClient.phone === '') {
          console.log(`   ❌ Phone is empty string`);
        } else {
          console.log(`   ✅ Phone has value: "${debugClient.phone}"`);
        }
        
        // Show the full client object for debugging
        console.log('\n4. 📋 Full client object:');
        console.log(JSON.stringify(debugClient, null, 2));
        
      } else {
        console.log(`   ❌ Debug client NOT found`);
        
        // Show recent clients to see what's in the database
        console.log('\n4. 📋 Recent clients in database:');
        const recentClients = clients.slice(-5);
        recentClients.forEach((client, index) => {
          console.log(`   ${index + 1}. ${client.firstName} ${client.lastName}: phone="${client.phone}"`);
        });
      }
      
    } else {
      console.log(`❌ Failed to fetch clients: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

debugPhoneStorage(); 