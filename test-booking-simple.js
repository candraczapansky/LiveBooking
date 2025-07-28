#!/usr/bin/env node

import fetch from 'node-fetch';

async function testBooking() {
  console.log('Testing SMS Booking...');
  
  try {
    const response = await fetch('http://localhost:5001/api/sms-auto-respond/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '+19185048902',
        to: '+19187277348',
        body: 'I want to book a Signature Head Spa'
      })
    });
    
    const result = await response.json();
    console.log('Result:', result);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testBooking(); 