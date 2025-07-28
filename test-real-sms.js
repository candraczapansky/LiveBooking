#!/usr/bin/env node

/**
 * Test Real SMS Sending
 * 
 * This script tests that the SMS auto-responder will send real SMS messages
 * instead of just simulating them
 */

import fetch from 'node-fetch';

async function testRealSMS() {
  console.log('🧪 Testing Real SMS Sending\n');
  
  const baseUrl = 'http://localhost:5000';
  
  try {
    // Test 1: Test with a test number (should simulate)
    console.log('1. Testing with test number (should simulate)...');
    const testSMS1 = {
      from: '+1234567890',
      to: '+19187277348',
      body: 'Test message from test number'
    };
    
    const testResponse1 = await fetch(`${baseUrl}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSMS1)
    });
    
    if (testResponse1.ok) {
      const result1 = await testResponse1.json();
      console.log('✅ Test number result:', result1.responseSent ? 'Simulated' : 'Not sent');
    }
    
    // Test 2: Test with a real phone number (should send real SMS)
    console.log('\n2. Testing with real phone number (should send real SMS)...');
    const realPhoneNumber = '+19185048902'; // Use a real number from your Twilio logs
    const testSMS2 = {
      from: realPhoneNumber,
      to: '+19187277348',
      body: 'Test message from real phone number'
    };
    
    const testResponse2 = await fetch(`${baseUrl}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSMS2)
    });
    
    if (testResponse2.ok) {
      const result2 = await testResponse2.json();
      console.log('✅ Real number result:', result2.responseSent ? 'Real SMS sent' : 'Not sent');
      if (result2.responseSent) {
        console.log('📱 Response:', result2.response);
        console.log('🎯 Confidence:', (result2.confidence * 100).toFixed(1) + '%');
      }
    }
    
    // Test 3: Test webhook with real phone number
    console.log('\n3. Testing webhook with real phone number...');
    const webhookSMS = {
      From: realPhoneNumber,
      To: '+19187277348',
      Body: 'Hi, I need information about your services',
      MessageSid: `real_test_${Date.now()}`,
      Timestamp: new Date().toISOString()
    };
    
    const webhookResponse = await fetch(`${baseUrl}/api/webhook/incoming-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookSMS)
    });
    
    if (webhookResponse.ok) {
      console.log('✅ Webhook processed successfully');
      const response = await webhookResponse.text();
      if (response.includes('<?xml')) {
        console.log('✅ TwiML response generated');
      }
    }
    
    console.log('\n🎉 Test completed!');
    console.log('\n📋 What to expect:');
    console.log('1. Test numbers (like +1234567890) will be simulated');
    console.log('2. Real phone numbers will trigger actual SMS sending');
    console.log('3. Check your Twilio logs for real SMS delivery');
    console.log('4. You should see "DEVELOPMENT MODE: Sending REAL SMS" in server logs');
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  }
}

testRealSMS(); 