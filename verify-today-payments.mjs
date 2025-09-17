#!/usr/bin/env node
import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:5001';

async function verifyTodayPayments() {
  console.log('🔍 Starting Helcim payment verification for today...');
  
  try {
    const response = await fetch(`${API_URL}/api/verify-helcim-payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        date: new Date().toISOString().split('T')[0]
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Verification failed');
    }
    
    const result = await response.json();
    
    console.log('\n📊 VERIFICATION SUMMARY');
    console.log('=' .repeat(50));
    console.log(`Date: ${result.date}`);
    console.log(`Helcim Transactions: ${result.helcimTransactions}`);
    console.log(`✅ Matched: ${result.matchedTransactions}`);
    console.log(`⚠️  Unmatched in Helcim: ${result.unmatchedTransactions}`);
    console.log(`❌ Unverified in App: ${result.unverifiedAppointments}`);
    console.log(`Total Appointments: ${result.totalAppointments}`);
    console.log(`Paid Appointments: ${result.paidAppointments}`);
    
    if (result.unverifiedAppointments > 0) {
      console.log('\n❌ UNVERIFIED APPOINTMENTS (Marked as paid but no Helcim transaction):');
      console.log('-'.repeat(50));
      result.unverifiedAppointments.forEach((apt) => {
        console.log(`  Appointment #${apt.appointmentId} - Client ${apt.clientId} - $${apt.totalAmount}`);
      });
    }
    
    if (result.unmatchedTransactions > 0) {
      console.log('\n⚠️  UNMATCHED HELCIM TRANSACTIONS (In Helcim but no matching appointment):');
      console.log('-'.repeat(50));
      result.unmatched.forEach((tx) => {
        console.log(`  Transaction #${tx.id} - Card ****${tx.cardLast4 || '????'} - $${tx.amount}`);
      });
    }
    
    if (result.matchedTransactions > 0) {
      console.log('\n✅ MATCHED TRANSACTIONS:');
      console.log('-'.repeat(50));
      result.matched.forEach((match) => {
        console.log(`  Appointment #${match.appointmentId} ↔ Transaction ${match.transaction.id} (${match.matchType})`);
      });
    }
    
    console.log('\n✨ Verification complete!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verifyTodayPayments();



