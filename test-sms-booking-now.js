#!/usr/bin/env node

/**
 * Test SMS Booking Now
 * 
 * This script tests the SMS booking functionality to see why it shows times again.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5002';

async function testSMSBooking() {
  console.log('🧪 Testing SMS Booking...\n');

  try {
    // Test 1: Check if server is running
    console.log('1. Checking server...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    if (!healthResponse.ok) {
      console.log('❌ Server not responding');
      return;
    }
    console.log('✅ Server is running');

    // Test 2: Test SMS booking with specific time
    console.log('\n2. Testing SMS booking with specific time...');
    
    const testMessage = {
      From: '+1234567890',
      Body: 'I want to book a Signature Head Spa for 2:00 PM',
      MessageSid: `test_${Date.now()}`
    };

    console.log('📱 Sending SMS:', testMessage.Body);
    
    const smsResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/process-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testMessage)
    });

    if (smsResponse.ok) {
      const result = await smsResponse.json();
      console.log('📱 SMS Response:', result.message);
      
      // Analyze the response
      if (result.message.includes('booked') && result.message.includes('at')) {
        console.log('🎉 SUCCESS: Appointment was booked!');
      } else if (result.message.includes('available times') || result.message.includes('Which time')) {
        console.log('📋 ISSUE: System is showing times instead of booking');
        console.log('🔍 This confirms the problem - the system should book the appointment but is showing times again');
      } else if (result.message.includes('not available')) {
        console.log('⚠️  ISSUE: Requested time is not available');
      } else if (result.message.includes('no available slots')) {
        console.log('❌ ISSUE: No available slots found');
        console.log('🔍 This is the root cause - the findAvailableSlots method is returning 0 slots');
      } else {
        console.log('❓ UNKNOWN: Unexpected response');
      }
    } else {
      console.log('❌ SMS API failed:', smsResponse.status);
      const errorText = await smsResponse.text();
      console.log('Error details:', errorText);
    }

    // Test 3: Test with just service name (should show times)
    console.log('\n3. Testing SMS booking with just service name...');
    
    const testMessage2 = {
      From: '+1234567890',
      Body: 'I want to book a Signature Head Spa',
      MessageSid: `test2_${Date.now()}`
    };

    console.log('📱 Sending SMS:', testMessage2.Body);
    
    const smsResponse2 = await fetch(`${BASE_URL}/api/sms-auto-respond/process-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testMessage2)
    });

    if (smsResponse2.ok) {
      const result2 = await smsResponse2.json();
      console.log('📱 SMS Response:', result2.message);
      
      if (result2.message.includes('available times') || result2.message.includes('Which time')) {
        console.log('✅ EXPECTED: System shows available times when no time specified');
      } else {
        console.log('❓ UNEXPECTED: System should show times but didn\'t');
      }
    }

    console.log('\n📋 Analysis:');
    console.log('If Test 2 shows "available times" instead of booking,');
    console.log('the issue is that findAvailableSlots is returning 0 slots.');
    console.log('\nCheck the server logs for debug messages like:');
    console.log('- "Available slots found: 0"');
    console.log('- "No available slots found!"');

  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

testSMSBooking().catch(console.error); 