#!/usr/bin/env node

/**
 * Test Time Selection Issue
 * 
 * This script tests the SMS responder with time selection to demonstrate the issue.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testTimeSelection() {
  console.log('🧪 Testing Time Selection Issue...\n');

  try {
    // Test 1: Initial service request (should work)
    console.log('1. Testing initial service request...');
    const test1 = {
      from: '+19185048902',
      to: '+19187277348',
      body: 'Signature Head Spa'
    };

    const response1 = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(test1)
    });

    if (response1.ok) {
      const result1 = await response1.json();
      console.log('✅ Initial response:', result1.response.substring(0, 100) + '...');
    }

    // Test 2: Time selection (this is where the issue occurs)
    console.log('\n2. Testing time selection...');
    const test2 = {
      from: '+19185048902',
      to: '+19187277348',
      body: '9:00 AM'
    };

    const response2 = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(test2)
    });

    if (response2.ok) {
      const result2 = await response2.json();
      console.log('❌ Time selection response:', result2.response);
      
      if (result2.response.includes("We don't offer haircuts")) {
        console.log('🚨 ISSUE CONFIRMED: Time selection is falling back to generic response');
      } else if (result2.response.includes('appointment') || result2.response.includes('booked')) {
        console.log('✅ SUCCESS: Time selection is working correctly');
      } else {
        console.log('⚠️  UNKNOWN: Unexpected response format');
      }
    }

    // Test 3: Alternative time formats
    console.log('\n3. Testing alternative time formats...');
    const timeFormats = ['9 AM', '9:00', '9am', '9:00am'];
    
    for (const timeFormat of timeFormats) {
      console.log(`Testing: "${timeFormat}"`);
      const test3 = {
        from: '+19185048902',
        to: '+19187277348',
        body: timeFormat
      };

      const response3 = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test3)
      });

      if (response3.ok) {
        const result3 = await response3.json();
        console.log(`Response: ${result3.response.substring(0, 80)}...`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testTimeSelection(); 