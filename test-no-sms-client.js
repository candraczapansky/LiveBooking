#!/usr/bin/env node

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testNoSMSClient() {
  console.log('🧪 Testing No "SMS Client" Response...\n');

  try {
    const response = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '+19185048902',
        to: '+19187277348',
        body: 'Hi! I want to book an appointment'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Response:', result.response);
      console.log(`🎯 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      
      if (result.response.includes('SMS Client')) {
        console.log('❌ Still contains "SMS Client"');
      } else {
        console.log('✅ No "SMS Client" found - Perfect!');
      }
    } else {
      console.log('❌ Test failed:', response.status);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testNoSMSClient(); 