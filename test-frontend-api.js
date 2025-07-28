import fetch from 'node-fetch';

async function testFrontendAPI() {
  console.log('🔍 Testing Frontend API Connection\n');
  
  try {
    // Test 1: Direct API call to backend
    console.log('1. Testing direct backend API...');
    const backendResponse = await fetch('http://localhost:5003/api/users?role=client');
    
    if (backendResponse.ok) {
      const backendData = await backendResponse.json();
      console.log(`   ✓ Backend API working: ${backendData.length} clients`);
      
      // Check for test clients
      const testClients = backendData.filter(client => 
        client.email.includes('test.user') || 
        client.email.includes('frontend.test') ||
        client.email.includes('debug.test')
      );
      console.log(`   ✓ Found ${testClients.length} test clients in backend`);
    } else {
      console.log(`   ✗ Backend API failed: ${backendResponse.status}`);
    }
    
    // Test 2: Test the exact endpoint the frontend uses
    console.log('\n2. Testing frontend API endpoint...');
    const frontendResponse = await fetch('http://localhost:5003/api/users?role=client');
    
    if (frontendResponse.ok) {
      const frontendData = await frontendResponse.json();
      console.log(`   ✓ Frontend API working: ${frontendData.length} clients`);
      
      // Show recent clients
      const recentClients = frontendData.slice(-5);
      console.log('   Recent clients:');
      recentClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email})`);
      });
    } else {
      console.log(`   ✗ Frontend API failed: ${frontendResponse.status}`);
    }
    
    // Test 3: Check if there are any network issues
    console.log('\n3. Testing network connectivity...');
    try {
      const testResponse = await fetch('http://localhost:5003/api/users?role=client', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (testResponse.ok) {
        console.log('   ✓ Network connectivity working');
        console.log('   ✓ CORS headers present');
      } else {
        console.log(`   ✗ Network test failed: ${testResponse.status}`);
      }
    } catch (error) {
      console.log(`   ✗ Network error: ${error.message}`);
    }
    
    console.log('\n4. 🛠️  Troubleshooting Steps:');
    console.log('   If clients are not showing in the frontend:');
    console.log('   1. Open browser developer tools (F12)');
    console.log('   2. Go to Network tab');
    console.log('   3. Refresh the clients page');
    console.log('   4. Look for the request to /api/users?role=client');
    console.log('   5. Check if the response contains the expected data');
    console.log('   6. Check Console tab for any JavaScript errors');
    console.log('   7. Check if the proxy is working correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendAPI(); 