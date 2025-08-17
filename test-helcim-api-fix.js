import fetch from 'node-fetch';

async function testHelcimApiFix() {
  console.log('🔧 Testing Helcim API Fix');
  console.log('==========================\n');

  // Test payment processing with real card data
  console.log('💳 Testing Payment Processing with Fixed API:');
  
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
    description: "Test payment with corrected Helcim API"
  };

  console.log('📝 Payment request data:', JSON.stringify(paymentData, null, 2));
  
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
        console.log('✅ Success Response:', JSON.stringify(responseData, null, 2));
        
        // Check if it's a real payment or mock
        if (responseData.payment && responseData.payment.id) {
          if (responseData.payment.id.startsWith('mock_') || responseData.payment.id.startsWith('card_')) {
            console.log('⚠️  WARNING: Still using mock response');
            console.log('🔧 Check server logs for Helcim API calls');
          } else {
            console.log('✅ SUCCESS: Real payment processed through Helcim API');
            console.log('🎯 Payment ID:', responseData.paymentId);
          }
        }
      } catch (e) {
        console.log('✅ Success Response (raw):', responseText);
      }
    } else {
      console.log('❌ Error Response:', responseText);
      
      // Check if it's a 404 error (API endpoint issue)
      if (response.status === 404) {
        console.log('🔧 This indicates an API endpoint issue - check Helcim API documentation');
      }
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  console.log('\n🎯 API FIXES APPLIED:');
  console.log('======================');
  console.log('✅ Changed API URL from v2 to v1');
  console.log('✅ Changed endpoint from /payments to /transactions');
  console.log('✅ Updated Authorization header format');
  console.log('✅ Added required type field for Helcim API');
  console.log('✅ Payment processing should now work with correct API calls');
}

testHelcimApiFix().catch(console.error); 