#!/usr/bin/env node

import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';
import { db } from '../server/db.ts';
import { salesHistory } from '../shared/schema.ts';
import { eq, and, sql } from 'drizzle-orm';

async function reassignTransactions() {
  try {
    console.log('Starting transaction reassignment...');
    const storage = new DatabaseStorage();
    
    console.log('\n📊 Reassigning Candra transactions...\n');
    
    // Get all sales history
    const allSales = await storage.getAllSalesHistory();
    
    // Filter for candra's transactions
    const candraTransactions = allSales.filter(sale => {
      const staffName = (sale.staffName || '').toLowerCase().trim();
      return staffName.includes('candra') && staffName.includes('czapansky');
    });
    
    console.log(`Found ${candraTransactions.length} "candra czapansky" transactions\n`);
    
    // Separate test vs real transactions
    const testTransactions = [];
    const realTransactions = [];
    
    for (const tx of candraTransactions) {
      if (tx.totalAmount <= 2.50) {
        testTransactions.push(tx);
      } else {
        realTransactions.push(tx);
      }
    }
    
    console.log(`📋 Transaction Breakdown:`);
    console.log(`  Test transactions (≤ $2.50): ${testTransactions.length}`);
    console.log(`  Real transactions (> $2.50): ${realTransactions.length}\n`);
    
    // Update test transactions to properly link to Candra (User ID 1)
    console.log('✅ Updating test transactions to Candra Czapansky (User ID 1)...');
    
    let updatedTest = 0;
    for (const tx of testTransactions) {
      try {
        await db
          .update(salesHistory)
          .set({ 
            staffName: 'Candra Czapansky',
            notes: sql`COALESCE(${salesHistory.notes}, '') || ' [Test transaction]'`
          })
          .where(eq(salesHistory.id, tx.id));
        updatedTest++;
      } catch (error) {
        console.error(`  Error updating transaction ${tx.id}:`, error.message);
      }
    }
    
    console.log(`  Updated ${updatedTest} test transactions\n`);
    
    // Mark real transactions as needing reassignment
    console.log('⚠️ Marking real transactions as needing staff assignment...');
    
    let updatedReal = 0;
    for (const tx of realTransactions) {
      try {
        await db
          .update(salesHistory)
          .set({ 
            staffName: 'NEEDS ASSIGNMENT',
            notes: sql`COALESCE(${salesHistory.notes}, '') || ' [Previously: candra czapansky]'`
          })
          .where(eq(salesHistory.id, tx.id));
        updatedReal++;
      } catch (error) {
        console.error(`  Error updating transaction ${tx.id}:`, error.message);
      }
    }
    
    console.log(`  Marked ${updatedReal} real transactions as needing assignment\n`);
    
    // Also handle the "undefined undefined" transactions
    const undefinedTransactions = allSales.filter(sale => 
      sale.staffName === 'undefined undefined' || 
      sale.staffName === 'Unknown'
    );
    
    if (undefinedTransactions.length > 0) {
      console.log('🔍 Handling "undefined undefined" transactions...');
      console.log(`  Found ${undefinedTransactions.length} transactions\n`);
      
      let updatedUndefined = 0;
      for (const tx of undefinedTransactions) {
        try {
          await db
            .update(salesHistory)
            .set({ 
              staffName: 'NEEDS ASSIGNMENT',
              notes: sql`COALESCE(${salesHistory.notes}, '') || ' [Webhook failed]'`
            })
            .where(eq(salesHistory.id, tx.id));
          updatedUndefined++;
        } catch (error) {
          console.error(`  Error updating transaction ${tx.id}:`, error.message);
        }
      }
      
      console.log(`  Marked ${updatedUndefined} undefined transactions as needing assignment\n`);
    }
    
    // Summary
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📊 SUMMARY:\n');
    console.log(`✅ Test transactions assigned to Candra: ${updatedTest}`);
    console.log(`⚠️ Real transactions needing assignment: ${updatedReal}`);
    console.log(`🔍 Undefined transactions needing assignment: ${undefinedTransactions.length}\n`);
    
    console.log('💡 NEXT STEPS:');
    console.log('1. Review the Sales Report page');
    console.log('2. Look for transactions marked "NEEDS ASSIGNMENT"');
    console.log('3. Use the date/time and customer info to identify the correct staff');
    console.log('4. Update each transaction with the correct staff member\n');
    
    console.log('You can search for "NEEDS ASSIGNMENT" on the Sales Report page');
    console.log('to find all transactions that need to be reassigned.');
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

// Ask for confirmation
console.log('\n⚠️ WARNING: This will update transaction records!\n');
console.log('This script will:');
console.log('1. Keep test transactions (≤ $2.50) assigned to Candra');
console.log('2. Mark real transactions (> $2.50) as "NEEDS ASSIGNMENT"');
console.log('3. Mark "undefined undefined" transactions as "NEEDS ASSIGNMENT"\n');
console.log('Continue? (Press Ctrl+C to cancel, or wait 5 seconds to proceed)\n');

setTimeout(() => {
  reassignTransactions().catch(err => {
    console.error('Failed:', err);
    process.exit(1);
  });
}, 5000);










