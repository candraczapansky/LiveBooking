const axios = require('axios');

async function testServerEnvironment() {
  try {
    console.log('🔍 Testing server environment variables...');
    
    // Test if server is running
    const healthResponse = await axios.get('http://localhost:5000/api/health');
    console.log('✅ Server is running');
    
    // Test payment endpoint to see if it's using real Helcim
    const paymentResponse = await axios.post('http://localhost:5000/api/create-payment', {
      amount: 10,
      cardData: {
        cardNumber: '4111111111111111',
        cardExpiryMonth: '12',
        cardExpiryYear: '2025',
        cardCVV: '123'
      },
      clientId: 1,
      type: 'test_payment',
      description: 'Environment Test'
    });
    
    console.log('📊 Payment Response:');
    console.log(JSON.stringify(paymentResponse.data, null, 2));
    
    // Check if response contains squarePayment (mock) or helcimPayment (real)
    if (paymentResponse.data.squarePayment) {
      console.log('❌ Server is using MOCK responses (squarePayment found)');
      console.log('🔍 This means HELCIM_API_TOKEN is not being loaded by the server process');
    } else if (paymentResponse.data.helcimPayment) {
      console.log('✅ Server is using REAL Helcim API (helcimPayment found)');
    } else {
      console.log('⚠️  Unexpected response format');
    }
    
  } catch (error) {
    console.error('❌ Error testing server:', error.message);
  }
}

testServerEnvironment(); 