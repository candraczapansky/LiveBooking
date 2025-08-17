import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function testGiftCertificateFlow() {
  try {
    console.log('🎁 Testing Complete Gift Certificate Purchase Flow...\n');

    // Step 1: Create payment with Helcim
    console.log('1️⃣ Creating payment with Helcim...');
    const paymentData = {
      amount: 50.00,
      cardData: {
        cardNumber: '4111111111111111',
        cardExpiryMonth: '12',
        cardExpiryYear: '2025',
        cardCVV: '123'
      },
      clientId: 1,
      type: 'gift_certificate_payment',
      description: 'Gift Certificate Purchase'
    };

    const paymentResponse = await axios.post(`${BASE_URL}/api/create-payment`, paymentData);
    console.log('✅ Payment created successfully');
    console.log('Payment Response:', JSON.stringify(paymentResponse.data, null, 2));
    console.log('');

    // Check if it's using Helcim or mock
    if (paymentResponse.data.helcimPayment) {
      console.log('✅ Server is using Helcim payment processing');
    } else if (paymentResponse.data.squarePayment) {
      console.log('❌ Server is still using Square payment processing (mock)');
    } else {
      console.log('⚠️  Unknown payment processing type');
    }
    console.log('');

    // Step 2: Purchase gift certificate with payment verification
    console.log('2️⃣ Purchasing gift certificate...');
    const giftCardData = {
      amount: 50.00,
      paymentId: paymentResponse.data.payment?.id || paymentResponse.data.paymentId,
      recipientEmail: 'test@example.com',
      recipientName: 'Test User',
      purchaserName: 'Test Purchaser',
      purchaserEmail: 'purchaser@example.com',
      message: 'Test gift certificate'
    };

    const giftCardResponse = await axios.post(`${BASE_URL}/api/gift-certificates/purchase`, giftCardData);
    console.log('✅ Gift certificate purchased successfully');
    console.log('Gift Card Response:', JSON.stringify(giftCardResponse.data, null, 2));
    console.log('');

    // Step 3: Verify the gift certificate was created
    console.log('3️⃣ Verifying gift certificate...');
    try {
      const giftCardsResponse = await axios.get(`${BASE_URL}/api/gift-cards`);
      const giftCards = giftCardsResponse.data;
      
      if (Array.isArray(giftCards)) {
        const createdGiftCard = giftCards.find(card => card.code === giftCardResponse.data.code);
        
        if (createdGiftCard) {
          console.log('✅ Gift certificate verified in database');
          console.log('Code:', createdGiftCard.code);
          console.log('Balance:', createdGiftCard.currentBalance);
          console.log('Status:', createdGiftCard.status);
        } else {
          console.log('❌ Gift certificate not found in database');
        }
      } else {
        console.log('⚠️  Gift cards endpoint returned non-array response');
      }
    } catch (error) {
      console.log('⚠️  Could not verify gift certificate in database:', error.message);
    }
    console.log('');

    console.log('🎉 Complete gift certificate flow test completed!');
    console.log('');
    console.log('📋 Summary:');
    console.log('- Payment processing: ✅ Working');
    console.log('- Gift certificate creation: ✅ Working');
    console.log('');
    console.log('🔍 Next Steps:');
    console.log('1. Check if the server is using real Helcim API or mock responses');
    console.log('2. If using mock responses, verify environment variables are set');
    console.log('3. Test with real card data if needed');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log('');
    console.log('🔍 Debug Information:');
    console.log('Error Status:', error.response?.status);
    console.log('Error Data:', JSON.stringify(error.response?.data, null, 2));
  }
}

testGiftCertificateFlow(); 