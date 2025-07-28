#!/usr/bin/env node

/**
 * Simple SMS Booking Debug Script
 * 
 * This script checks basic database connectivity and data
 * without requiring the full server to be running.
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function debugSMSBookingSimple() {
  console.log('🔍 Simple SMS Booking Debug...\n');

  try {
    // Check database connection
    console.log('1. Checking database connection...');
    
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.log('❌ DATABASE_URL not found in environment variables');
      return;
    }
    
    console.log('✅ DATABASE_URL found');
    
    const sql = neon(connectionString);
    const db = drizzle(sql);
    
    // Test connection
    try {
      const result = await sql`SELECT 1 as test`;
      console.log('✅ Database connection successful');
    } catch (error) {
      console.log('❌ Database connection failed:', error.message);
      return;
    }

    // Check services
    console.log('\n2. Checking services...');
    try {
      const services = await sql`SELECT * FROM services LIMIT 10`;
      console.log(`✅ Found ${services.length} services:`);
      services.forEach(service => {
        console.log(`   - ${service.name} (ID: ${service.id}, Duration: ${service.duration}min, Price: $${service.price})`);
      });
      
      if (services.length === 0) {
        console.log('❌ No services found! This is likely the problem.');
      }
    } catch (error) {
      console.log('❌ Error fetching services:', error.message);
    }

    // Check staff
    console.log('\n3. Checking staff...');
    try {
      const staff = await sql`SELECT * FROM staff LIMIT 10`;
      console.log(`✅ Found ${staff.length} staff members:`);
      staff.forEach(member => {
        console.log(`   - ${member.title || 'Staff'} (ID: ${member.id})`);
      });
      
      if (staff.length === 0) {
        console.log('❌ No staff found! This is likely the problem.');
      }
    } catch (error) {
      console.log('❌ Error fetching staff:', error.message);
    }

    // Check staff schedules
    console.log('\n4. Checking staff schedules...');
    try {
      const schedules = await sql`SELECT * FROM staff_schedules LIMIT 10`;
      console.log(`✅ Found ${schedules.length} staff schedules:`);
      schedules.forEach(schedule => {
        console.log(`   - Staff ${schedule.staff_id}: ${schedule.day_of_week} ${schedule.start_time}-${schedule.end_time} (Blocked: ${schedule.is_blocked})`);
      });
      
      if (schedules.length === 0) {
        console.log('❌ No staff schedules found! This is likely the problem.');
      }
    } catch (error) {
      console.log('❌ Error fetching staff schedules:', error.message);
    }

    // Check staff services
    console.log('\n5. Checking staff services...');
    try {
      const staffServices = await sql`SELECT * FROM staff_services LIMIT 10`;
      console.log(`✅ Found ${staffServices.length} staff service assignments:`);
      staffServices.forEach(assignment => {
        console.log(`   - Staff ${assignment.staff_id} assigned to Service ${assignment.service_id}`);
      });
      
      if (staffServices.length === 0) {
        console.log('❌ No staff services found! This is likely the problem.');
      }
    } catch (error) {
      console.log('❌ Error fetching staff services:', error.message);
    }

    // Check appointments
    console.log('\n6. Checking appointments...');
    try {
      const appointments = await sql`SELECT * FROM appointments ORDER BY start_time DESC LIMIT 5`;
      console.log(`✅ Found ${appointments.length} appointments:`);
      appointments.forEach(apt => {
        console.log(`   - ${apt.service_name} on ${new Date(apt.start_time).toLocaleDateString()} at ${new Date(apt.start_time).toLocaleTimeString()} (Status: ${apt.status})`);
      });
    } catch (error) {
      console.log('❌ Error fetching appointments:', error.message);
    }

    // Check service categories
    console.log('\n7. Checking service categories...');
    try {
      const categories = await sql`SELECT * FROM service_categories LIMIT 10`;
      console.log(`✅ Found ${categories.length} service categories:`);
      categories.forEach(cat => {
        console.log(`   - ${cat.name} (ID: ${cat.id})`);
      });
    } catch (error) {
      console.log('❌ Error fetching service categories:', error.message);
    }

    console.log('\n📋 Summary:');
    console.log('If you see "No services found", "No staff found", "No staff schedules found", or "No staff services found" above,');
    console.log('that is why the SMS booking is not working.');
    console.log('\nTo fix:');
    console.log('1. Run: node setup-sms-booking-data.js');
    console.log('2. Or create the data manually through the web interface');

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

// Run the debug
debugSMSBookingSimple().catch(console.error); 