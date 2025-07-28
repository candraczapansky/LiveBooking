import { DatabaseStorage } from './server/storage.js';
import { LLMService } from './server/llm-service.js';

async function debugLLM() {
  try {
    console.log('🔍 Debugging LLM Service');
    console.log('========================');
    console.log('');
    
    const storage = new DatabaseStorage();
    const llmService = new LLMService(storage);
    
    console.log('1. Testing LLM Service with simple context...');
    
    const testContext = {
      clientName: 'Test User',
      clientPhone: '+1234567890',
      businessName: 'Glo Head Spa',
      businessType: 'salon and spa',
      availableServices: [],
      businessKnowledge: [],
      conversationHistory: [],
      clientPreferences: {}
    };
    
    console.log('   Sending message: "What are your hours?"');
    const response = await llmService.generateResponse('What are your hours?', testContext, 'sms');
    
    console.log('');
    console.log('2. LLM Response Details:');
    console.log('   Success:', response.success);
    console.log('   Has Message:', !!response.message);
    console.log('   Confidence:', response.confidence);
    console.log('   Error:', response.error);
    console.log('   Full Response:', JSON.stringify(response, null, 2));
    
    if (response.success && response.message) {
      console.log('');
      console.log('   ✅ LLM Service is working!');
      console.log('   Message:', response.message);
    } else {
      console.log('');
      console.log('   ❌ LLM Service failed');
      console.log('   Error:', response.error);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

debugLLM(); 