import fetch from 'node-fetch';

async function testSMSSending() {
  const baseUrl = 'http://localhost:5000'; // Try port 5000 first
  
  console.log('🧪 Testing SMS Sending Functionality...\n');

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

    // Test sending a simple SMS using the promotional SMS endpoint
    console.log('\n2. Testing SMS sending via promotional endpoint...');
    const testSMS = {
      phone: '+15551234567', // Test number
      message: 'Test SMS from Glo Head Spa - ' + new Date().toISOString()
    };

    console.log('   Sending to:', testSMS.phone);
    console.log('   Message:', testSMS.message);

    const smsResponse = await fetch(`${baseUrl}/api/marketing/send-promotional-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testSMS)
    });

    if (smsResponse.ok) {
      const result = await smsResponse.json();
      console.log('✅ SMS sent successfully!');
      console.log('   Result:', result);
    } else {
      console.log('❌ SMS sending failed');
      console.log('   Status:', smsResponse.status);
      const errorText = await smsResponse.text();
      console.log('   Error:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }

  console.log('\n🏁 SMS Sending test completed');
}

testSMSSending();
