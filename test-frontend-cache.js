import fetch from 'node-fetch';

async function testFrontendCache() {
  console.log('🧪 Testing Frontend Cache Improvements\n');
  
  try {
    // Test 1: Import a test client
    console.log('1. 📤 Importing test client...');
    const testClient = {
      firstName: 'FrontendTest',
      lastName: 'CacheClient',
      email: 'frontendtest.cache@example.com',
      phone: '555-777-9999'
    };
    
    const importResponse = await fetch('http://localhost:5003/api/clients/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clients: [testClient] })
    });
    
    if (importResponse.ok) {
      const result = await importResponse.json();
      console.log(`   ✓ Import successful: ${result.imported} imported, ${result.skipped} skipped`);
    } else {
      console.log(`   ❌ Import failed: ${importResponse.status}`);
      return;
    }
    
    // Test 2: Verify client is in database
    console.log('\n2. 🔍 Verifying client in database...');
    const response = await fetch('http://localhost:5003/api/users?role=client');
    
    if (response.ok) {
      const clients = await response.json();
      const testClientFound = clients.find(client => 
        client.firstName === 'FrontendTest' && client.lastName === 'CacheClient'
      );
      
      if (testClientFound) {
        console.log(`   ✅ Test client found in database: ${testClientFound.firstName} ${testClientFound.lastName}`);
        console.log(`   📧 Email: ${testClientFound.email}`);
        console.log(`   📱 Phone: ${testClientFound.phone}`);
        console.log(`   🆔 ID: ${testClientFound.id}`);
      } else {
        console.log(`   ❌ Test client not found in database`);
      }
    }
    
    console.log('\n3. 💡 Next Steps:');
    console.log('   - Try searching for "FrontendTest" in the frontend');
    console.log('   - If found: Cache improvements are working');
    console.log('   - If not found: There may still be a cache issue');
    console.log('   - Try refreshing the page (F5) and searching again');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendCache(); 