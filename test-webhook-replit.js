#!/usr/bin/env node

/**
 * Test webhook to simulate Helcim sending to your Replit URL
 */

import https from 'https';
import crypto from 'crypto';

// Your actual Replit webhook URL
const WEBHOOK_URL = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/helcim/webhook';

// Test transaction ID
const TEST_TRANSACTION_ID = 'test-' + Date.now();

// Helcim webhook payload
const webhookPayload = {
  id: TEST_TRANSACTION_ID,
  type: 'cardTransaction'
};

const bodyString = JSON.stringify(webhookPayload);

// Generate webhook headers
const webhookId = `msg_test_${Date.now()}`;
const webhookTimestamp = Math.floor(Date.now() / 1000).toString();

// If you have the verifier token, set it here
const VERIFIER_TOKEN = process.env.HELCIM_WEBHOOK_VERIFIER_TOKEN || '';

let webhookSignature = 'v1,test-signature';

if (VERIFIER_TOKEN) {
  const signedContent = `${webhookId}.${webhookTimestamp}.${bodyString}`;
  const verifierTokenBytes = Buffer.from(VERIFIER_TOKEN, 'base64');
  const signature = crypto
    .createHmac('sha256', verifierTokenBytes)
    .update(signedContent)
    .digest('base64');
  webhookSignature = `v1,${signature}`;
}

console.log('🚀 Testing Webhook to Replit URL');
console.log('=================================');
console.log('');
console.log('📦 Webhook Payload:', JSON.stringify(webhookPayload, null, 2));
console.log('🎯 Target URL:', WEBHOOK_URL);
console.log('');

// Parse URL
const url = new URL(WEBHOOK_URL);

// Prepare request options
const options = {
  hostname: url.hostname,
  port: 443,
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
const req = https.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('📨 Response Status:', res.statusCode);
    console.log('📝 Response Body:', responseData);
    console.log('');
    
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ Webhook delivered successfully!');
      console.log('');
      console.log('Now check payment status:');
      console.log(`curl "https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/terminal/payment/test/${TEST_TRANSACTION_ID}"`);
    } else {
      console.log('❌ Webhook delivery failed!');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.write(bodyString);
req.end();

