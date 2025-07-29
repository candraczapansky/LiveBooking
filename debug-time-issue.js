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

// Test time extraction first
console.log('🔍 Testing Time Extraction:');
console.log('"3pm" →', responder.extractTime('3pm'));
console.log('"3:00pm" →', responder.extractTime('3:00pm'));
console.log('"3 pm" →', responder.extractTime('3 pm'));
console.log('"3" →', responder.extractTime('3'));
console.log('---');

// Test the full conversation
async function testConversation() {
  console.log('🧪 Testing Full Conversation:\n');
  
  const phoneNumber = '+1234567890';
  const messages = [
    'Hi',
    'I want to book an appointment',
    'Signature Head Spa',
    'Tomorrow',
    '3pm'
  ];
  
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
      console.log(`   Bot: "${result.response?.substring(0, 150)}..."`);
      
      // Check the last message specifically
      if (i === 4 && message === '3pm') {
        console.log('\n🔍 ANALYSIS OF LAST MESSAGE:');
        if (result.response?.includes('booked your appointment')) {
          console.log('✅ SUCCESS: Time "3pm" was correctly processed!');
        } else if (result.response?.includes('What service would you like')) {
          console.log('❌ FAILED: Time "3pm" reset to service selection');
          console.log('This means the conversation state was lost');
        } else if (result.response?.includes('available times')) {
          console.log('❌ FAILED: Time "3pm" went back to time selection');
          console.log('This means the time extraction failed');
        } else {
          console.log('❌ FAILED: Unexpected response');
          console.log('Response:', result.response);
        }
      }
    } else {
      console.log(`   Bot: [No response - ${result.error}]`);
    }
  }
  
  console.log('\n📊 Final Conversation Stats:');
  const stats = responder.getConversationStats();
  console.log(JSON.stringify(stats, null, 2));
}

// Run the test
testConversation().catch(console.error); 