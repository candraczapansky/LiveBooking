#!/usr/bin/env node

/**
 * SMS Issue Diagnostic
 * 
 * This script helps diagnose why SMS responses aren't working from actual phones
 */

import fetch from 'node-fetch';

async function diagnoseSMSIssue() {
  console.log('🔍 SMS Issue Diagnostic\n');
  
  const baseUrl = 'http://localhost:5000';
  
  try {
    // 1. Check current configuration
    console.log('1. Checking SMS Configuration...');
    const config = await fetch(`${baseUrl}/api/sms-auto-respond/config`);
    if (config.ok) {
      const configData = await config.json();
      console.log('✅ Configuration loaded:');
      console.log(`   - Enabled: ${configData.enabled}`);
      console.log(`   - Confidence Threshold: ${(configData.confidenceThreshold * 100).toFixed(0)}%`);
      console.log(`   - Auto-Respond Numbers: ${configData.autoRespondPhoneNumbers.join(', ')}`);
      console.log(`   - Excluded Keywords: ${configData.excludedKeywords.join(', ') || 'None'}`);
      console.log(`   - Business Hours Only: ${configData.businessHoursOnly}`);
      
      // Check if your Twilio number is in the auto-respond list
      const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
      if (twilioNumber && !configData.autoRespondPhoneNumbers.includes(twilioNumber)) {
        console.log(`⚠️  WARNING: Your Twilio number ${twilioNumber} is NOT in the auto-respond list!`);
        console.log('   This means SMS sent TO your Twilio number won\'t trigger auto-responses.');
      }
    } else {
      console.log('❌ Failed to load configuration');
    }
    
    // 2. Check Twilio credentials
    console.log('\n2. Checking Twilio Configuration...');
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    
    console.log(`   - Account SID: ${twilioSid ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - Auth Token: ${twilioToken ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - Phone Number: ${twilioPhone || '❌ Missing'}`);
    
    // 3. Test webhook with your actual phone number
    console.log('\n3. Testing Webhook with Real Phone Number...');
    console.log('   What phone number are you texting FROM? (e.g., +1234567890)');
    
    // Simulate a test with a real phone number
    const testPhoneNumber = '+1234567890'; // Replace with your actual phone number
    const testSMS = {
      From: testPhoneNumber,
      To: twilioPhone || '+19187277348',
      Body: 'Test message from my phone',
      MessageSid: `diagnostic_${Date.now()}`,
      Timestamp: new Date().toISOString()
    };
    
    console.log(`   Testing with: ${testPhoneNumber} → ${twilioPhone || '+19187277348'}`);
    
    const webhookTest = await fetch(`${baseUrl}/api/webhook/incoming-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSMS)
    });
    
    if (webhookTest.ok) {
      const response = await webhookTest.text();
      console.log('   ✅ Webhook responded successfully');
      
      // Check if response was sent
      if (response.includes('<?xml')) {
        console.log('   ✅ TwiML response generated (correct for Twilio)');
      }
    } else {
      console.log(`   ❌ Webhook failed: ${webhookTest.status}`);
    }
    
    // 4. Check if webhook is configured in Twilio
    console.log('\n4. Webhook Configuration Check...');
    const webhookUrl = `https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/webhook/incoming-sms`;
    console.log(`   Expected webhook URL: ${webhookUrl}`);
    console.log('   ⚠️  Please verify this URL is configured in your Twilio Console');
    
    // 5. Test external webhook accessibility
    console.log('\n5. Testing External Webhook Access...');
    try {
      const externalTest = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testSMS)
      });
      
      if (externalTest.ok) {
        console.log('   ✅ External webhook is accessible');
      } else {
        console.log(`   ❌ External webhook failed: ${externalTest.status}`);
      }
    } catch (error) {
      console.log(`   ❌ External webhook error: ${error.message}`);
    }
    
    // 6. Common issues and solutions
    console.log('\n6. Common Issues & Solutions:');
    console.log('   📱 If you\'re not getting responses:');
    console.log('      a) Check if your Twilio number is in auto-respond list');
    console.log('      b) Verify webhook URL is configured in Twilio Console');
    console.log('      c) Check if your message contains excluded keywords');
    console.log('      d) Verify confidence threshold isn\'t too high');
    console.log('      e) Check server logs for incoming webhook requests');
    
    console.log('\n   🔧 Quick Fixes:');
    console.log('      - Add your Twilio number to auto-respond list');
    console.log('      - Lower confidence threshold to 0.5');
    console.log('      - Clear excluded keywords list');
    console.log('      - Disable business hours restriction');
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
  }
}

diagnoseSMSIssue(); 