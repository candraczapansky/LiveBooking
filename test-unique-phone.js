import fetch from 'node-fetch';

async function testUniquePhone() {
  console.log('🧪 Testing Import with Unique Phone Number\n');
  
  try {
    // Test with a unique phone number
    console.log('1. 📤 Testing import with unique phone number...');
    const testClient = {
      firstName: 'Unique',
      lastName: 'PhoneTest',
      email: 'unique.phone.test@example.com',
      phone: '(555) 999-8888'
    };
    
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
    
    // Wait for database update
    console.log('\n2. ⏳ Waiting for database update...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check API response
    console.log('\n3. 🔍 Checking API response...');
    const apiResponse = await fetch('http://localhost:5003/api/users?role=client');
    
    if (apiResponse.ok) {
      const clients = await apiResponse.json();
      
      // Find our test client
      const testClientFound = clients.find(client => 
        client.email.includes('unique.phone.test@example.com')
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
    } else {
      console.log(`   ❌ Failed to get clients: ${apiResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing unique phone:', error.message);
  }
}

testUniquePhone(); 