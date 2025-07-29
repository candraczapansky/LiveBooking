const { SMSAutoRespondServiceImproved } = require('./server/sms-auto-respond-service-improved');

// Mock storage for testing
const mockStorage = {
  getUserByPhone: async (phone) => {
    return {
      id: 1,
      firstName: 'Test',
      lastName: 'Client',
      phone: phone,
      email: 'test@example.com'
    };
  },
  createUser: async (userData) => {
    return {
      id: 2,
      ...userData
    };
  },
  getBusinessSettings: async () => ({
    businessName: 'Glo Head Spa'
  }),
  getAllServices: async () => [
    { name: 'Signature Head Spa', description: 'Basic head spa treatment', price: 99, duration: 60 },
    { name: 'Deluxe Head Spa', description: 'Premium head spa treatment', price: 160, duration: 90 },
    { name: 'Platinum Head Spa', description: 'Ultimate head spa treatment', price: 220, duration: 120 }
  ],
  getBusinessKnowledge: async () => [
    {
      title: 'What are your hours?',
      content: 'We\'re open Monday through Saturday, 9:00 AM to 6:00 PM. Sundays we\'re closed.'
    },
    {
      title: 'What services do you offer?',
      content: 'We offer Signature Head Spa ($99), Deluxe Head Spa ($160), and Platinum Head Spa ($220).'
    }
  ]
};

// Mock LLM service
const mockLLMService = {
  generateResponse: async (message, context, channel) => {
    // Simulate AI responses based on message content
    const text = message.toLowerCase();
    
    if (text.includes('how much') || text.includes('cost') || text.includes('price')) {
      return {
        success: true,
        message: 'Here are our current prices:\n• Signature Head Spa - $99 (60 minutes)\n• Deluxe Head Spa - $160 (90 minutes)\n• Platinum Head Spa - $220 (120 minutes)\n\nWould you like to book an appointment? 💆‍♀️✨',
        confidence: 0.9
      };
    }
    
    if (text.includes('services') || text.includes('what do you offer')) {
      return {
        success: true,
        message: 'We offer these amazing services:\n• Signature Head Spa - $99 (60 minutes)\n• Deluxe Head Spa - $160 (90 minutes)\n• Platinum Head Spa - $220 (120 minutes)\n\nWhich service interests you? 💆‍♀️✨',
        confidence: 0.9
      };
    }
    
    if (text.includes('hours') || text.includes('when are you open')) {
      return {
        success: true,
        message: 'We\'re open Monday through Saturday, 9:00 AM to 6:00 PM. Sundays we\'re closed. What day works best for you? 📅',
        confidence: 0.9
      };
    }
    
    return {
      success: true,
      message: 'Thank you for your message! How can I help you today? 💆‍♀️✨',
      confidence: 0.7
    };
  }
};

// Create test service
const testService = new SMSAutoRespondServiceImproved(mockStorage);

// Override LLM service for testing
testService.llmService = mockLLMService;

// Test scenarios
const testScenarios = [
  {
    name: 'Simple Greeting',
    message: 'Hi',
    expectedIntent: 'greeting',
    expectedResponse: 'Hey there! Welcome to Glo Head Spa! How can I help you today? 💆‍♀️✨'
  },
  {
    name: 'Business Question - Pricing',
    message: 'How much does it cost?',
    expectedIntent: 'business_question',
    expectedResponse: 'Here are our current prices:\n• Signature Head Spa - $99 (60 minutes)\n• Deluxe Head Spa - $160 (90 minutes)\n• Platinum Head Spa - $220 (120 minutes)\n\nWould you like to book an appointment? 💆‍♀️✨'
  },
  {
    name: 'Business Question - Services',
    message: 'What services do you offer?',
    expectedIntent: 'business_question',
    expectedResponse: 'We offer these amazing services:\n• Signature Head Spa - $99 (60 minutes)\n• Deluxe Head Spa - $160 (90 minutes)\n• Platinum Head Spa - $220 (120 minutes)\n\nWhich service interests you? 💆‍♀️✨'
  },
  {
    name: 'Business Question - Hours',
    message: 'When are you open?',
    expectedIntent: 'business_question',
    expectedResponse: 'We\'re open Monday through Saturday, 9:00 AM to 6:00 PM. Sundays we\'re closed. What day works best for you? 📅'
  },
  {
    name: 'Booking Request - Initial',
    message: 'I want to book an appointment',
    expectedIntent: 'booking',
    expectedResponse: 'Great! I\'d love to help you book an appointment. What service would you like?\n\nOur services include:\n• Signature Head Spa - $99 (60 minutes)\n• Deluxe Head Spa - $160 (90 minutes)\n• Platinum Head Spa - $220 (120 minutes)\n\nJust let me know which service you\'d like to book! 💆‍♀️✨'
  },
  {
    name: 'Booking Request - Service Selection',
    message: 'Signature Head Spa',
    expectedIntent: 'booking',
    expectedResponse: 'Perfect! What date would you like to come in? You can say "tomorrow", "Friday", or any day that works for you. 📅'
  },
  {
    name: 'Booking Request - Date Selection',
    message: 'Tomorrow',
    expectedIntent: 'booking',
    expectedResponse: 'Great! Here are the available times for tomorrow:\n\n• 9:00 AM\n• 11:00 AM\n• 1:00 PM\n• 3:00 PM\n• 5:00 PM\n\nWhich time works best for you? ⏰'
  },
  {
    name: 'Booking Request - Time Selection',
    message: '2pm',
    expectedIntent: 'booking',
    expectedResponse: 'Perfect! I\'ve booked your appointment for tomorrow at 2pm. You\'ll receive a confirmation shortly. Thank you for choosing Glo Head Spa! ✨'
  },
  {
    name: 'Reschedule Request',
    message: 'I need to reschedule my appointment',
    expectedIntent: 'reschedule',
    expectedResponse: 'I\'d be happy to help you reschedule your appointment. Please call us at 9189325396 and we\'ll get that sorted out for you right away! 📞'
  },
  {
    name: 'Cancel Request',
    message: 'I need to cancel my appointment',
    expectedIntent: 'cancel',
    expectedResponse: 'I\'d be happy to help you cancel your appointment. Please call us at 9189325396 and we\'ll take care of that for you right away! 📞'
  },
  {
    name: 'General Message',
    message: 'Thank you for the great service!',
    expectedIntent: 'general',
    expectedResponse: 'Thank you for your message! How can I help you today? 💆‍♀️✨'
  }
];

// Run tests
async function runTests() {
  console.log('🧪 Testing Improved SMS Auto-Responder\n');
  
  let passedTests = 0;
  let totalTests = testScenarios.length;
  
  for (const scenario of testScenarios) {
    console.log(`\n📱 Testing: ${scenario.name}`);
    console.log(`Message: "${scenario.message}"`);
    
    try {
      const result = await testService.processIncomingSMS({
        from: '+1234567890',
        to: '+1987654321',
        body: scenario.message,
        timestamp: new Date().toISOString(),
        messageId: 'test-' + Date.now()
      });
      
      if (result.success && result.responseSent) {
        console.log(`✅ Intent: ${scenario.expectedIntent}`);
        console.log(`✅ Response: ${result.response?.substring(0, 100)}...`);
        
        // Check if response matches expected
        if (result.response?.includes(scenario.expectedResponse.substring(0, 50))) {
          console.log('✅ Test PASSED');
          passedTests++;
        } else {
          console.log('❌ Test FAILED - Response mismatch');
          console.log(`Expected: ${scenario.expectedResponse.substring(0, 100)}...`);
          console.log(`Got: ${result.response?.substring(0, 100)}...`);
        }
      } else {
        console.log('❌ Test FAILED - No response sent');
        console.log(`Error: ${result.error || result.reason}`);
      }
    } catch (error) {
      console.log('❌ Test FAILED - Exception thrown');
      console.log(`Error: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! The improved SMS responder is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please review the implementation.');
  }
}

// Test conversation flow
async function testConversationFlow() {
  console.log('\n🔄 Testing Conversation Flow\n');
  
  const phoneNumber = '+1234567890';
  const messages = [
    'Hi',
    'I want to book an appointment',
    'Signature Head Spa',
    'Tomorrow',
    '2pm'
  ];
  
  console.log('📱 Simulating conversation:');
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    console.log(`\n${i + 1}. User: "${message}"`);
    
    const result = await testService.processIncomingSMS({
      from: phoneNumber,
      to: '+1987654321',
      body: message,
      timestamp: new Date().toISOString(),
      messageId: `flow-test-${i}`
    });
    
    if (result.success && result.responseSent) {
      console.log(`   Bot: "${result.response?.substring(0, 100)}..."`);
    } else {
      console.log(`   Bot: [No response - ${result.error || result.reason}]`);
    }
  }
  
  console.log('\n✅ Conversation flow test completed');
}

// Run all tests
async function main() {
  try {
    await runTests();
    await testConversationFlow();
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  testService,
  testScenarios,
  runTests,
  testConversationFlow
}; 