#!/usr/bin/env node

import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';

async function checkKimTransactions() {
  try {
    const storage = new DatabaseStorage();
    
    console.log('🔍 Checking Kim Czapansky transactions for September 13, 2025...\n');
    
    // Get all sales history
    const allSales = await storage.getAllSalesHistory();
    
    // Find transactions for September 13
    const sept13Transactions = allSales.filter(sale => {
      const date = new Date(sale.transactionDate);
      return date.getMonth() === 8 && // September is month 8 (0-indexed)
             date.getDate() === 13 &&
             date.getFullYear() === 2025;
    });
    
    console.log(`Total transactions on Sept 13, 2025: ${sept13Transactions.length}\n`);
    
    // Find Kim's transactions
    const kimTransactions = sept13Transactions.filter(sale => {
      const staffName = (sale.staffName || '').toLowerCase();
      return staffName.includes('kim');
    });
    
    console.log(`Kim's transactions on Sept 13, 2025: ${kimTransactions.length}\n`);
    
    if (kimTransactions.length > 0) {
      console.log('📋 Kim\'s transactions details:\n');
      console.log('Time        | Amount   | Customer              | Type       | Staff Name');
      console.log('------------|----------|----------------------|------------|-------------------');
      
      for (const tx of kimTransactions) {
        const time = new Date(tx.transactionDate).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }).padEnd(11);
        
        const amount = `$${(tx.totalAmount || 0).toFixed(2)}`.padEnd(8);
        const customer = (tx.clientName || 'Unknown').substring(0, 20).padEnd(20);
        const type = (tx.transactionType || 'unknown').substring(0, 10).padEnd(10);
        const staffName = tx.staffName || 'Unknown';
        
        console.log(`${time} | ${amount} | ${customer} | ${type} | ${staffName}`);
      }
      
      const total = kimTransactions.reduce((sum, tx) => sum + (tx.totalAmount || 0), 0);
      console.log(`\nTotal: $${total.toFixed(2)}`);
    }
    
    // Check all staff on Sept 13
    console.log('\n\n📊 All staff transaction counts for Sept 13:\n');
    
    const staffCounts = {};
    for (const tx of sept13Transactions) {
      const staff = tx.staffName || 'Unknown';
      if (!staffCounts[staff]) {
        staffCounts[staff] = { count: 0, total: 0 };
      }
      staffCounts[staff].count++;
      staffCounts[staff].total += tx.totalAmount || 0;
    }
    
    for (const [staff, data] of Object.entries(staffCounts)) {
      console.log(`${staff}: ${data.count} transactions, $${data.total.toFixed(2)}`);
    }
    
    // Check for "NEEDS ASSIGNMENT" transactions
    const needsAssignment = sept13Transactions.filter(tx => 
      tx.staffName === 'NEEDS ASSIGNMENT'
    );
    
    if (needsAssignment.length > 0) {
      console.log(`\n⚠️ Found ${needsAssignment.length} transactions needing assignment on Sept 13`);
      console.log('These might be Kim\'s missing transactions!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

checkKimTransactions().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});










