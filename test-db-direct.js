#!/usr/bin/env node

import { DatabaseStorage } from './server/storage.js';
import { DatabaseConfig } from './server/config.js';

async function testDBDirect() {
  try {
    console.log('🗄️  Testing Database Directly');
    console.log('============================');
    
    const storage = new DatabaseStorage();
    const dbConfig = new DatabaseConfig(storage);
    
    console.log('\n1. Testing direct storage access...');
    try {
      const allConfig = await storage.getAllSystemConfig();
      console.log('   ✅ All system config retrieved');
      console.log('   📊 Total config entries:', allConfig.length);
      
      const openaiConfig = allConfig.find(c => c.key === 'openai_api_key');
      if (openaiConfig) {
        console.log('   ✅ OpenAI config found in storage');
        console.log('   🔑 Key starts with:', openaiConfig.value.substring(0, 10) + '...');
        console.log('   📝 Is active:', openaiConfig.isActive);
      } else {
        console.log('   ❌ OpenAI config not found in storage');
      }
    } catch (error) {
      console.log('   ❌ Storage error:', error.message);
    }
    
    console.log('\n2. Testing DatabaseConfig...');
    try {
      const apiKey = await dbConfig.getOpenAIKey();
      if (apiKey) {
        console.log('   ✅ DatabaseConfig.getOpenAIKey() returned key');
        console.log('   🔑 Key starts with:', apiKey.substring(0, 10) + '...');
      } else {
        console.log('   ❌ DatabaseConfig.getOpenAIKey() returned null/undefined');
      }
    } catch (error) {
      console.log('   ❌ DatabaseConfig error:', error.message);
    }
    
    console.log('\n3. Testing LLM Service...');
    try {
      const { LLMService } = await import('./server/llm-service.js');
      const llmService = new LLMService(storage);
      
      // Test the callOpenAI method directly
      const testResponse = await llmService['callOpenAI']('You are a helpful assistant.', 'Say hello');
      
      console.log('   LLM Service callOpenAI result:');
      console.log('   - Success:', testResponse.success);
      if (testResponse.error) {
        console.log('   - Error:', testResponse.error);
      }
      if (testResponse.message) {
        console.log('   - Message:', testResponse.message.substring(0, 50) + '...');
      }
    } catch (error) {
      console.log('   ❌ LLM Service error:', error.message);
    }
    
    console.log('\n✅ Database test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDBDirect(); 