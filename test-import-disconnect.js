import fetch from 'node-fetch';

async function testImportDisconnect() {
  console.log('🔍 Testing Import API vs Database Disconnect\n');
  
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
    
    // Step 2: Import test clients
    console.log('\n2. 📤 Importing Test Clients');
    const testClients = [
      {
        firstName: 'TestImport',
        lastName: 'Client1',
        email: 'testimport.client1@example.com',
        phone: '555-111-1111'
      },
      {
        firstName: 'TestImport',
        lastName: 'Client2',
        email: 'testimport.client2@example.com',
        phone: '555-222-2222'
      }
    ];
    
    const importResponse = await fetch('http://localhost:5003/api/clients/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clients: testClients })
    });
    
    if (importResponse.ok) {
      const importResult = await importResponse.json();
      console.log(`   ✓ Import API response: ${importResult.imported} imported, ${importResult.skipped} skipped`);
      
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
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 4: Check if clients are actually in database
    console.log('\n4. 🔍 Checking Database After Import');
    const updatedResponse = await fetch('http://localhost:5003/api/users?role=client');
    
    if (updatedResponse.ok) {
      const updatedClients = await updatedResponse.json();
      console.log(`   ✓ Updated total clients: ${updatedClients.length}`);
      
      // Look for the test clients
      const testClient1 = updatedClients.find(client => 
        client.firstName === 'TestImport' && client.lastName === 'Client1'
      );
      
      const testClient2 = updatedClients.find(client => 
        client.firstName === 'TestImport' && client.lastName === 'Client2'
      );
      
      console.log('\n5. 📋 Test Client Status:');
      console.log(`   TestImport Client1: ${testClient1 ? '✅ Found' : '❌ Not found'}`);
      console.log(`   TestImport Client2: ${testClient2 ? '✅ Found' : '❌ Not found'}`);
      
      if (testClient1) {
        console.log(`      Client1 details: ${testClient1.firstName} ${testClient1.lastName} (${testClient1.email})`);
      }
      
      if (testClient2) {
        console.log(`      Client2 details: ${testClient2.firstName} ${testClient2.lastName} (${testClient2.email})`);
      }
      
      // Show recent clients
      console.log('\n6. 📋 Recent 5 Clients:');
      const recentClients = updatedClients.slice(-5);
      recentClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email})`);
      });
      
    } else {
      console.log(`❌ Failed to fetch updated clients: ${updatedResponse.status}`);
    }
    
    console.log('\n7. 💡 Analysis:');
    console.log('   - If API says imported but clients not in database: Database transaction issue');
    console.log('   - If clients are in database: Frontend cache issue');
    console.log('   - Check server logs for database errors');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testImportDisconnect(); 