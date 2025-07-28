#!/usr/bin/env node

import fetch from 'node-fetch';

async function debugSMS() {
  try {
    console.log('🔍 Debugging SMS Auto-Responder');
    console.log('================================');
    
    const baseUrl = 'http://localhost:5000';
    
    // Test 1: Check FAQ data
    console.log('\n1. Checking FAQ data...');
    const faqResponse = await fetch(`${baseUrl}/api/business-knowledge`);
    const faqData = await faqResponse.json();
    console.log(`   Found ${faqData.length} FAQ entries`);
    faqData.forEach((item, i) => {
      console.log(`   ${i+1}. ${item.title} (${item.category})`);
    });
    
    // Test 2: Test SMS auto-respond with hours question
    console.log('\n2. Testing SMS auto-respond with hours question...');
    const testData = {
      from: '+1234567890',
      to: '+19187277348',
      body: 'What are your business hours?'
    };
    
    const smsResponse = await fetch(`${baseUrl}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    if (smsResponse.ok) {
      const result = await smsResponse.json();
      console.log('   Response received:');
      console.log('   - Success:', result.success);
      console.log('   - Response Sent:', result.responseSent);
      console.log('   - Reason:', result.reason || 'N/A');
      console.log('   - Confidence:', result.confidence || 'N/A');
      if (result.response) {
        console.log('   - Response:', result.response.substring(0, 100) + '...');
      }
      if (result.error) {
        console.log('   - Error:', result.error);
      }
    } else {
      console.log('   ❌ SMS test failed:', smsResponse.status);
      const errorText = await smsResponse.text();
      console.log('   Error:', errorText);
    }
    
    // Test 3: Test FAQ integration directly
    console.log('\n3. Testing FAQ integration...');
    const faqTestData = {
      from: '+1234567890',
      body: 'What are your business hours?'
    };
    
    const faqTestResponse = await fetch(`${baseUrl}/api/sms-auto-respond/test-faq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(faqTestData)
    });
    
    if (faqTestResponse.ok) {
      const faqResult = await faqTestResponse.json();
      console.log('   FAQ Test Response:');
      console.log('   - Success:', faqResult.success);
      console.log('   - FAQ Count:', faqResult.faqData?.count || 0);
      console.log('   - LLM Success:', faqResult.llmResponse?.success);
      console.log('   - LLM Error:', faqResult.llmResponse?.error || 'None');
      if (faqResult.llmResponse?.message) {
        console.log('   - LLM Message:', faqResult.llmResponse.message.substring(0, 100) + '...');
      }
    } else {
      console.log('   ❌ FAQ test failed:', faqTestResponse.status);
      const errorText = await faqTestResponse.text();
      console.log('   Error:', errorText);
    }
    
    console.log('\n✅ Debug completed!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugSMS(); 