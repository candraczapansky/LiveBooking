import fetch from 'node-fetch';

async function testSMSDebug() {
  const baseUrl = 'http://localhost:5000'; // Try port 5000 first
  
  console.log('🧪 Testing SMS Debug...\n');

  try {
    // First, check SMS configuration
    console.log('1. Checking SMS configuration...');
    let configResponse;
    try {
      configResponse = await fetch(`${baseUrl}/api/sms-config-status`);
    } catch (e) {
      // Try port 5001 if 5000 fails
      const baseUrl2 = 'http://localhost:5001';
      console.log('   Port 5000 failed, trying port 5001...');
      configResponse = await fetch(`${baseUrl2}/api/sms-config-status`);
      baseUrl = baseUrl2;
    }
    
    if (configResponse.ok) {
      const config = await configResponse.json();
      console.log('✅ SMS Configuration:');
      console.log('   Configured:', config.configured);
      console.log('   Message:', config.message);
    } else {
      console.log('❌ SMS Configuration check failed');
      console.log('   Status:', configResponse.status);
      return;
    }

    // Test the test-confirmation endpoint
    console.log('\n2. Testing SMS via test-confirmation endpoint...');
    const testResponse = await fetch(`${baseUrl}/api/test-confirmation`);
    
    if (testResponse.ok) {
      const result = await testResponse.json();
      console.log('✅ Test endpoint response:');
      console.log('   Success:', result.success);
      console.log('   SMS Test Result:', result.smsTest);
      console.log('   Email Test Result:', result.emailTest);
      console.log('   Message:', result.message);
    } else {
      console.log('❌ Test endpoint failed');
      console.log('   Status:', testResponse.status);
      const errorText = await testResponse.text();
      console.log('   Error:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }

  console.log('\n🏁 SMS Debug test completed');
}

testSMSDebug();



