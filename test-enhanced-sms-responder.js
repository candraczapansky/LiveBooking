const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5002';

async function testEnhancedSMSResponder() {
  console.log('🧪 Testing Enhanced SMS Auto-Responder');
  console.log('=====================================\n');

  const testCases = [
    // Booking tests
    {
      name: 'Booking Request - Simple',
      from: '+1234567890',
      body: 'Hi, I want to book an appointment',
      expectedIntent: 'booking'
    },
    {
      name: 'Booking Request - Service Specific',
      from: '+1234567890',
      body: 'I need a signature head spa appointment',
      expectedIntent: 'booking'
    },
    {
      name: 'Booking Request - Time Specific',
      from: '+1234567890',
      body: 'Can I book for tomorrow at 2pm?',
      expectedIntent: 'booking'
    },

    // Reschedule tests
    {
      name: 'Reschedule Request - Simple',
      from: '+1234567890',
      body: 'I need to reschedule my appointment',
      expectedIntent: 'reschedule'
    },
    {
      name: 'Reschedule Request - Specific Time',
      from: '+1234567890',
      body: 'Can I change my appointment to next Tuesday at 3pm?',
      expectedIntent: 'reschedule'
    },
    {
      name: 'Reschedule Request - Different Time',
      from: '+1234567890',
      body: 'I need a different time for my appointment',
      expectedIntent: 'reschedule'
    },

    // Cancel tests
    {
      name: 'Cancel Request - Simple',
      from: '+1234567890',
      body: 'I need to cancel my appointment',
      expectedIntent: 'cancel'
    },
    {
      name: 'Cancel Request - Can\'t Make It',
      from: '+1234567890',
      body: 'I can\'t make my appointment tomorrow',
      expectedIntent: 'cancel'
    },
    {
      name: 'Cancel Request - Emergency',
      from: '+1234567890',
      body: 'I have to cancel my booking due to an emergency',
      expectedIntent: 'cancel'
    },

    // Business questions
    {
      name: 'Business Question - Hours',
      from: '+1234567890',
      body: 'What are your hours?',
      expectedIntent: 'business_question'
    },
    {
      name: 'Business Question - Pricing',
      from: '+1234567890',
      body: 'How much does a facial cost?',
      expectedIntent: 'business_question'
    },
    {
      name: 'Business Question - Location',
      from: '+1234567890',
      body: 'Where are you located?',
      expectedIntent: 'business_question'
    },
    {
      name: 'Business Question - Services',
      from: '+1234567890',
      body: 'What services do you offer?',
      expectedIntent: 'business_question'
    },

    // General messages
    {
      name: 'General Message - Greeting',
      from: '+1234567890',
      body: 'Hello there!',
      expectedIntent: 'general'
    },
    {
      name: 'General Message - Thank You',
      from: '+1234567890',
      body: 'Thank you for the great service!',
      expectedIntent: 'general'
    }
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  for (const testCase of testCases) {
    console.log(`📱 Testing: ${testCase.name}`);
    console.log(`   Message: "${testCase.body}"`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/sms-auto-respond/process-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: testCase.from,
          to: '+19187277348',
          body: testCase.body,
          timestamp: new Date().toISOString(),
          messageId: `test_${Date.now()}_${Math.random()}`
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log(`   Response: ${result.responseSent ? '✅ Sent' : '❌ Not sent'}`);
      if (result.responseSent) {
        console.log(`   Message: "${result.response}"`);
        console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      } else {
        console.log(`   Reason: ${result.reason}`);
      }

      // Check if the response makes sense for the expected intent
      let intentDetected = false;
      if (result.responseSent && result.response) {
        const responseText = result.response.toLowerCase();
        
        switch (testCase.expectedIntent) {
          case 'booking':
            intentDetected = responseText.includes('book') || 
                           responseText.includes('appointment') || 
                           responseText.includes('service') ||
                           responseText.includes('schedule');
            break;
          case 'reschedule':
            intentDetected = responseText.includes('reschedule') || 
                           responseText.includes('change') || 
                           responseText.includes('move') ||
                           responseText.includes('different time');
            break;
          case 'cancel':
            intentDetected = responseText.includes('cancel') || 
                           responseText.includes('cancelled') || 
                           responseText.includes('cancellation');
            break;
          case 'business_question':
            intentDetected = responseText.includes('hours') || 
                           responseText.includes('price') || 
                           responseText.includes('cost') ||
                           responseText.includes('location') ||
                           responseText.includes('service') ||
                           responseText.includes('call us');
            break;
          case 'general':
            intentDetected = responseText.includes('hello') || 
                           responseText.includes('hi') || 
                           responseText.includes('thank') ||
                           responseText.includes('help');
            break;
        }
      }

      if (intentDetected) {
        console.log(`   Intent Detection: ✅ ${testCase.expectedIntent}`);
        passedTests++;
      } else {
        console.log(`   Intent Detection: ❌ Expected ${testCase.expectedIntent}, but response doesn't match`);
      }

    } catch (error) {
      console.log(`   Error: ❌ ${error.message}`);
    }

    console.log(''); // Empty line for readability
  }

  console.log('📊 Test Results');
  console.log('===============');
  console.log(`Passed: ${passedTests}/${totalTests} (${(passedTests/totalTests*100).toFixed(1)}%)`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! The enhanced SMS responder is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
  }

  console.log('\n🔧 Next Steps:');
  console.log('1. Test with real phone numbers to verify SMS sending');
  console.log('2. Create actual appointments to test reschedule/cancel functionality');
  console.log('3. Monitor conversation flows in the admin panel');
  console.log('4. Adjust confidence thresholds if needed');
}

// Run the test
testEnhancedSMSResponder().catch(console.error); 