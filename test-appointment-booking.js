#!/usr/bin/env node

/**
 * Test Appointment Booking via SMS
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001';

async function testAppointmentBooking() {
  console.log('🔍 Testing SMS Appointment Booking...\n');

  try {
    // Test 1: Basic booking request
    console.log('1. Testing basic booking request...');
    const testSMS = {
      from: '+19185048902',
      to: '+19187277348',
      body: 'I want to book an appointment'
    };

    const response = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSMS)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ SMS processing result:', result);
      
      if (result.success && result.responseSent) {
        console.log('🎉 SMS Appointment Booking is working!');
        console.log(`📱 Response: ${result.response}`);
        console.log(`🎯 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      } else {
        console.log('⚠️  SMS processed but no response sent:', result.reason);
      }
    } else {
      console.log('❌ SMS processing failed:', response.status);
      const errorText = await response.text();
      console.log('Error details:', errorText);
    }

  } catch (error) {
    console.error('❌ Error testing SMS appointment booking:', error);
  }
}

testAppointmentBooking(); 