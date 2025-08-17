import axios from 'axios';

async function testEnvironmentDebug() {
  try {
    console.log('🔍 Testing environment variables in server...\n');

    // Test 1: Check if server is responding
    console.log('1. Testing server response...');
    const response = await axios.get('http://localhost:5000/api/services');
    console.log('✅ Server is responding');
    console.log('');

    // Test 2: Test payment endpoint to trigger HelcimService debug output
    console.log('2. Testing payment endpoint to see HelcimService debug output...');
    const paymentData = {
      amount: 25.00,
      cardData: {
        cardNumber: '4111111111111111',
        cardExpiryMonth: '12',
        cardExpiryYear: '2025',
        cardCVV: '123'
      },
      clientId: 1,
      type: 'test',
      description: 'Environment debug test'
    };

    const paymentResponse = await axios.post('http://localhost:5000/api/create-payment', paymentData);
    console.log('✅ Payment endpoint responded');
    console.log('Response contains squarePayment:', !!paymentResponse.data.squarePayment);
    console.log('Response contains helcimPayment:', !!paymentResponse.data.helcimPayment);
    console.log('');

    // Test 3: Check server logs for debug output
    console.log('3. Checking for HelcimService debug output...');
    console.log('Look for these lines in server logs:');
    console.log('- "🔍 HelcimService constructor debug:"');
    console.log('- "🔍 makeRequest debug:"');
    console.log('- "✅ Using real Helcim API"');
    console.log('- "Helcim API token not found"');
    console.log('');
    console.log('If you see "Helcim API token not found", the environment variables are not set');
    console.log('If you see "✅ Using real Helcim API", the environment variables are working');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testEnvironmentDebug(); 