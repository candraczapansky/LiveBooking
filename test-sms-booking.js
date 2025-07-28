#!/usr/bin/env node

/**
 * SMS Appointment Booking Test
 * 
 * This script tests the SMS appointment booking functionality.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001';

async function testSMSBooking() {
  console.log('🔍 Testing SMS Appointment Booking...\n');

  try {
    // Test 1: Simple booking request
    console.log('1. Testing simple booking request...');
    const testSMS1 = {
      from: '+19185048902',
      to: '+19187277348',
      body: 'I want to book an appointment'
    };

    const response1 = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSMS1)
    });

    if (response1.ok) {
      const result1 = await response1.json();
      console.log('✅ Simple booking request result:', result1);
    }

    // Test 2: Service-specific booking request
    console.log('\n2. Testing service-specific booking request...');
    const testSMS2 = {
      from: '+19185048902',
      to: '+19187277348',
      body: 'I want to book a Signature Head Spa'
    };

    const response2 = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSMS2)
    });

    if (response2.ok) {
      const result2 = await response2.json();
      console.log('✅ Service-specific booking result:', result2);
    }

    // Test 3: Complete booking request with time
    console.log('\n3. Testing complete booking request...');
    const testSMS3 = {
      from: '+19185048902',
      to: '+19187277348',
      body: 'Book me a Deluxe Head Spa for tomorrow at 3pm'
    };

    const response3 = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSMS3)
    });

    if (response3.ok) {
      const result3 = await response3.json();
      console.log('✅ Complete booking result:', result3);
    }

    // Test 4: Just "Hi" - should trigger booking conversation
    console.log('\n4. Testing "Hi" message...');
    const testSMS4 = {
      from: '+19185048902',
      to: '+19187277348',
      body: 'Hi'
    };

    const response4 = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSMS4)
    });

    if (response4.ok) {
      const result4 = await response4.json();
      console.log('✅ "Hi" message result:', result4);
    }

  } catch (error) {
    console.error('❌ Error testing SMS booking:', error);
  }
}

testSMSBooking(); 