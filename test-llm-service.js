import { DatabaseStorage } from './server/storage.js';
import { LLMService } from './server/llm-service.js';
import { DatabaseConfig } from './server/config.js';

async function testLLMService() {
  try {
    console.log('🧪 Testing LLM Service');
    console.log('======================');
    console.log('');
    
    // Initialize storage and config
    const storage = new DatabaseStorage();
    const dbConfig = new DatabaseConfig(storage);
    
    console.log('1. Checking OpenAI API key...');
    const openaiKey = await dbConfig.getOpenAIKey();
    
    if (openaiKey) {
      console.log('   ✅ OpenAI API key found');
      console.log('   🔑 Key starts with:', openaiKey.substring(0, 10) + '...');
    } else {
      console.log('   ❌ OpenAI API key not found');
      console.log('   💡 Run: node fix-sms-auto-responder.js <your-api-key>');
      return;
    }
    
    console.log('');
    console.log('2. Testing LLM Service...');
    const llmService = new LLMService(storage);
    
    const testContext = {
      clientName: 'Test User',
      clientPhone: '+1234567890',
      businessName: 'Glo Head Spa',
      businessType: 'salon and spa',
      availableServices: [
        { name: "Women's Haircut & Style", price: 45, duration: 60 },
        { name: "Color & Highlights", price: 120, duration: 120 },
        { name: "Deep Cleansing Facial", price: 75, duration: 90 }
      ],
      businessKnowledge: [
        { title: 'What are your hours?', content: 'We are open 10-8 Wednesday-Saturday' }
      ],
      conversationHistory: [],
      clientPreferences: {
        smsAccountManagement: true,
        smsAppointmentReminders: true,
        smsPromotions: false
      }
    };
    
    console.log('   Sending test message: "What are your hours?"');
    const response = await llmService.generateResponse('What are your hours?', testContext, 'sms');
    
    console.log('');
    console.log('3. LLM Response:');
    console.log('   Success:', response.success);
    console.log('   Has Message:', !!response.message);
    console.log('   Confidence:', response.confidence);
    console.log('   Error:', response.error);
    
    if (response.success && response.message) {
      console.log('   Message:', response.message.substring(0, 100) + '...');
      console.log('');
      console.log('   ✅ LLM Service is working correctly!');
    } else {
      console.log('');
      console.log('   ❌ LLM Service failed');
      console.log('   Error:', response.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testLLMService(); 