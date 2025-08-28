#!/usr/bin/env node

/**
 * Test payment status checking
 */

async function checkPaymentStatus() {
  const paymentId = 'POS-1756341646413';
  const locationId = '4';
  
  console.log('🔍 Checking payment status...');
  console.log('Payment ID:', paymentId);
  console.log('Location ID:', locationId);
  
  try {
    const response = await fetch(`http://localhost:5000/api/terminal/payment/${locationId}/${paymentId}`);
    const data = await response.json();
    
    console.log('\n📊 Payment Status Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n✅ Payment COMPLETED!');
      console.log('Transaction ID:', data.transactionId);
      console.log('Last 4 digits:', data.last4);
    } else if (data.status === 'pending') {
      console.log('\n⏳ Payment is still pending');
    } else {
      console.log('\n❌ Payment failed or unknown');
    }
  } catch (error) {
    console.error('\n❌ Error checking status:', error.message);
  }
}

checkPaymentStatus();
