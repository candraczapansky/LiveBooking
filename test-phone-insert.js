import fetch from 'node-fetch';

async function testPhoneInsert() {
  console.log('🔍 Testing Phone Number Insert and Retrieve\n');
  
  try {
    // Test 1: Import a client with phone number
    console.log('1. 📤 Importing client with phone number...');
    const testClient = {
      lastName: 'PhoneTest',
      firstName: 'Manual',
      email: 'manual.phone.test@example.com',
      phone: '555-123-4567'
    };
    
    const importResponse = await fetch('http://localhost:5003/api/clients/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clients: [testClient] })
    });
    
    if (importResponse.ok) {
      const result = await importResponse.json();
      console.log(`   ✓ Import result: ${result.imported} imported, ${result.skipped} skipped`);
    } else {
      const errorText = await importResponse.text();
      console.log(`   ❌ Import failed: ${importResponse.status} - ${errorText}`);
      return;
    }
    
    // Wait and check results
    console.log('\n2. ⏳ Waiting for database update...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Try to get the specific client by email
    console.log('\n3. 🔍 Checking specific client...');
    const response = await fetch('http://localhost:5003/api/users?role=client');
    
    if (response.ok) {
      const clients = await response.json();
      
      // Find our test client
      const testClientFound = clients.find(client => 
        client.email === 'manual.phone.test@example.com'
      );
      
      if (testClientFound) {
        console.log(`   ✅ Test client found: ${testClientFound.firstName} ${testClientFound.lastName}`);
        console.log(`   📱 Phone number: "${testClientFound.phone}"`);
        console.log(`   📧 Email: ${testClientFound.email}`);
        console.log(`   🆔 ID: ${testClientFound.id}`);
        
        // Show all properties
        console.log('\n4. 📋 All properties:');
        Object.keys(testClientFound).forEach(key => {
          console.log(`   ${key}: "${testClientFound[key]}"`);
        });
        
      } else {
        console.log(`   ❌ Test client NOT found`);
      }
      
    } else {
      console.log(`❌ Failed to fetch clients: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPhoneInsert(); 