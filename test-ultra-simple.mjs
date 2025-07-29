import { SMSUltraSimple } from './server/sms-ultra-simple.js';

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
const responder = new SMSUltraSimple(mockStorage);

// Test the conversation
async function testConversation() {
  console.log('🧪 Testing Ultra-Simple SMS Responder\n');
  
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
      console.log(`   Bot: "${result.response?.substring(0, 150)}..."`);
      
      // Check if the last message (3pm) was handled correctly
      if (i === 4 && message === '3pm') {
        if (result.response?.includes('booked your appointment')) {
          console.log('✅ SUCCESS: Time "3pm" was correctly processed!');
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

// Run the test
testConversation().catch(console.error); 