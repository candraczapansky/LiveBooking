import { DatabaseStorage } from './server/storage.js';
import { DatabaseConfig } from './server/config.js';
import { LLMService } from './server/llm-service.js';

async function fixSMSLLM() {
  try {
    console.log('🔧 Fixing SMS LLM Responder');
    console.log('===========================');
    console.log('');
    
    const storage = new DatabaseStorage();
    const dbConfig = new DatabaseConfig(storage);
    
    console.log('1. Checking OpenAI API key...');
    const apiKey = await dbConfig.getOpenAIKey();
    
    if (!apiKey) {
      console.log('   ❌ OpenAI API key not found');
      console.log('   💡 Please run: node fix-sms-auto-responder.js <your-api-key>');
      return;
    }
    
    console.log('   ✅ OpenAI API key found');
    console.log('   🔑 Key starts with:', apiKey.substring(0, 10) + '...');
    
    console.log('');
    console.log('2. Testing OpenAI API directly...');
    
    const testResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant for a salon.' },
          { role: 'user', content: 'What are your hours?' }
        ],
        max_tokens: 100,
        temperature: 0.7
      })
    });
    
    if (!testResponse.ok) {
      const errorData = await testResponse.json();
      console.log('   ❌ OpenAI API test failed');
      console.log('   Error:', errorData.error?.message || testResponse.statusText);
      return;
    }
    
    const testData = await testResponse.json();
    const testMessage = testData.choices?.[0]?.message?.content;
    
    if (testMessage) {
      console.log('   ✅ OpenAI API test successful');
      console.log('   Response:', testMessage.substring(0, 50) + '...');
    } else {
      console.log('   ❌ No response from OpenAI API');
      return;
    }
    
    console.log('');
    console.log('3. Testing LLM Service...');
    
    const llmService = new LLMService(storage);
    
    const testContext = {
      clientName: 'Test User',
      clientPhone: '+1234567890',
      businessName: 'Glo Head Spa',
      businessType: 'salon and spa',
      availableServices: [
        { name: "Women's Haircut & Style", price: 45, duration: 60 }
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
    
    const llmResponse = await llmService.generateResponse('What are your hours?', testContext, 'sms');
    
    console.log('   LLM Response:', {
      success: llmResponse.success,
      hasMessage: !!llmResponse.message,
      confidence: llmResponse.confidence,
      error: llmResponse.error
    });
    
    if (llmResponse.success && llmResponse.message) {
      console.log('   ✅ LLM Service is working!');
      console.log('   Message:', llmResponse.message.substring(0, 100) + '...');
    } else {
      console.log('   ❌ LLM Service failed');
      console.log('   Error:', llmResponse.error);
    }
    
    console.log('');
    console.log('4. Checking SMS Auto-Responder Configuration...');
    
    const aiConfig = await storage.getAiMessagingConfig();
    if (aiConfig) {
      console.log('   ✅ AI Messaging config found');
      console.log('   SMS Enabled:', aiConfig.smsEnabled);
      console.log('   Confidence Threshold:', aiConfig.confidenceThreshold);
    } else {
      console.log('   ❌ No AI Messaging config found');
      console.log('   Creating default config...');
      
      await storage.createAiMessagingConfig({
        enabled: true,
        confidenceThreshold: 0.7,
        maxResponseLength: 160,
        businessHoursOnly: false,
        businessHoursStart: "09:00",
        businessHoursEnd: "17:00",
        businessHoursTimezone: "America/Chicago",
        smsEnabled: true,
        smsExcludedKeywords: JSON.stringify([]),
        smsExcludedPhoneNumbers: JSON.stringify([]),
        smsAutoRespondPhoneNumbers: JSON.stringify([]),
        excludedKeywords: JSON.stringify([])
      });
      
      console.log('   ✅ Default config created');
    }
    
    console.log('');
    console.log('5. Summary:');
    
    if (llmResponse.success && llmResponse.message) {
      console.log('   ✅ Everything is working correctly!');
      console.log('   🎉 The SMS LLM responder should now work with AI-powered responses.');
      console.log('');
      console.log('   Next steps:');
      console.log('   1. Restart your server: npm run dev');
      console.log('   2. Test the SMS auto-responder in the admin interface');
      console.log('   3. Send a test SMS to verify AI responses');
    } else {
      console.log('   ❌ LLM Service is not working properly');
      console.log('   🔧 Please check the error above and fix the issue');
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

fixSMSLLM(); 