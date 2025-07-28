import { DatabaseStorage } from './server/storage.js';
import { DatabaseConfig } from './server/config.js';

async function simpleTest() {
  try {
    console.log('🧪 Simple LLM Test');
    console.log('==================');
    
    const storage = new DatabaseStorage();
    const dbConfig = new DatabaseConfig(storage);
    
    console.log('1. Getting API key...');
    const apiKey = await dbConfig.getOpenAIKey();
    
    if (!apiKey) {
      console.log('❌ No API key found');
      return;
    }
    
    console.log('✅ API key found:', apiKey.substring(0, 10) + '...');
    
    console.log('2. Testing OpenAI API...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Say "Hello, this is a test!"' }
        ],
        max_tokens: 50
      })
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      const message = data.choices?.[0]?.message?.content;
      console.log('✅ Success! Response:', message);
    } else {
      const error = await response.json();
      console.log('❌ Error:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

simpleTest(); 