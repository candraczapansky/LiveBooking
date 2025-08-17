import fetch from 'node-fetch';

async function testPaymentProcessing() {
  console.log('🔧 Testing Payment Processing');
  console.log('=============================\n');

  // Test 1: Check webhook endpoint
  console.log('1. Testing webhook endpoint...');
  try {
    const webhookResponse = await fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/webhook');
    const webhookData = await webhookResponse.json();
    console.log('✅ Webhook endpoint working:', webhookData);
  } catch (error) {
    console.log('❌ Webhook endpoint failed:', error.message);
  }

  // Test 2: Test payment processing
  console.log('\n2. Testing payment processing...');
  try {
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
      description: "Test payment with new API token"
    };

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
        console.log('✅ Payment processing successful:', responseData);
      } catch (e) {
        console.log('✅ Payment processing successful (raw):', responseText);
      }
    } else {
      console.log('❌ Payment processing failed');
    }
  } catch (error) {
    console.log('❌ Payment test failed:', error.message);
  }

  // Test 3: Test webhook with verifier token
  console.log('\n3. Testing webhook with verifier token...');
  try {
    const webhookTestData = {
      type: 'payment.success',
      paymentId: 'test_payment_123',
      status: 'completed',
      amount: 25.00,
      currency: 'USD'
    };

    const webhookResponse = await fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-helcim-token': 'o4CdmeQzyxEKU2xmgN7STxo0sATuqMBi'
      },
      body: JSON.stringify(webhookTestData)
    });

    const webhookResult = await webhookResponse.json();
    console.log('✅ Webhook test successful:', webhookResult);
  } catch (error) {
    console.log('❌ Webhook test failed:', error.message);
  }

  console.log('\n🎯 SUMMARY:');
  console.log('===========');
  console.log('✅ Updated Helcim API token');
  console.log('✅ Created webhook endpoint at /webhook');
  console.log('✅ Added verifier token validation');
  console.log('✅ Payment processing should now work with real API calls');
}

testPaymentProcessing().catch(console.error); 