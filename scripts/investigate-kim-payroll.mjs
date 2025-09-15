#!/usr/bin/env node

import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';

async function investigateKimPayroll() {
  try {
    const storage = new DatabaseStorage();
    
    console.log('🔍 Investigating Kim Czapansky payroll issues...\n');
    
    // First, find Kim's user and staff records
    const allUsers = await storage.getAllUsers();
    const allStaff = await storage.getAllStaff();
    
    // Find Kim's user record
    const kimUser = allUsers.find(u => 
      u.firstName?.toLowerCase().includes('kim') || 
      u.lastName?.toLowerCase().includes('czapansky') ||
      u.email?.toLowerCase().includes('kim')
    );
    
    if (kimUser) {
      console.log('✅ Found Kim\'s User Record:');
      console.log(`   User ID: ${kimUser.id}`);
      console.log(`   Name: ${kimUser.firstName} ${kimUser.lastName}`);
      console.log(`   Email: ${kimUser.email}`);
      console.log(`   Role: ${kimUser.role}\n`);
      
      // Find Kim's staff record
      const kimStaff = allStaff.find(s => s.userId === kimUser.id);
      if (kimStaff) {
        console.log('✅ Found Kim\'s Staff Record:');
        console.log(`   Staff ID: ${kimStaff.id}`);
        console.log(`   Commission Type: ${kimStaff.commissionType}`);
        console.log(`   Commission Rate: ${kimStaff.commissionRate}\n`);
      } else {
        console.log('❌ No staff record found for Kim!\n');
      }
    } else {
      console.log('❌ Could not find Kim in users table\n');
    }
    
    // Now check sales history for Sept 13
    const sept13Start = new Date('2025-09-13T00:00:00');
    const sept13End = new Date('2025-09-13T23:59:59');
    
    const salesHistory = await storage.getSalesHistoryByDateRange(sept13Start, sept13End);
    
    console.log(`📊 September 13 Sales Analysis:\n`);
    console.log(`Total transactions: ${salesHistory.length}\n`);
    
    // Check for any variation of Kim's name
    const kimVariations = [
      'kim czapansky',
      'kim',
      'czapansky',
      'kimberly czapansky',
      'k czapansky',
      'kim c'
    ];
    
    const possibleKimTransactions = salesHistory.filter(sale => {
      const staffName = (sale.staffName || '').toLowerCase();
      return kimVariations.some(variant => staffName.includes(variant));
    });
    
    console.log(`Transactions with Kim variations in staffName: ${possibleKimTransactions.length}`);
    if (possibleKimTransactions.length > 0) {
      console.log('\nFound transactions:');
      possibleKimTransactions.forEach(tx => {
        console.log(`  - ${tx.staffName}: $${tx.totalAmount} - ${tx.clientName}`);
      });
    }
    
    // Check appointments for Sept 13
    console.log('\n📅 Checking Appointments for Sept 13:\n');
    const allAppointments = await storage.getAllAppointments();
    
    // Filter appointments for Sept 13
    const sept13Appointments = allAppointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return !isNaN(aptDate.getTime()) && 
             aptDate.getMonth() === 8 && 
             aptDate.getDate() === 13 && 
             aptDate.getFullYear() === 2025;
    });
    
    console.log(`Total appointments on Sept 13: ${sept13Appointments.length}`);
    
    if (kimStaff) {
      const kimAppointments = sept13Appointments.filter(apt => apt.staffId === kimStaff.id);
      console.log(`Kim's appointments on Sept 13: ${kimAppointments.length}`);
      
      if (kimAppointments.length > 0) {
        console.log('\nKim\'s appointment details:');
        for (const apt of kimAppointments) {
          const client = allUsers.find(u => u.id === apt.clientId);
          const payment = await storage.getPaymentsByAppointmentId(apt.id);
          console.log(`  Appointment ID: ${apt.id}`);
          console.log(`  Client: ${client ? `${client.firstName} ${client.lastName}` : 'Unknown'}`);
          console.log(`  Status: ${apt.status}`);
          console.log(`  Payments: ${payment ? payment.length : 0}`);
          if (payment && payment.length > 0) {
            payment.forEach(p => {
              console.log(`    - Payment ${p.id}: $${p.amount} (${p.status})`);
            });
          }
          console.log();
        }
      }
    }
    
    // Check for NEEDS ASSIGNMENT that might be Kim's
    const needsAssignment = salesHistory.filter(sale => 
      sale.staffName === 'NEEDS ASSIGNMENT'
    );
    
    console.log(`\n⚠️ Transactions needing assignment: ${needsAssignment.length}`);
    
    // Show first 10 NEEDS ASSIGNMENT transactions with details
    if (needsAssignment.length > 0) {
      console.log('\nFirst 10 "NEEDS ASSIGNMENT" transactions (might include Kim\'s):');
      needsAssignment.slice(0, 10).forEach(tx => {
        const date = new Date(tx.transactionDate);
        console.log(`  ${date.toLocaleTimeString()} - $${tx.totalAmount} - ${tx.clientName || 'Unknown'} - ${tx.notes || ''}`);
      });
      
      // Look for pattern in notes
      const withPreviousCandra = needsAssignment.filter(tx => 
        tx.notes && tx.notes.includes('[Previously: candra czapansky]')
      );
      
      console.log(`\n  Transactions previously assigned to Candra: ${withPreviousCandra.length}`);
      
      const withWebhookFailed = needsAssignment.filter(tx => 
        tx.notes && tx.notes.includes('[Webhook failed]')
      );
      
      console.log(`  Transactions with webhook failure: ${withWebhookFailed.length}`);
    }
    
    // Check what the payroll endpoint would return for Kim
    if (kimStaff) {
      console.log('\n💰 Simulating Payroll Calculation for Kim:\n');
      
      // Filter sales that would match Kim
      const kimSales = salesHistory.filter(sale => {
        if (!sale.staffName) return false;
        
        const saleName = sale.staffName.toLowerCase().trim();
        const kimFullName = kimUser ? `${kimUser.firstName} ${kimUser.lastName}`.toLowerCase() : '';
        const kimFirstName = (kimUser?.firstName || '').toLowerCase();
        const kimLastName = (kimUser?.lastName || '').toLowerCase();
        const kimEmail = (kimUser?.email || '').toLowerCase();
        
        return saleName === kimFullName ||
               saleName === kimEmail ||
               saleName.includes(kimFirstName) ||
               saleName.includes(kimLastName) ||
               kimFullName.includes(saleName);
      });
      
      console.log(`Transactions that would be counted for Kim: ${kimSales.length}`);
      if (kimSales.length > 0) {
        console.log('Details:');
        kimSales.forEach(sale => {
          console.log(`  - ${sale.staffName}: $${sale.totalAmount} - ${sale.clientName}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

investigateKimPayroll().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});










