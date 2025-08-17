// Test script to verify the ping endpoint
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001';

async function testPingEndpoint() {
  console.log('🧪 Testing Terminal Ping Endpoint...\n');
  
  // Test 1: Ping with your actual device code
  console.log('✅ Test 1: Pinging XOG5 device');
  try {
    const response = await fetch(`${BASE_URL}/api/terminal/ping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceCode: 'XOG5'
      })
    });
    
    const data = await response.json();
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Data:`, JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('🎉 Ping successful! Device is online.');
    } else {
      console.log('⚠️ Ping failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Ping request failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 2: Ping with HF1N device
  console.log('✅ Test 2: Pinging HF1N device');
  try {
    const response = await fetch(`${BASE_URL}/api/terminal/ping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceCode: 'HF1N'
      })
    });
    
    const data = await response.json();
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Data:`, JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('🎉 Ping successful! Device is online.');
    } else {
      console.log('⚠️ Ping failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Ping request failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 3: Test with invalid device code
  console.log('✅ Test 3: Testing with invalid device code');
  try {
    const response = await fetch(`${BASE_URL}/api/terminal/ping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceCode: 'INVALID123'
      })
    });
    
    const data = await response.json();
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Data:`, JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('⚠️ Unexpected success with invalid device code');
    } else {
      console.log('✅ Correctly rejected invalid device code');
    }
  } catch (error) {
    console.log('❌ Ping request failed:', error.message);
  }
  
  console.log('\n🏁 Ping endpoint tests completed!');
}

testPingEndpoint().catch(console.error);





