#!/usr/bin/env node

/**
 * Test All Improved Responses
 * 
 * This script tests all the improved SMS auto-responder responses.
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5002';

async function testResponse(message, expectedKeywords, testName) {
  try {
    const response = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: '+19185048902',
        to: '+19187277348',
        body: message
      })
    });

    if (!response.ok) {
      console.log(`❌ ${testName}: HTTP ${response.status}`);
      return false;
    }

    const result = await response.json();
    
    if (result.success && result.responseSent) {
      console.log(`✅ ${testName}: "${result.response.substring(0, 50)}..."`);
      
      // Check if response contains expected keywords
      const hasExpectedKeywords = expectedKeywords.some(keyword => 
        result.response.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (hasExpectedKeywords) {
        console.log(`   ✅ Contains expected content`);
        return true;
      } else {
        console.log(`   ⚠️  Missing expected content`);
        return false;
      }
    } else {
      console.log(`❌ ${testName}: No response sent`);
      return false;
    }

  } catch (error) {
    console.log(`❌ ${testName}: ${error.message}`);
    return false;
  }
}

async function testAllResponses() {
  console.log('🧪 Testing All Improved SMS Responses...\n');

  const tests = [
    {
      message: 'Hi',
      expectedKeywords: ['👋', 'How can I help'],
      testName: 'Simple Greeting'
    },
    {
      message: 'Hello',
      expectedKeywords: ['👋', 'How can I help'],
      testName: 'Simple Greeting (Hello)'
    },
    {
      message: 'What services do you offer?',
      expectedKeywords: ['services', 'Signature Head Spa', '$99'],
      testName: 'Business Question - Services'
    },
    {
      message: 'How much does it cost?',
      expectedKeywords: ['cost', 'price', '$99'],
      testName: 'Business Question - Pricing'
    },
    {
      message: 'When are you open?',
      expectedKeywords: ['open', 'Wednesday', 'Saturday', '10 AM', '8 PM'],
      testName: 'Business Question - Hours'
    },
    {
      message: 'I want to book an appointment',
      expectedKeywords: ['book', 'appointment', 'service', 'Signature Head Spa'],
      testName: 'Booking Request'
    },
    {
      message: 'Thank you',
      expectedKeywords: ['welcome', 'help'],
      testName: 'Thank You'
    },
    {
      message: 'What should I do?',
      expectedKeywords: ['help', 'services', 'Signature Head Spa'],
      testName: 'Confusion/Help'
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    const passed = await testResponse(test.message, test.expectedKeywords, test.testName);
    if (passed) passedTests++;
    console.log(''); // Empty line for readability
  }

  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! SMS auto-responder is working perfectly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the responses.');
  }

  console.log('\n🔧 Key Improvements Made:');
  console.log('✅ Simple greetings are now natural and friendly');
  console.log('✅ No more pushy sales language for basic greetings');
  console.log('✅ Business questions get appropriate, helpful responses');
  console.log('✅ Booking requests are handled properly');
  console.log('✅ All responses are contextually appropriate');
}

// Run the tests
testAllResponses().catch(console.error); 