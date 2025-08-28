#!/usr/bin/env node

/**
 * Webhook Debug Helper
 * This script helps diagnose webhook issues with Helcim terminal payments
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function checkWebhookLogs() {
  console.log('🔍 Checking server logs for webhook activity...\n');
  
  // Check recent server logs
  const logFiles = ['server-current.log', 'server-dev.log'];
  
  for (const logFile of logFiles) {
    try {
      const logPath = path.join(process.cwd(), logFile);
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf-8');
        const lines = content.split('\n');
        
        // Look for webhook-related logs
        const webhookLogs = lines.filter(line => 
          line.includes('webhook') || 
          line.includes('Webhook') ||
          line.includes('helcim') ||
          line.includes('Helcim') ||
          line.includes('📥') ||
          line.includes('📋') ||
          line.includes('💾')
        );
        
        if (webhookLogs.length > 0) {
          console.log(`📁 Found ${webhookLogs.length} webhook entries in ${logFile}:\n`);
          webhookLogs.slice(-10).forEach(log => console.log(log));
          console.log('\n');
        } else {
          console.log(`❌ No webhook logs found in ${logFile}\n`);
        }
      }
    } catch (error) {
      console.error(`Error reading ${logFile}:`, error.message);
    }
  }
}

async function testWebhookEndpoint() {
  console.log('\n🧪 Testing webhook endpoint availability...\n');
  
  try {
    // Test if the webhook endpoint is responding
    const response = await fetch('http://localhost:5000/api/helcim/webhook/health', {
      method: 'GET',
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Webhook endpoint is healthy:', data);
    } else {
      console.log('❌ Webhook endpoint returned:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Could not reach webhook endpoint:', error.message);
    console.log('Make sure the server is running on port 5000');
  }
}

async function simulateWebhook() {
  console.log('\n📮 Simulating a Helcim webhook...\n');
  
  // Sample webhook payload based on Helcim documentation
  const sampleWebhook = {
    type: 'cardTransaction',
    id: 'test-' + Date.now(),
    transactionId: 'txn_' + Date.now(),
    invoiceNumber: 'POS-' + Date.now(),
    cardLast4: '4242',
    amount: 100.00,
    approved: true,
    status: 'approved',
    outcome: 'APPROVED',
    customerCode: 'CUST001'
  };
  
  console.log('Sending webhook payload:', JSON.stringify(sampleWebhook, null, 2));
  
  try {
    const response = await fetch('http://localhost:5000/api/helcim/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleWebhook),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Webhook accepted:', data);
      console.log('\nCheck your server logs for processing details.');
    } else {
      console.log('\n❌ Webhook rejected:', response.status, response.statusText);
      const text = await response.text();
      console.log('Response:', text);
    }
  } catch (error) {
    console.error('\n❌ Error sending webhook:', error.message);
  }
}

async function getTerminalSnapshot() {
  console.log('\n📊 Getting terminal service debug snapshot...\n');
  
  try {
    const response = await fetch('http://localhost:5000/api/terminal/debug/snapshot', {
      method: 'GET',
    });
    
    if (response.ok) {
      const snapshot = await response.json();
      console.log('Active Sessions:', snapshot.sessions || []);
      console.log('\nRecent Webhooks:', snapshot.webhooks || []);
    } else {
      console.log('Debug endpoint not available');
    }
  } catch (error) {
    console.log('Could not get debug snapshot:', error.message);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🔧 Helcim Webhook Debug Helper');
  console.log('='.repeat(60));
  
  await checkWebhookLogs();
  await testWebhookEndpoint();
  
  console.log('\n' + '='.repeat(60));
  console.log('OPTIONS:');
  console.log('1. Run "node test-webhook-debug.js simulate" to send a test webhook');
  console.log('2. Check your Helcim dashboard webhook URL configuration');
  console.log('3. Make sure your server is running and accessible');
  console.log('='.repeat(60));
  
  if (process.argv[2] === 'simulate') {
    await simulateWebhook();
  }
  
  await getTerminalSnapshot();
}

main().catch(console.error);
