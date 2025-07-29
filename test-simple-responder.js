const { SMSSimpleResponder } = require('./server/sms-simple-responder');

// Mock storage
const mockStorage = {
  getUserByPhone: async (phone) => ({
    id: 1,
    firstName: 'Test',
    lastName: 'Client',
    phone: phone,
    email: 'test@example.com'
  }),
  createUser: async (userData) => ({
    id: 2,
    ...userData
  }),
  getBusinessSettings: async () => ({
    businessName: 'Glo Head Spa'
  }),
  getAllServices: async () => [
    { name: 'Signature Head Spa', description: 'Basic head spa treatment', price: 99, duration: 60 },
    { name: 'Deluxe Head Spa', description: 'Premium head spa treatment', price: 160, duration: 90 },
    { name: 'Platinum Head Spa', description: 'Ultimate head spa treatment', price: 220, duration: 120 }
  ],
  getBusinessKnowledge: async () => []
};

// Create test service
const responder = new SMSSimpleResponder(mockStorage);

// Test conversation
async function testConversation() {
  console.log('🧪 Testing Simple SMS Responder\n');
  
  const phoneNumber = '+1234567890';
  const messages = [
    'Hi',
    'I want to book an appointment',
    'Signature Head Spa',
    'Tomorrow',
    '3pm'
  ];
  
  console.log('📱 Testing conversation flow:');
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    console.log(`\n${i + 1}. User: "${message}"`);
    
    const result = await responder.processSMS({
      from: phoneNumber,
      to: '+1987654321',
      body: message,
      timestamp: new Date().toISOString(),
      messageId: `test-${i}`
    });
    
    if (result.success && result.responseSent) {
      console.log(`   Bot: "${result.response?.substring(0, 100)}..."`);
      
      // Check if the last message (3pm) was handled correctly
      if (i === 4 && message === '3pm') {
        if (result.response?.includes('booked your appointment')) {
          console.log('✅ SUCCESS: Time "3pm" was correctly processed!');
        } else {
          console.log('❌ FAILED: Time "3pm" was not processed correctly');
          console.log('Expected: Appointment booking confirmation');
          console.log('Got:', result.response);
        }
      }
    } else {
      console.log(`   Bot: [No response - ${result.error}]`);
    }
  }
  
  console.log('\n📊 Conversation Stats:');
  console.log(JSON.stringify(responder.getConversationStats(), null, 2));
  
  console.log('\n✅ Test completed');
}

// Test individual scenarios
async function testScenarios() {
  console.log('\n🔍 Testing Individual Scenarios:\n');
  
  const scenarios = [
    { name: 'Greeting', message: 'Hi' },
    { name: 'Business Question - Pricing', message: 'How much does it cost?' },
    { name: 'Business Question - Services', message: 'What services do you offer?' },
    { name: 'Business Question - Hours', message: 'When are you open?' },
    { name: 'Reschedule', message: 'I need to reschedule my appointment' },
    { name: 'Cancel', message: 'I need to cancel my appointment' },
    { name: 'General Message', message: 'Thank you for the great service!' }
  ];
  
  for (const scenario of scenarios) {
    console.log(`Testing: ${scenario.name}`);
    console.log(`Message: "${scenario.message}"`);
    
    const result = await responder.processSMS({
      from: '+1234567890',
      to: '+1987654321',
      body: scenario.message,
      timestamp: new Date().toISOString(),
      messageId: 'scenario-test'
    });
    
    if (result.success && result.responseSent) {
      console.log(`Response: "${result.response?.substring(0, 100)}..."`);
    } else {
      console.log(`Error: ${result.error}`);
    }
    console.log('---');
  }
}

// Run tests
async function main() {
  try {
    await testConversation();
    await testScenarios();
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  main();
} 