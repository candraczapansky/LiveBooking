#!/usr/bin/env node

/**
 * Test SMS Auto-Responder Improvements
 * 
 * This script tests the improved SMS auto-responder logic to ensure
 * it provides better and more natural responses.
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5002';

async function testSMSImprovements() {
  console.log('🧪 Testing SMS Auto-Responder Improvements...\n');

  const testCases = [
    {
      name: 'Simple Greeting',
      message: 'Hello',
      expectedIntent: 'general',
      description: 'Should respond with a friendly greeting and offer help'
    },
    {
      name: 'Business Question - Services',
      message: 'What services do you offer?',
      expectedIntent: 'business_question',
      description: 'Should provide service list and pricing'
    },
    {
      name: 'Business Question - Pricing',
      message: 'How much does a head spa cost?',
      expectedIntent: 'business_question',
      description: 'Should provide pricing information'
    },
    {
      name: 'Business Question - Hours',
      message: 'When are you open?',
      expectedIntent: 'business_question',
      description: 'Should provide business hours'
    },
    {
      name: 'Booking Request - Explicit',
      message: 'I want to book an appointment',
      expectedIntent: 'booking',
      description: 'Should start booking conversation'
    },
    {
      name: 'Booking Request - Service Specific',
      message: 'Can I book a signature head spa for tomorrow?',
      expectedIntent: 'booking',
      description: 'Should handle service + time booking'
    },
    {
      name: 'General Question',
      message: 'What should I do?',
      expectedIntent: 'general',
      description: 'Should provide helpful guidance'
    },
    {
      name: 'Thank You',
      message: 'Thank you',
      expectedIntent: 'general',
      description: 'Should respond with welcome message'
    }
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  for (const testCase of testCases) {
    console.log(`📱 Testing: ${testCase.name}`);
    console.log(`   Message: "${testCase.message}"`);
    console.log(`   Expected Intent: ${testCase.expectedIntent}`);
    console.log(`   Description: ${testCase.description}`);

    try {
      const response = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: '+19185048902',
          to: '+19187277348',
          body: testCase.message
        })
      });

      if (!response.ok) {
        console.log(`   ❌ Failed: HTTP ${response.status}`);
        continue;
      }

      const result = await response.json();
      
      if (result.success && result.responseSent) {
        console.log(`   ✅ Success: Response sent`);
        console.log(`   📝 Response: "${result.response.substring(0, 100)}..."`);
        console.log(`   🎯 Confidence: ${result.confidence}`);
        passedTests++;
      } else {
        console.log(`   ❌ Failed: No response sent`);
        console.log(`   📝 Reason: ${result.reason || 'Unknown'}`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log(''); // Empty line for readability
  }

  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! SMS auto-responder is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the SMS auto-responder configuration.');
  }

  console.log('\n🔧 Next Steps:');
  console.log('1. Test with real SMS messages to your Twilio number');
  console.log('2. Verify responses are natural and helpful');
  console.log('3. Check that booking conversations flow smoothly');
  console.log('4. Ensure business questions get appropriate answers');
}

// Run the test
testSMSImprovements().catch(console.error); 