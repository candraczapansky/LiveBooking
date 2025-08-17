// Test script to debug gift card payment workflow
// This script helps verify the payment processor responses and payment verification

const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

async function testGiftCardPaymentFlow() {
  console.log('🧪 Testing Gift Card Payment Flow');
  console.log('=====================================\n');

  try {
    // Step 1: Test payment creation
    console.log('1️⃣ Testing payment creation...');
    const paymentData = {
      amount: 50.00,
      sourceId: 'test_card_token',
      clientId: 1,
      type: 'gift_certificate_payment',
      description: 'Test Gift Certificate Purchase'
    };

    console.log('Payment request data:', JSON.stringify(paymentData, null, 2));

    const paymentResponse = await axios.post(`${API_BASE}/api/create-payment`, paymentData);
    console.log('✅ Payment creation response:', JSON.stringify(paymentResponse.data, null, 2));

    const paymentId = paymentResponse.data.paymentId;
    console.log('📋 Payment ID:', paymentId);

    // Step 2: Test gift certificate purchase with payment verification
    console.log('\n2️⃣ Testing gift certificate purchase with payment verification...');
    const giftCertData = {
      amount: 50.00,
      recipientName: 'Test Recipient',
      recipientEmail: 'test@example.com',
      purchaserName: 'Test Purchaser',
      purchaserEmail: 'purchaser@example.com',
      message: 'Test gift certificate',
      paymentId: paymentId
    };

    console.log('Gift certificate request data:', JSON.stringify(giftCertData, null, 2));

    const giftCertResponse = await axios.post(`${API_BASE}/api/gift-certificates/purchase`, giftCertData);
    console.log('✅ Gift certificate purchase response:', JSON.stringify(giftCertResponse.data, null, 2));

    // Step 3: Verify gift card was created
    if (giftCertResponse.data.success && giftCertResponse.data.giftCard) {
      const giftCardCode = giftCertResponse.data.giftCard.code;
      console.log('\n3️⃣ Testing gift card balance check...');
      
      const balanceResponse = await axios.get(`${API_BASE}/api/gift-card-balance/${giftCardCode}`);
      console.log('✅ Gift card balance response:', JSON.stringify(balanceResponse.data, null, 2));
    }

    console.log('\n🎉 Gift card payment flow test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('Server error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function testPaymentVerification() {
  console.log('\n🔍 Testing Payment Verification');
  console.log('================================\n');

  try {
    // Test gift certificate purchase WITHOUT payment ID (should fail)
    console.log('1️⃣ Testing gift certificate purchase without payment ID...');
    const giftCertDataWithoutPayment = {
      amount: 50.00,
      recipientName: 'Test Recipient',
      recipientEmail: 'test@example.com',
      purchaserName: 'Test Purchaser',
      purchaserEmail: 'purchaser@example.com',
      message: 'Test gift certificate'
      // No paymentId - should fail
    };

    try {
      await axios.post(`${API_BASE}/api/gift-certificates/purchase`, giftCertDataWithoutPayment);
      console.log('❌ Expected failure but got success - this is a bug!');
    } catch (error) {
      console.log('✅ Correctly failed without payment ID:', error.response?.data?.error);
    }

    // Test gift certificate purchase with invalid payment ID (should fail)
    console.log('\n2️⃣ Testing gift certificate purchase with invalid payment ID...');
    const giftCertDataWithInvalidPayment = {
      amount: 50.00,
      recipientName: 'Test Recipient',
      recipientEmail: 'test@example.com',
      purchaserName: 'Test Purchaser',
      purchaserEmail: 'purchaser@example.com',
      message: 'Test gift certificate',
      paymentId: 'invalid_payment_id'
    };

    try {
      await axios.post(`${API_BASE}/api/gift-certificates/purchase`, giftCertDataWithInvalidPayment);
      console.log('❌ Expected failure but got success - this is a bug!');
    } catch (error) {
      console.log('✅ Correctly failed with invalid payment ID:', error.response?.data?.error);
    }

  } catch (error) {
    console.error('❌ Payment verification test failed:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Gift Card Payment Debug Tests\n');
  
  await testGiftCardPaymentFlow();
  await testPaymentVerification();
  
  console.log('\n🏁 All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testGiftCardPaymentFlow, testPaymentVerification }; 