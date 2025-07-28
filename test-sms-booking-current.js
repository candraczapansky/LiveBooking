#!/usr/bin/env node

/**
 * Test SMS Booking with Current Data
 * 
 * This script checks the current state and tests SMS booking.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001';

async function testSMSBookingCurrent() {
  console.log('🧪 Testing SMS Booking with Current Data...\n');

  try {
    // Check current services
    console.log('1. Checking current services...');
    const servicesResponse = await fetch(`${BASE_URL}/api/services`);
    if (servicesResponse.ok) {
      const services = await servicesResponse.json();
      console.log(`Found ${services.length} services:`, services.map(s => s.name));
    }

    // Check current staff
    console.log('\n2. Checking current staff...');
    const staffResponse = await fetch(`${BASE_URL}/api/staff`);
    if (staffResponse.ok) {
      const staff = await staffResponse.json();
      console.log(`Found ${staff.length} staff members:`, staff.map(s => s.title));
    }

    // Check staff schedules
    console.log('\n3. Checking staff schedules...');
    const schedulesResponse = await fetch(`${BASE_URL}/api/staff-schedules`);
    if (schedulesResponse.ok) {
      const schedules = await schedulesResponse.json();
      console.log(`Found ${schedules.length} staff schedules`);
    } else {
      console.log('No staff schedules found');
    }

    // Check staff services
    console.log('\n4. Checking staff services...');
    const staffServicesResponse = await fetch(`${BASE_URL}/api/staff-services`);
    if (staffServicesResponse.ok) {
      const staffServices = await staffServicesResponse.json();
      console.log(`Found ${staffServices.length} staff-service assignments`);
    }

    // Test SMS booking
    console.log('\n5. Testing SMS booking...');
    const testSMS = {
      from: '+19185048902',
      to: '+19187277348',
      body: 'Signature Head Spa'
    };

    const testResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSMS)
    });

    if (testResponse.ok) {
      const result = await testResponse.json();
      console.log('✅ Test SMS Response:', result.response);
      
      if (result.response.includes('available times') || result.response.includes('available slots')) {
        console.log('🎉 SUCCESS: SMS booking is working!');
      } else if (result.response.includes("couldn't find any available slots")) {
        console.log('⚠️  SMS booking detected but no slots available');
      } else {
        console.log('❌ SMS booking not working as expected');
      }
    } else {
      console.log('❌ Test failed:', testResponse.status);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testSMSBookingCurrent(); 