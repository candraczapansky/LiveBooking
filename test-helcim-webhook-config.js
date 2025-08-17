#!/usr/bin/env node

/**
 * Test script to verify Helcim webhook configuration
 * Run this after configuring the webhook in Helcim dashboard
 */

const BASE_URL = 'http://localhost:5001'; // Update port if different

async function testHelcimWebhookConfig() {
  console.log('🧪 Testing Helcim Webhook Configuration\n');
  
  try {
    // Test 1: Webhook endpoint health
    console.log('1️⃣ Testing webhook endpoint health...');
    const healthResponse = await fetch(`${BASE_URL}/api/helcim-smart-terminal/webhook`);
    const healthData = await healthResponse.json();
    console.log('✅ Webhook endpoint:', healthData);
    
    // Test 2: Simulate Helcim webhook with proper headers
    console.log('\n2️⃣ Testing webhook with Helcim-style headers...');
    const webhookData = {
      id: 'HELCIM-TXN-12345',
      type: 'cardTransaction',
      status: 'COMPLETED',
      transactionAmount: 99.99,
      invoiceNumber: 'APT-888',
      customerCode: 'CLIENT-999',
      deviceCode: 'UOJS'
    };
    
    const webhookResponse = await fetch(`${BASE_URL}/api/helcim-smart-terminal/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'webhook-signature': 'v1,test-signature-for-development',
        'webhook-timestamp': new Date().toISOString(),
        'webhook-id': 'helcim-webhook-test'
      },
      body: JSON.stringify(webhookData)
    });
    
    const webhookResult = await webhookResponse.json();
    console.log('✅ Webhook response:', webhookResult);
    
    // Test 3: Check Helcim service health
    console.log('\n3️⃣ Checking Helcim service health...');
    const serviceHealthResponse = await fetch(`${BASE_URL}/api/helcim-smart-terminal/health`);
    const serviceHealth = await serviceHealthResponse.json();
    console.log('✅ Helcim service health:', serviceHealth);
    
    console.log('\n🎉 Configuration test completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Configure webhook in Helcim dashboard');
    console.log('   2. Set HELCIM_WEBHOOK_SECRET in environment');
    console.log('   3. Make a real payment on terminal');
    console.log('   4. Check server logs for webhook receipt');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure your server is running on the correct port');
  }
}

// Run the test
testHelcimWebhookConfig();
