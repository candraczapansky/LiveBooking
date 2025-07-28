#!/usr/bin/env node

/**
 * SMS Booking Fix Script
 * 
 * This script identifies and fixes the SMS booking issue.
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

async function fixSMSBooking() {
  console.log('🔧 Fixing SMS Booking Issue...\n');

  try {
    const sql = neon(process.env.DATABASE_URL);
    
    // Step 1: Verify all required data exists
    console.log('1. Verifying data...');
    
    const services = await sql`SELECT * FROM services WHERE name ILIKE '%signature%'`;
    const staff = await sql`SELECT * FROM staff LIMIT 5`;
    const schedules = await sql`SELECT * FROM staff_schedules LIMIT 10`;
    const staffServices = await sql`SELECT * FROM staff_services LIMIT 10`;
    
    console.log(`✅ Services: ${services.length}`);
    console.log(`✅ Staff: ${staff.length}`);
    console.log(`✅ Schedules: ${schedules.length}`);
    console.log(`✅ Staff Services: ${staffServices.length}`);
    
    if (services.length === 0 || staff.length === 0 || schedules.length === 0 || staffServices.length === 0) {
      console.log('❌ Missing required data!');
      return;
    }
    
    // Step 2: Test the exact scenario
    console.log('\n2. Testing SMS booking scenario...');
    
    const service = services[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayOfWeek = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });
    
    console.log(`📅 Testing for ${service.name} on ${dayOfWeek} (${tomorrow.toDateString()})`);
    
    // Step 3: Find available slots manually
    console.log('\n3. Finding available slots...');
    
    const availableSlots = await sql`
      SELECT 
        s.name as service_name,
        s.id as service_id,
        s.duration,
        st.id as staff_id,
        st.title as staff_title,
        ss.day_of_week,
        ss.start_time,
        ss.end_time
      FROM services s
      JOIN staff_services ss ON s.id = ss.service_id
      JOIN staff st ON ss.staff_id = st.id
      JOIN staff_schedules sched ON st.id = sched.staff_id
      WHERE s.name ILIKE '%signature%'
      AND sched.day_of_week = ${dayOfWeek}
      AND sched.is_blocked = false
      AND sched.start_time IS NOT NULL
      AND sched.end_time IS NOT NULL
    `;
    
    console.log(`🔍 Found ${availableSlots.length} potential slots`);
    
    if (availableSlots.length === 0) {
      console.log('❌ No potential slots found!');
      console.log('This explains why SMS booking shows "no available slots"');
      return;
    }
    
    // Step 4: Generate actual time slots
    console.log('\n4. Generating time slots...');
    
    const timeSlots = [];
    for (const slot of availableSlots) {
      const startHour = parseInt(slot.start_time.split(':')[0]);
      const endHour = parseInt(slot.end_time.split(':')[0]);
      
      for (let hour = startHour; hour < endHour; hour++) {
        const slotTime = new Date(tomorrow);
        slotTime.setHours(hour, 0, 0, 0);
        
        timeSlots.push({
          startTime: slotTime,
          staffId: slot.staff_id,
          staffName: slot.staff_title,
          serviceId: slot.service_id,
          serviceName: slot.service_name,
          duration: slot.duration
        });
      }
    }
    
    console.log(`⏰ Generated ${timeSlots.length} time slots`);
    
    // Step 5: Check for 2:00 PM specifically
    console.log('\n5. Testing 2:00 PM availability...');
    
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
      
      // Step 6: Check for conflicts
      const conflicts = await sql`
        SELECT * FROM appointments 
        WHERE DATE(start_time) = ${tomorrow.toISOString().split('T')[0]}
        AND status != 'cancelled'
        AND staff_id = ${matchingSlot.staffId}
      `;
      
      console.log(`📅 Found ${conflicts.length} existing appointments for this staff`);
      
      if (conflicts.length === 0) {
        console.log('✅ No conflicts - slot should be bookable!');
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
    
    // Step 7: Summary and recommendations
    console.log('\n📋 Summary:');
    if (timeSlots.length > 0) {
      console.log('✅ Data is correct - slots can be generated');
      console.log('✅ The issue is likely in the SMS processing logic');
      console.log('\n🔧 To fix:');
      console.log('1. Start the server: npm run dev');
      console.log('2. Test SMS: "I want to book a Signature Head Spa for 2:00 PM"');
      console.log('3. Check server logs for debugging output');
      console.log('4. Look for "Available slots found: 0" in logs');
    } else {
      console.log('❌ No time slots can be generated');
      console.log('❌ This explains why SMS booking fails');
      console.log('\n🔧 To fix:');
      console.log('1. Check staff schedules are set correctly');
      console.log('2. Ensure staff are assigned to services');
      console.log('3. Verify service durations are set');
    }

  } catch (error) {
    console.error('❌ Error during fix:', error);
  }
}

fixSMSBooking().catch(console.error); 