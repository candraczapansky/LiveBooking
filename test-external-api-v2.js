// Test script for external APIs v2.0 with authentication
const BASE_URL = 'http://localhost:5000';
const API_KEY = 'glo-head-spa-external-2024';

async function testExternalAPIs() {
  console.log('Testing External APIs v2.0...\n');

  try {
    // Test health check (no auth required)
    console.log('1. Testing health check...');
    const healthResponse = await fetch(`${BASE_URL}/api/external/health`);
    const healthData = await healthResponse.json();
    console.log('Health check result:', healthData);
    console.log('');

    // Test staff availability without auth
    console.log('2. Testing staff availability (no auth)...');
    const staffResponseNoAuth = await fetch(`${BASE_URL}/api/external/staff-availability`);
    const staffDataNoAuth = await staffResponseNoAuth.json();
    console.log(`Staff availability (no auth): Found ${staffDataNoAuth.data?.length || 0} staff members`);
    console.log('Authenticated:', staffDataNoAuth.authenticated);
    console.log('');

    // Test staff availability with auth
    console.log('3. Testing staff availability (with auth)...');
    const staffResponseAuth = await fetch(`${BASE_URL}/api/external/staff-availability`, {
      headers: {
        'X-API-Key': API_KEY
      }
    });
    const staffDataAuth = await staffResponseAuth.json();
    console.log(`Staff availability (with auth): Found ${staffDataAuth.data?.length || 0} staff members`);
    console.log('Authenticated:', staffDataAuth.authenticated);
    console.log('');

    // Test services with auth
    console.log('4. Testing services (with auth)...');
    const servicesResponse = await fetch(`${BASE_URL}/api/external/services`, {
      headers: {
        'X-API-Key': API_KEY
      }
    });
    const servicesData = await servicesResponse.json();
    console.log(`Services: Found ${servicesData.data?.length || 0} services`);
    console.log('Authenticated:', servicesData.authenticated);
    console.log('');

    // Test service categories with auth
    console.log('5. Testing service categories (with auth)...');
    const categoriesResponse = await fetch(`${BASE_URL}/api/external/service-categories`, {
      headers: {
        'X-API-Key': API_KEY
      }
    });
    const categoriesData = await categoriesResponse.json();
    console.log(`Service categories: Found ${categoriesData.data?.length || 0} categories`);
    console.log('Authenticated:', categoriesData.authenticated);
    console.log('');

    // Test webhook endpoint (GET method for status)
    console.log('6. Testing webhook status...');
    const webhookResponse = await fetch(`${BASE_URL}/api/appointments/webhook`);
    const webhookData = await webhookResponse.json();
    console.log('Webhook status:', webhookData);
    console.log('');

    // Test webhook without auth (should fail)
    console.log('7. Testing webhook POST without auth (should fail)...');
    try {
      const webhookNoAuthResponse = await fetch(`${BASE_URL}/api/appointments/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startTime: '2025-01-27T10:00:00Z',
          endTime: '2025-01-27T11:00:00Z'
        })
      });
      const webhookNoAuthData = await webhookNoAuthResponse.json();
      console.log('Webhook without auth result:', webhookNoAuthData);
    } catch (error) {
      console.log('Webhook without auth failed as expected:', error.message);
    }
    console.log('');

    // Test webhook with auth (should work)
    console.log('8. Testing webhook POST with auth...');
    try {
      const webhookAuthResponse = await fetch(`${BASE_URL}/api/appointments/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          startTime: '2025-01-27T10:00:00Z',
          endTime: '2025-01-27T11:00:00Z',
          clientInfo: {
            firstName: 'Test',
            lastName: 'Client',
            email: 'test@example.com'
          },
          serviceInfo: {
            name: 'Test Service',
            price: 50,
            duration: 60,
            categoryName: 'Test Category'
          },
          staffInfo: {
            firstName: 'Test',
            lastName: 'Staff',
            email: 'staff@example.com',
            title: 'Test Stylist'
          }
        })
      });
      const webhookAuthData = await webhookAuthResponse.json();
      console.log('Webhook with auth result:', webhookAuthData);
    } catch (error) {
      console.log('Webhook with auth failed:', error.message);
    }
    console.log('');

    console.log('✅ All external API tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing external APIs:', error.message);
  }
}

// Run the tests
testExternalAPIs(); 