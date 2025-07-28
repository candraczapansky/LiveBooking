#!/usr/bin/env node

import fetch from 'node-fetch';

async function testAPIKeyFix() {
  try {
    console.log('🔧 Testing API Key Fix');
    console.log('=====================');
    
    const baseUrl = 'http://localhost:5000';
    
    // Test 1: Check if API key is in system config
    console.log('\n1. Checking system config...');
    const configResponse = await fetch(`${baseUrl}/api/config/system`);
    if (configResponse.ok) {
      const config = await configResponse.json();
      const openaiConfig = config.config.find((c) => c.key === 'openai_api_key');
      if (openaiConfig) {
        console.log('   ✅ OpenAI API key found in system config');
        console.log('   🔑 Key starts with:', openaiConfig.value.substring(0, 10) + '...');
      } else {
        console.log('   ❌ OpenAI API key not found in system config');
      }
    }
    
    // Test 2: Test LLM service directly
    console.log('\n2. Testing LLM service...');
    const llmData = {
      clientMessage: 'What are your business hours?',
      channel: 'sms'
    };
    
    const llmResponse = await fetch(`${baseUrl}/api/llm/generate-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(llmData)
    });
    
    if (llmResponse.ok) {
      const result = await llmResponse.json();
      console.log('   ✅ LLM service working');
      console.log('   - Success:', result.success);
      if (result.response) {
        console.log('   - Response:', result.response.substring(0, 100) + '...');
      }
      if (result.error) {
        console.log('   - Error:', result.error);
      }
    } else {
      console.log('   ❌ LLM service failed:', llmResponse.status);
      const errorText = await llmResponse.text();
      console.log('   Error:', errorText);
    }
    
    // Test 3: Test SMS auto-responder
    console.log('\n3. Testing SMS auto-responder...');
    const smsData = {
      from: '+1234567890',
      to: '+19187277348',
      body: 'What are your business hours?'
    };
    
    const smsResponse = await fetch(`${baseUrl}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(smsData)
    });
    
    if (smsResponse.ok) {
      const result = await smsResponse.json();
      console.log('   ✅ SMS auto-responder working');
      console.log('   - Success:', result.success);
      console.log('   - Response Sent:', result.responseSent);
      console.log('   - Confidence:', result.confidence);
      if (result.response) {
        console.log('   - Response:', result.response.substring(0, 100) + '...');
      }
      if (result.error) {
        console.log('   - Error:', result.error);
      }
    } else {
      console.log('   ❌ SMS auto-responder failed:', smsResponse.status);
      const errorText = await smsResponse.text();
      console.log('   Error:', errorText);
    }
    
    console.log('\n✅ API Key Fix test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPIKeyFix(); 