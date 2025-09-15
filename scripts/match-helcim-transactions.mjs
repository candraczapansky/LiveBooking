import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';
import Papa from 'papaparse';
import fs from 'fs';

async function matchHelcimTransactions() {
  const storage = new DatabaseStorage();
  
  // Get CSV file path
  const csvFilePath = process.argv[2] || 'data/helcim-transactions.csv';
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }

  console.log(`📄 Reading Helcim CSV file: ${csvFilePath}`);
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  
  // Parse CSV
  const parseResult = Papa.parse(csvContent, {
    header: true,
    delimiter: '\t',
    skipEmptyLines: true
  });
  
  const helcimTransactions = parseResult.data;
  console.log(`📊 Found ${helcimTransactions.length} Helcim transactions\n`);
  
  // Get all sales history to check what's already imported
  const salesHistory = await storage.getAllSalesHistory();
  const existingHelcimIds = new Set(
    salesHistory
      .filter(s => s.helcimPaymentId)
      .map(s => s.helcimPaymentId)
  );
  
  // Find unmatched transactions
  const unmatched = [];
  const matched = [];
  
  for (const tx of helcimTransactions) {
    const txId = tx.ORDER_NUMBER;
    if (!txId) continue;
    
    if (existingHelcimIds.has(txId)) {
      matched.push(tx);
    } else {
      unmatched.push(tx);
    }
  }
  
  console.log(`✅ Matched: ${matched.length} transactions`);
  console.log(`❓ Unmatched: ${unmatched.length} transactions\n`);
  
  if (unmatched.length > 0) {
    console.log('📋 Unmatched Transactions Report:\n');
    console.log('Date       | Amount  | Customer            | Staff              | Order Number');
    console.log('-----------|---------|--------------------|--------------------|----------------------');
    
    for (const tx of unmatched) {
      const date = tx.DATE_CREATED || 'Unknown';
      const amount = tx.AMOUNT || '$0.00';
      const customer = (tx.CUSTOMER_NAME || 'Unknown').substring(0, 18).padEnd(18);
      const staff = (tx.USER || 'Unknown').substring(0, 18).padEnd(18);
      const orderId = tx.ORDER_NUMBER || 'N/A';
      
      console.log(`${date.padEnd(10)} | ${amount.padEnd(7)} | ${customer} | ${staff} | ${orderId}`);
    }
    
    // Group by date for easier matching
    console.log('\n📅 Unmatched Transactions by Date:');
    const byDate = {};
    for (const tx of unmatched) {
      const date = tx.DATE_CREATED || 'Unknown';
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(tx);
    }
    
    for (const [date, transactions] of Object.entries(byDate)) {
      console.log(`\n${date}: ${transactions.length} transaction(s)`);
      let totalAmount = 0;
      for (const tx of transactions) {
        const amount = parseFloat(String(tx.AMOUNT || 0).replace(/[^0-9.-]/g, ''));
        totalAmount += amount;
        console.log(`  - ${tx.AMOUNT} ${tx.CUSTOMER_NAME || 'Unknown'} (${tx.ORDER_NUMBER})`);
      }
      console.log(`  Total: $${totalAmount.toFixed(2)}`);
    }
  }
  
  // Check for potential matches in app payments
  console.log('\n🔍 Searching for potential matches in app...');
  const payments = await storage.getAllPayments();
  
  for (const tx of unmatched.slice(0, 10)) { // Check first 10 unmatched
    // Parse Helcim date
    const dateParts = tx.DATE_CREATED.split('/');
    if (dateParts.length !== 3) continue;
    
    const day = dateParts[0];
    const month = dateParts[1];
    const year = '20' + dateParts[2];
    const helcimDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    
    // Parse amount
    const helcimAmount = parseFloat(String(tx.AMOUNT || 0).replace(/[^0-9.-]/g, ''));
    
    // Look for matching payments
    const potentialMatches = payments.filter(p => {
      const paymentDate = new Date(p.paymentDate);
      const sameDate = 
        paymentDate.getDate() === helcimDate.getDate() &&
        paymentDate.getMonth() === helcimDate.getMonth() &&
        paymentDate.getFullYear() === helcimDate.getFullYear();
      
      const similarAmount = Math.abs(p.amount - helcimAmount) < 0.01;
      
      return sameDate && similarAmount && !p.helcimPaymentId;
    });
    
    if (potentialMatches.length > 0) {
      console.log(`\n💡 Potential match for ${tx.ORDER_NUMBER}:`);
      console.log(`   Helcim: ${tx.DATE_CREATED} - ${tx.AMOUNT} - ${tx.CUSTOMER_NAME || 'Unknown'}`);
      for (const match of potentialMatches) {
        const client = await storage.getClientById(match.clientId);
        console.log(`   App Payment: ${match.id} - $${match.amount} - ${client?.name || 'Unknown'} - Status: ${match.paymentStatus}`);
      }
    }
  }
  
  process.exit(0);
}

matchHelcimTransactions();










