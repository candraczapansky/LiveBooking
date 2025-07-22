#!/usr/bin/env node

/**
 * SMS Auto-Responder Test Script
 * 
 * This script tests the SMS auto-responder functionality.
 * Run this after setting up Twilio and configuring the webhook.
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_PHONE = process.env.TEST_PHONE || '+1234567890';

async function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SMS-Auto-Responder-Test/1.0'
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsed,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: responseData,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testSMSAutoResponder() {
  console.log('🧪 Testing SMS Auto-Responder\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  try {
    // Test 1: Check if SMS auto-respond config endpoint is accessible
    console.log('📋 Test 1: Configuration Endpoint');
    console.log('Testing GET /api/sms-auto-respond/config...');
    
    const configResponse = await makeRequest(`${BASE_URL}/api/sms-auto-respond/config`);
    
    if (configResponse.status === 200) {
      console.log('✅ Configuration endpoint is accessible');
      console.log('Current config:', JSON.stringify(configResponse.data, null, 2));
    } else {
      console.log(`❌ Configuration endpoint failed: ${configResponse.status}`);
      console.log('Response:', configResponse.data);
    }
    console.log('');

    // Test 2: Check if SMS auto-respond stats endpoint is accessible
    console.log('📋 Test 2: Statistics Endpoint');
    console.log('Testing GET /api/sms-auto-respond/stats...');
    
    const statsResponse = await makeRequest(`${BASE_URL}/api/sms-auto-respond/stats`);
    
    if (statsResponse.status === 200) {
      console.log('✅ Statistics endpoint is accessible');
      console.log('Current stats:', JSON.stringify(statsResponse.data, null, 2));
    } else {
      console.log(`❌ Statistics endpoint failed: ${statsResponse.status}`);
      console.log('Response:', statsResponse.data);
    }
    console.log('');

    // Test 3: Test SMS auto-respond with sample data
    console.log('📋 Test 3: SMS Auto-Respond Test');
    console.log('Testing POST /api/sms-auto-respond/test...');
    
    const testData = {
      from: TEST_PHONE,
      to: '+1234567890', // Your Twilio number
      body: 'Hi, I would like to book an appointment for a haircut. What are your available times?'
    };
    
    const testResponse = await makeRequest(
      `${BASE_URL}/api/sms-auto-respond/test`,
      'POST',
      testData
    );
    
    if (testResponse.status === 200) {
      console.log('✅ SMS auto-respond test completed');
      console.log('Test result:', JSON.stringify(testResponse.data, null, 2));
      
      if (testResponse.data.responseSent) {
        console.log('🎉 Auto-response was sent successfully!');
      } else {
        console.log('ℹ️  Auto-response was not sent. Reason:', testResponse.data.reason);
      }
    } else {
      console.log(`❌ SMS auto-respond test failed: ${testResponse.status}`);
      console.log('Response:', testResponse.data);
    }
    console.log('');

    // Test 4: Test webhook endpoint (simulate Twilio webhook)
    console.log('📋 Test 4: Webhook Endpoint');
    console.log('Testing POST /api/webhook/incoming-sms...');
    
    const webhookData = {
      From: TEST_PHONE,
      To: '+1234567890', // Your Twilio number
      Body: 'Hello, I need information about your services.',
      MessageSid: `test_${Date.now()}`,
      Timestamp: new Date().toISOString()
    };
    
    const webhookResponse = await makeRequest(
      `${BASE_URL}/api/webhook/incoming-sms`,
      'POST',
      webhookData
    );
    
    if (webhookResponse.status === 200) {
      console.log('✅ Webhook endpoint is accessible');
      console.log('Webhook response type:', typeof webhookResponse.data);
      if (typeof webhookResponse.data === 'string') {
        console.log('TwiML response received (expected for Twilio)');
      } else {
        console.log('Response:', webhookResponse.data);
      }
    } else {
      console.log(`❌ Webhook endpoint failed: ${webhookResponse.status}`);
      console.log('Response:', webhookResponse.data);
    }
    console.log('');

    // Test 5: Test with different message types
    console.log('📋 Test 5: Different Message Types');
    
    const testMessages = [
      {
        name: 'Appointment Request',
        body: 'I would like to schedule an appointment for next week.'
      },
      {
        name: 'Pricing Inquiry',
        body: 'How much do you charge for a haircut?'
      },
      {
        name: 'Business Hours',
        body: 'What are your business hours?'
      },
      {
        name: 'Urgent Message (should be blocked)',
        body: 'This is urgent! I need help immediately!'
      }
    ];

    for (const testMsg of testMessages) {
      console.log(`Testing: ${testMsg.name}`);
      
      const msgTestData = {
        from: TEST_PHONE,
        to: '+1234567890',
        body: testMsg.body
      };
      
      try {
        const msgResponse = await makeRequest(
          `${BASE_URL}/api/sms-auto-respond/test`,
          'POST',
          msgTestData
        );
        
        if (msgResponse.status === 200) {
          const result = msgResponse.data;
          if (result.responseSent) {
            console.log(`  ✅ Response sent (${result.confidence ? Math.round(result.confidence * 100) : 'N/A'}% confidence)`);
          } else {
            console.log(`  ℹ️  Response blocked: ${result.reason}`);
          }
        } else {
          console.log(`  ❌ Test failed: ${msgResponse.status}`);
        }
      } catch (error) {
        console.log(`  ❌ Test error: ${error.message}`);
      }
    }
    console.log('');

    console.log('🎉 SMS Auto-Responder testing completed!');
    console.log('\nNext steps:');
    console.log('1. Check your Twilio console for SMS delivery status');
    console.log('2. Verify that auto-responses are being sent correctly');
    console.log('3. Monitor the statistics in your AI Messaging dashboard');
    console.log('4. Adjust confidence thresholds and keywords as needed');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure your server is running');
    console.log('2. Check that the BASE_URL is correct');
    console.log('3. Verify that Twilio credentials are configured');
    console.log('4. Check server logs for any errors');
  }
}

// Handle script execution
if (require.main === module) {
  testSMSAutoResponder()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testSMSAutoResponder }; 