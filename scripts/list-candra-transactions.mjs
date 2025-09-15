import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';

async function listCandraTransactions() {
  const storage = new DatabaseStorage();
  
  console.log('📋 Listing all transactions for "candra czapansky"...\n');
  
  try {
    // Get all sales history
    const allSales = await storage.getAllSalesHistory();
    
    // Filter for candra's transactions (case insensitive)
    const candraTransactions = allSales.filter(sale => {
      const staffName = (sale.staffName || '').toLowerCase().trim();
      return staffName.includes('candra') && staffName.includes('czapansky');
    });
    
    console.log(`Found ${candraTransactions.length} transactions for candra czapansky\n`);
    
    // Group by date for easier viewing
    const byDate = {};
    let totalAmount = 0;
    let totalTips = 0;
    
    for (const tx of candraTransactions) {
      const date = new Date(tx.transactionDate).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
      
      if (!byDate[date]) {
        byDate[date] = [];
      }
      
      byDate[date].push(tx);
      totalAmount += tx.totalAmount || 0;
      totalTips += tx.tipAmount || 0;
    }
    
    // Sort dates
    const sortedDates = Object.keys(byDate).sort((a, b) => {
      return new Date(a) - new Date(b);
    });
    
    // Display transactions by date
    console.log('📅 Transactions by Date:\n');
    console.log('Date       | Time     | Amount   | Tip    | Customer              | Type      | Helcim ID');
    console.log('-----------|----------|----------|--------|----------------------|-----------|----------------------');
    
    for (const date of sortedDates) {
      const transactions = byDate[date];
      
      for (const tx of transactions) {
        const time = new Date(tx.transactionDate).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        
        const amount = `$${(tx.totalAmount || 0).toFixed(2)}`.padEnd(8);
        const tip = `$${(tx.tipAmount || 0).toFixed(2)}`.padEnd(6);
        const customer = (tx.clientName || 'Unknown').substring(0, 20).padEnd(20);
        const type = (tx.transactionType || 'unknown').substring(0, 9).padEnd(9);
        const helcimId = tx.helcimPaymentId || 'N/A';
        
        console.log(`${date} | ${time.padEnd(8)} | ${amount} | ${tip} | ${customer} | ${type} | ${helcimId}`);
      }
    }
    
    // Summary statistics
    console.log('\n📊 Summary Statistics:');
    console.log(`  Total Transactions: ${candraTransactions.length}`);
    console.log(`  Total Amount: $${totalAmount.toFixed(2)}`);
    console.log(`  Total Tips: $${totalTips.toFixed(2)}`);
    console.log(`  Average Transaction: $${(totalAmount / candraTransactions.length).toFixed(2)}`);
    console.log(`  Average Tip: $${(totalTips / candraTransactions.length).toFixed(2)}`);
    
    // Date range
    if (sortedDates.length > 0) {
      console.log(`  Date Range: ${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`);
    }
    
    // Transaction types breakdown
    const typeCount = {};
    for (const tx of candraTransactions) {
      const type = tx.transactionType || 'unknown';
      typeCount[type] = (typeCount[type] || 0) + 1;
    }
    
    console.log('\n📈 Transaction Types:');
    for (const [type, count] of Object.entries(typeCount)) {
      const percentage = ((count / candraTransactions.length) * 100).toFixed(1);
      console.log(`  ${type}: ${count} (${percentage}%)`);
    }
    
    // Check staff name variations
    const nameVariations = new Set();
    for (const tx of candraTransactions) {
      nameVariations.add(tx.staffName);
    }
    
    if (nameVariations.size > 1) {
      console.log('\n⚠️ Name Variations Found:');
      for (const name of nameVariations) {
        const count = candraTransactions.filter(tx => tx.staffName === name).length;
        console.log(`  "${name}": ${count} transactions`);
      }
    }
    
    // Sample of first 10 transactions for detail
    console.log('\n📝 First 10 Transactions (Detailed):');
    for (const tx of candraTransactions.slice(0, 10)) {
      console.log(`\n  ID: ${tx.id}`);
      console.log(`  Date/Time: ${new Date(tx.transactionDate).toLocaleString()}`);
      console.log(`  Customer: ${tx.clientName || 'Unknown'}`);
      console.log(`  Amount: $${tx.totalAmount} (Tip: $${tx.tipAmount || 0})`);
      console.log(`  Type: ${tx.transactionType}`);
      console.log(`  Payment Method: ${tx.paymentMethod}`);
      console.log(`  Helcim ID: ${tx.helcimPaymentId || 'N/A'}`);
      if (tx.serviceNames) console.log(`  Services: ${tx.serviceNames}`);
      if (tx.notes) console.log(`  Notes: ${tx.notes}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

listCandraTransactions().catch(error => {
  console.error('Failed to list transactions:', error);
  process.exit(1);
});










