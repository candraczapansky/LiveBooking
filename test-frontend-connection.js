import fetch from 'node-fetch';

async function testFrontendConnection() {
  console.log('Testing frontend connection to backend...');
  
  try {
    // Test 1: Check if we can reach the API through the backend server
    console.log('\n1. Testing API connectivity through backend server...');
    const response = await fetch('http://localhost:5001/api/users?role=client');
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✓ Backend server working! Found ${data.length} clients`);
    } else {
      console.log(`✗ Backend server failed: ${response.status}`);
    }
    
    // Test 2: Test the import endpoint through backend server
    console.log('\n2. Testing import endpoint through backend server...');
    const testData = [
      {
        firstName: 'Frontend',
        lastName: 'Test',
        email: 'frontend.test@example.com',
        phone: '555-999-8888'
      }
    ];
    
    const importResponse = await fetch('http://localhost:5001/api/clients/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ clients: testData })
    });
    
    if (importResponse.ok) {
      const result = await importResponse.json();
      console.log(`✓ Import through backend server working: ${result.imported} imported, ${result.skipped} skipped`);
    } else {
      const errorText = await importResponse.text();
      console.log(`✗ Import through backend server failed: ${importResponse.status} - ${errorText}`);
    }
    
    // Test 3: Check if frontend is accessible
    console.log('\n3. Testing frontend accessibility...');
    const frontendResponse = await fetch('http://localhost:5001/');
    
    if (frontendResponse.ok) {
      console.log('✓ Frontend is accessible through backend server');
    } else {
      console.log(`✗ Frontend not accessible: ${frontendResponse.status}`);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure the backend server is running on port 5001');
    console.log('2. Check that Vite middleware is properly configured');
    console.log('3. Verify the client directory structure is correct');
  }
}

testFrontendConnection(); 