#!/usr/bin/env node

/**
 * Debug SMS Booking Issues
 * 
 * This script checks the database state to identify why SMS booking
 * shows times again instead of booking appointments.
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5002';

async function debugSMSBooking() {
  console.log('🔍 Debugging SMS Booking Issues...\n');

  try {
    // Check if server is running
    console.log('1. Checking server connectivity...');
    try {
      const healthResponse = await fetch(`${BASE_URL}/api/health`);
      if (healthResponse.ok) {
        console.log('✅ Server is running');
      } else {
        console.log('❌ Server health check failed');
        return;
      }
    } catch (error) {
      console.log('❌ Server is not running. Please start the server first.');
      console.log('   Run: npm run dev');
      return;
    }

    // Check services
    console.log('\n2. Checking services...');
    try {
      const servicesResponse = await fetch(`${BASE_URL}/api/services`);
      if (servicesResponse.ok) {
        const services = await servicesResponse.json();
        console.log(`✅ Found ${services.length} services:`);
        services.forEach(service => {
          console.log(`   - ${service.name} (ID: ${service.id}, Duration: ${service.duration}min, Price: $${service.price})`);
        });
        
        if (services.length === 0) {
          console.log('❌ No services found! This is likely the problem.');
          console.log('   Create services through the web interface or API.');
        }
      } else {
        console.log('❌ Failed to fetch services:', servicesResponse.status);
      }
    } catch (error) {
      console.log('❌ Error fetching services:', error.message);
    }

    // Check staff
    console.log('\n3. Checking staff...');
    try {
      const staffResponse = await fetch(`${BASE_URL}/api/staff`);
      if (staffResponse.ok) {
        const staff = await staffResponse.json();
        console.log(`✅ Found ${staff.length} staff members:`);
        staff.forEach(member => {
          console.log(`   - ${member.title || 'Staff'} (ID: ${member.id})`);
        });
        
        if (staff.length === 0) {
          console.log('❌ No staff found! This is likely the problem.');
          console.log('   Create staff through the web interface or API.');
        }
      } else {
        console.log('❌ Failed to fetch staff:', staffResponse.status);
      }
    } catch (error) {
      console.log('❌ Error fetching staff:', error.message);
    }

    // Check staff schedules
    console.log('\n4. Checking staff schedules...');
    try {
      const schedulesResponse = await fetch(`${BASE_URL}/api/staff-schedules`);
      if (schedulesResponse.ok) {
        const schedules = await schedulesResponse.json();
        console.log(`✅ Found ${schedules.length} staff schedules:`);
        schedules.forEach(schedule => {
          console.log(`   - Staff ${schedule.staffId}: ${schedule.dayOfWeek} ${schedule.startTime}-${schedule.endTime} (Blocked: ${schedule.isBlocked})`);
        });
        
        if (schedules.length === 0) {
          console.log('❌ No staff schedules found! This is likely the problem.');
          console.log('   Create staff schedules through the web interface or API.');
        }
      } else {
        console.log('❌ Failed to fetch staff schedules:', schedulesResponse.status);
      }
    } catch (error) {
      console.log('❌ Error fetching staff schedules:', error.message);
    }

    // Check staff services
    console.log('\n5. Checking staff services...');
    try {
      const staffServicesResponse = await fetch(`${BASE_URL}/api/staff-services`);
      if (staffServicesResponse.ok) {
        const staffServices = await staffServicesResponse.json();
        console.log(`✅ Found ${staffServices.length} staff service assignments:`);
        staffServices.forEach(assignment => {
          console.log(`   - Staff ${assignment.staffId} assigned to Service ${assignment.serviceId}`);
        });
        
        if (staffServices.length === 0) {
          console.log('❌ No staff services found! This is likely the problem.');
          console.log('   Assign services to staff through the web interface or API.');
        }
      } else {
        console.log('❌ Failed to fetch staff services:', staffServicesResponse.status);
      }
    } catch (error) {
      console.log('❌ Error fetching staff services:', error.message);
    }

    // Check existing appointments
    console.log('\n6. Checking existing appointments...');
    try {
      const appointmentsResponse = await fetch(`${BASE_URL}/api/appointments`);
      if (appointmentsResponse.ok) {
        const appointments = await appointmentsResponse.json();
        console.log(`✅ Found ${appointments.length} appointments:`);
        appointments.forEach(apt => {
          console.log(`   - ${apt.serviceName} on ${new Date(apt.startTime).toLocaleDateString()} at ${new Date(apt.startTime).toLocaleTimeString()} (Status: ${apt.status})`);
        });
      } else {
        console.log('❌ Failed to fetch appointments:', appointmentsResponse.status);
      }
    } catch (error) {
      console.log('❌ Error fetching appointments:', error.message);
    }

    // Test SMS booking directly
    console.log('\n7. Testing SMS booking...');
    try {
      const testMessage = {
        From: '+1234567890',
        Body: 'I want to book a Signature Head Spa for 2:00 PM',
        MessageSid: `test_${Date.now()}`
      };

      console.log('📱 Sending test SMS:', testMessage.Body);
      
      const smsResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/process-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testMessage)
      });

      if (smsResponse.ok) {
        const result = await smsResponse.json();
        console.log('📱 SMS Response:', result.message);
        
        if (result.message.includes('booked') && result.message.includes('at')) {
          console.log('🎯 SUCCESS: Appointment was booked!');
        } else if (result.message.includes('available times') || result.message.includes('Which time')) {
          console.log('📋 ISSUE: System is showing times instead of booking');
        } else if (result.message.includes('not available')) {
          console.log('⚠️  ISSUE: Requested time is not available');
        } else {
          console.log('❓ UNKNOWN: Unexpected response');
        }
      } else {
        console.log('❌ SMS API failed:', smsResponse.status);
      }
    } catch (error) {
      console.log('❌ Error testing SMS:', error.message);
    }

    console.log('\n📋 Summary:');
    console.log('If you see "No services found", "No staff found", "No staff schedules found", or "No staff services found" above,');
    console.log('that is likely why the SMS booking is not working.');
    console.log('\nTo fix:');
    console.log('1. Create services through the web interface');
    console.log('2. Create staff members through the web interface');
    console.log('3. Set up staff schedules through the web interface');
    console.log('4. Assign services to staff through the web interface');

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

// Run the debug
debugSMSBooking().catch(console.error); 