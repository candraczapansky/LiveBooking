#!/usr/bin/env node

import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';

async function checkAppointmentDates() {
  try {
    const storage = new DatabaseStorage();
    
    console.log('📅 Checking appointment dates in the system...\n');
    
    // Get all appointments
    const appointments = await storage.getAllAppointments();
    console.log(`Total appointments in database: ${appointments.length}\n`);
    
    // Group appointments by date
    const byDate = {};
    for (const apt of appointments) {
      const date = new Date(apt.appointmentDate).toLocaleDateString();
      if (!byDate[date]) {
        byDate[date] = 0;
      }
      byDate[date]++;
    }
    
    // Sort dates
    const sortedDates = Object.keys(byDate).sort((a, b) => new Date(a) - new Date(b));
    
    // Show date range
    if (sortedDates.length > 0) {
      console.log(`📆 Appointment Date Range:`);
      console.log(`  First: ${sortedDates[0]}`);
      console.log(`  Last: ${sortedDates[sortedDates.length - 1]}\n`);
      
      // Show appointments in September 2025
      console.log('📊 Appointments in September 2025:\n');
      const septemberDates = sortedDates.filter(d => d.includes('9/') && d.includes('/2025'));
      
      if (septemberDates.length > 0) {
        for (const date of septemberDates) {
          console.log(`  ${date}: ${byDate[date]} appointments`);
        }
      } else {
        console.log('  ❌ No appointments found in September 2025');
      }
      
      // Show recent dates
      console.log('\n📊 Last 10 dates with appointments:\n');
      for (const date of sortedDates.slice(-10)) {
        console.log(`  ${date}: ${byDate[date]} appointments`);
      }
    }
    
    // Check appointments with staff assigned
    console.log('\n🔍 Checking staff assignments in appointments:\n');
    const withStaff = appointments.filter(apt => apt.staffId);
    const withoutStaff = appointments.filter(apt => !apt.staffId);
    
    console.log(`  With staff assigned: ${withStaff.length}`);
    console.log(`  Without staff assigned: ${withoutStaff.length}`);
    
    // Sample some appointments with staff
    if (withStaff.length > 0) {
      console.log('\n📋 Sample appointments with staff (first 5):\n');
      
      for (const apt of withStaff.slice(0, 5)) {
        const date = new Date(apt.appointmentDate).toLocaleString();
        
        // Get staff info
        let staffName = 'Unknown';
        if (apt.staffId) {
          const staff = await storage.getStaff(apt.staffId);
          if (staff) {
            const user = await storage.getUserById(staff.userId);
            if (user) {
              staffName = user.name || user.email;
            }
          }
        }
        
        // Get client info
        let clientName = 'Unknown';
        if (apt.clientId) {
          const client = await storage.getClientById(apt.clientId);
          if (client) {
            clientName = client.name || client.email;
          }
        }
        
        console.log(`  Apt ${apt.id}:`);
        console.log(`    Date: ${date}`);
        console.log(`    Client: ${clientName}`);
        console.log(`    Staff: ${staffName} (ID: ${apt.staffId})`);
        console.log(`    Status: ${apt.status}`);
      }
    }
    
    // Check for appointments on transaction dates
    console.log('\n\n🔍 Checking key transaction dates:\n');
    const keyDates = ['9/5/2025', '9/6/2025', '9/9/2025', '9/10/2025', '9/11/2025', '9/12/2025', '9/13/2025'];
    
    for (const date of keyDates) {
      const count = byDate[date] || 0;
      console.log(`  ${date}: ${count} appointments`);
    }
    
    console.log('\n💡 FINDINGS:');
    if (septemberDates.length === 0) {
      console.log('  ❌ No appointments found for September 2025');
      console.log('  This explains why we cannot match transactions to staff!');
      console.log('  The appointments were likely:');
      console.log('    1. Not created in the system');
      console.log('    2. Created but not saved properly');
      console.log('    3. Deleted or in a different database');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

checkAppointmentDates().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});










