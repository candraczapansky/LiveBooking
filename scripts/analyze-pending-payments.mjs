import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';
import { format } from 'date-fns';

async function analyzePendingPayments() {
  const storage = new DatabaseStorage();
  
  try {
    // Get all payments from the database
    const allPayments = await storage.getAllPayments();
    const pendingPayments = allPayments.filter(p => p.status === 'pending');
    
    console.log(`📊 Analyzing ${pendingPayments.length} pending payments:\n`);
    
    // Group by amount ranges
    const amountGroups = {
      small: pendingPayments.filter(p => p.totalAmount < 10),
      medium: pendingPayments.filter(p => p.totalAmount >= 10 && p.totalAmount < 50),
      large: pendingPayments.filter(p => p.totalAmount >= 50 && p.totalAmount < 100),
      xlarge: pendingPayments.filter(p => p.totalAmount >= 100)
    };
    
    console.log('💰 By Amount:');
    console.log(`   < $10: ${amountGroups.small.length} payments`);
    console.log(`   $10-50: ${amountGroups.medium.length} payments`);
    console.log(`   $50-100: ${amountGroups.large.length} payments`);
    console.log(`   > $100: ${amountGroups.xlarge.length} payments`);
    
    // Group by date
    const dateGroups = {};
    pendingPayments.forEach(p => {
      const date = format(new Date(p.createdAt), 'yyyy-MM-dd');
      dateGroups[date] = (dateGroups[date] || 0) + 1;
    });
    
    console.log('\n📅 By Date:');
    const sortedDates = Object.keys(dateGroups).sort();
    sortedDates.slice(-10).forEach(date => {
      console.log(`   ${date}: ${dateGroups[date]} payments`);
    });
    
    // Show some actual pending payments with meaningful amounts
    const meaningfulPending = pendingPayments.filter(p => p.totalAmount > 10);
    if (meaningfulPending.length > 0) {
      console.log('\n💳 Pending payments > $10:');
      meaningfulPending.slice(0, 20).forEach(p => {
        const date = format(new Date(p.createdAt), 'MM/dd/yyyy');
        const client = p.clientId;
        console.log(`   Payment ${p.id}: $${p.totalAmount} on ${date} (Client ID: ${client}, Type: ${p.type || 'appointment'})`);
        if (p.appointmentId) {
          console.log(`     Appointment ID: ${p.appointmentId}`);
        }
        if (p.description) {
          console.log(`     Description: ${p.description}`);
        }
      });
    }
    
    // Check for any payments with partial Helcim data
    const withHelcimId = pendingPayments.filter(p => p.helcimPaymentId);
    if (withHelcimId.length > 0) {
      console.log(`\n🔍 Pending payments with Helcim IDs (but still pending):`);
      withHelcimId.forEach(p => {
        console.log(`   Payment ${p.id}: $${p.totalAmount} - Helcim ID: ${p.helcimPaymentId}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

analyzePendingPayments();










