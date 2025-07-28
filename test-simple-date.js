#!/usr/bin/env node

import fetch from 'node-fetch';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

async function testSimpleDate() {
  console.log('🧪 Simple Date Test...\n');

  try {
    // Test simple date request
    console.log('1. Testing simple date request...');
    const dateResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '+19185048902',
        to: '+19187277348',
        body: 'tomorrow'
      })
    });

    console.log('Date request status:', dateResponse.status);
    
    if (dateResponse.ok) {
      const result = await dateResponse.json();
      console.log('✅ Response:', result.response);
      
      // Check if it contains available times
      if (result.response && result.response.includes('available times')) {
        console.log('✅ Response contains available times for the specific date');
      } else {
        console.log('❌ Response does not contain available times for the specific date');
      }
    } else {
      const errorText = await dateResponse.text();
      console.log('❌ Error response:', errorText);
    }

    // Test 2: Date with service
    console.log('\n2. Testing date with service...');
    const dateServiceResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '+19185048902',
        to: '+19187277348',
        body: 'I want to book a head spa for Friday'
      })
    });

    console.log('Date with service status:', dateServiceResponse.status);
    
    if (dateServiceResponse.ok) {
      const result = await dateServiceResponse.json();
      console.log('✅ Response:', result.response);
      
      // Check if it contains available times
      if (result.response && result.response.includes('available times')) {
        console.log('✅ Response contains available times for the specific date');
      } else {
        console.log('❌ Response does not contain available times for the specific date');
      }
    } else {
      const errorText = await dateServiceResponse.text();
      console.log('❌ Error response:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSimpleDate().catch(console.error); 