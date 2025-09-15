#!/usr/bin/env node

console.log('Script starting...');

import 'dotenv/config';

console.log('Dotenv loaded');

import { DatabaseStorage } from '../server/storage.ts';

console.log('Storage imported');
console.log('Starting staff matching process...');

async function matchStaff() {
  try {
    console.log('Creating storage instance...');
    const storage = new DatabaseStorage();
    console.log('Storage created');
    
    console.log('\n🔍 Analyzing staff assignments for Helcim transactions...\n');
    
    // Get all sales history
    const allSales = await storage.getAllSalesHistory();
    
    // Get unique staff names from transactions
    const staffSummary = {};
    
    for (const sale of allSales) {
      if (sale.helcimPaymentId && sale.staffName) {
        if (!staffSummary[sale.staffName]) {
          staffSummary[sale.staffName] = {
            count: 0,
            total: 0,
            firstDate: sale.transactionDate,
            lastDate: sale.transactionDate,
            sampleCustomers: []
          };
        }
        
        staffSummary[sale.staffName].count++;
        staffSummary[sale.staffName].total += sale.totalAmount || 0;
        
        if (new Date(sale.transactionDate) < new Date(staffSummary[sale.staffName].firstDate)) {
          staffSummary[sale.staffName].firstDate = sale.transactionDate;
        }
        if (new Date(sale.transactionDate) > new Date(staffSummary[sale.staffName].lastDate)) {
          staffSummary[sale.staffName].lastDate = sale.transactionDate;
        }
        
        if (staffSummary[sale.staffName].sampleCustomers.length < 5 && sale.clientName && sale.clientName !== 'Unknown Customer') {
          staffSummary[sale.staffName].sampleCustomers.push(sale.clientName);
        }
      }
    }
    
    console.log('📋 STAFF ASSIGNMENTS NEEDED:\n');
    console.log('══════════════════════════════════════════════════════════════════════\n');
    
    // Sort by transaction count
    const sortedStaff = Object.entries(staffSummary)
      .sort((a, b) => b[1].count - a[1].count);
    
    // Focus on the main ones that need fixing
    const needsAssignment = [
      'candra czapansky',
      'candra  czapansky',
      'undefined undefined',
      'Unknown',
      'Candra Czapansky'
    ];
    
    console.log('🔴 HIGH PRIORITY - These need immediate assignment:\n');
    
    for (const [staffName, data] of sortedStaff) {
      const nameCheck = staffName.toLowerCase();
      if (needsAssignment.some(n => n.toLowerCase() === nameCheck) || nameCheck.includes('undefined')) {
        console.log(`\n"${staffName}"`);
        console.log(`├─ Transactions: ${data.count}`);
        console.log(`├─ Total: $${data.total.toFixed(2)}`);
        console.log(`├─ Date Range: ${new Date(data.firstDate).toLocaleDateString()} - ${new Date(data.lastDate).toLocaleDateString()}`);
        if (data.sampleCustomers.length > 0) {
          console.log(`└─ Sample Customers: ${data.sampleCustomers.slice(0, 3).join(', ')}`);
        }
      }
    }
    
    console.log('\n\n🟢 ALREADY HAVE NAMES - May just need user record updates:\n');
    
    for (const [staffName, data] of sortedStaff) {
      const nameCheck = staffName.toLowerCase();
      if (!needsAssignment.some(n => n.toLowerCase() === nameCheck) && 
          !nameCheck.includes('undefined') && 
          nameCheck !== 'helcim system') {
        console.log(`\n"${staffName}"`);
        console.log(`├─ Transactions: ${data.count}`);
        console.log(`├─ Total: $${data.total.toFixed(2)}`);
        console.log(`└─ Date Range: ${new Date(data.firstDate).toLocaleDateString()} - ${new Date(data.lastDate).toLocaleDateString()}`);
      }
    }
    
    console.log('\n══════════════════════════════════════════════════════════════════════\n');
    
    // Get all users to check for matches
    const allUsers = await storage.getAllUsers();
    console.log(`\n👥 Users in database: ${allUsers.length}\n`);
    
    // Look for potential Candra match
    console.log('🔍 Searching for "Candra" in users:');
    const candraMatches = allUsers.filter(user => {
      const name = (user.name || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      return name.includes('candra') || 
             name.includes('czapansky') ||
             email.includes('candra') || 
             email.includes('czapansky');
    });
    
    if (candraMatches.length > 0) {
      console.log('✅ Found potential Candra match(es):');
      for (const user of candraMatches) {
        console.log(`  User ID ${user.id}: ${user.name} (${user.email}) - Role: ${user.role}`);
      }
    } else {
      console.log('❌ No users found with "candra" or "czapansky" in name/email');
    }
    
    // Look for admin/owner
    console.log('\n🔍 Looking for admin/owner users:');
    const adminUsers = allUsers.filter(user => 
      user.role === 'admin' || user.role === 'owner'
    );
    
    if (adminUsers.length > 0) {
      console.log('Found admin/owner users:');
      for (const user of adminUsers) {
        console.log(`  User ID ${user.id}: ${user.name} (${user.email}) - Role: ${user.role}`);
      }
    }
    
    // Show all users for reference
    console.log('\n📋 ALL USERS (for manual matching):');
    console.log('─────────────────────────────────────');
    
    for (const user of allUsers.slice(0, 20)) {
      console.log(`ID ${user.id}: ${user.name || 'No name'} (${user.email}) - Role: ${user.role}`);
    }
    
    if (allUsers.length > 20) {
      console.log(`... and ${allUsers.length - 20} more users`);
    }
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Identify which user ID corresponds to each staff member');
    console.log('2. The "undefined undefined" transactions (309) need manual review');
    console.log('3. "candra czapansky" (281 transactions) needs to be linked to the correct user');
    console.log('4. Once identified, we can bulk update all transactions');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
  
  process.exit(0);
}

matchStaff().catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});
