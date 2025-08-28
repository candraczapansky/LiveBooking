#!/usr/bin/env node

/**
 * Direct webhook test - simulates what Helcim sends
 */

async function sendTestWebhook() {
  const webhookUrl = 'http://localhost:5000/api/helcim/webhook';
  
  // Based on Helcim documentation, they typically send something like this
  const payload = {
    type: 'PURCHASE',
    id: 12345678,
    dateCreated: '2025-01-25T00:42:00.000-07:00',
    cardTransactionId: 12345678,
    status: 'APPROVED',
    approved: 1,
    amount: 100.00,
    currency: 'USD',
    cardNumber: '424242******4242',
    cardLast4: '4242',
    cardType: 'VISA',
    invoiceNumber: 'POS-1756341646413',
    customerCode: 'CST1001'
  };
  
  console.log('📮 Sending webhook to:', webhookUrl);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    console.log('\nResponse Status:', response.status);
    const responseBody = await response.text();
    console.log('Response Body:', responseBody);
    
    if (response.ok) {
      console.log('\n✅ Webhook sent successfully!');
      console.log('Check server logs for processing details.');
    } else {
      console.log('\n❌ Webhook failed');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('Make sure server is running on port 5000');
  }
}

sendTestWebhook();
