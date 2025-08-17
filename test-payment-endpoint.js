import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testPaymentEndpoint() {
  console.log('🧪 Testing Payment Endpoint...\n');

  try {
    // Test 1: Simple cash payment
    console.log('1️⃣ Testing cash payment...');
    const cashPaymentResponse = await fetch(`${BASE_URL}/api/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 50.00,
        sourceId: 'cash',
        type: 'appointment_payment',
        description: 'Test cash payment',
        appointmentId: 1
      })
    });

    console.log('Cash payment status:', cashPaymentResponse.status);
    if (cashPaymentResponse.ok) {
      const cashPaymentResult = await cashPaymentResponse.json();
      console.log('✅ Cash payment successful:', cashPaymentResult);
    } else {
      const errorText = await cashPaymentResponse.text();
      console.log('❌ Cash payment failed:', errorText);
    }

    // Test 2: Card payment
    console.log('\n2️⃣ Testing card payment...');
    const cardPaymentResponse = await fetch(`${BASE_URL}/api/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 75.00,
        tipAmount: 10.00,
        totalAmount: 85.00,
        cardData: {
          cardNumber: '4111111111111111',
          cardExpiryMonth: '12',
          cardExpiryYear: '2025',
          cardCVV: '123'
        },
        type: 'appointment_payment',
        description: 'Test card payment',
        appointmentId: 1
      })
    });

    console.log('Card payment status:', cardPaymentResponse.status);
    if (cardPaymentResponse.ok) {
      const cardPaymentResult = await cardPaymentResponse.json();
      console.log('✅ Card payment successful:', cardPaymentResult);
    } else {
      const errorText = await cardPaymentResponse.text();
      console.log('❌ Card payment failed:', errorText);
    }

    console.log('\n🎉 Payment endpoint test completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

testPaymentEndpoint().catch(console.error); 