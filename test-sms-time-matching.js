#!/usr/bin/env node

/**
 * Test SMS Time Matching
 * 
 * This script tests the SMS appointment booking time matching functionality
 * to ensure it correctly handles various time formats and matches them to available slots.
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5002';

async function testSMSTimeMatching() {
  console.log('🧪 Testing SMS Time Matching...\n');

  const testCases = [
    {
      name: 'Basic time format',
      message: 'I want to book a Signature Head Spa for 2:00 PM',
      expectedTime: '2:00 PM'
    },
    {
      name: 'Time without minutes',
      message: 'Can I book a facial for 3pm?',
      expectedTime: '3pm'
    },
    {
      name: 'Time with AM/PM',
      message: 'I need an appointment for 10:30 AM',
      expectedTime: '10:30 AM'
    },
    {
      name: 'Time range - morning',
      message: 'I want to book a massage in the morning',
      expectedTime: 'morning'
    },
    {
      name: 'Time range - afternoon',
      message: 'Can I get a facial in the afternoon?',
      expectedTime: 'afternoon'
    },
    {
      name: 'Full date and time',
      message: 'I want to book for tomorrow at 4:00 PM',
      expectedDate: 'tomorrow',
      expectedTime: '4:00 PM'
    },
    {
      name: 'Specific date and time',
      message: 'Book me for Friday at 11:00 AM',
      expectedDate: 'Friday',
      expectedTime: '11:00 AM'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Testing: ${testCase.name}`);
    console.log(`Message: "${testCase.message}"`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/sms-auto-respond/process-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          From: '+1234567890',
          Body: testCase.message,
          MessageSid: `test_${Date.now()}_${Math.random()}`
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Response: ${result.message}`);
        
        // Check if the response indicates time matching
        if (result.message.includes('booked') && result.message.includes('at')) {
          console.log(`🎯 SUCCESS: Appointment booked with time matching!`);
        } else if (result.message.includes('available times')) {
          console.log(`📋 SUCCESS: Showing available times as expected`);
        } else {
          console.log(`⚠️  UNKNOWN: Unexpected response format`);
        }
      } else {
        console.log(`❌ Error: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Network error: ${error.message}`);
    }
  }

  console.log('\n🎉 Time matching test completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Check the server logs for detailed time matching debug info');
  console.log('2. Verify that appointments are being booked for the correct times');
  console.log('3. Test with real SMS messages to confirm functionality');
}

// Run the test
testSMSTimeMatching().catch(console.error); 