import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';
import { db } from '../server/db.ts';
import { users } from '../shared/schema.ts';
import { eq } from 'drizzle-orm';

async function extractTimesAndMatchStaff() {
  console.log('Starting script...');
  
  const storage = new DatabaseStorage();
  
  console.log('🕐 Extracting actual transaction times and matching staff...\n');
  
  try {
    // Get all sales history
    const allSales = await storage.getAllSalesHistory();
    
    // Filter for transactions that need staff assignment
    const unmatchedStaffTransactions = allSales.filter(sale => {
      const staffName = (sale.staffName || '').toLowerCase();
      return sale.helcimPaymentId && 
             (staffName === 'candra czapansky' || 
              staffName === 'candra  czapansky' ||
              staffName === 'unknown staff' ||
              staffName === 'helcim system' ||
              staffName.includes('undefined'));
    });
    
    console.log(`Found ${unmatchedStaffTransactions.length} transactions needing staff assignment\n`);
    
    // Group by the USER field from Helcim (staffName in our DB)
    const byStaffName = {};
    
    for (const tx of unmatchedStaffTransactions) {
      let actualTime = null;
      
      // Extract timestamp from POS ID if available
      if (tx.helcimPaymentId && tx.helcimPaymentId.startsWith('POS-')) {
        const posId = tx.helcimPaymentId.substring(4); // Remove 'POS-'
        const timestampStr = posId.substring(0, 10); // Get first 10 digits
        const timestamp = parseInt(timestampStr);
        
        if (!isNaN(timestamp) && timestamp > 1600000000) { // After Sept 2020
          actualTime = new Date(timestamp * 1000);
        }
      }
      
      const staffName = tx.staffName || 'Unknown';
      if (!byStaffName[staffName]) {
        byStaffName[staffName] = [];
      }
      
      byStaffName[staffName].push({
        id: tx.id,
        helcimId: tx.helcimPaymentId,
        date: new Date(tx.transactionDate),
        actualTime: actualTime,
        amount: tx.totalAmount,
        tip: tx.tipAmount,
        customer: tx.clientName,
        type: tx.transactionType
      });
    }
    
    // Display transactions by staff name from Helcim
    console.log('📋 Transactions by Staff (from Helcim CSV):\n');
    
    for (const [staffName, transactions] of Object.entries(byStaffName)) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Staff: "${staffName}" (${transactions.length} transactions)`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      
      // Sort by actual time if available, otherwise by ID
      transactions.sort((a, b) => {
        if (a.actualTime && b.actualTime) {
          return a.actualTime - b.actualTime;
        }
        return a.id - b.id;
      });
      
      // Show first 10 transactions with extracted times
      console.log('Sample Transactions (showing actual times when available):');
      console.log('Date       | Actual Time      | Amount   | Customer              | Helcim ID');
      console.log('-----------|------------------|----------|----------------------|----------------------');
      
      for (const tx of transactions.slice(0, 15)) {
        const dateStr = tx.date.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        });
        
        let timeStr = 'No time data     ';
        if (tx.actualTime) {
          timeStr = tx.actualTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          }).padEnd(16);
        }
        
        const amount = `$${tx.amount.toFixed(2)}`.padEnd(8);
        const customer = (tx.customer || 'Unknown').substring(0, 20).padEnd(20);
        const helcimId = tx.helcimId || 'N/A';
        
        console.log(`${dateStr} | ${timeStr} | ${amount} | ${customer} | ${helcimId}`);
      }
      
      if (transactions.length > 15) {
        console.log(`... and ${transactions.length - 15} more transactions`);
      }
      
      // Calculate total for this staff member
      const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
      const totalTips = transactions.reduce((sum, tx) => sum + (tx.tip || 0), 0);
      console.log(`\nTotal: $${total.toFixed(2)} (Tips: $${totalTips.toFixed(2)})`);
    }
    
    // Look for existing users/staff in the database
    console.log('\n\n🔍 Looking for matching users in the database...\n');
    
    const allUsers = await db.select().from(users);
    
    console.log('Existing users who might match:');
    for (const user of allUsers) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      const nameLower = fullName.toLowerCase();
      
      // Check if this might be a match for any of the Helcim staff names
      for (const staffName of Object.keys(byStaffName)) {
        const staffLower = staffName.toLowerCase();
        if (staffLower !== 'unknown staff' && 
            staffLower !== 'helcim system' &&
            staffLower !== 'unknown' &&
            (nameLower.includes('candra') || 
             nameLower.includes('czapansky') ||
             staffLower.includes(nameLower) ||
             nameLower.includes(staffLower))) {
          console.log(`  User ID ${user.id}: ${fullName} (${user.email}) - might match "${staffName}"`);
        }
      }
    }
    
    console.log('\n💡 Next Steps:');
    console.log('1. Review the transactions above with their actual extracted times');
    console.log('2. Identify which user in your system is "candra czapansky"');
    console.log('3. Run a script to update all these transactions with the correct staff assignment');
    console.log('\n📝 Note: POS transaction IDs contain Unix timestamps, so we can extract actual times!');
    console.log('   Invoice (INV) and some APT transactions don\'t have embedded timestamps.');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

extractTimesAndMatchStaff().catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});
