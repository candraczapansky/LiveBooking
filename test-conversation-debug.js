#!/usr/bin/env node

/**
 * Test conversation state management for SMS booking flow
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5003';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testConversationFlow() {
  console.log('🔍 Testing SMS Conversation Flow...\n');

  try {
    // Step 1: Initial booking request
    console.log('1. Initial booking request...');
    const testSMS1 = {
      from: '+19185048902',
      to: '+19187277348',
      body: 'Hi, I would like to book an appointment'
    };

    const response1 = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSMS1)
    });

    if (response1.ok) {
      const result1 = await response1.json();
      console.log('✅ Response 1:', result1.response.substring(0, 100) + '...');
    }

    await sleep(1000); // Wait for state to update

    // Step 2: Service selection
    console.log('\n2. Service selection...');
    const testSMS2 = {
      from: '+19185048902',
      to: '+19187277348',
      body: 'Signature head spa'
    };

    const response2 = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSMS2)
    });

    if (response2.ok) {
      const result2 = await response2.json();
      console.log('✅ Response 2:', result2.response.substring(0, 100) + '...');
      
      // Check if it's using booking flow
      if (result2.response.includes('available slots') || result2.response.includes('available times')) {
        console.log('✅ SUCCESS: Service selection triggered booking flow!');
      } else {
        console.log('❌ FAILURE: Still listing services');
      }
    }

    await sleep(1000); // Wait for state to update

    // Step 3: Time selection
    console.log('\n3. Time selection...');
    const testSMS3 = {
      from: '+19185048902',
      to: '+19187277348',
      body: 'Tomorrow'
    };

    const response3 = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSMS3)
    });

    if (response3.ok) {
      const result3 = await response3.json();
      console.log('✅ Response 3:', result3.response.substring(0, 100) + '...');
      
      // Check if conversation context is maintained
      if (result3.response.includes('We offer:') || result3.response.includes('Which service')) {
        console.log('❌ FAILURE: Lost conversation context - listing services again');
      } else {
        console.log('✅ SUCCESS: Conversation context maintained!');
      }
    }

  } catch (error) {
    console.error('❌ Error testing conversation flow:', error);
  }
}

testConversationFlow(); 