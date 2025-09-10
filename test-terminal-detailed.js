import axios from 'axios';

const BASE_URL = 'http://localhost:3002';

async function testTerminalDetailed() {
  console.log('🔍 Detailed Terminal Test\n');
  console.log('=====================================\n');
  
  try {
    // 1. Get terminal configuration
    console.log('📋 Step 1: Checking Terminal Configuration');
    const configResponse = await axios.get(`${BASE_URL}/api/terminal/status/1`);
    console.log('✅ Configuration found:', JSON.stringify(configResponse.data, null, 2));
    
    // 2. Clear cache
    console.log('\n📋 Step 2: Clearing Cache');
    await axios.post(`${BASE_URL}/api/terminal/clear-cache`);
    console.log('✅ Cache cleared');
    
    // 3. Enable detailed logging by making request with debug flag
    console.log('\n📋 Step 3: Starting Payment with Debug Mode');
    console.log('⏳ Sending payment request...\n');
    
    try {
      const paymentResponse = await axios.post(
        `${BASE_URL}/api/terminal/payment/start`,
        {
          locationId: '1',
          amount: 1.00,
          description: 'Debug Test Payment'
        },
        {
          validateStatus: () => true // Accept any status code to see full response
        }
      );
      
      console.log('📡 Response Status:', paymentResponse.status);
      console.log('📦 Response Data:', JSON.stringify(paymentResponse.data, null, 2));
      
      if (paymentResponse.status === 200 && paymentResponse.data.success) {
        console.log('\n✅ Payment sent successfully!');
        console.log('🔑 Payment ID:', paymentResponse.data.paymentId);
        console.log('📱 CHECK YOUR TERMINAL NOW!');
      } else {
        console.log('\n❌ Payment failed to send');
        if (paymentResponse.data.message) {
          console.log('📝 Error message:', paymentResponse.data.message);
        }
      }
      
    } catch (paymentError) {
      console.error('\n❌ Payment request failed:', paymentError.message);
      if (paymentError.response) {
        console.log('📡 Response:', paymentError.response.data);
      }
    }
    
    // 4. Check debug snapshot
    console.log('\n📋 Step 4: Getting Debug Snapshot');
    try {
      const snapshotResponse = await axios.get(`${BASE_URL}/api/terminal/debug/snapshot`);
      console.log('📊 Debug Snapshot:', JSON.stringify(snapshotResponse.data, null, 2));
    } catch (err) {
      console.log('⚠️  Could not get debug snapshot');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
  }
  
  console.log('\n=====================================');
  console.log('Test complete\n');
}

// Run test
testTerminalDetailed().catch(console.error);
