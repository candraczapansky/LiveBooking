import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';
import { db } from '../server/db.ts';
import { users, staff, salesHistory } from '../shared/schema.ts';
import { eq, or, like, sql } from 'drizzle-orm';

async function findAndMatchStaff() {
  console.log('🔍 Finding and matching staff members...\n');
  
  const storage = new DatabaseStorage();
  
  try {
    // Get all users to find potential matches
    console.log('Fetching all users from database...');
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users\n`);
    
    // Get all staff records
    const allStaff = await db.select().from(staff);
    console.log(`Found ${allStaff.length} staff records\n`);
    
    // Get unique staff names from Helcim transactions
    const salesRecords = await storage.getAllSalesHistory();
    const helcimStaffNames = new Set();
    
    for (const sale of salesRecords) {
      if (sale.helcimPaymentId && sale.staffName) {
        helcimStaffNames.add(sale.staffName);
      }
    }
    
    console.log('📋 Staff names from Helcim transactions:\n');
    const staffNameArray = Array.from(helcimStaffNames).sort();
    staffNameArray.forEach(name => {
      const count = salesRecords.filter(s => s.staffName === name).length;
      const total = salesRecords.filter(s => s.staffName === name)
        .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      console.log(`  "${name}": ${count} transactions, $${total.toFixed(2)}`);
    });
    
    console.log('\n🔍 Searching for matching users in database:\n');
    
    // Map to store matches
    const staffMatches = {};
    
    // Search for each Helcim staff name
    for (const helcimName of staffNameArray) {
      if (helcimName === 'Helcim System' || helcimName === 'Unknown' || helcimName === 'undefined undefined') {
        continue; // Skip system/unknown entries
      }
      
      console.log(`\nSearching for: "${helcimName}"`);
      
      // Try different search strategies
      const nameParts = helcimName.toLowerCase().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      
      // Look for exact matches
      const exactMatches = allUsers.filter(user => {
        const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
        const userEmail = (user.email || '').toLowerCase();
        
        return userFullName === helcimName.toLowerCase() ||
               userEmail.includes(firstName) ||
               userEmail.includes(lastName);
      });
      
      // Look for partial matches
      const partialMatches = allUsers.filter(user => {
        const userFirst = (user.firstName || '').toLowerCase();
        const userLast = (user.lastName || '').toLowerCase();
        const userEmail = (user.email || '').toLowerCase();
        const userName = (user.name || '').toLowerCase();
        
        return (userFirst.includes(firstName) || firstName.includes(userFirst)) ||
               (userLast.includes(lastName) || lastName.includes(userLast)) ||
               userName.includes(firstName) ||
               userName.includes(lastName);
      });
      
      if (exactMatches.length > 0) {
        console.log(`  ✅ Exact match found:`);
        for (const user of exactMatches) {
          console.log(`     User ID ${user.id}: ${user.firstName} ${user.lastName} (${user.email})`);
          staffMatches[helcimName] = user.id;
          
          // Check if this user has a staff record
          const staffRecord = allStaff.find(s => s.userId === user.id);
          if (staffRecord) {
            console.log(`     → Has staff record: ID ${staffRecord.id}`);
          } else {
            console.log(`     → No staff record found`);
          }
        }
      } else if (partialMatches.length > 0) {
        console.log(`  🔶 Partial matches found:`);
        for (const user of partialMatches) {
          console.log(`     User ID ${user.id}: ${user.firstName || user.name} ${user.lastName || ''} (${user.email})`);
        }
      } else {
        console.log(`  ❌ No matches found`);
      }
    }
    
    // Special handling for common names
    console.log('\n🎯 Special name mappings:\n');
    
    // Look for Candra specifically
    const candraUsers = allUsers.filter(user => {
      const name = (user.name || '').toLowerCase();
      const firstName = (user.firstName || '').toLowerCase();
      const lastName = (user.lastName || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      
      return name.includes('candra') || 
             firstName.includes('candra') || 
             lastName.includes('czapansky') ||
             email.includes('candra') ||
             email.includes('czapansky');
    });
    
    if (candraUsers.length > 0) {
      console.log('Found potential matches for Candra Czapansky:');
      for (const user of candraUsers) {
        console.log(`  User ID ${user.id}: ${user.name || `${user.firstName} ${user.lastName}`} (${user.email})`);
        
        // Check for staff record
        const staffRecord = allStaff.find(s => s.userId === user.id);
        if (staffRecord) {
          console.log(`    → Staff ID: ${staffRecord.id}`);
          staffMatches['candra czapansky'] = user.id;
          staffMatches['Candra Czapansky'] = user.id;
        }
      }
    }
    
    // Summary of matches
    console.log('\n📊 Match Summary:\n');
    const matchedCount = Object.keys(staffMatches).length;
    console.log(`Matched ${matchedCount} out of ${staffNameArray.length} unique staff names`);
    
    if (matchedCount > 0) {
      console.log('\n✅ Ready to update transactions with these matches:');
      for (const [helcimName, userId] of Object.entries(staffMatches)) {
        const txCount = salesRecords.filter(s => s.staffName === helcimName).length;
        console.log(`  "${helcimName}" → User ID ${userId} (${txCount} transactions)`);
      }
      
      console.log('\n💡 To apply these matches, create an update script that:');
      console.log('   1. Updates the staffName in sales_history to the correct format');
      console.log('   2. Links transactions to the proper staff records');
      console.log('   3. Enables commission calculations');
    }
    
    // Check for admin/owner account
    console.log('\n👤 Looking for admin/owner account:');
    const adminUsers = allUsers.filter(user => {
      const role = (user.role || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      return role === 'admin' || role === 'owner' || email.includes('admin') || email.includes('owner');
    });
    
    for (const admin of adminUsers) {
      console.log(`  Admin: ${admin.name || `${admin.firstName} ${admin.lastName}`} (${admin.email}) - Role: ${admin.role}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

findAndMatchStaff().catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});










