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

// Test the specific issue
async function testTimeIssue() {
  console.log('🧪 Testing Time Issue Fix\n');
  
  const phoneNumber = '+1234567890';
  const conversation = [
    'Hi',
    'I want to book an appointment',
    'Signature Head Spa',
    'Tomorrow',
    '3pm'  // This was causing the issue
  ];
  
  console.log('📱 Testing conversation flow:');
  
  for (let i = 0; i < conversation.length; i++) {
    const message = conversation[i];
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
        } else if (result.response?.includes('What service would you like')) {
          console.log('❌ FAILED: Time "3pm" reset to service selection');
          console.log('Expected: Appointment booking confirmation');
          console.log('Got:', result.response);
        } else {
          console.log('❌ FAILED: Time "3pm" was not processed correctly');
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

// Test time extraction directly
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
    const extracted = responder.extractTime(time);
    console.log(`"${time}" → "${extracted}"`);
  }
}

// Run tests
async function main() {
  try {
    await testTimeIssue();
    testTimeExtraction();
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  main();
} 