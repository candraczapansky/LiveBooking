import axios from 'axios';

async function testServerDebug() {
  try {
    console.log('🔍 Testing server debug output...\n');

    // Test 1: Check if server is responding
    console.log('1. Testing server response...');
    const response = await axios.get('http://localhost:5000/api/services');
    console.log('✅ Server is responding');
    console.log('');

    // Test 2: Test payment endpoint to trigger HelcimService constructor
    console.log('2. Testing payment endpoint to trigger HelcimService...');
    const paymentData = {
      amount: 25.00,
      cardData: {
        cardNumber: '4111111111111111',
        expiry: '12/25',
        cvv: '123'
      },
      clientId: 1,
      type: 'test',
      description: 'Debug test'
    };

    const paymentResponse = await axios.post('http://localhost:5000/api/create-payment', paymentData);
    console.log('✅ Payment endpoint responded');
    console.log('Response status:', paymentResponse.status);
    console.log('');

    console.log('3. Check server logs for HelcimService debug output...');
    console.log('Look for lines starting with "🔍 HelcimService constructor debug:"');
    console.log('If you see "✅ Helcim API token found", the environment variables are working');
    console.log('If you see "Helcim API token not found", the environment variables are not set');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testServerDebug(); 