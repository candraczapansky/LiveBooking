#!/usr/bin/env node

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001';

async function testSMSBooking() {
  console.log('🧪 Testing SMS Booking...\n');

  try {
    // Test 1: Initial booking request
    console.log('1. Testing initial booking request...');
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
      console.log('✅ Response 1:', result1.response);
    } else {
      console.log('❌ Test 1 failed:', response1.status);
    }

    // Test 2: Service selection
    console.log('\n2. Testing service selection...');
    const testSMS2 = {
      from: '+19185048902',
      to: '+19187277348',
      body: 'Signature Head Spa'
    };

    const response2 = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSMS2)
    });

    if (response2.ok) {
      const result2 = await response2.json();
      console.log('✅ Response 2:', result2.response);
      
      if (result2.response.includes('available times') || result2.response.includes('available slots')) {
        console.log('🎉 SUCCESS: SMS booking is working!');
      } else if (result2.response.includes("couldn't find any available slots")) {
        console.log('⚠️  SMS booking detected but no slots available');
      } else {
        console.log('❌ SMS booking not working as expected');
      }
    } else {
      console.log('❌ Test 2 failed:', response2.status);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testSMSBooking(); 