#!/usr/bin/env node

/**
 * Simple SMS Webhook Test
 * 
 * This script tests if the SMS webhook is working correctly.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001';

async function testSMSAutoResponder() {
  console.log('🔍 Testing SMS Auto-Responder Booking Flow...\n');

  try {
    // Test 1: Check health status
    console.log('1. Checking health status...');
    const healthResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/health`);
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Health Status:', health);
    } else {
      console.log('❌ Health check failed:', healthResponse.status);
    }

    // Test 2: Test initial booking request
    console.log('\n2. Testing initial booking request...');
    const testSMS1 = {
      from: '+19185048902', // Test phone number
      to: '+19187277348',   // Use the configured auto-respond phone number
      body: 'Hi, I would like to book an appointment'
    };
    console.log('Test SMS 1 payload:', testSMS1);

    const processResponse1 = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSMS1)
    });

    if (processResponse1.ok) {
      const result1 = await processResponse1.json();
      console.log('✅ Initial booking response:', result1.response);
    } else {
      console.log('❌ Initial booking failed:', processResponse1.status);
    }

    // Test 3: Test service selection
    console.log('\n3. Testing service selection...');
    const testSMS2 = {
      from: '+19185048902',
      to: '+19187277348',
      body: 'Signature head spa'
    };
    console.log('Test SMS 2 payload:', testSMS2);

    const processResponse2 = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSMS2)
    });

    if (processResponse2.ok) {
      const result2 = await processResponse2.json();
      console.log('✅ Service selection response:', result2.response);
      
      // Check if it's using the booking flow instead of listing all services
      if (result2.response.includes('available times') || result2.response.includes('available slots')) {
        console.log('✅ SUCCESS: Service selection triggered booking flow!');
      } else if (result2.response.includes('We offer:') || result2.response.includes('Which service')) {
        console.log('❌ FAILURE: Service selection still listing all services');
      } else {
        console.log('⚠️  UNKNOWN: Response format unclear');
      }
    } else {
      console.log('❌ Service selection failed:', processResponse2.status);
    }

  } catch (error) {
    console.error('❌ Error testing SMS auto-responder:', error);
  }
}

testSMSAutoResponder(); 