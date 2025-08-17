// Test script to verify Helcim webhook flow
// This simulates the complete payment flow from initiation to webhook completion

const BASE_URL = 'http://localhost:5001'; // Updated to correct port

async function testHelcimWebhookFlow() {
  console.log('🧪 Testing Helcim webhook flow...\n');

  try {
    // Step 1: Check service health
    console.log('1️⃣ Checking Helcim service health...');
    const healthResponse = await fetch(`${BASE_URL}/api/helcim-smart-terminal/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);

    if (!healthData.configured) {
      console.log('❌ Helcim service not configured');
      return;
    }

    // Step 2: Test webhook endpoint directly with sample data
    console.log('\n2️⃣ Testing webhook endpoint directly...');
    const webhookData = {
      id: 'TEST-12345',
      type: 'cardTransaction',
      status: 'COMPLETED',
      transactionAmount: 30.00,
      invoiceNumber: 'APT-999'
    };

    console.log('📤 Sending webhook data:', JSON.stringify(webhookData, null, 2));
    
    const webhookResponse = await fetch(`${BASE_URL}/api/helcim-smart-terminal/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookData)
    });

    const webhookResult = await webhookResponse.json();
    console.log('✅ Webhook response:', webhookResult);

    // Step 3: Test alternative webhook endpoints
    console.log('\n3️⃣ Testing alternative webhook endpoints...');
    
    // Test the shorter path
    const shortWebhookResponse = await fetch(`${BASE_URL}/h/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookData)
    });
    console.log('✅ Short webhook response:', await shortWebhookResponse.json());

    // Test the other alias
    const aliasWebhookResponse = await fetch(`${BASE_URL}/api/webhooks/helcim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookData)
    });
    console.log('✅ Alias webhook response:', await aliasWebhookResponse.json());

    console.log('\n🎉 Webhook testing completed!');
    console.log('   Check the server console for detailed webhook logging');
    console.log('   The webhook should have processed the test data');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testHelcimWebhookFlow();
