import axios from 'axios';

const BASE_URL = 'http://localhost:3003';

async function testTerminal() {
  console.log('🔧 Testing Terminal Connection...\n');
  
  try {
    // 1. Check if terminal is configured
    console.log('1️⃣ Checking terminal configuration...');
    const statusResponse = await axios.get(`${BASE_URL}/api/terminal/status/1`);
    console.log('✅ Terminal configured:', statusResponse.data);
    console.log(`   Device Code: ${statusResponse.data.deviceCode}`);
    console.log(`   Terminal ID: ${statusResponse.data.terminalId}\n`);
  } catch (error) {
    console.error('❌ Terminal not configured:', error.response?.data || error.message);
    console.log('\n⚠️  Please configure terminal in Settings > Locations first!\n');
    return;
  }
  
  try {
    // 2. Clear any cached data
    console.log('2️⃣ Clearing cache...');
    await axios.post(`${BASE_URL}/api/terminal/clear-cache`);
    console.log('✅ Cache cleared\n');
  } catch (error) {
    console.error('⚠️  Could not clear cache:', error.response?.data || error.message);
  }
  
  try {
    // 3. Try to start a test payment
    console.log('3️⃣ Starting test payment ($1.00)...');
    const paymentResponse = await axios.post(`${BASE_URL}/api/terminal/payment/start`, {
      locationId: '1',
      amount: 1.00,
      description: 'Test Payment'
    });
    console.log('✅ Payment started:', paymentResponse.data);
    console.log(`   Payment ID: ${paymentResponse.data.paymentId}`);
    console.log(`   Invoice: ${paymentResponse.data.invoiceNumber}`);
    console.log('\n📱 CHECK YOUR TERMINAL - Payment should appear on screen!\n');
    
    // 4. Check payment status
    if (paymentResponse.data.paymentId) {
      console.log('4️⃣ Checking payment status (waiting 5 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const statusCheck = await axios.get(
        `${BASE_URL}/api/terminal/payment/1/${paymentResponse.data.paymentId}`
      );
      console.log('📊 Payment status:', statusCheck.data);
    }
    
  } catch (error) {
    console.error('\n❌ Failed to start payment:', error.response?.data || error.message);
    
    if (error.response?.data?.message) {
      console.log('\n🔍 Error details:', error.response.data.message);
      
      // Common error messages and solutions
      if (error.response.data.message.includes('No terminal configured')) {
        console.log('\n💡 Solution: Configure terminal in Settings > Locations');
      } else if (error.response.data.message.includes('401') || error.response.data.message.includes('Unauthorized')) {
        console.log('\n💡 Solution: Check your API Token is correct');
        console.log('   - Go to Helcim Dashboard > Settings > API Tokens');
        console.log('   - Make sure the token has Smart Terminal permissions');
      } else if (error.response.data.message.includes('Device not found')) {
        console.log('\n💡 Solution: Check your Device Code');
        console.log('   - Enable API Mode in Helcim Dashboard');
        console.log('   - Log out and back in to your physical terminal');
        console.log('   - Use the Device Code shown on the terminal screen');
      } else if (error.response.data.message.includes('Terminal is busy')) {
        console.log('\n💡 Solution: Terminal has another transaction in progress');
        console.log('   - Complete or cancel the current transaction on the terminal');
      }
    }
  }
  
  console.log('\n✅ Test complete!');
}

testTerminal().catch(console.error);
