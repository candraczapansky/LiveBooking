import fetch from 'node-fetch';

async function testHelcimConfig() {
  console.log('🔧 Testing Helcim Configuration');
  console.log('================================\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('- HELCIM_API_TOKEN:', process.env.HELCIM_API_TOKEN ? 'SET' : 'NOT SET');
  console.log('- HELCIM_WEBHOOK_SECRET:', process.env.HELCIM_WEBHOOK_SECRET ? 'SET' : 'NOT SET');
  
  if (process.env.HELCIM_API_TOKEN) {
    console.log('- Token preview:', process.env.HELCIM_API_TOKEN.substring(0, 10) + '...');
  }

  // Test the payment endpoint
  console.log('\n💳 Testing Payment Endpoint:');
  
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
    description: "Test payment with current config"
  };

  try {
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
        console.log('✅ Payment successful:', responseData);
      } catch (e) {
        console.log('✅ Payment successful (raw):', responseText);
      }
    } else {
      console.log('❌ Payment failed');
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  // Test webhook endpoint
  console.log('\n🔔 Testing Webhook Endpoint:');
  try {
    const webhookResponse = await fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/webhook');
    const webhookData = await webhookResponse.json();
    console.log('✅ Webhook endpoint working:', webhookData);
  } catch (error) {
    console.log('❌ Webhook endpoint failed:', error.message);
  }

  console.log('\n🎯 NEXT STEPS:');
  console.log('==============');
  console.log('1. Add HELCIM_API_TOKEN to your Replit secrets');
  console.log('2. Add HELCIM_WEBHOOK_SECRET to your Replit secrets');
  console.log('3. Restart the server after adding secrets');
  console.log('4. Test payment processing again');
}

testHelcimConfig().catch(console.error); 