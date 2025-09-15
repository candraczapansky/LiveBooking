#!/usr/bin/env node

import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';

async function matchTransactionsToAppointments() {
  try {
    const storage = new DatabaseStorage();
    
    console.log('🔍 Searching for appointments to match with transactions...\n');
    
    // Get transactions needing assignment
    const allSales = await storage.getAllSalesHistory();
    const needsAssignment = allSales.filter(s => 
      s.staffName === 'NEEDS ASSIGNMENT'
    );
    
    console.log(`Found ${needsAssignment.length} transactions needing assignment\n`);
    
    // Get all appointments for the date range
    const appointments = await storage.getAllAppointments();
    console.log(`Found ${appointments.length} total appointments in database\n`);
    
    // Try to match transactions to appointments
    console.log('📅 ATTEMPTING TO MATCH TRANSACTIONS TO APPOINTMENTS:\n');
    console.log('══════════════════════════════════════════════════════\n');
    
    let matchedCount = 0;
    let unmatchedCount = 0;
    const matches = [];
    
    for (const tx of needsAssignment.slice(0, 20)) { // Check first 20
      const txDate = new Date(tx.transactionDate);
      const txDateStr = txDate.toLocaleDateString();
      
      // Extract actual time if available from POS ID
      let txTime = null;
      if (tx.helcimPaymentId && tx.helcimPaymentId.startsWith('POS-')) {
        const posId = tx.helcimPaymentId.substring(4);
        const timestampStr = posId.substring(0, 10);
        const timestamp = parseInt(timestampStr);
        if (!isNaN(timestamp) && timestamp > 1600000000) {
          txTime = new Date(timestamp * 1000);
        }
      }
      
      // Look for appointments on the same day
      const sameDayAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.appointmentDate);
        return aptDate.toLocaleDateString() === txDateStr;
      });
      
      console.log(`\nTransaction: ${tx.helcimPaymentId}`);
      console.log(`  Date: ${txDateStr}`);
      console.log(`  Time: ${txTime ? txTime.toLocaleTimeString() : 'Unknown'}`);
      console.log(`  Amount: $${tx.totalAmount}`);
      console.log(`  Customer: ${tx.clientName || 'Unknown'}`);
      
      if (sameDayAppointments.length > 0) {
        console.log(`  Found ${sameDayAppointments.length} appointments on this date:`);
        
        // Try to match by client name or amount
        for (const apt of sameDayAppointments.slice(0, 3)) {
          // Get client info
          let clientName = 'Unknown';
          if (apt.clientId) {
            const client = await storage.getClientById(apt.clientId);
            if (client) {
              clientName = client.name || `${client.firstName} ${client.lastName}`.trim() || 'Unknown';
            }
          }
          
          // Get staff info
          let staffName = 'Unknown';
          if (apt.staffId) {
            const staff = await storage.getStaff(apt.staffId);
            if (staff) {
              const user = await storage.getUserById(staff.userId);
              if (user) {
                staffName = user.name || `${user.firstName} ${user.lastName}`.trim() || user.email;
              }
            }
          }
          
          // Get service info
          let serviceName = 'Unknown';
          let servicePrice = 0;
          if (apt.serviceId) {
            const service = await storage.getService(apt.serviceId);
            if (service) {
              serviceName = service.name;
              servicePrice = service.price;
            }
          }
          
          const aptTime = new Date(apt.appointmentDate).toLocaleTimeString();
          console.log(`    → Apt ${apt.id}: ${aptTime} - ${clientName} with ${staffName}`);
          console.log(`      Service: ${serviceName} ($${servicePrice})`);
          
          // Check if this might be a match
          const clientMatch = clientName.toLowerCase().includes(tx.clientName?.toLowerCase() || 'xxx');
          const amountMatch = Math.abs(servicePrice - tx.totalAmount) < 20; // Within $20
          
          if (clientMatch || amountMatch) {
            console.log(`      🎯 POTENTIAL MATCH!`);
            matches.push({
              transaction: tx,
              appointment: apt,
              staffName: staffName,
              confidence: clientMatch && amountMatch ? 'HIGH' : 'MEDIUM'
            });
            matchedCount++;
          }
        }
      } else {
        console.log(`  ❌ No appointments found on this date`);
        unmatchedCount++;
      }
    }
    
    // Summary
    console.log('\n\n📊 MATCHING SUMMARY:\n');
    console.log(`Analyzed: ${Math.min(20, needsAssignment.length)} transactions`);
    console.log(`Potential matches found: ${matchedCount}`);
    console.log(`No appointments found: ${unmatchedCount}`);
    
    if (matches.length > 0) {
      console.log('\n✅ HIGH CONFIDENCE MATCHES:\n');
      const highConfidence = matches.filter(m => m.confidence === 'HIGH');
      for (const match of highConfidence.slice(0, 10)) {
        console.log(`Transaction ${match.transaction.helcimPaymentId} → Staff: ${match.staffName}`);
      }
    }
    
    // Check if appointments have payment info
    console.log('\n\n🔍 Checking appointment payment status:\n');
    const appointmentsWithPayments = appointments.filter(apt => apt.paymentId);
    console.log(`Appointments with payment records: ${appointmentsWithPayments.length}`);
    console.log(`Appointments without payment records: ${appointments.length - appointmentsWithPayments.length}`);
    
    console.log('\n💡 INSIGHTS:');
    console.log('1. Many appointments may not have payment records linked');
    console.log('2. The webhook failure prevented automatic linking');
    console.log('3. Manual matching may be required based on:');
    console.log('   - Client names');
    console.log('   - Service amounts');
    console.log('   - Appointment times');
    console.log('   - Staff schedules');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

matchTransactionsToAppointments().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});










