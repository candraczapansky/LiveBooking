import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testSMSAutoResponder() {
  console.log('🔍 Testing SMS Auto-Responder...\n');

  try {
    // Test 1: Check configuration
    console.log('1. Testing configuration endpoint...');
    const configResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/config`);
    if (configResponse.ok) {
      const config = await configResponse.json();
      console.log('✅ Configuration loaded:', config);
    } else {
      console.log('❌ Configuration failed:', configResponse.status);
    }

    // Test 2: Check statistics
    console.log('\n2. Testing statistics endpoint...');
    const statsResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/stats`);
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('✅ Statistics loaded:', stats);
    } else {
      console.log('❌ Statistics failed:', statsResponse.status);
    }

    // Test 3: Test SMS processing
    console.log('\n3. Testing SMS processing...');
    const testSMS = {
      from: '+1234567890',
      to: '+19187277348',
      body: 'Hi, I would like to book an appointment for a haircut'
    };

    const processResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSMS)
    });

    if (processResponse.ok) {
      const result = await processResponse.json();
      console.log('✅ SMS processing result:', result);
    } else {
      console.log('❌ SMS processing failed:', processResponse.status);
      const errorText = await processResponse.text();
      console.log('Error details:', errorText);
    }

    // Test 4: Check if OpenAI API key is configured
    console.log('\n4. Checking OpenAI API key...');
    const apiKeyResponse = await fetch(`${BASE_URL}/api/system-config?category=openai`);
    if (apiKeyResponse.ok) {
      const apiConfig = await apiKeyResponse.json();
      console.log('✅ API configuration:', apiConfig);
    } else {
      console.log('❌ API configuration failed:', apiKeyResponse.status);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testSMSAutoResponder(); 