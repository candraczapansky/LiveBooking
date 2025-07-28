#!/usr/bin/env node

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testSpecificResponses() {
  console.log('🧪 Testing Specific Responses...\n');

  const tests = [
    { name: 'Simple Hi', message: 'Hi' },
    { name: 'Service Question', message: 'What services do you offer?' },
    { name: 'Hours Question', message: 'What are your hours?' },
    { name: 'Booking Request', message: 'I want to book an appointment' },
    { name: 'Price Question', message: 'How much does a haircut cost?' }
  ];

  for (const test of tests) {
    console.log(`\n${test.name}:`);
    console.log(`Message: "${test.message}"`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: '+19185048902',
          to: '+19187277348',
          body: test.message
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`Response: ${result.response}`);
        console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      } else {
        console.log('❌ Test failed:', response.status);
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
    
    // Wait a moment between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testSpecificResponses(); 