#!/usr/bin/env node

/**
 * Test Webhook Reception
 * 
 * This script helps verify if Twilio is actually calling your webhook.
 */

console.log('🔍 Webhook Reception Test');
console.log('========================\n');

console.log('📋 INSTRUCTIONS:');
console.log('1. Keep this terminal open and watch for webhook calls');
console.log('2. Send a message from your phone to +19187277348');
console.log('3. Look for "Incoming SMS webhook received" in your server logs');
console.log('4. If you see that message, the webhook is working');
console.log('5. If you don\'t see that message, Twilio is not calling your webhook\n');

console.log('🎯 EXPECTED BEHAVIOR:');
console.log('When you send a message from your phone, you should see in your server logs:');
console.log('- "Incoming SMS webhook received"');
console.log('- "Processing incoming SMS for auto-response"');
console.log('- "SMS auto-response sent successfully"');
console.log('- A TwiML response being returned\n');

console.log('❌ IF NO WEBHOOK CALLS:');
console.log('The issue is in Twilio Console configuration:');
console.log('1. Go to: https://console.twilio.com');
console.log('2. Navigate to: Phone Numbers → Manage → Active numbers');
console.log('3. Click on: +19187277348');
console.log('4. Check "Messaging" section:');
console.log('   - Webhook URL should be: https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/webhook/incoming-sms');
console.log('   - HTTP Method should be: POST');
console.log('   - Status should be: Active\n');

console.log('🔧 ALTERNATIVE TEST:');
console.log('If the webhook isn\'t working, try this command in another terminal:');
console.log('curl -X POST https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/webhook/incoming-sms \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"From":"+19185048902","To":"+19187277348","Body":"Test from curl","MessageSid":"test_curl_123"}\'\n');

console.log('📱 READY TO TEST:');
console.log('Send a message from your phone to +19187277348 now...');
console.log('Watch your server console for webhook activity...\n');

// Keep the script running
setInterval(() => {
  const now = new Date().toLocaleTimeString();
  console.log(`[${now}] Waiting for webhook calls... (Press Ctrl+C to stop)`);
}, 30000); 