#!/usr/bin/env node

/**
 * SMS Booking Setup Script
 * 
 * This script sets up the necessary configuration for SMS booking to work:
 * 1. Ensures staff have proper user details
 * 2. Sets up staff schedules
 * 3. Assigns services to staff
 * 4. Configures SMS auto-respond phone numbers
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001';

async function setupSMSBooking() {
  console.log('🔧 Setting up SMS Booking Functionality...\n');

  try {
    // Step 1: Check current staff and fix user details
    console.log('1. Checking and fixing staff user details...');
    const staffResponse = await fetch(`${BASE_URL}/api/staff`);
    if (staffResponse.ok) {
      const staff = await staffResponse.json();
      console.log(`Found ${staff.length} staff members`);

      for (const member of staff) {
        if (!member.user || !member.user.firstName) {
          console.log(`Fixing staff member ${member.id}...`);
      
          // Update staff user details
          const updateResponse = await fetch(`${BASE_URL}/api/users/${member.userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName: 'Emma',
              lastName: 'Martinez',
              email: 'emma.martinez@example.com',
              phone: '555-234-5678'
            })
          });
          
          if (updateResponse.ok) {
            console.log(`✅ Updated staff member ${member.id}`);
          } else {
            console.log(`❌ Failed to update staff member ${member.id}`);
          }
        }
      }
    }

    // Step 2: Set up staff schedules
    console.log('\n2. Setting up staff schedules...');
    const scheduleData = {
      staffId: 53, // Emma's staff ID
      schedules: [
        {
          dayOfWeek: 'Monday',
          startTime: '09:00',
          endTime: '17:00',
          isBlocked: false
        },
        {
          dayOfWeek: 'Tuesday',
          startTime: '09:00',
          endTime: '17:00',
          isBlocked: false
        },
        {
          dayOfWeek: 'Wednesday',
          startTime: '09:00',
          endTime: '17:00',
          isBlocked: false
        },
        {
          dayOfWeek: 'Thursday',
          startTime: '09:00',
          endTime: '17:00',
          isBlocked: false
        },
        {
          dayOfWeek: 'Friday',
            startTime: '09:00',
            endTime: '17:00',
            isBlocked: false
        },
        {
          dayOfWeek: 'Saturday',
          startTime: '10:00',
          endTime: '16:00',
          isBlocked: false
        }
      ]
    };

    const scheduleResponse = await fetch(`${BASE_URL}/api/staff/53/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scheduleData)
    });

    if (scheduleResponse.ok) {
      console.log('✅ Staff schedules created');
    } else {
      console.log('❌ Failed to create staff schedules:', scheduleResponse.status);
    }

    // Step 3: Assign services to staff
    console.log('\n3. Assigning services to staff...');
    const servicesResponse = await fetch(`${BASE_URL}/api/services`);
    if (servicesResponse.ok) {
      const services = await servicesResponse.json();
      
      // Find the Signature Head Spa service
      const signatureService = services.find(s => s.name.toLowerCase().includes('signature head spa'));
      
      if (signatureService) {
        const staffServiceData = {
          staffId: 53,
          serviceId: signatureService.id
        };

        const staffServiceResponse = await fetch(`${BASE_URL}/api/staff-services`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(staffServiceData)
        });

        if (staffServiceResponse.ok) {
          console.log(`✅ Assigned ${signatureService.name} to staff`);
        } else {
          console.log('❌ Failed to assign service to staff:', staffServiceResponse.status);
        }
      }
    }

    // Step 4: Configure SMS auto-respond phone numbers
    console.log('\n4. Configuring SMS auto-respond phone numbers...');
    const phoneNumbers = ['+19187277348']; // The phone number from the test
    
    const configResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/phone-numbers`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumbers })
    });

    if (configResponse.ok) {
      console.log('✅ SMS auto-respond phone numbers configured');
    } else {
      console.log('❌ Failed to configure phone numbers:', configResponse.status);
    }

    // Step 5: Test the setup
    console.log('\n5. Testing SMS booking setup...');
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
        console.log('🎉 SUCCESS: SMS booking is now working!');
      } else {
        console.log('⚠️  SMS booking may still need configuration');
      }
    } else {
      console.log('❌ Test failed:', testResponse.status);
    }

  } catch (error) {
    console.error('❌ Error during setup:', error);
  }
}

setupSMSBooking(); 