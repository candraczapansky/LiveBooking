import fetch from 'node-fetch';

async function testPhoneDebug() {
  console.log('🔍 Debugging Phone Number Import Process\n');
  
  try {
    // Test with a simple phone number
    console.log('1. 📤 Testing phone number import with backend logging...');
    const testClient = {
      lastName: 'DebugPhone',
      firstName: 'Test',
      email: 'debug.phone.test@example.com',
      phone: '555-999-8888'
    };
    
    console.log('   📤 Sending to backend:', JSON.stringify(testClient, null, 2));
    
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
    
    console.log('\n3. 🔍 Checking database result...');
    const response = await fetch('http://localhost:5003/api/users?role=client');
    
    if (response.ok) {
      const clients = await response.json();
      
      // Find our test client
      const debugClient = clients.find(client => 
        client.email === 'debug.phone.test@example.com'
      );
      
      if (debugClient) {
        console.log(`   ✅ Debug client found: ${debugClient.firstName} ${debugClient.lastName}`);
        console.log(`   📱 Phone number: "${debugClient.phone}"`);
        console.log(`   📧 Email: ${debugClient.email}`);
        console.log(`   🆔 ID: ${debugClient.id}`);
        
        // Check if phone property exists
        console.log(`   🔍 Has 'phone' property: ${'phone' in debugClient}`);
        console.log(`   🔍 Phone type: ${typeof debugClient.phone}`);
        
        // Show all properties
        console.log('\n4. 📋 All properties:');
        Object.keys(debugClient).forEach(key => {
          console.log(`   ${key}: "${debugClient[key]}"`);
        });
        
        console.log('\n5. 💡 Analysis:');
        if (!('phone' in debugClient)) {
          console.log('   ❌ Phone property is completely missing from the response');
        } else if (debugClient.phone === undefined) {
          console.log('   ❌ Phone property exists but is undefined');
        } else if (debugClient.phone === null) {
          console.log('   ❌ Phone property is null');
        } else if (debugClient.phone === '') {
          console.log('   ❌ Phone property is empty string');
        } else {
          console.log('   ✅ Phone property has a value');
        }
        
      } else {
        console.log(`   ❌ Debug client NOT found`);
      }
      
    } else {
      console.log(`❌ Failed to fetch clients: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPhoneDebug(); 