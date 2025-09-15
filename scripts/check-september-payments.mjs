import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';
import { format } from 'date-fns';

async function checkSeptemberPayments() {
  const storage = new DatabaseStorage();
  
  try {
    const allPayments = await storage.getAllPayments();
    
    // Filter for September 2025 payments
    const septemberPayments = allPayments.filter(p => {
      const paymentDate = new Date(p.createdAt);
      return paymentDate.getMonth() === 8 && paymentDate.getFullYear() === 2025; // Month is 0-indexed
    });
    
    console.log(`\n📊 September 2025 Payments Analysis:\n`);
    console.log(`Total September payments: ${septemberPayments.length}`);
    
    const pending = septemberPayments.filter(p => p.status === 'pending');
    const completed = septemberPayments.filter(p => p.status === 'completed');
    const withHelcimId = septemberPayments.filter(p => p.helcimPaymentId);
    const withoutHelcimId = completed.filter(p => !p.helcimPaymentId);
    
    console.log(`   Pending: ${pending.length}`);
    console.log(`   Completed: ${completed.length}`);
    console.log(`   With Helcim ID: ${withHelcimId.length}`);
    console.log(`   Completed WITHOUT Helcim ID: ${withoutHelcimId.length}`);
    
    if (withoutHelcimId.length > 0) {
      console.log(`\n⚠️  Found ${withoutHelcimId.length} completed payments without Helcim IDs (might need updating):`);
      withoutHelcimId.slice(0, 20).forEach(p => {
        const date = format(new Date(p.createdAt), 'MM/dd/yyyy');
        console.log(`   Payment ${p.id}: $${p.totalAmount} on ${date} (Type: ${p.type || 'appointment'})`);
      });
    }
    
    // Check amounts in September
    if (septemberPayments.length > 0) {
      console.log('\n💰 September payment amounts:');
      const amounts = {};
      septemberPayments.forEach(p => {
        const amount = p.totalAmount.toFixed(2);
        amounts[amount] = (amounts[amount] || 0) + 1;
      });
      
      Object.entries(amounts)
        .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
        .slice(0, 20)
        .forEach(([amount, count]) => {
          console.log(`   $${amount}: ${count} payment(s)`);
        });
    }
    
    // Check if ANY payments exist from the CSV date range
    const csvDates = ['2025-09-02', '2025-09-03', '2025-09-04', '2025-09-05', '2025-09-06', 
                      '2025-09-07', '2025-09-08', '2025-09-09', '2025-09-10', '2025-09-11',
                      '2025-09-12', '2025-09-13', '2025-09-14'];
    
    console.log('\n📅 Payments by specific dates from CSV:');
    csvDates.forEach(dateStr => {
      const dayPayments = allPayments.filter(p => {
        return format(new Date(p.createdAt), 'yyyy-MM-dd') === dateStr;
      });
      if (dayPayments.length > 0) {
        console.log(`   ${dateStr}: ${dayPayments.length} payments (Pending: ${dayPayments.filter(p => p.status === 'pending').length}, Completed: ${dayPayments.filter(p => p.status === 'completed').length})`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkSeptemberPayments();










