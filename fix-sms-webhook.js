#!/usr/bin/env node

/**
 * SMS Webhook Configuration Fix
 * 
 * This script helps fix the SMS responder webhook and server reachability issues.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function question(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
}

async function fixSMSWebhook() {
  console.log('🔧 SMS Webhook Configuration Fix\n');
  
  // Get current domain from environment
  const replitDomain = process.env.REPLIT_DOMAINS;
  const customDomain = process.env.CUSTOM_DOMAIN;
  
  console.log('📋 Current Configuration:');
  console.log(`Replit Domain: ${replitDomain || 'Not set'}`);
  console.log(`Custom Domain: ${customDomain || 'Not set'}`);
  console.log(`Twilio Phone: ${process.env.TWILIO_PHONE_NUMBER || 'Not set'}`);
  console.log('');
  
  // Determine the correct webhook URL
  let webhookUrl;
  if (customDomain) {
    webhookUrl = `https://${customDomain}/api/webhook/incoming-sms`;
  } else if (replitDomain) {
    webhookUrl = `https://${replitDomain}/api/webhook/incoming-sms`;
  } else {
    console.log('❌ No domain configured. Please set REPLIT_DOMAINS or CUSTOM_DOMAIN environment variable.');
    return;
  }
  
  console.log('✅ Your webhook URL should be:');
  console.log(`${webhookUrl}\n`);
  
  // Test the webhook endpoint
  console.log('🧪 Testing webhook endpoint...');
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SMS-Webhook-Test/1.0'
      },
      body: JSON.stringify({
        From: '+1234567890',
        To: process.env.TWILIO_PHONE_NUMBER || '+19187277348',
        Body: 'Test message',
        MessageSid: `test_${Date.now()}`,
        Timestamp: new Date().toISOString()
      })
    });
    
    if (response.ok) {
      console.log('✅ Webhook endpoint is accessible and responding correctly!');
      const responseText = await response.text();
      console.log('Response type:', typeof responseText);
      if (responseText.includes('<?xml')) {
        console.log('✅ TwiML response received (correct for Twilio)');
      }
    } else {
      console.log(`❌ Webhook endpoint returned status: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Webhook endpoint test failed:', error.message);
    console.log('This indicates a server reachability issue.');
  }
  
  console.log('\n📋 Steps to fix the webhook configuration:\n');
  console.log('1. Log into your Twilio Console: https://console.twilio.com');
  console.log('2. Go to Phone Numbers → Manage → Active numbers');
  console.log('3. Click on your Twilio phone number');
  console.log('4. In the "Messaging" section:');
  console.log(`   - Set webhook URL to: ${webhookUrl}`);
  console.log('   - Set HTTP method to: POST');
  console.log('   - Make sure "Primary handler fails" is set to "HTTP POST"');
  console.log('5. Click "Save Configuration"\n');
  
  console.log('📋 Alternative: Use Twilio CLI');
  console.log('1. Install Twilio CLI: npm install -g twilio-cli');
  console.log('2. Login: twilio login');
  console.log('3. Configure webhook:');
  console.log(`   twilio phone-numbers:update ${process.env.TWILIO_PHONE_NUMBER || '+19187277348'} --sms-url=${webhookUrl} --sms-method=POST\n`);
  
  console.log('📋 Testing after configuration:');
  console.log('1. Send a text message to your Twilio number');
  console.log('2. Check your server logs for incoming webhook requests');
  console.log('3. The SMS auto-responder should process the message and send a response');
  console.log('4. You can also test using: npm run test-sms\n');
  
  console.log('📋 Troubleshooting tips:');
  console.log('- If webhook test fails, check that your server is running and accessible');
  console.log('- Verify the webhook URL is exactly correct (no extra spaces)');
  console.log('- Make sure your Twilio phone number is correctly configured');
  console.log('- Check server logs for any error messages');
  console.log('- Ensure your domain is publicly accessible (not localhost)');
  
  // Check if we need to update any configuration
  const updateConfig = await question('\nDo you want to update the SMS auto-responder configuration? (y/N): ');
  
  if (updateConfig.toLowerCase() === 'y') {
    console.log('\n📋 Updating SMS configuration...');
    
    try {
      const response = await fetch('http://localhost:5000/api/sms-auto-respond/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          enabled: true,
          confidenceThreshold: 0.7,
          maxResponseLength: 160,
          businessHoursOnly: false,
          autoRespondPhoneNumbers: [process.env.TWILIO_PHONE_NUMBER || '+19187277348']
        })
      });
      
      if (response.ok) {
        console.log('✅ SMS configuration updated successfully!');
      } else {
        console.log('❌ Failed to update SMS configuration');
      }
    } catch (error) {
      console.log('❌ Error updating SMS configuration:', error.message);
    }
  }
  
  console.log('\n🎉 Configuration fix completed!');
  console.log('Next steps:');
  console.log('1. Configure the webhook in Twilio Console');
  console.log('2. Test by sending a message to your Twilio number');
  console.log('3. Monitor the logs for any issues');
  console.log('4. Use the test interface in your app to verify functionality');
}

fixSMSWebhook().catch(console.error); 