#!/usr/bin/env node

/**
 * Simulate a Helcim webhook locally for testing
 * Use this after running a real payment on the terminal
 */

import http from 'http';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔧 Helcim Webhook Simulator');
console.log('===========================');
console.log('');
console.log('After running a payment on your Smart Terminal:');
console.log('1. Look at the terminal screen for the transaction ID');
console.log('2. Enter it below to simulate the webhook');
console.log('');

rl.question('Enter the Transaction ID from the terminal: ', (transactionId) => {
  if (!transactionId) {
    console.log('❌ No transaction ID provided');
    rl.close();
    return;
  }

  const webhookPayload = {
    id: transactionId.trim(),
    type: 'cardTransaction'
  };

  const bodyString = JSON.stringify(webhookPayload);

  const options = {
    hostname: 'localhost',
    port: process.env.PORT || 3002,  // Your app is running on port 3002
    path: '/api/helcim/webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyString),
      'webhook-id': `msg_manual_${Date.now()}`,
      'webhook-timestamp': Math.floor(Date.now() / 1000).toString(),
      'webhook-signature': 'v1,manual-test'
    }
  };

  console.log('');
  console.log('📤 Sending webhook to local server...');
  console.log('Payload:', webhookPayload);
  console.log('');

  const req = http.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('✅ Webhook delivered successfully!');
        console.log('Response:', responseData);
        console.log('');
        console.log('Your app should now show the payment as completed! 🎉');
      } else {
        console.log('❌ Webhook delivery failed!');
        console.log('Status:', res.statusCode);
        console.log('Response:', responseData);
      }
      rl.close();
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
    console.log('');
    console.log('Make sure your server is running on port', options.port);
    rl.close();
  });

  req.write(bodyString);
  req.end();
});
