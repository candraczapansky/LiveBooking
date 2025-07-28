#!/usr/bin/env node

import fetch from 'node-fetch';

async function testLLMDirect() {
  try {
    console.log('🧪 Testing LLM Service Directly');
    console.log('===============================');
    
    const baseUrl = 'http://localhost:5000';
    
    // Test LLM service directly
    console.log('\n1. Testing LLM service...');
    const llmData = {
      clientMessage: 'What are your business hours?',
      clientId: null,
      channel: 'sms'
    };
    
    const llmResponse = await fetch(`${baseUrl}/api/llm/generate-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(llmData)
    });
    
    if (llmResponse.ok) {
      const result = await llmResponse.json();
      console.log('   LLM Response:');
      console.log('   - Success:', result.success);
      console.log('   - Response:', result.response?.substring(0, 150) + '...');
      console.log('   - Confidence:', result.confidence);
      console.log('   - Suggested Actions:', result.suggestedActions?.length || 0);
    } else {
      console.log('   ❌ LLM test failed:', llmResponse.status);
      const errorText = await llmResponse.text();
      console.log('   Error:', errorText);
    }
    
    console.log('\n✅ LLM test completed!');
    
  } catch (error) {
    console.error('❌ LLM test failed:', error.message);
  }
}

testLLMDirect(); 