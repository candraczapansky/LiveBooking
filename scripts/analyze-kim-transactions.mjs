#!/usr/bin/env node

import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';

async function analyzeKimTransactions() {
  try {
    const storage = new DatabaseStorage();
    
    console.log('🔍 Analyzing Kim Czapansky transactions...\n');
    
    // Get all sales history
    const allSales = await storage.getAllSalesHistory();
    
    // Find Kim's actual transactions
    const kimTransactions = allSales.filter(sale => 
      sale.staffName === 'Kim Czapansky'
    );
    
    console.log(`✅ Found ${kimTransactions.length} transactions assigned to Kim Czapansky:\n`);
    
    if (kimTransactions.length > 0) {
      console.log('Date/Time              | Amount    | Client                | Notes');
      console.log('----------------------|-----------|----------------------|------------------------');
      kimTransactions.forEach(tx => {
        const date = new Date(tx.transactionDate);
        const dateStr = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const datetime = `${dateStr} ${timeStr}`.padEnd(22);
        const amount = `$${(tx.totalAmount || 0).toFixed(2)}`.padEnd(9);
        const client = (tx.clientName || 'Unknown').substring(0, 20).padEnd(20);
        const notes = tx.notes || '';
        console.log(`${datetime}| ${amount} | ${client} | ${notes}`);
      });
    }
    
    // Now check September 13 specifically
    console.log('\n\n📅 September 13, 2025 Analysis:\n');
    
    const sept13Sales = allSales.filter(sale => {
      const date = new Date(sale.transactionDate);
      return date.getMonth() === 8 && // September is month 8 (0-indexed)
             date.getDate() === 13 &&
             date.getFullYear() === 2025;
    });
    
    console.log(`Total transactions on Sept 13: ${sept13Sales.length}\n`);
    
    // Group by staff
    const staffGroups = {};
    sept13Sales.forEach(sale => {
      const staff = sale.staffName || 'Unknown';
      if (!staffGroups[staff]) {
        staffGroups[staff] = [];
      }
      staffGroups[staff].push(sale);
    });
    
    console.log('Transactions by staff member:');
    for (const [staff, transactions] of Object.entries(staffGroups)) {
      console.log(`\n${staff}: ${transactions.length} transactions`);
      if (staff === 'Kim Czapansky' || staff === 'NEEDS ASSIGNMENT') {
        console.log('  Details:');
        transactions.forEach(tx => {
          const date = new Date(tx.transactionDate);
          const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const amount = `$${(tx.totalAmount || 0).toFixed(2)}`;
          const client = tx.clientName || 'Unknown';
          const notes = tx.notes ? ` [${tx.notes}]` : '';
          console.log(`    ${time} - ${amount} - ${client}${notes}`);
        });
      }
    }
    
    // Check appointments to see if Kim had appointments on Sept 13
    console.log('\n\n📊 Checking Kim\'s appointments on Sept 13:\n');
    
    const allAppointments = await storage.getAllAppointments();
    const allUsers = await storage.getAllUsers();
    const allStaff = await storage.getAllStaff();
    
    // Find Kim's staff ID
    const kimStaff = allStaff.find(s => s.id === 28); // Kim's staff ID is 28
    
    if (kimStaff) {
      // Find appointments for Kim on Sept 13
      const kimAppointments = allAppointments.filter(apt => {
        if (apt.staffId !== kimStaff.id) return false;
        const aptDate = new Date(apt.date);
        return !isNaN(aptDate.getTime()) && 
               aptDate.getMonth() === 8 && 
               aptDate.getDate() === 13 && 
               aptDate.getFullYear() === 2025;
      });
      
      console.log(`Kim had ${kimAppointments.length} appointments on Sept 13`);
      
      if (kimAppointments.length > 0) {
        console.log('\nAppointment details:');
        for (const apt of kimAppointments) {
          const client = allUsers.find(u => u.id === apt.clientId);
          const service = await storage.getService(apt.serviceId);
          const payments = await storage.getPaymentsByAppointmentId(apt.id);
          
          console.log(`\n  Appointment ID: ${apt.id}`);
          console.log(`  Client: ${client ? `${client.firstName} ${client.lastName}` : 'Unknown'}`);
          console.log(`  Service: ${service ? service.name : 'Unknown'}`);
          console.log(`  Status: ${apt.status}`);
          console.log(`  Payments: ${payments ? payments.length : 0}`);
          
          // Check if this appointment has a sales history entry
          const salesEntry = sept13Sales.find(s => 
            s.appointmentId === apt.id || 
            (client && s.clientName && s.clientName.toLowerCase().includes(client.lastName?.toLowerCase()))
          );
          
          if (salesEntry) {
            console.log(`  ✅ Has sales history entry: ${salesEntry.staffName}`);
          } else {
            console.log(`  ❌ No sales history entry found`);
          }
        }
      }
    }
    
    // Suggest which "NEEDS ASSIGNMENT" might be Kim's
    console.log('\n\n💡 Potential Kim transactions in "NEEDS ASSIGNMENT":\n');
    
    const needsAssignment = sept13Sales.filter(s => s.staffName === 'NEEDS ASSIGNMENT');
    
    if (needsAssignment.length > 0) {
      console.log(`There are ${needsAssignment.length} transactions that need assignment on Sept 13.`);
      console.log('\nBased on the pattern, Kim should have 5 total transactions.');
      console.log(`Currently has: ${kimTransactions.filter(tx => {
        const date = new Date(tx.transactionDate);
        return date.getMonth() === 8 && date.getDate() === 13 && date.getFullYear() === 2025;
      }).length} on Sept 13`);
      console.log(`Missing: ${5 - kimTransactions.filter(tx => {
        const date = new Date(tx.transactionDate);
        return date.getMonth() === 8 && date.getDate() === 13 && date.getFullYear() === 2025;
      }).length} transactions`);
      
      console.log('\nAll "NEEDS ASSIGNMENT" transactions on Sept 13:');
      needsAssignment.forEach((tx, index) => {
        const date = new Date(tx.transactionDate);
        const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const amount = `$${(tx.totalAmount || 0).toFixed(2)}`;
        const client = tx.clientName || 'Unknown';
        console.log(`  ${index + 1}. ${time} - ${amount} - ${client}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

analyzeKimTransactions().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});










