import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';
import Papa from 'papaparse';
import fs from 'fs';

async function analyzeHelcimData() {
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
  console.log(`📊 Found ${helcimTransactions.length} rows in CSV\n`);
  
  // Analyze CSV data
  const withOrderNumber = [];
  const withoutOrderNumber = [];
  const verifyTransactions = [];
  const zeroAmount = [];
  
  for (const tx of helcimTransactions) {
    if (tx.TRANSACTION_TYPE === 'Verify') {
      verifyTransactions.push(tx);
    } else if (tx.AMOUNT === '$0.00') {
      zeroAmount.push(tx);
    } else if (tx.ORDER_NUMBER) {
      withOrderNumber.push(tx);
    } else {
      withoutOrderNumber.push(tx);
    }
  }
  
  console.log('📋 CSV Data Analysis:');
  console.log(`  ✓ With ORDER_NUMBER: ${withOrderNumber.length}`);
  console.log(`  ✗ Without ORDER_NUMBER: ${withoutOrderNumber.length}`);
  console.log(`  🔐 Card Verifications: ${verifyTransactions.length}`);
  console.log(`  💳 Zero Amount: ${zeroAmount.length}\n`);
  
  // Get all sales history
  const salesHistory = await storage.getAllSalesHistory();
  const withHelcimId = salesHistory.filter(s => s.helcimPaymentId);
  const withoutHelcimId = salesHistory.filter(s => !s.helcimPaymentId);
  
  console.log('📊 Sales History in App:');
  console.log(`  Total records: ${salesHistory.length}`);
  console.log(`  With Helcim ID: ${withHelcimId.length}`);
  console.log(`  Without Helcim ID: ${withoutHelcimId.length}\n`);
  
  // Check which Helcim IDs are in the database
  const existingHelcimIds = new Set(withHelcimId.map(s => s.helcimPaymentId));
  
  // Find transactions without ORDER_NUMBER
  if (withoutOrderNumber.length > 0) {
    console.log('⚠️ Transactions without ORDER_NUMBER (cannot be imported):');
    console.log('Date       | Amount  | Customer            | Type        | Status');
    console.log('-----------|---------|--------------------| ------------|--------');
    
    for (const tx of withoutOrderNumber.slice(0, 20)) { // Show first 20
      const date = tx.DATE_CREATED || 'Unknown';
      const amount = tx.AMOUNT || '$0.00';
      const customer = (tx.CUSTOMER_NAME || 'Unknown').substring(0, 18).padEnd(18);
      const type = tx.TRANSACTION_TYPE || 'Unknown';
      const status = tx.STATUS || 'Unknown';
      
      console.log(`${date.padEnd(10)} | ${amount.padEnd(7)} | ${customer} | ${type.padEnd(11)} | ${status}`);
    }
    
    if (withoutOrderNumber.length > 20) {
      console.log(`... and ${withoutOrderNumber.length - 20} more`);
    }
  }
  
  // Show summary by transaction type
  console.log('\n📈 Transaction Types in CSV:');
  const typeCount = {};
  for (const tx of helcimTransactions) {
    const type = tx.TRANSACTION_TYPE || 'Unknown';
    typeCount[type] = (typeCount[type] || 0) + 1;
  }
  
  for (const [type, count] of Object.entries(typeCount)) {
    console.log(`  ${type}: ${count}`);
  }
  
  // Show date range
  const dates = helcimTransactions
    .filter(tx => tx.DATE_CREATED)
    .map(tx => {
      const parts = tx.DATE_CREATED.split('/');
      if (parts.length === 3) {
        return new Date(`20${parts[2]}-${parts[1]}-${parts[0]}`);
      }
      return null;
    })
    .filter(d => d && !isNaN(d.getTime()));
  
  if (dates.length > 0) {
    dates.sort((a, b) => a - b);
    console.log(`\n📅 Date Range in CSV:`);
    console.log(`  First: ${dates[0].toLocaleDateString()}`);
    console.log(`  Last: ${dates[dates.length - 1].toLocaleDateString()}`);
  }
  
  // Check for any unmatched with ORDER_NUMBER (should be 0 based on previous run)
  const unmatched = withOrderNumber.filter(tx => !existingHelcimIds.has(tx.ORDER_NUMBER));
  if (unmatched.length > 0) {
    console.log(`\n❗ Found ${unmatched.length} unmatched transactions with ORDER_NUMBER!`);
    for (const tx of unmatched.slice(0, 5)) {
      console.log(`  - ${tx.ORDER_NUMBER}: ${tx.DATE_CREATED} ${tx.AMOUNT} ${tx.CUSTOMER_NAME || 'Unknown'}`);
    }
  } else {
    console.log('\n✅ All transactions with ORDER_NUMBER are in the sales history!');
  }
  
  process.exit(0);
}

analyzeHelcimData();










