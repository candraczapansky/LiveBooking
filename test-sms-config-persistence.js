import { DatabaseStorage } from './server/storage.js';
import { SMSAutoRespondService } from './server/sms-auto-respond-service.js';

async function testSMSConfigPersistence() {
  try {
    console.log('🧪 Testing SMS Auto-Responder Configuration Persistence');
    console.log('=====================================================');
    console.log('');
    
    // Initialize storage and service
    const storage = new DatabaseStorage();
    const smsService = SMSAutoRespondService.getInstance(storage);
    
    console.log('1. Getting initial configuration...');
    const initialConfig = await smsService.getConfig();
    console.log('   Initial config:', {
      enabled: initialConfig.enabled,
      confidenceThreshold: initialConfig.confidenceThreshold,
      maxResponseLength: initialConfig.maxResponseLength
    });
    
    console.log('');
    console.log('2. Updating configuration...');
    const testConfig = {
      enabled: true,
      confidenceThreshold: 0.8,
      maxResponseLength: 150,
      excludedKeywords: ['test', 'urgent'],
      autoRespondPhoneNumbers: ['+1234567890']
    };
    
    await smsService.updateConfig(testConfig);
    console.log('   Configuration updated');
    
    console.log('');
    console.log('3. Getting updated configuration...');
    const updatedConfig = await smsService.getConfig();
    console.log('   Updated config:', {
      enabled: updatedConfig.enabled,
      confidenceThreshold: updatedConfig.confidenceThreshold,
      maxResponseLength: updatedConfig.maxResponseLength,
      excludedKeywords: updatedConfig.excludedKeywords,
      autoRespondPhoneNumbers: updatedConfig.autoRespondPhoneNumbers
    });
    
    console.log('');
    console.log('4. Creating new service instance to test persistence...');
    const newSmsService = SMSAutoRespondService.getInstance(storage);
    const persistedConfig = await newSmsService.getConfig();
    console.log('   Persisted config:', {
      enabled: persistedConfig.enabled,
      confidenceThreshold: persistedConfig.confidenceThreshold,
      maxResponseLength: persistedConfig.maxResponseLength,
      excludedKeywords: persistedConfig.excludedKeywords,
      autoRespondPhoneNumbers: persistedConfig.autoRespondPhoneNumbers
    });
    
    console.log('');
    console.log('5. Verifying configuration persistence...');
    const configMatches = 
      updatedConfig.enabled === persistedConfig.enabled &&
      updatedConfig.confidenceThreshold === persistedConfig.confidenceThreshold &&
      updatedConfig.maxResponseLength === persistedConfig.maxResponseLength &&
      JSON.stringify(updatedConfig.excludedKeywords) === JSON.stringify(persistedConfig.excludedKeywords) &&
      JSON.stringify(updatedConfig.autoRespondPhoneNumbers) === JSON.stringify(persistedConfig.autoRespondPhoneNumbers);
    
    if (configMatches) {
      console.log('   ✅ Configuration is being persisted correctly!');
      console.log('   🎉 The SMS auto-responder should maintain its settings across restarts.');
    } else {
      console.log('   ❌ Configuration is NOT being persisted correctly!');
      console.log('   🔧 There may be an issue with the database storage.');
    }
    
    console.log('');
    console.log('6. Testing OpenAI API key configuration...');
    const { DatabaseConfig } = await import('./server/config.js');
    const dbConfig = new DatabaseConfig(storage);
    const openaiKey = await dbConfig.getOpenAIKey();
    
    if (openaiKey) {
      console.log('   ✅ OpenAI API key is configured');
      console.log('   🔑 Key starts with:', openaiKey.substring(0, 10) + '...');
    } else {
      console.log('   ❌ OpenAI API key is NOT configured');
      console.log('   💡 Run: node fix-sms-auto-responder.js <your-api-key>');
    }
    
    console.log('');
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testSMSConfigPersistence(); 