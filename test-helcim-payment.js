import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function testHelcimPayment() {
  try {
    console.log('🧪 Testing Helcim Payment Flow...\n');

    // Test 1: Check if server is running
    console.log('1. Testing server connection...');
    const servicesResponse = await axios.get(`${BASE_URL}/api/services`);
    console.log('✅ Server is running, services available:', servicesResponse.data.length);
    console.log('');

    // Test 2: Test payment creation with Helcim
    console.log('2. Testing payment creation with Helcim...');
    const paymentData = {
      amount: 25.00,
      cardData: {
        cardNumber: '4111111111111111',
        expiry: '12/25',
        cvv: '123'
      },
      clientId: 1,
      type: 'gift_certificate',
      description: 'Test gift certificate purchase'
    };

    const paymentResponse = await axios.post(`${BASE_URL}/api/create-payment`, paymentData);
    console.log('✅ Payment created successfully');
    console.log('Payment ID:', paymentResponse.data.paymentId);
    console.log('Payment Status:', paymentResponse.data.status);
    console.log('Payment Type:', paymentResponse.data.paymentType);
    console.log('');

    // Test 3: Test gift certificate purchase
    console.log('3. Testing gift certificate purchase...');
    const giftCardData = {
      amount: 25.00,
      paymentId: paymentResponse.data.paymentId,
      recipientEmail: 'test@example.com',
      recipientName: 'Test User',
      message: 'Test gift certificate'
    };

    const giftCardResponse = await axios.post(`${BASE_URL}/api/gift-certificates/purchase`, giftCardData);
    console.log('✅ Gift certificate created successfully');
    console.log('Gift Card Code:', giftCardResponse.data.code);
    console.log('Gift Card Balance:', giftCardResponse.data.currentBalance);
    console.log('');

    console.log('🎉 All tests passed! Helcim payment processing is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log('');
    console.log('🔍 Debug Information:');
    console.log('Error Status:', error.response?.status);
    console.log('Error Data:', JSON.stringify(error.response?.data, null, 2));
  }
}

testHelcimPayment(); 