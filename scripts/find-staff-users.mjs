#!/usr/bin/env node

import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';

async function findStaffUsers() {
  try {
    const storage = new DatabaseStorage();
    
    console.log('🔍 Finding staff users in database...\n');
    
    const allUsers = await storage.getAllUsers();
    console.log(`Total users in database: ${allUsers.length}\n`);
    
    // Staff names from Helcim that need matching
    const staffToFind = [
      'candra czapansky',
      'sonja mcintire',
      'kisty ferguson',
      'kelsie wensman',
      'jenn mullings',
      'jade reece',
      'lynetta porter',
      'kelsey czapansky',
      'rita williams',
      'nicole smith',
      'kim czapansky',
      'eva arredondo',
      'jamie beller',
      'sydni brannon',
      'jacque grimm',
      'whitley guey',
      'marleigh allwelt',
      'memphis case',
      'valerie song',
      'marina fanning',
      'lupe oviedo',
      'hailey donley',
      'james taylor'
    ];
    
    console.log('📋 Searching for staff members:\n');
    console.log('══════════════════════════════════════════════\n');
    
    const matches = {};
    
    for (const staffName of staffToFind) {
      console.log(`\nSearching for: "${staffName}"`);
      const nameParts = staffName.toLowerCase().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      
      // Search in users
      const potentialMatches = allUsers.filter(user => {
        const userName = (user.name || '').toLowerCase();
        const userEmail = (user.email || '').toLowerCase();
        
        // Check various matching strategies
        return userName === staffName ||
               userName.includes(firstName) ||
               userName.includes(lastName) ||
               userEmail.includes(firstName) ||
               userEmail.includes(lastName) ||
               userEmail.replace(/[0-9]/g, '').includes(firstName) ||
               userEmail.replace(/[0-9]/g, '').includes(lastName);
      });
      
      if (potentialMatches.length > 0) {
        console.log('  ✅ Potential matches found:');
        for (const user of potentialMatches.slice(0, 3)) {
          console.log(`      User ID ${user.id}: ${user.name || 'No name'} (${user.email}) - Role: ${user.role}`);
          
          // Store best match
          if (!matches[staffName]) {
            matches[staffName] = {
              userId: user.id,
              userName: user.name,
              userEmail: user.email,
              userRole: user.role
            };
          }
        }
        if (potentialMatches.length > 3) {
          console.log(`      ... and ${potentialMatches.length - 3} more`);
        }
      } else {
        console.log('  ❌ No matches found');
      }
    }
    
    // Look for admin/owner users
    console.log('\n\n👤 Admin/Owner Users:\n');
    const adminUsers = allUsers.filter(user => 
      user.role === 'admin' || 
      user.role === 'owner' ||
      (user.email && user.email.includes('czapansky'))
    );
    
    for (const user of adminUsers.slice(0, 10)) {
      console.log(`  User ID ${user.id}: ${user.name || 'No name'} (${user.email}) - Role: ${user.role}`);
    }
    
    // Get sales history to show impact
    const allSales = await storage.getAllSalesHistory();
    
    console.log('\n\n📊 Transaction Summary for Matched Staff:\n');
    console.log('══════════════════════════════════════════════\n');
    
    for (const [staffName, match] of Object.entries(matches)) {
      const transactions = allSales.filter(s => 
        s.staffName && s.staffName.toLowerCase() === staffName
      );
      
      if (transactions.length > 0) {
        const total = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
        console.log(`"${staffName}" → User ID ${match.userId}`);
        console.log(`  Transactions: ${transactions.length}`);
        console.log(`  Total: $${total.toFixed(2)}`);
        console.log(`  User: ${match.userEmail}\n`);
      }
    }
    
    // Summary of unmatched
    console.log('\n❓ Still need to identify:\n');
    const unmatchedSales = allSales.filter(s => 
      s.staffName === 'undefined undefined' ||
      s.staffName === 'Unknown' ||
      s.staffName === 'candra czapansky' ||
      s.staffName === 'Candra Czapansky'
    );
    
    const byStaff = {};
    for (const sale of unmatchedSales) {
      const staff = sale.staffName || 'Unknown';
      if (!byStaff[staff]) {
        byStaff[staff] = { count: 0, total: 0 };
      }
      byStaff[staff].count++;
      byStaff[staff].total += sale.totalAmount || 0;
    }
    
    for (const [staff, data] of Object.entries(byStaff)) {
      console.log(`  "${staff}": ${data.count} transactions, $${data.total.toFixed(2)}`);
    }
    
    console.log('\n💡 Next step: Tell me which user ID should be assigned to:');
    console.log('   1. "candra czapansky" (281 transactions)');
    console.log('   2. "undefined undefined" (309 transactions)');
    console.log('   3. Any other unmatched staff');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

findStaffUsers().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});










