#!/usr/bin/env node

/**
 * Quick SMS Test
 * 
 * This script simulates the exact SMS booking scenario to identify the issue.
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

async function quickSMSTest() {
  console.log('🚀 Quick SMS Test...\n');

  try {
    const sql = neon(process.env.DATABASE_URL);
    
    // Test 1: Check if we can find the Signature Head Spa service
    console.log('1. Checking Signature Head Spa service...');
    const services = await sql`SELECT * FROM services WHERE name ILIKE '%signature%'`;
    console.log(`Found ${services.length} Signature services:`, services.map(s => s.name));
    
    if (services.length === 0) {
      console.log('❌ No Signature services found!');
      return;
    }
    
    const service = services[0];
    console.log(`✅ Using service: ${service.name} (ID: ${service.id}, Duration: ${service.duration}min)`);
    
    // Test 2: Check staff assigned to this service
    console.log('\n2. Checking staff assignments...');
    const staffServices = await sql`
      SELECT ss.*, s.name as service_name, st.title as staff_title
      FROM staff_services ss
      JOIN services s ON ss.service_id = s.id
      JOIN staff st ON ss.staff_id = st.id
      WHERE s.id = ${service.id}
    `;
    
    console.log(`Found ${staffServices.length} staff assigned to ${service.name}:`);
    staffServices.forEach(ss => {
      console.log(`   - ${ss.staff_title} (ID: ${ss.staff_id})`);
    });
    
    if (staffServices.length === 0) {
      console.log('❌ No staff assigned to this service!');
      return;
    }
    
    // Test 3: Check staff schedules for tomorrow
    console.log('\n3. Checking staff schedules for tomorrow...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayOfWeek = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });
    
    console.log(`Looking for schedules on ${dayOfWeek} (${tomorrow.toDateString()})`);
    
    const schedules = await sql`
      SELECT ss.*, s.title as staff_title
      FROM staff_schedules ss
      JOIN staff s ON ss.staff_id = s.id
      WHERE ss.day_of_week = ${dayOfWeek} 
      AND ss.is_blocked = false
      AND ss.staff_id IN (${sql.unsafe(staffServices.map(ss => ss.staff_id).join(','))})
    `;
    
    console.log(`Found ${schedules.length} schedules for ${dayOfWeek}:`);
    schedules.forEach(schedule => {
      console.log(`   - ${schedule.staff_title}: ${schedule.start_time} - ${schedule.end_time}`);
    });
    
    if (schedules.length === 0) {
      console.log('❌ No staff schedules found for tomorrow!');
      return;
    }
    
    // Test 4: Generate time slots
    console.log('\n4. Generating time slots...');
    const timeSlots = [];
    
    for (const schedule of schedules) {
      const startHour = parseInt(schedule.start_time.split(':')[0]);
      const endHour = parseInt(schedule.end_time.split(':')[0]);
      
      for (let hour = startHour; hour < endHour; hour++) {
        const slotTime = new Date(tomorrow);
        slotTime.setHours(hour, 0, 0, 0);
        
        timeSlots.push({
          startTime: slotTime,
          staffId: schedule.staff_id,
          staffName: schedule.staff_title,
          serviceId: service.id,
          serviceName: service.name,
          duration: service.duration
        });
      }
    }
    
    console.log(`Generated ${timeSlots.length} time slots:`);
    timeSlots.slice(0, 10).forEach(slot => {
      console.log(`   - ${slot.startTime.toLocaleTimeString()} with ${slot.staffName}`);
    });
    
    // Test 5: Check for 2:00 PM specifically
    console.log('\n5. Testing 2:00 PM matching...');
    const requestedTime = '2:00 PM';
    
    const matchingSlot = timeSlots.find(slot => {
      const slotTime = slot.startTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      return slotTime === requestedTime;
    });
    
    if (matchingSlot) {
      console.log(`✅ Found matching slot for ${requestedTime}:`);
      console.log(`   - Time: ${matchingSlot.startTime.toLocaleTimeString()}`);
      console.log(`   - Staff: ${matchingSlot.staffName}`);
      console.log(`   - Service: ${matchingSlot.serviceName}`);
      
      // Test 6: Check for conflicts
      console.log('\n6. Checking for conflicts...');
      const conflicts = await sql`
        SELECT * FROM appointments 
        WHERE DATE(start_time) = ${tomorrow.toISOString().split('T')[0]}
        AND status != 'cancelled'
        AND staff_id = ${matchingSlot.staffId}
      `;
      
      console.log(`Found ${conflicts.length} existing appointments for this staff on ${tomorrow.toDateString()}:`);
      conflicts.forEach(apt => {
        console.log(`   - ${apt.start_time} (Status: ${apt.status})`);
      });
      
      if (conflicts.length === 0) {
        console.log('✅ No conflicts found - slot should be bookable!');
        console.log('🎉 The SMS booking should work for 2:00 PM tomorrow.');
      } else {
        console.log('❌ Conflicts found - slot not available');
      }
    } else {
      console.log(`❌ No matching slot found for ${requestedTime}`);
      console.log('Available times:');
      timeSlots.slice(0, 10).forEach(slot => {
        console.log(`   - ${slot.startTime.toLocaleTimeString()}`);
      });
    }
    
    console.log('\n📋 Summary:');
    console.log('If all tests pass but SMS booking still shows times again,');
    console.log('the issue is in the SMS processing logic, not the data.');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

quickSMSTest().catch(console.error); 