#!/usr/bin/env node

/**
 * Test script to demonstrate the complete Helcim payment flow
 * This shows how webhooks work with real appointment data
 */

const BASE_URL = 'http://localhost:5002'; // Update port if different

async function testRealPaymentFlow() {
  console.log('🧪 Testing Complete Helcim Payment Flow\n');
  
  try {
    // Step 1: Test webhook endpoint
    console.log('1️⃣ Testing webhook endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/h/webhook`);
    const healthData = await healthResponse.json();
    console.log('✅ Webhook endpoint:', healthData);
    
    // Step 2: Simulate Helcim sending completed payment
    console.log('\n2️⃣ Simulating Helcim payment completion...');
    const paymentData = {
      id: 'HELCIM-REAL-PAYMENT-12345',
      type: 'cardTransaction',
      status: 'APPROVED',
      transactionAmount: 125.50,
      invoiceNumber: 'APT-999',
      customerCode: 'CLIENT-456',
      deviceCode: 'UOJS'
    };
    
    console.log('📤 Sending payment data:', paymentData);
    
    const webhookResponse = await fetch(`${BASE_URL}/h/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'webhook-signature': 'v1,test-signature',
        'webhook-timestamp': new Date().toISOString(),
        'webhook-id': 'helcim-real-test'
      },
      body: JSON.stringify(paymentData)
    });
    
    const webhookResult = await webhookResponse.json();
    console.log('✅ Webhook response:', webhookResult);
    
    // Step 3: Explain what happens next
    console.log('\n3️⃣ What happens in your app:');
    console.log('   📥 Webhook received from Helcim');
    console.log('   🔍 Payment status analyzed (APPROVED)');
    console.log('   💳 Transaction amount captured ($125.50)');
    console.log('   📋 Invoice number parsed (APT-999)');
    console.log('   🆔 Appointment ID extracted (999)');
    console.log('   💾 Payment record created in database');
    console.log('   ✅ Appointment marked as paid');
    
    console.log('\n🎉 Payment flow test completed!');
    console.log('\n📋 Next steps for you:');
    console.log('   1. Add HELCIM_WEBHOOK_SECRET to .env file');
    console.log('   2. Restart your server');
    console.log('   3. Make a real payment on your terminal');
    console.log('   4. Check server logs for webhook processing');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure your server is running on the correct port');
  }
}

// Run the test
testRealPaymentFlow();
