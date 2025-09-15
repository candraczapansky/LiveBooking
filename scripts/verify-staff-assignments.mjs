import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';

async function verifyStaffAssignments() {
  console.log('Starting verification script...');
  
  const storage = new DatabaseStorage();
  
  console.log('🔍 Verifying Staff Assignments in Sales History...\n');
  
  try {
    // Get all sales history
    console.log('Fetching sales history...');
    const salesHistory = await storage.getAllSalesHistory();
    console.log(`Found ${salesHistory.length} sales records`);
    
    // Get all staff members
    console.log('Fetching staff members...');
    const allStaff = await storage.getAllStaff();
    const staffNames = new Set(
      allStaff.map(s => `${s.firstName} ${s.lastName}`.toLowerCase().trim())
    );
    
    console.log('📋 Staff Members in Database:');
    for (const staff of allStaff) {
      const fullName = `${staff.firstName} ${staff.lastName}`;
      console.log(`  - ${fullName} (ID: ${staff.id}, Active: ${staff.isActive})`);
    }
    console.log();
    
    // Analyze staff assignments in sales history
    const staffCounts = {};
    const unmatchedStaffNames = new Set();
    let correctlyMatched = 0;
    let incorrectlyAssigned = 0;
    let helcimImported = 0;
    
    for (const sale of salesHistory) {
      const staffName = sale.staffName || 'Unknown';
      staffCounts[staffName] = (staffCounts[staffName] || 0) + 1;
      
      // Check if this is a Helcim imported transaction
      if (sale.helcimPaymentId) {
        helcimImported++;
        
        // Check if the staff name matches a real staff member
        const normalizedName = staffName.toLowerCase().trim();
        if (!staffNames.has(normalizedName) && staffName !== 'Unknown Staff') {
          unmatchedStaffNames.add(staffName);
          incorrectlyAssigned++;
        } else {
          correctlyMatched++;
        }
      }
    }
    
    console.log('📊 Staff Assignment Summary:');
    console.log(`  Total Sales Records: ${salesHistory.length}`);
    console.log(`  Helcim Imported: ${helcimImported}`);
    console.log(`  Correctly Matched Staff: ${correctlyMatched}`);
    console.log(`  Unmatched Staff Names: ${incorrectlyAssigned}\n`);
    
    console.log('📈 Staff Transaction Counts:');
    const sortedCounts = Object.entries(staffCounts)
      .sort((a, b) => b[1] - a[1]);
    
    for (const [staff, count] of sortedCounts) {
      const percentage = ((count / salesHistory.length) * 100).toFixed(1);
      console.log(`  ${staff}: ${count} transactions (${percentage}%)`);
    }
    
    if (unmatchedStaffNames.size > 0) {
      console.log('\n⚠️ Unmatched Staff Names from Helcim:');
      for (const name of unmatchedStaffNames) {
        console.log(`  - "${name}"`);
        
        // Try to find potential matches
        const nameLower = name.toLowerCase();
        const potentialMatches = allStaff.filter(s => {
          const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
          return fullName.includes(nameLower.split(' ')[0]) || 
                 fullName.includes(nameLower.split(' ')[1] || '');
        });
        
        if (potentialMatches.length > 0) {
          console.log('    Potential matches:');
          for (const match of potentialMatches) {
            console.log(`      → ${match.firstName} ${match.lastName} (ID: ${match.id})`);
          }
        }
      }
      
      console.log('\n💡 Recommendation:');
      console.log('   The staff names from Helcim CSV don\'t match the database.');
      console.log('   You may need to update the staff names to match correctly.');
    }
    
    // Check specific Helcim user names
    const helcimUsers = new Set();
    const helcimTransactions = salesHistory.filter(s => s.helcimPaymentId);
    
    for (const tx of helcimTransactions) {
      if (tx.staffName && tx.staffName !== 'Unknown Staff') {
        helcimUsers.add(tx.staffName);
      }
    }
    
    console.log('\n📝 Unique Staff Names in Helcim Transactions:');
    for (const user of helcimUsers) {
      console.log(`  - "${user}"`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
  
  process.exit(0);
}

verifyStaffAssignments().catch(error => {
  console.error('Failed to run verification:', error);
  process.exit(1);
});
