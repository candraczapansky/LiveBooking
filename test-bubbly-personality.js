#!/usr/bin/env node

/**
 * Test Bubbly Personality
 * 
 * This script tests the new bubbly, friendly personality for SMS responses.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testBubblyPersonality() {
  console.log('🎉 Testing New Bubbly Personality! 🎉\n');

  try {
    // Test 1: Basic greeting
    console.log('1. Testing basic greeting...');
    const greetingResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '+19185048902',
        to: '+19187277348',
        body: 'Hi there!'
      })
    });

    if (greetingResponse.ok) {
      const result = await greetingResponse.json();
      console.log('✅ Greeting Response:', result.response);
      console.log(`🎯 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    }

    // Test 2: Service inquiry
    console.log('\n2. Testing service inquiry...');
    const serviceResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '+19185048902',
        to: '+19187277348',
        body: 'What services do you offer?'
      })
    });

    if (serviceResponse.ok) {
      const result = await serviceResponse.json();
      console.log('✅ Service Response:', result.response);
      console.log(`🎯 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    }

    // Test 3: Appointment booking
    console.log('\n3. Testing appointment booking...');
    const bookingResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '+19185048902',
        to: '+19187277348',
        body: 'I want to book an appointment!'
      })
    });

    if (bookingResponse.ok) {
      const result = await bookingResponse.json();
      console.log('✅ Booking Response:', result.response);
      console.log(`🎯 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    }

    console.log('\n🎉 Bubbly Personality Test Complete!');
    console.log('✨ Your AI should now be super friendly and enthusiastic! ✨');

  } catch (error) {
    console.error('❌ Error testing bubbly personality:', error);
  }
}

testBubblyPersonality(); 