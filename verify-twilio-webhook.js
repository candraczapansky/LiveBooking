#!/usr/bin/env node

/**
 * Verify Twilio Webhook Configuration
 * 
 * This script helps verify that Twilio is properly configured to call your webhook.
 */

import fetch from 'node-fetch';

const WEBHOOK_URL = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/webhook/incoming-sms';
const TWILIO_PHONE = '+19187277348';

console.log('🔍 Verifying Twilio Webhook Configuration...\n');

async function verifyWebhook() {
  try {
    // Test 1: Check if webhook is accessible
    console.log('1. Testing webhook accessibility...');
    const testResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: '+19185048902',
        To: TWILIO_PHONE,
        Body: 'Test webhook accessibility',
        MessageSid: 'test_verify_123'
      })
    });
    
    if (testResponse.ok) {
      console.log('✅ Webhook is accessible and responding');
    } else {
      console.log('❌ Webhook returned error:', testResponse.status);
      return;
    }

    // Test 2: Check server health
    console.log('\n2. Checking server health...');
    const healthResponse = await fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/sms-auto-respond/health');
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Server health:', health.status);
    } else {
      console.log('❌ Server health check failed');
    }

    console.log('\n📋 DIAGNOSIS STEPS:');
    console.log('==================');
    console.log('\n1. VERIFY TWILIO CONSOLE SETTINGS:');
    console.log('   - Go to: https://console.twilio.com');
    console.log('   - Navigate to: Phone Numbers → Manage → Active numbers');
    console.log('   - Click on your number: +19187277348');
    console.log('   - In "Messaging" section, verify:');
    console.log(`     • Webhook URL: ${WEBHOOK_URL}`);
    console.log('     • HTTP Method: POST');
    console.log('     • Status: Active');
    
    console.log('\n2. CHECK TWILIO LOGS:');
    console.log('   - Go to: https://console.twilio.com');
    console.log('   - Navigate to: Monitor → Logs → SMS Logs');
    console.log('   - Look for your recent message');
    console.log('   - Check if there are any error messages');
    
    console.log('\n3. TEST WITH TWILIO CLI (if you have it installed):');
    console.log('   twilio phone-numbers:list');
    console.log(`   twilio phone-numbers:update +19187277348 --sms-url=${WEBHOOK_URL} --sms-method=POST`);
    
    console.log('\n4. COMMON ISSUES TO CHECK:');
    console.log('   - Is the phone number +19187277348 active in Twilio?');
    console.log('   - Are there any billing issues with your Twilio account?');
    console.log('   - Is the webhook URL exactly correct (no extra spaces)?');
    console.log('   - Are you sending from a different phone number than +19185048902?');
    
    console.log('\n5. ALTERNATIVE TEST:');
    console.log('   Try sending a message from a different phone number');
    console.log('   Sometimes Twilio has restrictions on certain numbers');
    
    console.log('\n6. CHECK SERVER LOGS:');
    console.log('   Look at your server console for any incoming webhook requests');
    console.log('   If you see "Incoming SMS webhook received" in logs, the webhook is working');
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Double-check the Twilio Console settings');
    console.log('2. Send another test message from your phone');
    console.log('3. Check Twilio SMS logs for any errors');
    console.log('4. Check your server console for webhook requests');

  } catch (error) {
    console.error('❌ Error verifying webhook:', error.message);
  }
}

verifyWebhook(); 