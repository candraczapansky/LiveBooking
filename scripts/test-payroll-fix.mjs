#!/usr/bin/env node

import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';

async function testPayrollFix() {
  try {
    const storage = new DatabaseStorage();
    
    console.log('🔍 Testing payroll fix for September 13, 2025...\n');
    
    // Get sales history for Sept 13
    const start = new Date('2025-09-13T00:00:00');
    const end = new Date('2025-09-13T23:59:59');
    
    const salesHistory = await storage.getSalesHistoryByDateRange(start, end);
    
    console.log(`Total transactions on Sept 13: ${salesHistory.length}\n`);
    
    // Group by staff
    const byStaff = {};
    for (const sale of salesHistory) {
      const staff = sale.staffName || 'Unknown';
      if (!byStaff[staff]) {
        byStaff[staff] = { count: 0, total: 0, transactions: [] };
      }
      byStaff[staff].count++;
      byStaff[staff].total += sale.totalAmount || 0;
      byStaff[staff].transactions.push({
        time: new Date(sale.transactionDate).toLocaleTimeString(),
        amount: sale.totalAmount,
        client: sale.clientName
      });
    }
    
    console.log('📊 Transactions by Staff Member:\n');
    console.log('══════════════════════════════════════════\n');
    
    for (const [staff, data] of Object.entries(byStaff)) {
      console.log(`${staff}:`);
      console.log(`  Transactions: ${data.count}`);
      console.log(`  Total: $${data.total.toFixed(2)}`);
      
      if (staff.toLowerCase().includes('kim')) {
        console.log('  Details:');
        for (const tx of data.transactions) {
          console.log(`    ${tx.time} - $${tx.amount.toFixed(2)} - ${tx.client || 'Unknown'}`);
        }
      }
      console.log();
    }
    
    console.log('💡 PAYROLL REPORT SHOULD NOW SHOW:');
    console.log('1. ALL transactions from sales_history table');
    console.log('2. Not just appointments with payments');
    console.log('3. Kim should see all 5 transactions once they are properly assigned');
    console.log('\n⚠️ NOTE: Transactions marked "NEEDS ASSIGNMENT" won\'t show in payroll');
    console.log('   You need to update those transactions with the correct staff member');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

testPayrollFix().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});










