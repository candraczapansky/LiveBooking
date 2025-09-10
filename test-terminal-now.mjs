#!/usr/bin/env node
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3002';

console.log('🔧 Terminal Connection Test\n');
console.log('=====================================\n');

// First, check if server is running
try {
  const healthCheck = await fetch(`${BASE_URL}/api/health`).catch(() => null);
  if (!healthCheck) {
    console.error('❌ Server is not running on port 3002');
    console.log('Please start the server first with: npm run dev');
    process.exit(1);
  }
} catch (e) {
  console.error('❌ Cannot connect to server:', e.message);
  process.exit(1);
}

// Check terminal configuration
try {
  const statusRes = await fetch(`${BASE_URL}/api/terminal/status/1`);
  const status = await statusRes.json();
  
  if (!statusRes.ok) {
    console.error('❌ No terminal configured for location 1');
    console.log('Please configure terminal in Settings > Locations');
    process.exit(1);
  }
  
  console.log('✅ Terminal Configured:');
  console.log(`   Device Code: ${status.deviceCode}`);
  console.log(`   Terminal ID: ${status.terminalId}\n`);
} catch (e) {
  console.error('❌ Error checking terminal status:', e.message);
  process.exit(1);
}

// Try to start a payment
console.log('📤 Attempting to send payment to terminal...\n');

try {
  const paymentRes = await fetch(`${BASE_URL}/api/terminal/payment/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locationId: '1',
      amount: 1.00,
      description: 'Test Payment'
    })
  });
  
  const payment = await paymentRes.json();
  
  if (paymentRes.ok && payment.success) {
    console.log('✅ Payment request sent successfully!');
    console.log(`   Payment ID: ${payment.paymentId}`);
    console.log(`   Status: ${payment.status}`);
    console.log('\n📱 CHECK YOUR PHYSICAL TERMINAL NOW!');
    console.log('   The payment should appear on the terminal screen.\n');
    
    // Wait and check status
    console.log('⏳ Waiting 5 seconds before checking status...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const statusRes = await fetch(`${BASE_URL}/api/terminal/payment/1/${payment.paymentId}`);
    const statusData = await statusRes.json();
    
    console.log('\n📊 Payment Status:');
    console.log(`   Status: ${statusData.status}`);
    if (statusData.message) {
      console.log(`   Message: ${statusData.message}`);
    }
    
  } else {
    console.error('❌ Failed to send payment to terminal');
    console.log('Response:', payment);
    
    if (payment.message) {
      console.log('\n🔍 Error Message:', payment.message);
      
      // Check for common errors
      if (payment.message.includes('No terminal configured')) {
        console.log('\n💡 Solution: Configure terminal in Settings > Locations');
      } else if (payment.message.includes('401') || payment.message.includes('Unauthorized')) {
        console.log('\n💡 Solution: Your API Token may be incorrect');
        console.log('   1. Check Helcim Dashboard for correct API Token');
        console.log('   2. Re-enter it in Settings > Locations');
      } else if (payment.message.includes('Device not found') || payment.message.includes('404')) {
        console.log('\n💡 Solution: Your Device Code may be incorrect');
        console.log('   1. Check the physical terminal for the correct Device Code');
        console.log('   2. Re-enter it in Settings > Locations');
      }
    }
  }
  
} catch (e) {
  console.error('❌ Error starting payment:', e.message);
}

console.log('\n=====================================');
console.log('Test complete\n');

