// Test script to verify terminal API endpoints
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001';

async function testEndpoint(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    console.log(`🔍 Testing ${method} ${endpoint}...`);
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    console.log(`✅ ${endpoint} - Status: ${response.status}`);
    console.log(`📊 Response:`, JSON.stringify(data, null, 2));
    console.log('');
    
    return { success: true, data, status: response.status };
  } catch (error) {
    console.log(`❌ ${endpoint} - Error:`, error.message);
    console.log('');
    return { success: false, error: error.message };
  }
}

console.log('🧪 Testing Helcim Terminal API Endpoints...\n');

async function runTests() {
  // Test 1: Get all terminal devices
  await testEndpoint('/api/terminal/devices');
  
  // Test 2: Get terminal devices from database
  await testEndpoint('/api/terminal/devices/database');
  
  // Test 3: Test ping endpoint (this will fail without a device, but should return proper error)
  await testEndpoint('/api/terminal/ping', 'POST', { deviceCode: 'test123' });
  
  // Test 4: Test device registration (this will fail without proper data, but should return proper error)
  await testEndpoint('/api/terminal/register', 'POST', { deviceCode: 'test123' });
  
  console.log('🏁 Terminal API endpoint tests completed!');
}

runTests().catch(console.error);





