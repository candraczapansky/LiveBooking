#!/usr/bin/env node

/**
 * Test greeting fix - should not mention haircuts for simple greetings
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5007';

async function testGreetingFix() {
  console.log('🧪 Testing Greeting Fix...\n');

  try {
    // Test 1: Simple greeting
    console.log('1. Testing simple "Hi" greeting...');
    const testSMS1 = {
      from: '+19185048902',
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
      console.log('✅ Response 1:', result1.response.substring(0, 100) + '...');
      
      // Check if it mentions haircuts inappropriately
      if (result1.response.toLowerCase().includes('haircut') || 
          result1.response.toLowerCase().includes('don\'t offer') ||
          result1.response.toLowerCase().includes('not offer')) {
        console.log('❌ FAILURE: Still mentioning haircuts in simple greeting');
      } else {
        console.log('✅ SUCCESS: No inappropriate haircut mention in greeting');
      }
    }

    // Test 2: Direct haircut question (should mention it)
    console.log('\n2. Testing direct haircut question...');
    const testSMS2 = {
      from: '+19185048902',
      to: '+19187277348',
      body: 'Do you offer haircuts?'
    };

    const response2 = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSMS2)
    });

    if (response2.ok) {
      const result2 = await response2.json();
      console.log('✅ Response 2:', result2.response.substring(0, 150) + '...');
      
      // Check if it correctly explains they don't offer haircuts
      if (result2.response.toLowerCase().includes('don\'t offer haircuts') || 
          result2.response.toLowerCase().includes('not offer haircuts')) {
        console.log('✅ SUCCESS: Correctly explains no haircut services when asked');
      } else {
        console.log('❌ FAILURE: Does not explain no haircut services when asked');
      }
    }

    console.log('\n🎉 Test Summary:');
    console.log('✅ Greeting should be warm and welcoming without mentioning haircuts');
    console.log('✅ Direct haircut questions should be answered appropriately');

  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

testGreetingFix(); 