#!/usr/bin/env node

/**
 * Test SMS Booking Flow
 * 
 * This script tests the complete SMS booking flow to debug why
 * the system shows times again instead of booking when a time is provided.
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5002';

async function testSMSBookingFlow() {
  console.log('🧪 Testing SMS Booking Flow...\n');

  const testPhone = '+1234567890';
  
  const testFlow = [
    {
      step: 'Initial request with service and time',
      message: 'I want to book a Signature Head Spa for 2:00 PM',
      expected: 'should book appointment'
    },
    {
      step: 'Service only',
      message: 'I want to book a Signature Head Spa',
      expected: 'should show available times'
    },
    {
      step: 'Time only (after service selected)',
      message: '2:00 PM',
      expected: 'should book appointment'
    },
    {
      step: 'Complete booking in one message',
      message: 'Book me a Signature Head Spa for tomorrow at 3:00 PM',
      expected: 'should book appointment'
    }
  ];

  for (const test of testFlow) {
    console.log(`\n📝 Testing: ${test.step}`);
    console.log(`Message: "${test.message}"`);
    console.log(`Expected: ${test.expected}`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/sms-auto-respond/process-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          From: testPhone,
          Body: test.message,
          MessageSid: `test_${Date.now()}_${Math.random()}`
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Response: ${result.message}`);
        
        // Analyze the response
        if (result.message.includes('booked') && result.message.includes('at')) {
          console.log(`🎯 SUCCESS: Appointment was booked!`);
        } else if (result.message.includes('available times') || result.message.includes('Which time')) {
          console.log(`📋 SHOWING TIMES: System is showing available times instead of booking`);
        } else if (result.message.includes('not available')) {
          console.log(`⚠️  TIME NOT AVAILABLE: Requested time is not available`);
        } else {
          console.log(`❓ UNKNOWN: Unexpected response format`);
        }
      } else {
        console.log(`❌ Error: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Network error: ${error.message}`);
    }
    
    // Wait a moment between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n🎉 Booking flow test completed!');
  console.log('\n📋 Check the server logs for detailed debugging information.');
  console.log('Look for:');
  console.log('- Time matching debug logs');
  console.log('- Booking attempt logs');
  console.log('- Conversation state logs');
}

// Run the test
testSMSBookingFlow().catch(console.error); 