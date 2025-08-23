// Direct Helcim API Test
// This test bypasses our server to test the Helcim API directly

async function testHelcimDirectly() {
  console.error('🔧 Testing Helcim API Directly');
  console.error('==============================\n');

  // Test with the correct API token
  const apiToken = 'a7Cms-m0D4K88wr1MXFe6YkvfpTrn8Qra3TtXml9MZ8kLj5Ehf0FG3AsQ';
  const apiUrl = 'https://api.helcim.com/v1';

  console.error('📋 Configuration:');
  console.error('- API URL:', apiUrl);
  console.error('- API Token:', '****' + apiToken.slice(-4));

  // Test payment data
  const paymentData = {
    amount: 25.00,
    currency: 'USD',
    test: true, // Enable test mode
    paymentMethod: {
      paymentType: 'cc',
      creditCard: {
        cardHolderName: 'Test User',
        cardNumber: '5454545454545454', // Test Mastercard
        expiryMonth: '12',
        expiryYear: '25',
        cardCvv: '123'
      }
    },
    transactionDetails: {
      description: 'Direct Helcim API test payment',
      idempotencyKey: `direct_test_${Date.now()}`
    }
  };

  console.error('\n💳 Payment Data:');
  console.error(JSON.stringify(paymentData, null, 2));

  try {
    console.error('\n📤 Making direct API call to Helcim...');
    
    const response = await fetch(`${apiUrl}/payment/purchase`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Helcim-Client': 'Direct Test v1'
      },
      body: JSON.stringify(paymentData)
    });

    console.error('\n📥 Response received:');
    console.error('- Status:', response.status, response.statusText);
    console.error('- Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

    const responseText = await response.text();
    console.error('- Raw Body:', responseText);

    if (response.ok) {
      try {
        const responseData = JSON.parse(responseText);
        console.error('\n✅ Parsed Response:');
        console.error(JSON.stringify(responseData, null, 2));

        if (responseData.transactionId) {
          console.error('\n🎉 SUCCESS: Real transaction processed!');
          console.error('Transaction ID:', responseData.transactionId);
          console.error('Status:', responseData.responseMessage);
        } else {
          console.error('\n⚠️ Response received but no transaction ID found');
        }
      } catch (e) {
        console.error('\n⚠️ Could not parse JSON response');
      }
    } else {
      console.error('\n❌ API call failed');
      
      // Try to parse error response
      try {
        const errorData = JSON.parse(responseText);
        console.error('Error details:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.error('Raw error:', responseText);
      }
    }

  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
    console.error('Stack:', error.stack);
  }

  console.error('\n📋 Next Steps:');
  console.error('1. Check if transaction appears in Helcim dashboard');
  console.error('2. Verify API token permissions');
  console.error('3. Test with different card numbers if needed');
}

testHelcimDirectly().catch(console.error);

