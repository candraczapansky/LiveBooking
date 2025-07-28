#!/usr/bin/env node

/**
 * Test Time Rejection
 * 
 * This script tests the SMS responder with time rejection to verify it works properly.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testTimeRejection() {
  console.log('🧪 Testing Time Rejection...\n');

  try {
    // Test 1: Initial service request
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

    // Test 2: Time rejection
    console.log('\n2. Testing time rejection...');
    const test2 = {
      from: '+19185048902',
      to: '+19187277348',
      body: "I don't want that time"
    };

    const response2 = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(test2)
    });

    if (response2.ok) {
      const result2 = await response2.json();
      console.log('✅ Time rejection response:', result2.response);
      
      if (result2.response.includes("We don't offer haircuts")) {
        console.log('❌ ISSUE: Time rejection still giving haircut response');
      } else if (result2.response.includes('other available times') || result2.response.includes('better time')) {
        console.log('🎉 SUCCESS: Time rejection is working correctly!');
      } else {
        console.log('⚠️  UNKNOWN: Unexpected response format');
      }
    }

    // Test 3: Alternative rejection phrases
    console.log('\n3. Testing alternative rejection phrases...');
    const rejectionPhrases = [
      "I don't like that time",
      "I can't make that time",
      "I need a different time",
      "I want another time",
      "I need more options"
    ];
    
    for (const phrase of rejectionPhrases) {
      console.log(`Testing: "${phrase}"`);
      const test3 = {
        from: '+19185048902',
        to: '+19187277348',
        body: phrase
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

testTimeRejection(); 