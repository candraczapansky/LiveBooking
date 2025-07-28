import fetch from 'node-fetch';

async function testPhoneFix() {
  console.log('🔍 Testing and Fixing Phone Number Issue\n');
  
  try {
    // Test 1: Import a client with phone number
    console.log('1. 📤 Importing test client with phone number...');
    const testClient = {
      firstName: 'Phone',
      lastName: 'FixTest',
      email: 'phone.fix.test@example.com',
      phone: '(555) 123-4567'
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
    
    // Wait for database update
    console.log('\n2. ⏳ Waiting for database update...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Check what the API returns
    console.log('\n3. 🔍 Checking API response...');
    const apiResponse = await fetch('http://localhost:5003/api/users?role=client');
    
    if (apiResponse.ok) {
      const clients = await apiResponse.json();
      
      // Find our test client
      const testClientFound = clients.find(client => 
        client.email.includes('phone.fix.test@example.com')
      );
      
      if (testClientFound) {
        console.log('   ✅ Found test client in API response:');
        console.log(`      Name: ${testClientFound.firstName} ${testClientFound.lastName}`);
        console.log(`      Email: ${testClientFound.email}`);
        console.log(`      Phone: "${testClientFound.phone}" (type: ${typeof testClientFound.phone})`);
        console.log(`      Phone length: ${testClientFound.phone ? testClientFound.phone.length : 0}`);
        
        if (testClientFound.phone && testClientFound.phone !== '') {
          console.log('   ✅ Phone number IS being returned by API!');
        } else {
          console.log('   ❌ Phone number is NOT being returned by API');
        }
      } else {
        console.log('   ❌ Test client not found in API response');
      }
      
      // Check a few other recent clients
      console.log('\n4. 📱 Checking other recent clients:');
      const recentClients = clients.slice(-5);
      recentClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName}: phone="${client.phone}"`);
      });
    } else {
      console.log(`   ❌ Failed to get clients: ${apiResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing phone fix:', error.message);
  }
}

testPhoneFix(); 