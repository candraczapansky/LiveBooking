import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';
import Papa from 'papaparse';
import fs from 'fs';
import { format, parse } from 'date-fns';

async function importHelcimToSalesHistory() {
  const storage = new DatabaseStorage();
  
  // Get CSV file path from command line argument
  const csvFilePath = process.argv[2] || 'data/helcim-transactions.csv';
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }

  console.log(`📄 Reading CSV file: ${csvFilePath}`);
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');

  // Parse CSV - your data is tab-separated
  const parseResult = Papa.parse(csvContent, {
    header: true,
    delimiter: '\t',
    skipEmptyLines: true,
  });

  if (parseResult.errors.length > 0) {
    console.warn('⚠️ CSV parsing warnings:', parseResult.errors);
  }

  const transactions = parseResult.data;
  console.log(`✅ Found ${transactions.length} transactions in CSV`);

  // Get existing sales history to avoid duplicates
  const existingSalesHistory = await storage.getAllSalesHistory();
  const existingHelcimIds = new Set(
    existingSalesHistory
      .filter(sh => sh.helcimPaymentId)
      .map(sh => sh.helcimPaymentId)
  );
  
  console.log(`📊 Existing sales history records: ${existingSalesHistory.length}`);
  console.log(`   With Helcim IDs: ${existingHelcimIds.size}`);

  let imported = 0;
  let skipped = 0;
  let updated = 0;
  let errors = 0;

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

      // Check if already exists in sales history
      if (existingHelcimIds.has(txId)) {
        skipped++;
        console.log(`✓ Already in sales history: ${txId}`);
        continue;
      }

      // Parse amount (remove $ sign and convert to number)
      const amount = parseFloat(String(helcimTx.AMOUNT || 0).replace(/[^0-9.-]/g, ''));
      const tipAmount = parseFloat(String(helcimTx.AMOUNT_TIP || 0).replace(/[^0-9.-]/g, ''));
      const totalAmount = amount; // In Helcim, AMOUNT is already the total

      // Parse date (DD/MM/YY format)
      let txDate = new Date();
      if (helcimTx.DATE_CREATED) {
        const dateParts = helcimTx.DATE_CREATED.split('/');
        if (dateParts.length === 3) {
          const day = dateParts[0].padStart(2, '0');
          const month = dateParts[1].padStart(2, '0');
          let year = dateParts[2];
          // Add century
          if (year.length === 2) {
            year = parseInt(year) <= 50 ? '20' + year : '19' + year;
          }
          const dateStr = `${year}-${month}-${day}`;
          txDate = new Date(dateStr);
        }
      }

      // Determine transaction type
      let transactionType = 'pos_sale'; // Default for unmatched
      let clientName = helcimTx.CUSTOMER_NAME || 'Unknown Customer';
      let paymentMethod = 'card'; // All Helcim transactions are card payments
      let staffName = helcimTx.USER || 'Unknown Staff';
      let notes = '';

      // Check if this is matched to a payment in the system
      const matchedPayment = await storage.getPaymentByHelcimId(txId);
      
      if (matchedPayment) {
        // This transaction is matched to a payment
        if (matchedPayment.appointmentId) {
          transactionType = 'appointment';
          
          // Try to get appointment details
          try {
            const appointment = await storage.getAppointment(matchedPayment.appointmentId);
            if (appointment) {
              // Get client info
              if (appointment.clientId) {
                const client = await storage.getUserById(appointment.clientId);
                if (client) {
                  clientName = `${client.firstName} ${client.lastName}`.trim() || clientName;
                }
              }
              
              // Get service info
              if (appointment.serviceId) {
                const service = await storage.getService(appointment.serviceId);
                if (service) {
                  notes = `Service: ${service.name}`;
                }
              }
              
              // Get staff info
              if (appointment.staffId) {
                const staff = await storage.getStaff(appointment.staffId);
                if (staff) {
                  staffName = `${staff.firstName} ${staff.lastName}`.trim() || staffName;
                }
              }
            }
          } catch (err) {
            console.warn(`Could not get appointment details for ${matchedPayment.appointmentId}:`, err.message);
          }
        }
      } else {
        // Unmatched transaction - mark it appropriately
        if (txId.startsWith('POS-')) {
          transactionType = 'pos_sale';
          notes = 'Helcim POS transaction (unmatched)';
        } else if (txId.startsWith('INV')) {
          transactionType = 'invoice';
          notes = 'Helcim invoice payment (unmatched)';
        } else if (txId.startsWith('APT-')) {
          transactionType = 'appointment';
          notes = 'Helcim appointment test transaction';
        } else {
          transactionType = 'unknown';
          notes = 'Helcim transaction (type unknown)';
        }
      }

      // Format business date and other time-based fields
      const businessDate = format(txDate, 'yyyy-MM-dd');
      const dayOfWeek = format(txDate, 'EEEE');
      const monthYear = format(txDate, 'yyyy-MM');
      const quarter = `${format(txDate, 'yyyy')}-Q${Math.ceil((txDate.getMonth() + 1) / 3)}`;

      // Create sales history record
      const salesHistoryData = {
        transactionType,
        transactionDate: txDate,
        paymentId: matchedPayment?.id || null,
        totalAmount,
        paymentMethod,
        paymentStatus: 'completed',
        
        // Customer info
        clientId: matchedPayment?.clientId || null,
        clientName,
        clientEmail: null,
        clientPhone: null,
        
        // Staff info
        staffId: matchedPayment?.appointmentId ? null : null, // Would need to get from appointment
        staffName,
        
        // Appointment data (if matched)
        appointmentId: matchedPayment?.appointmentId || null,
        serviceIds: null,
        serviceNames: null,
        serviceTotalAmount: matchedPayment?.appointmentId ? (totalAmount - tipAmount) : null,
        
        // POS data (for unmatched POS transactions)
        productIds: null,
        productNames: transactionType === 'pos_sale' ? JSON.stringify(['Unknown Product']) : null,
        productQuantities: null,
        productUnitPrices: null,
        productTotalAmount: transactionType === 'pos_sale' ? (totalAmount - tipAmount) : null,
        
        // Membership data
        membershipId: null,
        membershipName: null,
        membershipDuration: null,
        
        // Tax and fees
        taxAmount: 0,
        tipAmount: tipAmount || 0,
        discountAmount: 0,
        
        // Business insights
        businessDate,
        dayOfWeek,
        monthYear,
        quarter,
        
        // External tracking
        helcimPaymentId: txId,
        
        // Audit
        createdBy: null,
        notes: `${notes} | Approval: ${helcimTx.APPROVAL_CODE} | Card: ${helcimTx.CARD}`,
      };

      // Check if we need to update an existing sales history record
      const existingRecord = existingSalesHistory.find(sh => 
        sh.paymentId === matchedPayment?.id && 
        !sh.helcimPaymentId
      );

      if (existingRecord) {
        // Update existing record with Helcim ID
        await storage.updateSalesHistory(existingRecord.id, {
          helcimPaymentId: txId,
          tipAmount: tipAmount || existingRecord.tipAmount,
          notes: existingRecord.notes ? 
            `${existingRecord.notes} | Linked to Helcim: ${txId}` : 
            `Linked to Helcim: ${txId} | Approval: ${helcimTx.APPROVAL_CODE}`
        });
        updated++;
        console.log(`📝 Updated existing sales history record ${existingRecord.id} with Helcim ID ${txId}`);
      } else {
        // Create new sales history record
        await storage.createSalesHistory(salesHistoryData);
        imported++;
        console.log(`✅ Imported ${transactionType} transaction ${txId}: $${totalAmount} on ${businessDate} (${clientName})`);
      }
      
    } catch (error) {
      errors++;
      console.error(`❌ Error processing transaction ${helcimTx.ORDER_NUMBER}:`, error.message);
    }
  }

  console.log('\n📊 Import Summary:');
  console.log(`✅ Successfully imported: ${imported} new sales history records`);
  console.log(`📝 Updated existing: ${updated} sales history records`);
  console.log(`✓ Already existed: ${skipped} transactions`);
  console.log(`❌ Errors: ${errors} transactions`);
  
  console.log('\n💡 Next Steps:');
  console.log('1. Go to the Reports page in your app');
  console.log('2. Select "Sales Report" to view all transactions');
  console.log('3. Unmatched transactions will appear with descriptive notes');
  console.log('4. You can filter by date range to focus on specific periods');
  console.log('5. Transaction types show as: appointment, pos_sale, invoice, or unknown');

  process.exit(0);
}

// Run the script
importHelcimToSalesHistory().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
