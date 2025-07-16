// Test script for external APIs
const BASE_URL = 'http://localhost:5000';

async function testExternalAPIs() {
  console.log('Testing External APIs...\n');

  try {
    // Test health check
    console.log('1. Testing health check...');
    const healthResponse = await fetch(`${BASE_URL}/api/external/health`);
    const healthData = await healthResponse.json();
    console.log('Health check result:', healthData);
    console.log('');

    // Test staff availability
    console.log('2. Testing staff availability...');
    const staffResponse = await fetch(`${BASE_URL}/api/external/staff-availability`);
    const staffData = await staffResponse.json();
    console.log(`Staff availability: Found ${staffData.data?.length || 0} staff members`);
    console.log('');

    // Test services
    console.log('3. Testing services...');
    const servicesResponse = await fetch(`${BASE_URL}/api/external/services`);
    const servicesData = await servicesResponse.json();
    console.log(`Services: Found ${servicesData.data?.length || 0} services`);
    console.log('');

    // Test service categories
    console.log('4. Testing service categories...');
    const categoriesResponse = await fetch(`${BASE_URL}/api/external/service-categories`);
    const categoriesData = await categoriesResponse.json();
    console.log(`Service categories: Found ${categoriesData.data?.length || 0} categories`);
    console.log('');

    // Test webhook endpoint (GET method for status)
    console.log('5. Testing webhook status...');
    const webhookResponse = await fetch(`${BASE_URL}/api/appointments/webhook`);
    const webhookData = await webhookResponse.json();
    console.log('Webhook status:', webhookData);
    console.log('');

    console.log('✅ All external API tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing external APIs:', error.message);
  }
}

// Run the tests
testExternalAPIs(); 