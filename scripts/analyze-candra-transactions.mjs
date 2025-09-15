#!/usr/bin/env node

import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';

async function analyzeCandraTransactions() {
  try {
    const storage = new DatabaseStorage();
    
    console.log('📊 Analyzing "candra czapansky" transactions...\n');
    
    // Get all sales history
    const allSales = await storage.getAllSalesHistory();
    
    // Filter for candra's transactions
    const candraTransactions = allSales.filter(sale => {
      const staffName = (sale.staffName || '').toLowerCase().trim();
      return staffName.includes('candra') && staffName.includes('czapansky');
    });
    
    console.log(`Total "candra czapansky" transactions: ${candraTransactions.length}\n`);
    
    // Separate test vs real transactions
    const testTransactions = [];
    const realTransactions = [];
    
    for (const tx of candraTransactions) {
      // Transactions $2.50 or less are likely tests
      if (tx.totalAmount <= 2.50) {
        testTransactions.push(tx);
      } else {
        realTransactions.push(tx);
      }
    }
    
    console.log('📋 TRANSACTION BREAKDOWN:\n');
    console.log('══════════════════════════════════════════════════════\n');
    
    console.log(`🔬 TEST TRANSACTIONS (≤ $2.50): ${testTransactions.length} transactions`);
    const testTotal = testTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
    console.log(`   Total: $${testTotal.toFixed(2)}`);
    console.log(`   These are likely Candra's actual test transactions\n`);
    
    console.log(`💰 REAL CUSTOMER TRANSACTIONS (> $2.50): ${realTransactions.length} transactions`);
    const realTotal = realTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
    console.log(`   Total: $${realTotal.toFixed(2)}`);
    console.log(`   ⚠️ These need to be assigned to the correct staff members!\n`);
    
    // Extract actual times from POS IDs for real transactions
    console.log('\n📅 REAL TRANSACTIONS BY DATE (with extracted times):\n');
    console.log('These need to be matched to the staff who were actually working:\n');
    
    // Group by date
    const byDate = {};
    for (const tx of realTransactions) {
      const date = new Date(tx.transactionDate).toLocaleDateString('en-US');
      if (!byDate[date]) {
        byDate[date] = [];
      }
      
      // Try to extract actual time from POS ID
      let actualTime = null;
      if (tx.helcimPaymentId && tx.helcimPaymentId.startsWith('POS-')) {
        const posId = tx.helcimPaymentId.substring(4);
        const timestampStr = posId.substring(0, 10);
        const timestamp = parseInt(timestampStr);
        if (!isNaN(timestamp) && timestamp > 1600000000) {
          actualTime = new Date(timestamp * 1000);
        }
      }
      
      byDate[date].push({
        ...tx,
        actualTime: actualTime
      });
    }
    
    // Sort dates
    const sortedDates = Object.keys(byDate).sort((a, b) => new Date(a) - new Date(b));
    
    for (const date of sortedDates) {
      const transactions = byDate[date];
      const dayTotal = transactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
      
      console.log(`\n📅 ${date} - ${transactions.length} transactions, $${dayTotal.toFixed(2)} total`);
      console.log('─────────────────────────────────────────────────────────────');
      
      // Sort by time if available
      transactions.sort((a, b) => {
        if (a.actualTime && b.actualTime) {
          return a.actualTime - b.actualTime;
        }
        return 0;
      });
      
      console.log('Time        | Amount  | Customer                | Type       | Helcim ID');
      console.log('------------|---------|------------------------|------------|--------------------');
      
      for (const tx of transactions) {
        let timeStr = 'Unknown    ';
        if (tx.actualTime) {
          timeStr = tx.actualTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }).padEnd(11);
        }
        
        const amount = `$${tx.totalAmount.toFixed(2)}`.padEnd(7);
        const customer = (tx.clientName || 'Unknown').substring(0, 22).padEnd(22);
        const type = (tx.transactionType || 'unknown').substring(0, 10).padEnd(10);
        const helcimId = (tx.helcimPaymentId || 'N/A').substring(0, 18);
        
        console.log(`${timeStr} | ${amount} | ${customer} | ${type} | ${helcimId}`);
      }
    }
    
    // Show summary of amounts
    console.log('\n\n💡 AMOUNT DISTRIBUTION:\n');
    const amountRanges = {
      'Test ($0-$2.50)': 0,
      'Small ($2.51-$25)': 0,
      'Medium ($25-$75)': 0,
      'Large ($75-$150)': 0,
      'Extra Large ($150+)': 0
    };
    
    for (const tx of candraTransactions) {
      if (tx.totalAmount <= 2.50) amountRanges['Test ($0-$2.50)']++;
      else if (tx.totalAmount <= 25) amountRanges['Small ($2.51-$25)']++;
      else if (tx.totalAmount <= 75) amountRanges['Medium ($25-$75)']++;
      else if (tx.totalAmount <= 150) amountRanges['Large ($75-$150)']++;
      else amountRanges['Extra Large ($150+)']++;
    }
    
    for (const [range, count] of Object.entries(amountRanges)) {
      if (count > 0) {
        console.log(`  ${range}: ${count} transactions`);
      }
    }
    
    console.log('\n\n📊 RECOMMENDATIONS:\n');
    console.log('1. Keep the test transactions ($1-$2.50) assigned to Candra (User ID 1)');
    console.log('2. The real customer transactions need to be reassigned based on:');
    console.log('   - Who was scheduled to work at those times');
    console.log('   - Cross-reference with appointment book');
    console.log('   - Check terminal logs if available');
    console.log('\n3. The "undefined undefined" transactions (309) also need assignment');
    console.log('   - These are where the webhook completely failed');
    console.log('   - Need to identify staff based on time/date/customer');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

analyzeCandraTransactions().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});










