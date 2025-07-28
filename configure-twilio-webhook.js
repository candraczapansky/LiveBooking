#!/usr/bin/env node

/**
 * Quick Twilio Webhook Configuration Script
 * 
 * This script helps you configure the webhook URL for your Twilio number.
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function configureWebhook() {
  console.log('🔧 Twilio Webhook Configuration\n');
  
  // Your current server URL based on the logs
  const serverUrl = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev:5003';
  const webhookUrl = `${serverUrl}/api/webhook/incoming-sms`;
  
  console.log('✅ Your webhook URL is:');
  console.log(`${webhookUrl}\n`);
  
  console.log('📋 Steps to configure in Twilio Console:\n');
  console.log('1. Go to https://console.twilio.com');
  console.log('2. Navigate to Phone Numbers → Manage → Active numbers');
  console.log('3. Click on your Twilio phone number');
  console.log('4. In the "Messaging" section:');
  console.log(`   - Set webhook URL to: ${webhookUrl}`);
  console.log('   - Set HTTP method to: POST');
  console.log('   - Make sure "Primary handler fails" is set to "HTTP POST"');
  console.log('5. Click "Save Configuration"\n');
  
  console.log('📋 Alternative: Use Twilio CLI (if you have it installed):\n');
  console.log('1. Install Twilio CLI: npm install -g twilio-cli');
  console.log('2. Login: twilio login');
  console.log('3. Configure webhook:');
  console.log(`   twilio phone-numbers:update ${await question('Enter your Twilio phone number (e.g., +1234567890): ')} --sms-url=${webhookUrl} --sms-method=POST\n`);
  
  console.log('📋 Testing the webhook:\n');
  console.log('1. After configuration, send a text message to your Twilio number');
  console.log('2. Check your server logs for incoming webhook requests');
  console.log('3. The SMS auto-responder should process the message and send a response\n');
  
  console.log('📋 Troubleshooting:\n');
  console.log('- If you get "Cannot read properties of undefined" errors, check the webhook payload format');
  console.log('- Make sure your server is running and accessible');
  console.log('- Verify the webhook URL is exactly correct (no extra spaces)');
  console.log('- Check that your Twilio credentials are properly set in .env\n');
  
  console.log('🎉 Once configured, your SMS auto-responder will:');
  console.log('- Receive incoming SMS messages via webhook');
  console.log('- Process them through the LLM service');
  console.log('- Send AI-generated responses back to the sender');
  console.log('- Log all interactions for monitoring\n');
}

// Handle script execution
if (require.main === module) {
  configureWebhook()
    .then(() => {
      rl.close();
    })
    .catch((error) => {
      console.error('❌ Configuration failed:', error.message);
      rl.close();
      process.exit(1);
    });
}

module.exports = { configureWebhook }; 