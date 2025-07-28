import fetch from 'node-fetch';

async function debugImportSearch() {
  console.log('🔍 Comprehensive Import & Search Debug\n');
  
  try {
    // Step 1: Check current database state
    console.log('1. 📊 Current Database State');
    const response = await fetch('http://localhost:5003/api/users?role=client');
    
    if (!response.ok) {
      console.log(`❌ Failed to fetch clients: ${response.status}`);
      return;
    }
    
    const clients = await response.json();
    console.log(`   ✓ Total clients in database: ${clients.length}`);
    
    // Step 2: Import a test client with a unique name
    console.log('\n2. 📤 Importing Test Client');
    const testClient = {
      firstName: 'DebugTest',
      lastName: 'SearchClient',
      email: 'debugtest.search@example.com',
      phone: '555-999-8888'
    };
    
    const importResponse = await fetch('http://localhost:5003/api/clients/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clients: [testClient] })
    });
    
    if (importResponse.ok) {
      const importResult = await importResponse.json();
      console.log(`   ✓ Import result: ${importResult.imported} imported, ${importResult.skipped} skipped`);
      if (importResult.errors && importResult.errors.length > 0) {
        console.log(`   ⚠️  Import errors: ${importResult.errors.join(', ')}`);
      }
    } else {
      const errorText = await importResponse.text();
      console.log(`   ❌ Import failed: ${importResponse.status} - ${errorText}`);
      return;
    }
    
    // Step 3: Wait a moment for database to update
    console.log('\n3. ⏳ Waiting for database update...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 4: Fetch updated client list
    console.log('\n4. 🔄 Fetching Updated Client List');
    const updatedResponse = await fetch('http://localhost:5003/api/users?role=client');
    
    if (!updatedResponse.ok) {
      console.log(`❌ Failed to fetch updated clients: ${updatedResponse.status}`);
      return;
    }
    
    const updatedClients = await updatedResponse.json();
    console.log(`   ✓ Updated total clients: ${updatedClients.length}`);
    
    // Step 5: Look for the test client
    console.log('\n5. 🔍 Looking for Test Client');
    const testClientFound = updatedClients.find(client => 
      client.firstName === 'DebugTest' && client.lastName === 'SearchClient'
    );
    
    if (testClientFound) {
      console.log(`   ✅ Test client found in database:`);
      console.log(`      Name: ${testClientFound.firstName} ${testClientFound.lastName}`);
      console.log(`      Email: ${testClientFound.email}`);
      console.log(`      Phone: ${testClientFound.phone}`);
      console.log(`      ID: ${testClientFound.id}`);
    } else {
      console.log(`   ❌ Test client NOT found in database`);
    }
    
    // Step 6: Test search functionality
    console.log('\n6. 🧪 Testing Search Functionality');
    const searchQueries = ['debugtest', 'searchclient', 'debug', 'search'];
    
    searchQueries.forEach(query => {
      const filteredClients = updatedClients.filter(client => {
        return client.username.toLowerCase().includes(query.toLowerCase()) ||
               client.email.toLowerCase().includes(query.toLowerCase()) ||
               (client.firstName && client.firstName.toLowerCase().includes(query.toLowerCase())) ||
               (client.lastName && client.lastName.toLowerCase().includes(query.toLowerCase())) ||
               (client.phone && client.phone.includes(query));
      });
      
      const found = filteredClients.some(client => 
        client.firstName === 'DebugTest' && client.lastName === 'SearchClient'
      );
      
      console.log(`   Search "${query}": ${found ? '✅ Found' : '❌ Not found'} (${filteredClients.length} total results)`);
      
      if (filteredClients.length > 0) {
        console.log(`      Results: ${filteredClients.map(c => `${c.firstName} ${c.lastName}`).join(', ')}`);
      }
    });
    
    // Step 7: Test frontend cache invalidation
    console.log('\n7. 🔄 Testing Cache Invalidation');
    console.log('   This simulates what the frontend should do after import...');
    
    // Simulate the frontend cache invalidation
    const cacheResponse = await fetch('http://localhost:5003/api/users?role=client');
    if (cacheResponse.ok) {
      const cacheClients = await cacheResponse.json();
      const cacheTestClient = cacheClients.find(client => 
        client.firstName === 'DebugTest' && client.lastName === 'SearchClient'
      );
      
      console.log(`   Cache test: ${cacheTestClient ? '✅ Found' : '❌ Not found'}`);
    }
    
    // Step 8: Show recent clients
    console.log('\n8. 📋 Recent 5 Clients');
    const recentClients = updatedClients.slice(-5);
    recentClients.forEach((client, index) => {
      console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email})`);
    });
    
    console.log('\n9. 💡 Troubleshooting Summary:');
    console.log('   - If test client is found in database but not in search: Search logic issue');
    console.log('   - If test client is not in database: Import issue');
    console.log('   - If test client is in database and search: Frontend cache issue');
    console.log('   - Try searching for "DebugTest" or "SearchClient" in the frontend');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugImportSearch(); 