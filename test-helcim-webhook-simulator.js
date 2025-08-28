#!/usr/bin/env node

/**
 * Simulates exactly what Helcim should send according to their documentation
 * This helps verify your webhook handler works correctly
 */

async function simulateHelcimWebhook() {
  const webhookUrl = 'https://salon-sync-candraczapansky.replit.app/api/terminal/webhook';
  
  // Simulate the EXACT format from Helcim documentation
  // For cardTransaction events
  const helcimPayload = {
    "id": "25764674",
    "type": "cardTransaction"
  };
  
  console.log('📮 Simulating Helcim cardTransaction webhook...');
  console.log('URL:', webhookUrl);
  console.log('Payload:', JSON.stringify(helcimPayload, null, 2));
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'webhook-signature': 'v1,test-signature',
        'webhook-timestamp': Date.now().toString(),
        'webhook-id': 'msg_test_' + Date.now()
      },
      body: JSON.stringify(helcimPayload),
    });
    
    console.log('\nResponse Status:', response.status);
    const responseBody = await response.text();
    console.log('Response Body:', responseBody);
    
    if (response.ok) {
      console.log('\n✅ Webhook accepted by your server');
      console.log('\nNOTE: Helcim sends minimal data (just id and type).');
      console.log('Your app should then fetch full transaction details using the ID.');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
  
  // Also test with a more complete payload that might come from newer API
  console.log('\n\n📮 Testing with fuller payload (what might actually be sent)...');
  
  const fullPayload = {
    "id": "25764674",
    "type": "cardTransaction",
    "dateCreated": new Date().toISOString(),
    "cardTransactionId": "25764674",
    "status": "APPROVED",
    "approved": 1,
    "amount": 2.00,
    "currency": "USD",
    "cardLast4": "4242",
    "invoiceNumber": "POS-" + Date.now()
  };
  
  console.log('Payload:', JSON.stringify(fullPayload, null, 2));
  
  try {
    const response2 = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fullPayload),
    });
    
    console.log('\nResponse Status:', response2.status);
    const responseBody2 = await response2.text();
    console.log('Response Body:', responseBody2);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

simulateHelcimWebhook();
