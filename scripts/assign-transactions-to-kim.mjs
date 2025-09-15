#!/usr/bin/env node

import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function assignTransactionsToKim() {
  try {
    const storage = new DatabaseStorage();
    
    console.log('🔍 Kim Czapansky Transaction Assignment Tool\n');
    console.log('Kim Czapansky (Staff ID: 28, User ID: 4761)\n');
    
    // Get Sept 13 "NEEDS ASSIGNMENT" transactions
    const allSales = await storage.getAllSalesHistory();
    const sept13NeedsAssignment = allSales.filter(sale => {
      const date = new Date(sale.transactionDate);
      return date.getMonth() === 8 && 
             date.getDate() === 13 &&
             date.getFullYear() === 2025 &&
             sale.staffName === 'NEEDS ASSIGNMENT';
    });
    
    console.log(`Found ${sept13NeedsAssignment.length} unassigned transactions on Sept 13, 2025.\n`);
    console.log('Please identify which 5 transactions belong to Kim:\n');
    
    // Display all transactions with numbers
    console.log('No. | Time     | Amount    | Client                      | Service/Notes');
    console.log('----|----------|-----------|-----------------------------|-----------------');
    
    sept13NeedsAssignment.forEach((tx, index) => {
      const date = new Date(tx.transactionDate);
      const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const amount = `$${(tx.totalAmount || 0).toFixed(2)}`.padEnd(9);
      const client = (tx.clientName || 'Unknown').substring(0, 27).padEnd(27);
      const service = tx.serviceNames || tx.notes?.split('|')[0]?.replace('Service:', '').trim() || '';
      const num = `${index + 1}`.padStart(2);
      console.log(`${num}. | ${time.padEnd(8)} | ${amount} | ${client} | ${service}`);
    });
    
    console.log('\n✅ Enter the numbers of transactions to assign to Kim (comma-separated).');
    console.log('   Example: 1,5,12,20,25');
    console.log('   Or type "cancel" to exit without changes.\n');
    
    const input = await question('Transaction numbers for Kim: ');
    
    if (input.toLowerCase() === 'cancel') {
      console.log('\n❌ Cancelled. No changes made.');
      rl.close();
      process.exit(0);
    }
    
    // Parse the input
    const selectedNumbers = input.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    const validNumbers = selectedNumbers.filter(n => n >= 1 && n <= sept13NeedsAssignment.length);
    
    if (validNumbers.length === 0) {
      console.log('\n❌ No valid transaction numbers provided. No changes made.');
      rl.close();
      process.exit(0);
    }
    
    console.log(`\n📋 You selected ${validNumbers.length} transactions to assign to Kim:\n`);
    
    let totalAmount = 0;
    const transactionsToUpdate = [];
    
    validNumbers.forEach(num => {
      const tx = sept13NeedsAssignment[num - 1];
      transactionsToUpdate.push(tx);
      totalAmount += tx.totalAmount || 0;
      console.log(`  - ${tx.clientName || 'Unknown'}: $${(tx.totalAmount || 0).toFixed(2)}`);
    });
    
    console.log(`\nTotal: $${totalAmount.toFixed(2)}`);
    console.log(`\nConfirm assignment of these ${validNumbers.length} transactions to Kim Czapansky? (yes/no)`);
    
    const confirm = await question('Confirm: ');
    
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('\n❌ Cancelled. No changes made.');
      rl.close();
      process.exit(0);
    }
    
    // Update the transactions
    console.log('\n🔄 Updating transactions...\n');
    
    for (const tx of transactionsToUpdate) {
      try {
        // Update the sales history record
        await storage.updateSalesHistory(tx.id, {
          staffName: 'Kim Czapansky',
          staffId: 28, // Kim's staff ID
          notes: (tx.notes || '').replace('[Webhook failed]', '[Manually assigned to Kim Czapansky]')
                                 .replace('[Previously: candra czapansky]', '[Manually assigned to Kim Czapansky]')
        });
        
        console.log(`✅ Updated: ${tx.clientName || 'Unknown'} - $${(tx.totalAmount || 0).toFixed(2)}`);
      } catch (error) {
        console.log(`❌ Failed to update: ${tx.clientName || 'Unknown'} - Error: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Successfully assigned ${transactionsToUpdate.length} transactions to Kim Czapansky!`);
    console.log('\n💡 The payroll report should now show these transactions for Kim.');
    
    rl.close();
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

assignTransactionsToKim().catch(err => {
  console.error('Failed:', err);
  rl.close();
  process.exit(1);
});










