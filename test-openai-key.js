import { DatabaseStorage } from './server/storage.js';
import { DatabaseConfig } from './server/config.js';

async function testOpenAIKey() {
  try {
    console.log('🔑 Testing OpenAI API Key');
    console.log('========================');
    console.log('');
    
    const storage = new DatabaseStorage();
    const dbConfig = new DatabaseConfig(storage);
    
    console.log('1. Getting API key from database...');
    const apiKey = await dbConfig.getOpenAIKey();
    
    if (!apiKey) {
      console.log('   ❌ No API key found in database');
      return;
    }
    
    console.log('   ✅ API key found');
    console.log('   🔑 Key starts with:', apiKey.substring(0, 10) + '...');
    
    console.log('');
    console.log('2. Testing OpenAI API call...');
    
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
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log('   ❌ API call failed');
      console.log('   Error:', errorData.error?.message || response.statusText);
      return;
    }
    
    const data = await response.json();
    const message = data.choices?.[0]?.message?.content;
    
    if (message) {
      console.log('   ✅ API call successful');
      console.log('   Response:', message);
    } else {
      console.log('   ❌ No response generated');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOpenAIKey(); 