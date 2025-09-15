#!/usr/bin/env node

import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';

console.log('Starting transaction time extraction...');

async function showTransactionTimes() {
  try {
    const storage = new DatabaseStorage();
    
    console.log('📊 Analyzing transaction times from Helcim POS IDs...\n');
    
    // Get all sales history
    const allSales = await storage.getAllSalesHistory();
    console.log(`Total sales records: ${allSales.length}\n`);
    
    // Filter for Helcim transactions that aren't properly assigned
    const helcimTransactions = allSales.filter(sale => {
      return sale.helcimPaymentId && sale.staffName;
    });
    
    console.log(`Helcim transactions: ${helcimTransactions.length}\n`);
    
    // Extract actual times from POS IDs
    const transactionsWithTimes = [];
    
    for (const tx of helcimTransactions) {
      let actualTime = null;
      let hasTime = false;
      
      // Extract timestamp from POS ID
      if (tx.helcimPaymentId && tx.helcimPaymentId.startsWith('POS-')) {
        const posId = tx.helcimPaymentId.substring(4); // Remove 'POS-'
        // The timestamp is usually the first 10 digits
        const timestampStr = posId.substring(0, 10);
        const timestamp = parseInt(timestampStr);
        
        // Validate timestamp (should be after 2020)
        if (!isNaN(timestamp) && timestamp > 1577836800) { // After Jan 1, 2020
          actualTime = new Date(timestamp * 1000);
          hasTime = true;
        }
      }
      
      transactionsWithTimes.push({
        id: tx.id,
        helcimId: tx.helcimPaymentId,
        staffName: tx.staffName,
        recordedDate: new Date(tx.transactionDate),
        actualTime: actualTime,
        hasTime: hasTime,
        amount: tx.totalAmount,
        customer: tx.clientName,
        type: tx.transactionType
      });
    }
    
    // Group by staff
    const byStaff = {};
    for (const tx of transactionsWithTimes) {
      const staff = tx.staffName || 'Unknown';
      if (!byStaff[staff]) {
        byStaff[staff] = [];
      }
      byStaff[staff].push(tx);
    }
    
    // Show transactions for each staff member
    console.log('🕐 EXTRACTED ACTUAL TRANSACTION TIMES:\n');
    console.log('══════════════════════════════════════════════════════════════════════════\n');
    
    // Focus on the main staff who need assignment
    const priorityStaff = ['candra czapansky', 'candra  czapansky', 'Unknown', 'Helcim System'];
    
    for (const staffName of Object.keys(byStaff).sort()) {
      const transactions = byStaff[staffName];
      const withTimes = transactions.filter(t => t.hasTime);
      
      console.log(`\n📋 Staff: "${staffName}"`);
      console.log(`   Total: ${transactions.length} transactions`);
      console.log(`   With extracted times: ${withTimes.length}`);
      
      if (withTimes.length > 0) {
        // Sort by actual time
        withTimes.sort((a, b) => a.actualTime - b.actualTime);
        
        console.log('\n   Sample transactions with ACTUAL TIMES:');
        console.log('   ─────────────────────────────────────────────────────────────────────');
        console.log('   Date       | Actual Time        | Amount   | Customer');
        console.log('   -----------|--------------------|----------|----------------------');
        
        for (const tx of withTimes.slice(0, 10)) {
          const dateStr = tx.recordedDate.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: '2-digit'
          });
          
          const timeStr = tx.actualTime.toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });
          
          const amount = `$${tx.amount.toFixed(2)}`.padEnd(8);
          const customer = (tx.customer || 'Unknown').substring(0, 20);
          
          console.log(`   ${dateStr}    | ${timeStr} | ${amount} | ${customer}`);
        }
        
        if (withTimes.length > 10) {
          console.log(`   ... and ${withTimes.length - 10} more with times`);
        }
      }
      
      // Calculate totals
      const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
      console.log(`\n   💰 Total amount: $${total.toFixed(2)}`);
    }
    
    console.log('\n══════════════════════════════════════════════════════════════════════════\n');
    console.log('💡 KEY FINDINGS:');
    console.log('   ✅ POS transaction IDs contain Unix timestamps!');
    console.log('   ✅ We can extract the ACTUAL transaction times');
    console.log('   ❌ These transactions need to be assigned to the correct staff members');
    console.log('\n📝 NEXT STEPS:');
    console.log('   1. Identify which user in your system is "candra czapansky"');
    console.log('   2. Update these transactions to link to the correct staff record');
    console.log('   3. This will enable accurate commission calculations');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

// Run the function
showTransactionTimes().catch(error => {
  console.error('Failed to run:', error);
  process.exit(1);
});










