#!/usr/bin/env node

/**
 * Test script to simulate Helcim webhook with exact payload format
 * According to Helcim docs, the webhook payload is: {"id":"TRANSACTION_ID", "type":"cardTransaction"}
 */

import http from 'http';
import crypto from 'crypto';

// Configuration
const PORT = process.env.PORT || 3001;
const WEBHOOK_URL = `http://localhost:${PORT}/api/helcim/webhook`;

// Test transaction ID (you can replace with a real one)
const TEST_TRANSACTION_ID = '12345678';

// Helcim webhook payload format
const webhookPayload = {
  id: TEST_TRANSACTION_ID,
  type: 'cardTransaction'
};

const bodyString = JSON.stringify(webhookPayload);

// Generate webhook headers (simplified for testing)
const webhookId = `msg_test_${Date.now()}`;
const webhookTimestamp = Math.floor(Date.now() / 1000).toString();

// If you have the verifier token from Helcim, set it here
const VERIFIER_TOKEN = process.env.HELCIM_WEBHOOK_VERIFIER_TOKEN || '';

let webhookSignature = 'v1,test-signature'; // Default test signature

// Generate proper signature if verifier token is available
if (VERIFIER_TOKEN) {
  const signedContent = `${webhookId}.${webhookTimestamp}.${bodyString}`;
  const verifierTokenBytes = Buffer.from(VERIFIER_TOKEN, 'base64');
  const signature = crypto
    .createHmac('sha256', verifierTokenBytes)
    .update(signedContent)
    .digest('base64');
  webhookSignature = `v1,${signature}`;
}

console.log('🚀 Testing Helcim Webhook Handler');
console.log('==================================');
console.log('');
console.log('📦 Webhook Payload:');
console.log(JSON.stringify(webhookPayload, null, 2));
console.log('');
console.log('📋 Webhook Headers:');
console.log(`  webhook-id: ${webhookId}`);
console.log(`  webhook-timestamp: ${webhookTimestamp}`);
console.log(`  webhook-signature: ${webhookSignature}`);
console.log('');
console.log(`🎯 Target URL: ${WEBHOOK_URL}`);
console.log('');

// Parse URL
const url = new URL(WEBHOOK_URL);

// Prepare request options
const options = {
  hostname: url.hostname,
  port: url.port || 80,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(bodyString),
    'webhook-id': webhookId,
    'webhook-timestamp': webhookTimestamp,
    'webhook-signature': webhookSignature
  }
};

// Make the request
const req = http.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('📨 Response Status:', res.statusCode);
    console.log('📄 Response Headers:', res.headers);
    console.log('📝 Response Body:', responseData);
    console.log('');
    
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ Webhook delivered successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Check server logs to see webhook processing');
      console.log('2. Test the payment status endpoint:');
      console.log(`   curl "http://localhost:${PORT}/api/terminal/payment/test/${TEST_TRANSACTION_ID}"`);
      console.log('');
      console.log('3. Check webhook cache status:');
      console.log(`   curl "http://localhost:${PORT}/api/terminal/debug"`);
    } else {
      console.log('❌ Webhook delivery failed!');
      console.log('Check server logs for error details.');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.log('');
  console.log('Make sure the server is running on port', PORT);
});

// Send the request
req.write(bodyString);
req.end();
