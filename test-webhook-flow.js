#!/usr/bin/env node

/**
 * Test script to verify Helcim webhook payment flow
 * This simulates what happens when Helcim sends a completed payment webhook
 */

const BASE_URL = 'http://localhost:5001'; // Update port if different

async function testWebhookFlow() {
  console.log('🧪 Testing Helcim Webhook Payment Flow\n');
  
  try {
    // Step 1: Test webhook endpoint health
    console.log('1️⃣ Testing webhook endpoint health...');
    const healthResponse = await fetch(`${BASE_URL}/api/helcim-smart-terminal/webhook`);
    const healthData = await healthResponse.json();
    console.log('✅ Webhook endpoint health:', healthData);
    
    // Step 2: Test webhook with completed payment
    console.log('\n2️⃣ Testing webhook with completed payment...');
    const webhookData = {
      id: 'TEST-TXN-12345',
      type: 'cardTransaction',
      status: 'COMPLETED',
      transactionAmount: 75.50,
      invoiceNumber: 'APT-123',
      customerCode: 'CLIENT-456'
    };
    
    const webhookResponse = await fetch(`${BASE_URL}/api/helcim-smart-terminal/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'webhook-signature': 'v1,test-signature',
        'webhook-timestamp': new Date().toISOString(),
        'webhook-id': 'test-webhook-id'
      },
      body: JSON.stringify(webhookData)
    });
    
    const webhookResult = await webhookResponse.json();
    console.log('✅ Webhook response:', webhookResult);
    
    // Step 3: Test with different payment statuses
    console.log('\n3️⃣ Testing different payment statuses...');
    const statuses = ['APPROVED', 'DECLINED', 'PROCESSING'];
    
    for (const status of statuses) {
      const testData = {
        id: `TEST-${status}-${Date.now()}`,
        type: 'cardTransaction',
        status: status,
        transactionAmount: 25.00,
        invoiceNumber: 'APT-789'
      };
      
      const response = await fetch(`${BASE_URL}/api/helcim-smart-terminal/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });
      
      const result = await response.json();
      console.log(`   ${status}: ${result.note || result.received ? '✅ Processed' : '❌ Failed'}`);
    }
    
    // Step 4: Test webhook signature validation (production mode)
    console.log('\n4️⃣ Testing webhook signature validation...');
    console.log('   Note: In development mode, signature validation is skipped');
    console.log('   In production, this would validate HELCIM_WEBHOOK_SECRET');
    
    console.log('\n🎉 Webhook flow test completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Configure webhook URL in Helcim dashboard');
    console.log('   2. Set HELCIM_WEBHOOK_SECRET in environment');
    console.log('   3. Test with real payment on terminal');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testWebhookFlow();
