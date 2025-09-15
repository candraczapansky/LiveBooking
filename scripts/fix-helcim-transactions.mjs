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
    console.log('Usage: node scripts/fix-helcim-transactions.mjs <path-to-csv>');
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
  const pendingPayments = allPayments.filter(p => p.status === 'pending');
  
  console.log(`📊 Found ${pendingPayments.length} pending payments in database`);
  console.log(`📊 Total payments in database: ${allPayments.length}`);

  let matched = 0;
  let notFound = 0;
  let alreadyCompleted = 0;
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

      // Skip APT- prefixed transactions (these are special appointment transactions)
      if (txId.startsWith('APT-')) {
        console.log(`⚠️ Skipping APT transaction (likely test/special): ${txId}`);
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

      // First check if payment already exists with this Helcim ID
      const existingWithHelcimId = await storage.getPaymentByHelcimId(String(txId));
      if (existingWithHelcimId) {
        if (existingWithHelcimId.status === 'completed') {
          alreadyCompleted++;
          console.log(`✓ Payment ${existingWithHelcimId.id} already completed with Helcim ID ${txId}`);
        } else {
          // Update status to completed
          await storage.updatePayment(existingWithHelcimId.id, {
            status: 'completed',
            processedAt: txDate || new Date(),
            tipAmount: tipAmount || existingWithHelcimId.tipAmount,
            notes: `Updated from Helcim CSV import. Approval: ${helcimTx.APPROVAL_CODE}`
          });
          matched++;
          console.log(`✅ Updated payment ${existingWithHelcimId.id} to completed (had Helcim ID)`);
        }
        continue;
      }

      // Try to match by date and amount
      let matchedPayment = null;
      
      if (txDate && amount > 0) {
        // Find payments on the same date with similar amount (allow small difference for rounding)
        matchedPayment = pendingPayments.find(p => {
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
          matchedPayment = pendingPayments.find(p => {
            if (!p.createdAt) return false;
            
            const paymentDate = new Date(p.createdAt);
            const sameDay = format(paymentDate, 'yyyy-MM-dd') === format(txDate, 'yyyy-MM-dd');
            
            // Check if base amount matches
            const baseMatch = Math.abs((p.amount || 0) - baseAmount) < 0.02;
            
            return sameDay && baseMatch;
          });
        }
      }

      // If no match by date/amount, try to match by customer name
      if (!matchedPayment && helcimTx.CUSTOMER_NAME) {
        const customerName = helcimTx.CUSTOMER_NAME.toLowerCase().trim();
        
        for (const payment of pendingPayments) {
          try {
            // Get client info for this payment
            const client = await storage.getClientById(payment.clientId);
            if (client) {
              const clientFullName = `${client.firstName} ${client.lastName}`.toLowerCase().trim();
              const clientNameMatch = clientFullName === customerName || 
                                     client.firstName?.toLowerCase() === customerName ||
                                     client.lastName?.toLowerCase() === customerName;
              
              // Match by name and amount (within same day if date available)
              if (clientNameMatch && Math.abs((payment.totalAmount || 0) - totalAmount) < 0.02) {
                if (!txDate || (payment.createdAt && 
                    format(new Date(payment.createdAt), 'yyyy-MM-dd') === format(txDate, 'yyyy-MM-dd'))) {
                  matchedPayment = payment;
                  break;
                }
              }
            }
          } catch (clientError) {
            // Skip if can't get client info
            console.log(`⚠️ Could not get client info for payment ${payment.id}`);
          }
        }
      }

      if (matchedPayment) {
        // Update the matched payment
        await storage.updatePayment(matchedPayment.id, {
          status: 'completed',
          helcimPaymentId: String(txId),
          processedAt: txDate || new Date(),
          tipAmount: tipAmount || matchedPayment.tipAmount,
          totalAmount: totalAmount,
          notes: `Matched from Helcim CSV. Approval: ${helcimTx.APPROVAL_CODE}, User: ${helcimTx.USER}`
        });
        
        // If payment has an appointment, update it too
        if (matchedPayment.appointmentId) {
          try {
            await storage.updateAppointment(matchedPayment.appointmentId, {
              paymentStatus: 'paid',
              tipAmount: tipAmount || 0,
              totalAmount: totalAmount
            });
          } catch (aptError) {
            console.log(`⚠️ Could not update appointment ${matchedPayment.appointmentId}: ${aptError.message}`);
          }
        }
        
        matched++;
        console.log(`✅ Matched payment ${matchedPayment.id} to Helcim ${txId} ($${totalAmount}, Date: ${txDate ? format(txDate, 'MM/dd/yyyy') : 'N/A'})`);
      } else {
        notFound++;
        unmatchedTransactions.push({
          txId,
          amount: totalAmount,
          date: txDate ? format(txDate, 'MM/dd/yyyy') : helcimTx.DATE_CREATED,
          customer: helcimTx.CUSTOMER_NAME,
          user: helcimTx.USER
        });
        console.log(`❓ No match for ${txId} ($${totalAmount}, ${helcimTx.CUSTOMER_NAME || 'No name'}, ${txDate ? format(txDate, 'MM/dd/yyyy') : 'N/A'})`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing transaction ${helcimTx.ORDER_NUMBER}:`, error);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Successfully matched and updated: ${matched} payments`);
  console.log(`✓ Already completed: ${alreadyCompleted} payments`);
  console.log(`❓ Not found/couldn't match: ${notFound} transactions`);
  
  if (notFound > 0) {
    console.log('\n💡 Unmatched transactions might be:');
    console.log('   1. From a different date range than what\'s in the database');
    console.log('   2. Already completed transactions');
    console.log('   3. Test transactions or refunds');
    console.log('   4. Transactions that need manual matching');
    
    console.log('\n📝 First 20 unmatched transactions for review:');
    unmatchedTransactions.slice(0, 20).forEach(tx => {
      console.log(`   - ${tx.txId}: $${tx.amount} on ${tx.date} (${tx.customer || 'No customer'}) by ${tx.user}`);
    });
  }

  process.exit(0);
}

// Run the script
fixHelcimTransactions().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
