import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';

async function checkPayments() {
  const storage = new DatabaseStorage();
  
  try {
    // Get all payments from the database
    const allPayments = await storage.getAllPayments();
    const pendingPayments = allPayments.filter(p => p.status === 'pending');
    const completedPayments = allPayments.filter(p => p.status === 'completed');
    
    console.log(`📊 Database Payment Summary:`);
    console.log(`   Total payments: ${allPayments.length}`);
    console.log(`   Pending payments: ${pendingPayments.length}`);
    console.log(`   Completed payments: ${completedPayments.length}`);
    
    // Show some sample pending payments
    if (pendingPayments.length > 0) {
      console.log('\n📝 Sample pending payments (first 5):');
      pendingPayments.slice(0, 5).forEach(p => {
        console.log(`   - Payment ID ${p.id}: $${p.totalAmount} created on ${new Date(p.createdAt).toLocaleDateString()}`);
        if (p.helcimPaymentId) {
          console.log(`     Has Helcim ID: ${p.helcimPaymentId}`);
        }
      });
    }
    
    // Check for payments with Helcim IDs
    const paymentsWithHelcimIds = allPayments.filter(p => p.helcimPaymentId);
    console.log(`\n   Payments with Helcim IDs: ${paymentsWithHelcimIds.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkPayments();










