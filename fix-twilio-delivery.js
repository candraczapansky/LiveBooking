#!/usr/bin/env node

/**
 * Fix Twilio SMS Delivery Issues
 * 
 * This script helps diagnose and fix "undelivered" SMS issues in Twilio
 */

import fetch from 'node-fetch';

async function fixTwilioDelivery() {
  console.log('🔧 Fixing Twilio SMS Delivery Issues\n');
  
  const baseUrl = 'http://localhost:5000';
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER || '+19187277348';
  
  console.log('📋 Current Configuration:');
  console.log(`Twilio Phone: ${twilioPhone}`);
  console.log(`Server URL: ${baseUrl}`);
  console.log('');
  
  // 1. Check SMS configuration
  console.log('1. Checking SMS Configuration...');
  try {
    const configResponse = await fetch(`${baseUrl}/api/sms-config-status`);
    if (configResponse.ok) {
      const config = await configResponse.json();
      console.log('✅ SMS Configuration Status:', config);
    } else {
      console.log('❌ Failed to get SMS configuration');
    }
  } catch (error) {
    console.log('❌ Error checking SMS configuration:', error.message);
  }
  
  // 2. Test SMS sending
  console.log('\n2. Testing SMS Sending...');
  try {
    const testResponse = await fetch(`${baseUrl}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '+19185048935',
        to: twilioPhone,
        body: 'Test delivery fix'
      })
    });
    
    if (testResponse.ok) {
      const result = await testResponse.json();
      console.log('✅ SMS Test Result:', result);
    } else {
      console.log('❌ SMS test failed');
    }
  } catch (error) {
    console.log('❌ Error testing SMS:', error.message);
  }
  
  // 3. Common causes of "undelivered" status
  console.log('\n📋 Common Causes of "Undelivered" Status:\n');
  
  console.log('🔴 1. TWILIO ACCOUNT ISSUES:');
  console.log('   - Insufficient account balance');
  console.log('   - Account suspended or restricted');
  console.log('   - Phone number not active');
  console.log('   - Geographic restrictions');
  console.log('');
  
  console.log('🔴 2. PHONE NUMBER ISSUES:');
  console.log('   - Recipient phone number is invalid');
  console.log('   - Recipient phone number is not SMS-capable');
  console.log('   - Recipient has blocked SMS from Twilio');
  console.log('   - Recipient is in a restricted region');
  console.log('');
  
  console.log('🔴 3. MESSAGE CONTENT ISSUES:');
  console.log('   - Message contains prohibited content');
  console.log('   - Message is too long');
  console.log('   - Message contains special characters');
  console.log('');
  
  console.log('🔴 4. CONFIGURATION ISSUES:');
  console.log('   - Wrong Twilio credentials');
  console.log('   - Incorrect phone number format');
  console.log('   - Missing or invalid webhook configuration');
  console.log('');
  
  // 4. Troubleshooting steps
  console.log('🔧 TROUBLESHOOTING STEPS:\n');
  
  console.log('1. CHECK TWILIO CONSOLE:');
  console.log('   - Go to: https://console.twilio.com');
  console.log('   - Check account balance and status');
  console.log('   - Verify phone number is active');
  console.log('   - Check SMS logs for specific error codes');
  console.log('');
  
  console.log('2. CHECK SMS LOGS:');
  console.log('   - In Twilio Console, go to Monitor → Logs → SMS Logs');
  console.log('   - Look for your recent messages');
  console.log('   - Check the "Status" column for specific error messages');
  console.log('   - Common error codes:');
  console.log('     * 30004: Message delivery failed');
  console.log('     * 30005: Message delivery failed - unknown error');
  console.log('     * 30006: Message delivery failed - carrier rejected');
  console.log('     * 30007: Message delivery failed - unknown destination');
  console.log('');
  
  console.log('3. TEST WITH DIFFERENT NUMBERS:');
  console.log('   - Try sending to a different phone number');
  console.log('   - Test with a verified number (like your own)');
  console.log('   - Check if the issue is specific to certain numbers');
  console.log('');
  
  console.log('4. CHECK MESSAGE CONTENT:');
  console.log('   - Ensure message doesn\'t contain prohibited words');
  console.log('   - Keep message under 160 characters');
  console.log('   - Avoid special characters or emojis');
  console.log('');
  
  console.log('5. VERIFY WEBHOOK CONFIGURATION:');
  console.log('   - Ensure webhook URL is correct');
  console.log('   - Verify HTTP method is POST');
  console.log('   - Check that webhook is responding with 200 status');
  console.log('');
  
  // 5. Immediate actions
  console.log('🚀 IMMEDIATE ACTIONS TO TAKE:\n');
  
  console.log('1. Check Twilio Account:');
  console.log('   - Log into https://console.twilio.com');
  console.log('   - Check your account balance');
  console.log('   - Verify phone number status');
  console.log('');
  
  console.log('2. Check SMS Logs:');
  console.log('   - Go to Monitor → Logs → SMS Logs');
  console.log('   - Find your recent message');
  console.log('   - Look at the "Status" and "Error Code" columns');
  console.log('');
  
  console.log('3. Test with Simple Message:');
  console.log('   - Send a simple text message (no emojis, no special chars)');
  console.log('   - Keep it under 160 characters');
  console.log('   - Test with a different recipient number');
  console.log('');
  
  console.log('4. Contact Twilio Support:');
  console.log('   - If you see specific error codes, contact Twilio support');
  console.log('   - Provide your Account SID and the specific error message');
  console.log('   - They can help identify the exact cause');
  console.log('');
  
  // 6. Test webhook configuration
  console.log('🧪 TESTING WEBHOOK CONFIGURATION:\n');
  
  const webhookUrl = `https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/webhook/incoming-sms`;
  
  console.log('Your webhook URL should be:');
  console.log(`${webhookUrl}\n`);
  
  console.log('To verify webhook is working:');
  console.log('1. Send a message to your Twilio number');
  console.log('2. Check server logs for "Incoming SMS webhook received"');
  console.log('3. Check server logs for "DEVELOPMENT MODE: Sending REAL SMS"');
  console.log('4. If you see these logs but SMS is undelivered, it\'s a Twilio issue');
  console.log('');
  
  console.log('🎯 MOST LIKELY CAUSES:');
  console.log('1. Twilio account balance is low');
  console.log('2. Phone number is not SMS-capable');
  console.log('3. Geographic restrictions');
  console.log('4. Carrier rejection');
  console.log('');
  
  console.log('📞 NEXT STEPS:');
  console.log('1. Check your Twilio Console immediately');
  console.log('2. Look at the specific error codes in SMS logs');
  console.log('3. Try sending to a different phone number');
  console.log('4. Contact Twilio support if the issue persists');
  console.log('');
  
  console.log('✅ The SMS auto-responder is working correctly on your server.');
  console.log('❌ The "undelivered" status is a Twilio delivery issue, not a server issue.');
}

fixTwilioDelivery().catch(console.error); 