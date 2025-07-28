#!/usr/bin/env node

/**
 * Direct SMS Booking Test
 * 
 * This script directly tests the SMS booking logic using the existing data
 * to identify why the system shows times again instead of booking.
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSMSBookingDirect() {
  console.log('🧪 Direct SMS Booking Test...\n');

  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.log('❌ DATABASE_URL not found');
      return;
    }
    
    const sql = neon(connectionString);
    const db = drizzle(sql);
    
    console.log('✅ Connected to database');

    // Test 1: Check if we can find available slots
    console.log('\n1. Testing available slots...');
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log(`📅 Looking for slots on: ${tomorrow.toDateString()}`);
    
    // Get staff schedules for tomorrow
    const dayOfWeek = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });
    console.log(`📅 Day of week: ${dayOfWeek}`);
    
    const schedules = await sql`
      SELECT ss.*, s.title as staff_title 
      FROM staff_schedules ss 
      JOIN staff s ON ss.staff_id = s.id 
      WHERE ss.day_of_week = ${dayOfWeek} AND ss.is_blocked = false
    `;
    
    console.log(`📋 Found ${schedules.length} staff schedules for ${dayOfWeek}:`);
    schedules.forEach(schedule => {
      console.log(`   - ${schedule.staff_title}: ${schedule.start_time} - ${schedule.end_time}`);
    });
    
    if (schedules.length === 0) {
      console.log('❌ No staff schedules found for tomorrow!');
      return;
    }
    
    // Get staff services
    const staffServices = await sql`
      SELECT ss.*, s.name as service_name, s.duration, st.title as staff_title
      FROM staff_services ss
      JOIN services s ON ss.service_id = s.id
      JOIN staff st ON ss.staff_id = st.id
      WHERE s.name ILIKE '%signature%'
    `;
    
    console.log(`🔗 Found ${staffServices.length} staff service assignments for Signature services:`);
    staffServices.forEach(assignment => {
      console.log(`   - ${assignment.staff_title} can provide ${assignment.service_name} (${assignment.duration}min)`);
    });
    
    if (staffServices.length === 0) {
      console.log('❌ No staff assigned to Signature services!');
      return;
    }
    
    // Test 2: Generate time slots
    console.log('\n2. Generating time slots...');
    
    const timeSlots = [];
    for (const schedule of schedules) {
      for (const assignment of staffServices) {
        if (schedule.staff_id === assignment.staff_id) {
          // Generate 1-hour slots from start to end time
          const startHour = parseInt(schedule.start_time.split(':')[0]);
          const endHour = parseInt(schedule.end_time.split(':')[0]);
          
          for (let hour = startHour; hour < endHour; hour++) {
            const slotTime = new Date(tomorrow);
            slotTime.setHours(hour, 0, 0, 0);
            
            timeSlots.push({
              startTime: slotTime,
              staffId: schedule.staff_id,
              staffName: assignment.staff_title,
              serviceId: assignment.service_id,
              serviceName: assignment.service_name,
              duration: assignment.duration
            });
          }
        }
      }
    }
    
    console.log(`⏰ Generated ${timeSlots.length} time slots:`);
    timeSlots.slice(0, 5).forEach(slot => {
      console.log(`   - ${slot.startTime.toLocaleTimeString()} with ${slot.staffName} for ${slot.serviceName}`);
    });
    
    if (timeSlots.length === 0) {
      console.log('❌ No time slots generated!');
      return;
    }
    
    // Test 3: Check for conflicting appointments
    console.log('\n3. Checking for conflicting appointments...');
    
    const conflictingAppointments = await sql`
      SELECT * FROM appointments 
      WHERE DATE(start_time) = ${tomorrow.toISOString().split('T')[0]}
      AND status != 'cancelled'
    `;
    
    console.log(`📅 Found ${conflictingAppointments.length} appointments on ${tomorrow.toDateString()}:`);
    conflictingAppointments.forEach(apt => {
      console.log(`   - ${apt.start_time} (Status: ${apt.status})`);
    });
    
    // Test 4: Simulate time matching
    console.log('\n4. Testing time matching...');
    
    const requestedTime = '2:00 PM';
    console.log(`🎯 Looking for slot matching: ${requestedTime}`);
    
    const matchingSlot = timeSlots.find(slot => {
      const slotTime = slot.startTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      return slotTime === requestedTime;
    });
    
    if (matchingSlot) {
      console.log(`✅ Found matching slot: ${matchingSlot.startTime.toLocaleTimeString()} with ${matchingSlot.staffName}`);
      
      // Test 5: Check if slot is actually available (no conflicts)
      const slotStart = matchingSlot.startTime;
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + matchingSlot.duration);
      
      const conflicts = conflictingAppointments.filter(apt => {
        const aptStart = new Date(apt.start_time);
        const aptEnd = new Date(aptStart);
        aptEnd.setMinutes(aptEnd.getMinutes() + (apt.duration || 60));
        
        return (slotStart < aptEnd && slotEnd > aptStart);
      });
      
      if (conflicts.length === 0) {
        console.log('✅ Slot is available - should be bookable!');
        console.log('🎉 The SMS booking should work for this time.');
      } else {
        console.log(`❌ Slot has ${conflicts.length} conflicts - not available`);
      }
    } else {
      console.log('❌ No matching slot found for 2:00 PM');
      console.log('Available times:');
      timeSlots.slice(0, 10).forEach(slot => {
        console.log(`   - ${slot.startTime.toLocaleTimeString()}`);
      });
    }
    
    console.log('\n📋 Analysis:');
    console.log('If the slot is available but SMS booking still shows times again,');
    console.log('the issue is likely in the SMS processing logic, not the data.');

  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

// Run the test
testSMSBookingDirect().catch(console.error); 