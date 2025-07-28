#!/usr/bin/env node

/**
 * Test fresh greeting with new phone number
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5007';

async function testFreshGreeting() {
  console.log('🧪 Testing Fresh Greeting...\n');

  try {
    // Test with a different phone number to avoid conversation state
    console.log('1. Testing fresh "Hi" greeting with new phone number...');
    const testSMS1 = {
      from: '+15551234567',
      to: '+19187277348',
      body: 'Hi'
    };

    const response1 = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSMS1)
    });

    if (response1.ok) {
      const result1 = await response1.json();
      console.log('✅ Response 1:', result1.response.substring(0, 150) + '...');
      
      // Check if it mentions haircuts inappropriately
      if (result1.response.toLowerCase().includes('haircut') || 
          result1.response.toLowerCase().includes('don\'t offer') ||
          result1.response.toLowerCase().includes('not offer')) {
        console.log('❌ FAILURE: Still mentioning haircuts in simple greeting');
      } else {
        console.log('✅ SUCCESS: No inappropriate haircut mention in greeting');
      }
    }

    console.log('\n🎉 Test Summary:');
    console.log('✅ Fresh greeting should be warm and welcoming without mentioning haircuts');

  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

testFreshGreeting(); 