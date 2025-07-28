#!/usr/bin/env node

/**
 * Fix Phone Number Configuration
 * 
 * This script fixes the phone number configuration for SMS auto-responder
 */

import fetch from 'node-fetch';

async function fixPhoneNumbers() {
  console.log('🔧 Fixing Phone Number Configuration\n');
  
  const baseUrl = 'http://localhost:5000';
  
  try {
    // Get current Twilio phone number
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    console.log(`Current Twilio phone: ${twilioPhone}`);
    
    // Clean up the phone number (remove double plus signs)
    const cleanTwilioPhone = twilioPhone?.replace(/^\+\+/, '+') || '+19187277348';
    console.log(`Cleaned Twilio phone: ${cleanTwilioPhone}`);
    
    // Get current configuration
    console.log('\n1. Getting current configuration...');
    const configResponse = await fetch(`${baseUrl}/api/sms-auto-respond/config`);
    if (!configResponse.ok) {
      console.log('❌ Failed to get current configuration');
      return;
    }
    
    const currentConfig = await configResponse.json();
    console.log('Current auto-respond numbers:', currentConfig.autoRespondPhoneNumbers);
    
    // Update configuration with correct phone numbers
    console.log('\n2. Updating configuration...');
    const updatedConfig = {
      ...currentConfig,
      autoRespondPhoneNumbers: [cleanTwilioPhone], // Only include the Twilio number
      confidenceThreshold: 0.5, // Lower threshold for testing
      excludedKeywords: [], // Clear excluded keywords
      businessHoursOnly: false // Disable business hours restriction
    };
    
    const updateResponse = await fetch(`${baseUrl}/api/sms-auto-respond/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedConfig)
    });
    
    if (updateResponse.ok) {
      console.log('✅ Configuration updated successfully!');
      console.log(`✅ Auto-respond numbers: ${updatedConfig.autoRespondPhoneNumbers.join(', ')}`);
      console.log(`✅ Confidence threshold: ${(updatedConfig.confidenceThreshold * 100).toFixed(0)}%`);
      console.log(`✅ Business hours: ${updatedConfig.businessHoursOnly ? 'Enabled' : 'Disabled'}`);
    } else {
      console.log('❌ Failed to update configuration');
      return;
    }
    
    // Test the configuration
    console.log('\n3. Testing updated configuration...');
    const testSMS = {
      from: '+1234567890',
      to: cleanTwilioPhone,
      body: 'Test message after configuration fix'
    };
    
    const testResponse = await fetch(`${baseUrl}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSMS)
    });
    
    if (testResponse.ok) {
      const result = await testResponse.json();
      console.log('✅ Test result:', result);
      
      if (result.responseSent) {
        console.log('🎉 SMS auto-responder is now working correctly!');
        console.log(`📱 Response: ${result.response}`);
        console.log(`🎯 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      } else {
        console.log('⚠️  Test message was not sent. Reason:', result.reason);
      }
    } else {
      console.log('❌ Test failed');
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Send a text message to your Twilio number from your phone');
    console.log('2. Check server logs for incoming webhook requests');
    console.log('3. You should now receive an auto-response');
    
  } catch (error) {
    console.error('❌ Error fixing phone numbers:', error.message);
  }
}

fixPhoneNumbers(); 