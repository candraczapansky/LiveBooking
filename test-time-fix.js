// Simple test to verify the time extraction fix
const { SMSAutoRespondServiceImproved } = require('./server/sms-auto-respond-service-improved');

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

// Mock LLM service
const mockLLMService = {
  generateResponse: async (message, context, channel) => ({
    success: true,
    message: 'Test response',
    confidence: 0.8
  })
};

// Create test service
const testService = new SMSAutoRespondServiceImproved(mockStorage);
testService.llmService = mockLLMService;

// Test conversation flow
async function testTimeFix() {
  console.log('🧪 Testing Time Extraction Fix\n');
  
  const phoneNumber = '+1234567890';
  const conversation = [
    'Hi',
    'I want to book an appointment',
    'Signature Head Spa',
    'Tomorrow',
    '3pm'  // This was the problematic input
  ];
  
  console.log('📱 Testing conversation flow:');
  
  for (let i = 0; i < conversation.length; i++) {
    const message = conversation[i];
    console.log(`\n${i + 1}. User: "${message}"`);
    
    const result = await testService.processIncomingSMS({
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
      console.log(`   Bot: [No response - ${result.error || result.reason}]`);
    }
  }
  
  console.log('\n✅ Test completed');
}

// Test individual time extraction
function testTimeExtraction() {
  console.log('\n🔍 Testing Time Extraction:\n');
  
  const testTimes = [
    '3pm',
    '3:00pm',
    '3:30pm',
    '3 pm',
    '3:00 pm',
    '15:30',
    '3',
    '3:30',
    'not a time'
  ];
  
  for (const time of testTimes) {
    const extracted = testService.extractTimeFromMessage(time);
    console.log(`"${time}" → "${extracted}"`);
  }
}

// Run tests
async function main() {
  try {
    await testTimeFix();
    testTimeExtraction();
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  main();
} 