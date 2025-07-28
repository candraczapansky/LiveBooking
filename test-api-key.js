#!/usr/bin/env node

import { DatabaseStorage } from './server/storage.js';
import { DatabaseConfig } from './server/config.js';

async function testAPIKey() {
  try {
    console.log('🔑 Testing API Key Retrieval');
    console.log('============================');
    
    const storage = new DatabaseStorage();
    const dbConfig = new DatabaseConfig(storage);
    
    console.log('\n1. Getting API key from database...');
    const apiKey = await dbConfig.getOpenAIKey();
    
    if (apiKey) {
      console.log('   ✅ API key found');
      console.log('   🔑 Key starts with:', apiKey.substring(0, 10) + '...');
      console.log('   🔑 Key length:', apiKey.length);
    } else {
      console.log('   ❌ No API key found in database');
    }
    
    console.log('\n2. Testing OpenAI API call...');
    if (apiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Say "Hello, this is a test!"' }
          ],
          max_tokens: 50,
          temperature: 0.7
        })
      });
      
      console.log('   Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        const message = data.choices?.[0]?.message?.content;
        console.log('   ✅ API call successful');
        console.log('   Response:', message);
      } else {
        const errorData = await response.json();
        console.log('   ❌ API call failed');
        console.log('   Error:', errorData.error?.message || response.statusText);
      }
    } else {
      console.log('   ❌ Cannot test API call without API key');
    }
    
    console.log('\n✅ API key test completed!');
    
  } catch (error) {
    console.error('❌ API key test failed:', error.message);
  }
}

testAPIKey(); 