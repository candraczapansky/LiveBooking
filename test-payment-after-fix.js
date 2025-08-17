import fetch from 'node-fetch';

async function testPaymentAfterFix() {
  console.log('🔧 Testing Payment Processing After Spelling Fix');
  console.log('===============================================\n');

  const paymentData = {
    amount: 25.00,
    tipAmount: 0,
    cardData: {
      cardNumber: "4111111111111111",
      cardExpiryMonth: "12",
      cardExpiryYear: "25",
      cardCVV: "123"
    },
    type: "appointment_payment",
    description: "Test payment after spelling fix"
  };

  try {
    console.log('💳 Sending payment request...');
    const response = await fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });
    
    const responseText = await response.text();
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Response:', responseText);
    
    if (response.ok) {
      try {
        const responseData = JSON.parse(responseText);
        console.log('\n✅ Payment successful!');
        console.log('Payment ID:', responseData.paymentId);
        console.log('Payment Status:', responseData.payment?.status);
        
        if (responseData.paymentId && !responseData.paymentId.startsWith('card_')) {
          console.log('🎉 Real Helcim payment processed!');
        } else {
          console.log('⚠️  Still using fallback/mock payment');
        }
      } catch (e) {
        console.log('✅ Payment successful (raw):', responseText);
      }
    } else {
      console.log('❌ Payment failed');
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  console.log('\n🎯 NEXT STEPS:');
  console.log('==============');
  console.log('1. If you see a real payment ID (not starting with "card_"), the fix worked!');
  console.log('2. If you still see "card_" payment IDs, the environment variables might not be loaded');
  console.log('3. Check the server logs for any Helcim API calls');
}

testPaymentAfterFix().catch(console.error); 