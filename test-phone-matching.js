import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testPhoneMatching() {
  console.log('🔍 Testing Phone Number Matching...\n');

  try {
    // Test 1: Check current configuration
    console.log('1. Checking current SMS configuration...');
    const configResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/config`);
    if (configResponse.ok) {
      const config = await configResponse.json();
      console.log('✅ Current Config:', config);
      console.log('📱 Auto-respond phone numbers:', config.autoRespondPhoneNumbers);
    } else {
      console.log('❌ Config check failed:', configResponse.status);
    }

    // Test 2: Test with a real phone number format
    console.log('\n2. Testing phone number matching...');
    const testPhoneNumbers = [
      '+1234567890',  // Test number
      '+19187277348', // Real number (masked as +123456XXXX)
      '+15551234567', // Another test number
      '+123456XXXX'   // Masked number
    ];

    for (const phone of testPhoneNumbers) {
      console.log(`\nTesting phone: ${phone}`);
      
      const testSMS = {
        from: phone,
        to: '+1234567890',
        body: 'Hi, I would like to book an appointment'
      };

      const processResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testSMS)
      });

      if (processResponse.ok) {
        const result = await processResponse.json();
        console.log(`  Result: ${result.responseSent ? '✅ Response sent' : '❌ No response'}`);
        if (result.reason) {
          console.log(`  Reason: ${result.reason}`);
        }
      } else {
        console.log(`  ❌ Error: ${processResponse.status}`);
      }
    }

  } catch (error) {
    console.error('❌ Error testing phone matching:', error);
  }
}

testPhoneMatching(); 