import fetch from 'node-fetch';

async function testDirectQuery() {
  console.log('🔍 Testing Direct Database Query\n');
  
  try {
    // First, let's import a client with a phone number
    console.log('1. 📤 Importing test client...');
    const testClient = {
      lastName: 'DirectQuery',
      firstName: 'Test',
      email: 'direct.query.test@example.com',
      phone: '555-777-6666'
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
    
    // Now let's try to get the client using a different endpoint
    console.log('\n3. 🔍 Testing different query approaches...');
    
    // Try getting all users (not just clients)
    console.log('   a) Getting ALL users...');
    const allUsersResponse = await fetch('http://localhost:5003/api/users');
    
    if (allUsersResponse.ok) {
      const allUsers = await allUsersResponse.json();
      const testUser = allUsers.find(user => user.email === 'direct.query.test@example.com');
      
      if (testUser) {
        console.log(`   ✅ Found in all users: ${testUser.firstName} ${testUser.lastName}`);
        console.log(`   📱 Phone: "${testUser.phone}"`);
        console.log(`   🔍 Has phone property: ${'phone' in testUser}`);
      } else {
        console.log(`   ❌ Not found in all users`);
      }
    }
    
    // Try searching for the user
    console.log('   b) Searching for user...');
    const searchResponse = await fetch('http://localhost:5003/api/users?search=direct.query.test@example.com');
    
    if (searchResponse.ok) {
      const searchResults = await searchResponse.json();
      if (searchResults.length > 0) {
        const foundUser = searchResults[0];
        console.log(`   ✅ Found via search: ${foundUser.firstName} ${foundUser.lastName}`);
        console.log(`   📱 Phone: "${foundUser.phone}"`);
        console.log(`   🔍 Has phone property: ${'phone' in foundUser}`);
      } else {
        console.log(`   ❌ Not found via search`);
      }
    }
    
    // Try getting the specific user by ID
    console.log('   c) Getting specific user...');
    const specificResponse = await fetch('http://localhost:5003/api/users?role=client');
    
    if (specificResponse.ok) {
      const clients = await specificResponse.json();
      const testClientFound = clients.find(client => client.email === 'direct.query.test@example.com');
      
      if (testClientFound) {
        console.log(`   ✅ Found via client query: ${testClientFound.firstName} ${testClientFound.lastName}`);
        console.log(`   📱 Phone: "${testClientFound.phone}"`);
        console.log(`   🔍 Has phone property: ${'phone' in testClientFound}`);
        
        // Show all properties
        console.log('\n4. 📋 All properties from client query:');
        Object.keys(testClientFound).forEach(key => {
          console.log(`   ${key}: "${testClientFound[key]}"`);
        });
      } else {
        console.log(`   ❌ Not found via client query`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDirectQuery(); 