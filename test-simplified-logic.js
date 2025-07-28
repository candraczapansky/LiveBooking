#!/usr/bin/env node

import fetch from 'node-fetch';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

async function testSimplifiedLogic() {
  console.log('🧪 Testing Simplified SMS Logic...\n');

  try {
    // Test 1: Simple date request
    console.log('1. Testing "tomorrow"...');
    const tomorrowResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '+19185048902',
        to: '+19187277348',
        body: 'tomorrow'
      })
    });

    if (tomorrowResponse.ok) {
      const result = await tomorrowResponse.json();
      console.log('✅ Response:', result.response);
      
      if (result.response.includes('service')) {
        console.log('✅ Correctly asking for service selection');
      } else if (result.response.includes('available times')) {
        console.log('✅ Showing available times directly');
      }
    }

    // Test 2: Date with service
    console.log('\n2. Testing "head spa for Friday"...');
    const fridayResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '+19185048902',
        to: '+19187277348',
        body: 'head spa for Friday'
      })
    });

    if (fridayResponse.ok) {
      const result = await fridayResponse.json();
      console.log('✅ Response:', result.response);
      
      if (result.response.includes('available times')) {
        console.log('✅ Showing available times for Friday');
      }
    }

    // Test 3: Simple greeting
    console.log('\n3. Testing "hi"...');
    const hiResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '+19185048902',
        to: '+19187277348',
        body: 'hi'
      })
    });

    if (hiResponse.ok) {
      const result = await hiResponse.json();
      console.log('✅ Response:', result.response);
      
      if (result.response.includes('Hi SMS Client')) {
        console.log('✅ Correctly handling simple greeting');
      }
    }

    // Test 4: Business question
    console.log('\n4. Testing "how much does a head spa cost?"...');
    const costResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '+19185048902',
        to: '+19187277348',
        body: 'how much does a head spa cost?'
      })
    });

    if (costResponse.ok) {
      const result = await costResponse.json();
      console.log('✅ Response:', result.response);
      
      if (result.response.includes('$99') || result.response.includes('cost')) {
        console.log('✅ Correctly handling pricing question');
      }
    }

    console.log('\n🎯 Simplified Logic Summary:');
    console.log('• Time/date keywords should trigger booking requests');
    console.log('• Simple greetings should get friendly responses');
    console.log('• Business questions should get informative responses');
    console.log('• Booking requests should show available times');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSimplifiedLogic().catch(console.error); 