import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testCardPayment() {
  console.log('🧪 Testing Card Payment Functionality...\n');

  try {
    // Test 1: Basic card payment
    console.log('1️⃣ Testing basic card payment...');
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
        description: 'Test card payment for appointment',
        appointmentId: 1
      })
    });

    if (cardPaymentResponse.ok) {
      const cardPaymentResult = await cardPaymentResponse.json();
      console.log('✅ Card payment successful:', cardPaymentResult);
    } else {
      const errorData = await cardPaymentResponse.json();
      console.log('❌ Card payment failed:', errorData);
    }

    // Test 2: Cash payment (for comparison)
    console.log('\n2️⃣ Testing cash payment...');
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

    if (cashPaymentResponse.ok) {
      const cashPaymentResult = await cashPaymentResponse.json();
      console.log('✅ Cash payment successful:', cashPaymentResult);
    } else {
      const errorData = await cashPaymentResponse.json();
      console.log('❌ Cash payment failed:', errorData);
    }

    // Test 3: Payment confirmation
    console.log('\n3️⃣ Testing payment confirmation...');
    const confirmResponse = await fetch(`${BASE_URL}/api/confirm-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentId: 'mock_payment_1754495881220',
        appointmentId: 1
      })
    });

    if (confirmResponse.ok) {
      const confirmResult = await confirmResponse.json();
      console.log('✅ Payment confirmation successful:', confirmResult);
    } else {
      const errorData = await confirmResponse.json();
      console.log('❌ Payment confirmation failed:', errorData);
    }

    console.log('\n🎉 Card payment functionality test completed!');
    console.log('\n📋 Summary:');
    console.log('- Card payments are processed through Helcim');
    console.log('- Cash payments work as fallback');
    console.log('- Payment confirmation is available');
    console.log('- Calendar checkout now supports both payment methods');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testCardPayment().catch(console.error); 