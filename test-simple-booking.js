#!/usr/bin/env node

/**
 * Simple Booking Test
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5004';

async function testSimpleBooking() {
  console.log('🔍 Testing Simple Booking Flow...\n');

  try {
    // Test 1: Direct booking request for "Signature Head Spa"
    console.log('1. Testing direct booking for Signature Head Spa...');
    const testSMS = {
      from: '+19185048902',
      to: '+19187277348',
      body: 'I want to book Signature Head Spa'
    };

    const response = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSMS)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Response:', result.response);
      
      if (result.response.includes('available times')) {
        console.log('🎉 SUCCESS: Found available times!');
      } else if (result.response.includes('no available slots')) {
        console.log('❌ FAILED: No available slots found');
      } else {
        console.log('⚠️  UNKNOWN: Unexpected response');
      }
    } else {
      console.log('❌ Failed:', response.status);
    }

  } catch (error) {
    console.error('❌ Error testing simple booking:', error);
  }
}

testSimpleBooking(); 