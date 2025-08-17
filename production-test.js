// Production Payment Test
console.log('🔥 PRODUCTION PAYMENT TEST');
console.log('========================');

// Force production environment
process.env.NODE_ENV = 'production';
process.env.HELCIM_API_TOKEN = 'a7Cms-m0D4K88wr1MXFe6YkvfpTrn8Qra3TtXml9MZ8kLj5Ehf0FG3AsQ';

console.log('Environment:', process.env.NODE_ENV);
console.log('API Token Set:', process.env.HELCIM_API_TOKEN ? 'YES' : 'NO');
console.log('Mode:', process.env.NODE_ENV === 'production' ? 'PRODUCTION (REAL PAYMENTS)' : 'TEST MODE');

// Test payment data with production flag
const paymentData = {
  amount: 1.00, // Small test amount
  currency: 'USD',
  cardData: {
    cardNumber: "4111111111111111", // Visa test card
    cardExpiryMonth: "12",
    cardExpiryYear: "25",
    cardCVV: "123",
    cardHolderName: "Test User"
  },
  description: "Production test payment - $1.00",
  type: "production_test"
};

console.log('\n💳 Payment Request:');
console.log(JSON.stringify(paymentData, null, 2));

fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/create-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(paymentData)
})
.then(response => {
  console.log('\n📥 Response Status:', response.status, response.statusText);
  return response.text();
})
.then(text => {
  console.log('\n📄 Response Body:');
  console.log(text);
  
  try {
    const data = JSON.parse(text);
    if (data.payment && data.payment.id) {
      if (data.payment.id.startsWith('mock_')) {
        console.log('\n⚠️ WARNING: Still getting mock response!');
        console.log('This means the payment is NOT processing in production mode.');
      } else {
        console.log('\n🎉 SUCCESS: Real production payment processed!');
        console.log('Payment ID:', data.payment.id);
        console.log('Check your Helcim dashboard for this transaction.');
      }
    }
  } catch (e) {
    console.log('Response is not JSON');
  }
})
.catch(error => {
  console.log('\n❌ Error:', error.message);
});

