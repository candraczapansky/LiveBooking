import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';
import Papa from 'papaparse';
import fs from 'fs';
import { format, parse, isValid } from 'date-fns';

async function fixHelcimTransactions() {
  const storage = new DatabaseStorage();
  
  // Get CSV file path from command line argument
  const csvFilePath = process.argv[2];
  if (!csvFilePath) {
    console.error('❌ Please provide a CSV file path as an argument');
    console.log('Usage: node scripts/fix-helcim-transactions-v2.mjs <path-to-csv>');
    process.exit(1);
  }

  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }

  console.log(`📄 Reading CSV file: ${csvFilePath}`);
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');

  // Parse CSV - your data is tab-separated
  const parseResult = Papa.parse(csvContent, {
    header: true,
    delimiter: '\t', // Tab-separated values
    skipEmptyLines: true,
  });

  if (parseResult.errors.length > 0) {
    console.warn('⚠️ CSV parsing warnings:', parseResult.errors);
  }

  const transactions = parseResult.data;
  console.log(`✅ Found ${transactions.length} transactions in CSV`);

  // Get all payments from the database
  const allPayments = await storage.getAllPayments();
  
  // Focus on completed payments WITHOUT Helcim IDs (these need to be linked)
  const completedWithoutHelcimId = allPayments.filter(p => 
    p.status === 'completed' && !p.helcimPaymentId
  );
  
  console.log(`\n📊 Database Analysis:`);
  console.log(`   Total payments: ${allPayments.length}`);
  console.log(`   Completed without Helcim ID: ${completedWithoutHelcimId.length} (need linking)`);
  console.log(`   Completed with Helcim ID: ${allPayments.filter(p => p.status === 'completed' && p.helcimPaymentId).length} (already linked)`);

  let matched = 0;
  let alreadyLinked = 0;
  let notFound = 0;
  const unmatchedTransactions = [];

  for (const helcimTx of transactions) {
    try {
      // Skip if not APPROVED
      if (helcimTx.STATUS !== 'APPROVED') {
        console.log(`⚠️ Skipping non-approved transaction: ${helcimTx.ORDER_NUMBER}`);
        continue;
      }

      // Extract transaction ID from ORDER_NUMBER
      const txId = helcimTx.ORDER_NUMBER;
      if (!txId) {
        console.warn(`⚠️ Skipping row without ORDER_NUMBER`);
        continue;
      }

      // Skip APT- prefixed transactions (these are special test transactions)
      if (txId.startsWith('APT-')) {
        continue;
      }

      // Parse amount (remove $ sign and convert to number)
      const amount = parseFloat(String(helcimTx.AMOUNT || 0).replace(/[^0-9.-]/g, ''));
      const tipAmount = parseFloat(String(helcimTx.AMOUNT_TIP || 0).replace(/[^0-9.-]/g, ''));
      const totalAmount = amount; // In Helcim, AMOUNT is already the total

      // Parse date (DD/MM/YY format)
      let txDate = null;
      if (helcimTx.DATE_CREATED) {
        // Parse DD/MM/YY format and add century
        const dateParts = helcimTx.DATE_CREATED.split('/');
        if (dateParts.length === 3) {
          const day = dateParts[0].padStart(2, '0');
          const month = dateParts[1].padStart(2, '0');
          let year = dateParts[2];
          // Add century - assuming 20xx for years 00-50, 19xx for 51-99
          if (year.length === 2) {
            year = parseInt(year) <= 50 ? '20' + year : '19' + year;
          }
          const dateStr = `${year}-${month}-${day}`;
          txDate = new Date(dateStr);
        }
      }

      // First check if a payment already has this Helcim ID
      const existingWithHelcimId = await storage.getPaymentByHelcimId(String(txId));
      if (existingWithHelcimId) {
        alreadyLinked++;
        console.log(`✓ Payment ${existingWithHelcimId.id} already has Helcim ID ${txId}`);
        continue;
      }

      // Try to match with completed payments that don't have Helcim IDs
      let matchedPayment = null;
      
      if (txDate && amount > 0) {
        // Find payments on the same date with the same amount
        matchedPayment = completedWithoutHelcimId.find(p => {
          if (!p.createdAt) return false;
          
          const paymentDate = new Date(p.createdAt);
          const sameDay = format(paymentDate, 'yyyy-MM-dd') === format(txDate, 'yyyy-MM-dd');
          
          // Check if total amounts match (with small tolerance for rounding)
          const amountMatch = Math.abs((p.totalAmount || 0) - totalAmount) < 0.02;
          
          return sameDay && amountMatch;
        });

        // If no exact match, try matching base amount without tip
        if (!matchedPayment && tipAmount > 0) {
          const baseAmount = amount - tipAmount;
          matchedPayment = completedWithoutHelcimId.find(p => {
            if (!p.createdAt) return false;
            
            const paymentDate = new Date(p.createdAt);
            const sameDay = format(paymentDate, 'yyyy-MM-dd') === format(txDate, 'yyyy-MM-dd');
            
            // Check if base amount matches (payment might not have tip recorded)
            const baseMatch = Math.abs((p.amount || p.totalAmount || 0) - baseAmount) < 0.02;
            
            return sameDay && baseMatch;
          });
        }
      }

      // If no match by date/amount, try to match by customer name if available
      if (!matchedPayment && helcimTx.CUSTOMER_NAME && txDate) {
        const customerName = helcimTx.CUSTOMER_NAME.toLowerCase().trim();
        
        // Look for payments on the same date
        const sameDatePayments = completedWithoutHelcimId.filter(p => {
          if (!p.createdAt) return false;
          const paymentDate = new Date(p.createdAt);
          return format(paymentDate, 'yyyy-MM-dd') === format(txDate, 'yyyy-MM-dd');
        });

        for (const payment of sameDatePayments) {
          try {
            // Get client info for this payment
            const client = await storage.getClientById(payment.clientId);
            if (client) {
              const clientFullName = `${client.firstName} ${client.lastName}`.toLowerCase().trim();
              const clientNameMatch = clientFullName === customerName || 
                                     client.firstName?.toLowerCase() === customerName ||
                                     client.lastName?.toLowerCase() === customerName;
              
              // Match by name and approximate amount
              if (clientNameMatch && Math.abs((payment.totalAmount || 0) - totalAmount) < 5) { // Allow $5 difference
                matchedPayment = payment;
                break;
              }
            }
          } catch (clientError) {
            // Skip if can't get client info
          }
        }
      }

      if (matchedPayment) {
        // Update the matched payment with Helcim ID
        await storage.updatePayment(matchedPayment.id, {
          helcimPaymentId: String(txId),
          tipAmount: tipAmount || matchedPayment.tipAmount,
          notes: `Linked to Helcim transaction via CSV import. Approval: ${helcimTx.APPROVAL_CODE}`
        });
        
        // Remove from the pool of unmatched payments
        const index = completedWithoutHelcimId.indexOf(matchedPayment);
        if (index > -1) {
          completedWithoutHelcimId.splice(index, 1);
        }
        
        matched++;
        console.log(`✅ Linked payment ${matchedPayment.id} to Helcim ${txId} ($${totalAmount}, Date: ${txDate ? format(txDate, 'MM/dd/yyyy') : 'N/A'})`);
      } else {
        notFound++;
        unmatchedTransactions.push({
          txId,
          amount: totalAmount,
          tipAmount,
          date: txDate ? format(txDate, 'MM/dd/yyyy') : helcimTx.DATE_CREATED,
          customer: helcimTx.CUSTOMER_NAME || 'No customer name',
          user: helcimTx.USER,
          type: txId.startsWith('POS-') ? 'POS' : txId.startsWith('INV') ? 'Invoice' : 'Other'
        });
      }
      
    } catch (error) {
      console.error(`❌ Error processing transaction ${helcimTx.ORDER_NUMBER}:`, error.message);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Successfully linked: ${matched} payments to Helcim transactions`);
  console.log(`✓ Already linked: ${alreadyLinked} payments`);
  console.log(`❓ Could not match: ${notFound} transactions`);
  
  if (notFound > 0) {
    console.log('\n💡 Unmatched transactions breakdown:');
    const byType = {
      POS: unmatchedTransactions.filter(t => t.type === 'POS'),
      Invoice: unmatchedTransactions.filter(t => t.type === 'Invoice'),
      Other: unmatchedTransactions.filter(t => t.type === 'Other')
    };
    
    console.log(`   POS transactions: ${byType.POS.length}`);
    console.log(`   Invoice transactions: ${byType.Invoice.length}`);
    console.log(`   Other transactions: ${byType.Other.length}`);
    
    console.log('\n📝 Sample unmatched transactions (first 10):');
    unmatchedTransactions.slice(0, 10).forEach(tx => {
      console.log(`   - ${tx.txId}: $${tx.amount} (tip: $${tx.tipAmount}) on ${tx.date}`);
      console.log(`     Customer: ${tx.customer}, User: ${tx.user}`);
    });
    
    console.log('\n💡 These might be:');
    console.log('   1. POS sales that weren\'t linked to appointments');
    console.log('   2. Transactions processed outside the normal booking flow');
    console.log('   3. Test transactions');
    console.log('   4. Refunds or voided transactions');
  }

  // Show remaining unlinked payments in the database
  const stillUnlinked = await storage.getAllPayments().then(payments => 
    payments.filter(p => p.status === 'completed' && !p.helcimPaymentId)
  );
  
  if (stillUnlinked.length > 0) {
    console.log(`\n⚠️  Still have ${stillUnlinked.length} completed payments without Helcim IDs in the database`);
  }

  process.exit(0);
}

// Run the script
fixHelcimTransactions().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});










