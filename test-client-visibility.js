import fetch from 'node-fetch';

async function testClientVisibility() {
  console.log('🔍 Testing Client Visibility Issue\n');
  
  try {
    // Test 1: Check current client count
    console.log('1. 📊 Current Client Count');
    const response = await fetch('http://localhost:5003/api/users?role=client');
    
    if (response.ok) {
      const clients = await response.json();
      console.log(`   ✓ Found ${clients.length} total clients`);
      
      // Show the most recent clients
      const recentClients = clients.slice(-5);
      console.log('\n   Recent clients:');
      recentClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email}) - ID: ${client.id}`);
      });
    } else {
      console.log(`   ✗ Failed to fetch clients: ${response.status}`);
      return;
    }
    
    // Test 2: Check if we can see the imported test clients
    console.log('\n2. 🔍 Looking for Imported Test Clients');
    const testEmails = [
      'test.user3@example.com',
      'frontend.test@example.com', 
      'debug.test@example.com',
      'test.import@example.com',
      'test.user2@example.com'
    ];
    
    const response2 = await fetch('http://localhost:5003/api/users?role=client');
    if (response2.ok) {
      const allClients = await response2.json();
      
      testEmails.forEach(email => {
        const client = allClients.find(c => c.email === email);
        if (client) {
          console.log(`   ✓ Found: ${client.firstName} ${client.lastName} (${client.email})`);
        } else {
          console.log(`   ✗ Missing: ${email}`);
        }
      });
    }
    
    // Test 3: Test the API endpoint that the frontend uses
    console.log('\n3. 🌐 Testing Frontend API Endpoint');
    const frontendResponse = await fetch('http://localhost:5003/api/users?role=client');
    
    if (frontendResponse.ok) {
      const frontendClients = await frontendResponse.json();
      console.log(`   ✓ Frontend API working: ${frontendClients.length} clients`);
      
      // Check if the response includes the expected fields
      if (frontendClients.length > 0) {
        const sampleClient = frontendClients[0];
        console.log('   Sample client fields:', Object.keys(sampleClient));
      }
    } else {
      console.log(`   ✗ Frontend API failed: ${frontendResponse.status}`);
    }
    
    // Test 4: Check for any filtering issues
    console.log('\n4. 🔍 Checking for Filtering Issues');
    const allUsersResponse = await fetch('http://localhost:5003/api/users');
    
    if (allUsersResponse.ok) {
      const allUsers = await allUsersResponse.json();
      const clientUsers = allUsers.filter(user => user.role === 'client');
      console.log(`   ✓ Total users: ${allUsers.length}`);
      console.log(`   ✓ Client users: ${clientUsers.length}`);
      
      if (allUsers.length !== clientUsers.length) {
        console.log('   ⚠️  Some users have different roles (admin, staff, etc.)');
      }
    }
    
    console.log('\n5. 🛠️  Troubleshooting Steps');
    console.log('   If clients are not showing up in the frontend:');
    console.log('   1. Check browser developer tools (F12)');
    console.log('   2. Go to Network tab');
    console.log('   3. Refresh the clients page');
    console.log('   4. Look for the API request to /api/users?role=client');
    console.log('   5. Check if the response contains the expected clients');
    console.log('   6. Check if there are any JavaScript errors in Console tab');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testClientVisibility(); 