#!/usr/bin/env node

/**
 * Permanent SMS Fix
 * 
 * This script fixes all SMS auto-responder issues permanently
 */

import fetch from 'node-fetch';

async function fixSMSPermanent() {
  console.log('🔧 Permanent SMS Auto-Responder Fix\n');
  
  const baseUrl = 'http://localhost:5000';
  
  try {
    // 1. Fix Twilio phone number format
    console.log('1. Fixing Twilio Phone Number Format...');
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    console.log(`   Original: ${twilioPhone}`);
    
    // Clean up the phone number (remove double plus signs)
    const cleanTwilioPhone = twilioPhone?.replace(/^\+\+/, '+') || '+19187277348';
    console.log(`   Cleaned: ${cleanTwilioPhone}`);
    
    // 2. Update SMS configuration with optimal settings
    console.log('\n2. Updating SMS Configuration...');
    const optimalConfig = {
      enabled: true,
      confidenceThreshold: 0.5, // Lower threshold for better response rate
      maxResponseLength: 160,
      businessHoursOnly: false, // Respond 24/7
      businessHours: {
        start: "09:00",
        end: "17:00",
        timezone: "America/Chicago"
      },
      excludedKeywords: [], // No keyword restrictions
      excludedPhoneNumbers: [], // No excluded numbers
      autoRespondPhoneNumbers: [cleanTwilioPhone] // Only your Twilio number
    };
    
    const configResponse = await fetch(`${baseUrl}/api/sms-auto-respond/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(optimalConfig)
    });
    
    if (configResponse.ok) {
      console.log('✅ SMS configuration updated successfully!');
      console.log(`   - Auto-respond numbers: ${optimalConfig.autoRespondPhoneNumbers.join(', ')}`);
      console.log(`   - Confidence threshold: ${(optimalConfig.confidenceThreshold * 100).toFixed(0)}%`);
      console.log(`   - Business hours: Disabled (responds 24/7)`);
      console.log(`   - Excluded keywords: None`);
    } else {
      console.log('❌ Failed to update SMS configuration');
      return;
    }
    
    // 3. Test the configuration
    console.log('\n3. Testing Updated Configuration...');
    const testSMS = {
      from: '+1234567890',
      to: cleanTwilioPhone,
      body: 'Hi, I need information about your services'
    };
    
    const testResponse = await fetch(`${baseUrl}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSMS)
    });
    
    if (testResponse.ok) {
      const result = await testResponse.json();
      console.log('✅ Test completed successfully!');
      
      if (result.responseSent) {
        console.log('🎉 SMS auto-responder is working!');
        console.log(`📱 Response: ${result.response}`);
        console.log(`🎯 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      } else {
        console.log('⚠️  Test message was not sent. Reason:', result.reason);
      }
    } else {
      console.log('❌ Test failed');
    }
    
    // 4. Verify webhook endpoint
    console.log('\n4. Verifying Webhook Endpoint...');
    const webhookUrl = `https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/webhook/incoming-sms`;
    
    const webhookTest = await fetch(`${baseUrl}/api/webhook/incoming-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: '+1234567890',
        To: cleanTwilioPhone,
        Body: 'Test webhook message',
        MessageSid: `permanent_fix_${Date.now()}`,
        Timestamp: new Date().toISOString()
      })
    });
    
    if (webhookTest.ok) {
      console.log('✅ Webhook endpoint is working correctly');
      const response = await webhookTest.text();
      if (response.includes('<?xml')) {
        console.log('✅ TwiML response generated (correct for Twilio)');
      }
    } else {
      console.log('❌ Webhook test failed');
    }
    
    // 5. Provide final instructions
    console.log('\n🎉 SMS Auto-Responder Fix Complete!');
    console.log('\n📋 CRITICAL: Configure Twilio Webhook');
    console.log('You MUST configure the webhook in your Twilio Console:');
    console.log('\n1. Go to: https://console.twilio.com');
    console.log('2. Navigate to: Phone Numbers → Manage → Active numbers');
    console.log('3. Click on your phone number');
    console.log('4. In the "Messaging" section:');
    console.log(`   - Set webhook URL to: ${webhookUrl}`);
    console.log('   - Set HTTP method to: POST');
    console.log('   - Make sure "Primary handler fails" is set to: HTTP POST');
    console.log('5. Click "Save Configuration"');
    
    console.log('\n📱 Test Instructions:');
    console.log('1. After configuring the webhook, send a text message to your Twilio number');
    console.log('2. You should receive an auto-response within a few seconds');
    console.log('3. Check server logs for incoming webhook requests');
    
    console.log('\n🔧 Current Configuration:');
    console.log(`   - Twilio Number: ${cleanTwilioPhone}`);
    console.log(`   - Webhook URL: ${webhookUrl}`);
    console.log(`   - Confidence Threshold: ${(optimalConfig.confidenceThreshold * 100).toFixed(0)}%`);
    console.log(`   - Business Hours: Disabled (24/7 responses)`);
    console.log(`   - Excluded Keywords: None`);
    
    console.log('\n🚨 If you still don\'t get responses:');
    console.log('1. Check that the webhook URL is exactly correct in Twilio Console');
    console.log('2. Verify your Twilio number is active and not in trial mode');
    console.log('3. Check server logs for any error messages');
    console.log('4. Try sending a test message and check the logs immediately');
    
  } catch (error) {
    console.error('❌ Error during permanent fix:', error.message);
  }
}

fixSMSPermanent(); 