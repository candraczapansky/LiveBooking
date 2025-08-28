#!/usr/bin/env node

/**
 * Complete test of minimal webhook processing
 * This simulates exactly what Helcim sends for Smart Terminal transactions
 */

async function testMinimalWebhook() {
  const baseUrl = 'https://salon-sync-candraczapansky.replit.app';
  const paymentId = 'TEST-' + Date.now();
  
  console.log('🧪 Testing Helcim Minimal Webhook Processing');
  console.log('='.repeat(60));
  console.log('Payment ID:', paymentId);
  console.log('');
  
  // Step 1: Send minimal webhook (what Helcim actually sends)
  console.log('1️⃣ Sending minimal webhook (like Helcim)...');
  const webhookPayload = {
    id: paymentId,
    type: 'cardTransaction'
  };
  
  console.log('Payload:', JSON.stringify(webhookPayload));
  
  try {
    const webhookResponse = await fetch(`${baseUrl}/api/terminal/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });
    
    console.log('Response:', webhookResponse.status, await webhookResponse.text());
    
    if (!webhookResponse.ok) {
      console.log('❌ Webhook failed');
      return;
    }
    
    console.log('✅ Webhook accepted\n');
  } catch (error) {
    console.error('❌ Error sending webhook:', error.message);
    return;
  }
  
  // Step 2: Wait a moment for processing
  console.log('2️⃣ Waiting for webhook processing...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Step 3: Check payment status
  console.log('\n3️⃣ Checking payment status...');
  try {
    const statusResponse = await fetch(`${baseUrl}/api/terminal/payment/4/${paymentId}`);
    const statusData = await statusResponse.json();
    
    console.log('Status response:', JSON.stringify(statusData, null, 2));
    
    if (statusData.success === true && statusData.status === 'completed') {
      console.log('\n🎉 SUCCESS! Payment marked as completed!');
      console.log('The minimal webhook was properly processed.');
    } else if (statusData.status === 'pending') {
      console.log('\n⚠️ Payment still pending - webhook might not be processed correctly');
      console.log('Check server logs for details.');
    } else {
      console.log('\n❌ Unexpected status:', statusData.status);
    }
  } catch (error) {
    console.error('❌ Error checking status:', error.message);
  }
}

// Run the test
testMinimalWebhook().catch(console.error);
