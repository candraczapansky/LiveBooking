#!/usr/bin/env node

/**
 * Test Date-Specific Handling
 * 
 * This script tests that the SMS auto-responder properly handles specific date requests
 * and shows available times for that specific day instead of falling back to generic responses.
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5002';

async function testDateSpecificHandling() {
  console.log('🧪 Testing Date-Specific Handling...\n');
  console.log('Verifying that SMS auto-responder shows available times for specific dates\n');

  try {
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test 1: Specific date request
    console.log('1. Testing specific date request...');
    const dateResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '+19185048902',
        body: 'I want to book for tomorrow'
      })
    });

    if (dateResponse.ok) {
      const dateResult = await dateResponse.json();
      console.log('✅ Date request response:', dateResult.response);
      
      // Check if response contains available times for the specific date
      if (dateResult.response && dateResult.response.includes('available times')) {
        console.log('✅ Response contains available times for the specific date');
      } else {
        console.log('❌ Response does not contain available times for the specific date');
      }
    } else {
      console.log('❌ Date request failed:', dateResponse.status);
    }

    console.log('\n2. Testing specific date with service...');
    const dateServiceResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '+19185048902',
        body: 'I want to book a head spa for Friday'
      })
    });

    if (dateServiceResponse.ok) {
      const dateServiceResult = await dateServiceResponse.json();
      console.log('✅ Date with service response:', dateServiceResult.response);
      
      // Check if response contains available times for the specific date
      if (dateServiceResult.response && dateServiceResult.response.includes('available times')) {
        console.log('✅ Response contains available times for the specific date');
      } else {
        console.log('❌ Response does not contain available times for the specific date');
      }
    } else {
      console.log('❌ Date with service request failed:', dateServiceResponse.status);
    }

    console.log('\n3. Testing specific time request...');
    const timeResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '+19185048902',
        body: 'I want to book for 2:00 PM tomorrow'
      })
    });

    if (timeResponse.ok) {
      const timeResult = await timeResponse.json();
      console.log('✅ Time request response:', timeResult.response);
      
      // Check if response handles the specific time request
      if (timeResult.response && (timeResult.response.includes('available') || timeResult.response.includes('booked'))) {
        console.log('✅ Response properly handles specific time request');
      } else {
        console.log('❌ Response does not properly handle specific time request');
      }
    } else {
      console.log('❌ Time request failed:', timeResponse.status);
    }

    console.log('\n🎯 Test Summary:');
    console.log('The SMS auto-responder should now properly handle specific date requests');
    console.log('and show available times for those specific dates instead of generic responses.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDateSpecificHandling().catch(console.error); 