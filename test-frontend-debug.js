import fetch from 'node-fetch';

async function testFrontendDebug() {
  console.log('🔍 Frontend Debug Test\n');
  
  try {
    // Test 1: Check if the server is running and accessible
    console.log('1. Server Status Check');
    const serverResponse = await fetch('http://localhost:5003/api/users?role=client');
    
    if (serverResponse.ok) {
      const serverData = await serverResponse.json();
      console.log(`   ✓ Server running: ${serverData.length} clients`);
      
      // Check for specific test clients
      const testClients = serverData.filter(client => 
        client.email.includes('test.user') || 
        client.email.includes('frontend.test') ||
        client.email.includes('debug.test')
      );
      
      console.log(`   ✓ Test clients found: ${testClients.length}`);
      testClients.forEach((client, index) => {
        console.log(`     ${index + 1}. ${client.firstName} ${client.lastName} (${client.email})`);
      });
    } else {
      console.log(`   ✗ Server not responding: ${serverResponse.status}`);
      return;
    }
    
    // Test 2: Check if the frontend proxy would work
    console.log('\n2. Frontend Proxy Test');
    console.log('   Note: This tests what the frontend would see through the Vite proxy');
    
    // Simulate the frontend request
    const frontendResponse = await fetch('http://localhost:5003/api/users?role=client', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (frontendResponse.ok) {
      const frontendData = await frontendResponse.json();
      console.log(`   ✓ Frontend proxy would work: ${frontendData.length} clients`);
      
      // Check if the data structure is correct
      if (frontendData.length > 0) {
        const sampleClient = frontendData[0];
        console.log('   Sample client structure:', {
          id: sampleClient.id,
          firstName: sampleClient.firstName,
          lastName: sampleClient.lastName,
          email: sampleClient.email,
          role: sampleClient.role
        });
      }
    } else {
      console.log(`   ✗ Frontend proxy test failed: ${frontendResponse.status}`);
    }
    
    // Test 3: Check for any filtering issues
    console.log('\n3. Data Filtering Test');
    const allUsersResponse = await fetch('http://localhost:5003/api/users');
    
    if (allUsersResponse.ok) {
      const allUsers = await allUsersResponse.json();
      const clientUsers = allUsers.filter(user => user.role === 'client');
      
      console.log(`   ✓ Total users: ${allUsers.length}`);
      console.log(`   ✓ Client users: ${clientUsers.length}`);
      console.log(`   ✓ Non-client users: ${allUsers.length - clientUsers.length}`);
      
      if (allUsers.length !== clientUsers.length) {
        console.log('   ⚠️  Some users have different roles (admin, staff, etc.)');
      }
    }
    
    // Test 4: Check for recent imports
    console.log('\n4. Recent Import Check');
    const recentResponse = await fetch('http://localhost:5003/api/users?role=client');
    
    if (recentResponse.ok) {
      const recentData = await recentResponse.json();
      const recentClients = recentData.slice(-10); // Last 10 clients
      
      console.log('   Recent clients (last 10):');
      recentClients.forEach((client, index) => {
        const isTest = client.email.includes('test') || client.email.includes('debug') || client.email.includes('frontend');
        const marker = isTest ? ' 🧪' : '';
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email})${marker}`);
      });
    }
    
    console.log('\n5. 🛠️  Frontend Debugging Steps:');
    console.log('   1. Open browser and go to: http://localhost:5003/');
    console.log('   2. Open Developer Tools (F12)');
    console.log('   3. Go to Console tab');
    console.log('   4. Look for "Client list debug:" logs');
    console.log('   5. Go to Network tab');
    console.log('   6. Refresh the page');
    console.log('   7. Look for the request to /api/users?role=client');
    console.log('   8. Check if the response contains the expected data');
    console.log('   9. If the request fails, check the proxy configuration');
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
  }
}

testFrontendDebug(); 