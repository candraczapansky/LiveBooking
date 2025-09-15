import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';
import { db } from '../server/db.ts';
import { staff, users, salesHistory } from '../shared/schema.ts';
import { eq, sql, and } from 'drizzle-orm';

async function fixStaffNamesInSales() {
  console.log('Starting script...');
  
  const storage = new DatabaseStorage();
  
  console.log('🔧 Fixing Staff Names in Sales History...\n');
  
  try {
    // Get all staff with their user details
    console.log('Fetching staff with user details...');
    const staffWithUsers = await db
      .select({
        staffId: staff.id,
        userId: staff.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(staff)
      .leftJoin(users, eq(staff.userId, users.id))
      .where(eq(staff.isActive, true));
    
    console.log(`Found ${staffWithUsers.length} active staff members\n`);
    
    // Create a map of name variations to staff
    const nameToStaff = new Map();
    
    for (const s of staffWithUsers) {
      if (s.firstName && s.lastName) {
        const fullName = `${s.firstName} ${s.lastName}`;
        const fullNameLower = fullName.toLowerCase();
        
        console.log(`Staff ID ${s.staffId}: ${fullName} (User ID: ${s.userId})`);
        
        // Add various name formats
        nameToStaff.set(fullNameLower, { staffId: s.staffId, correctName: fullName });
        nameToStaff.set(`${s.firstName.toLowerCase()} ${s.lastName.toLowerCase()}`, { staffId: s.staffId, correctName: fullName });
        nameToStaff.set(`${s.lastName.toLowerCase()} ${s.firstName.toLowerCase()}`, { staffId: s.staffId, correctName: fullName });
        
        // Handle special cases
        if (fullNameLower === 'candra czapansky') {
          // Add variations found in the data
          nameToStaff.set('candra czapansky', { staffId: s.staffId, correctName: fullName });
          nameToStaff.set('candra  czapansky', { staffId: s.staffId, correctName: fullName });
        }
      }
    }
    
    console.log(`\nCreated name mapping for ${nameToStaff.size} name variations`);
    
    // Get all sales history records
    console.log('\nFetching sales history...');
    const allSales = await storage.getAllSalesHistory();
    console.log(`Found ${allSales.length} sales records`);
    
    // Track updates
    let updated = 0;
    let notFound = 0;
    const unmatchedNames = new Set();
    
    // Process each sale
    for (const sale of allSales) {
      if (!sale.staffName || sale.staffName === 'Unknown Staff' || sale.staffName === 'undefined undefined') {
        continue;
      }
      
      // Try to find matching staff
      const staffNameLower = sale.staffName.toLowerCase().trim();
      const match = nameToStaff.get(staffNameLower);
      
      if (match) {
        // Update with correct name format
        if (sale.staffName !== match.correctName) {
          await db
            .update(salesHistory)
            .set({ staffName: match.correctName })
            .where(eq(salesHistory.id, sale.id));
          
          console.log(`✅ Updated: "${sale.staffName}" → "${match.correctName}"`);
          updated++;
        }
      } else if (sale.staffName === 'Helcim System') {
        // Leave Helcim System as is - these are online payments
        continue;
      } else {
        unmatchedNames.add(sale.staffName);
        notFound++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`  ✅ Updated: ${updated} records`);
    console.log(`  ❓ Not found: ${notFound} records`);
    
    if (unmatchedNames.size > 0) {
      console.log('\n⚠️ Unmatched Staff Names:');
      for (const name of unmatchedNames) {
        console.log(`  - "${name}"`);
      }
      
      console.log('\n💡 To fix unmatched names:');
      console.log('  1. Add these staff members to the system');
      console.log('  2. Or manually update the sales records');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

fixStaffNamesInSales().catch(error => {
  console.error('Failed to fix staff names:', error);
  process.exit(1);
});
