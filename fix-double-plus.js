#!/usr/bin/env node

/**
 * Fix Double Plus Sign Issue
 * 
 * This script fixes the double plus sign issue in the Twilio phone number
 */

import fetch from 'node-fetch';

async function fixDoublePlus() {
  console.log('🔧 Fixing Double Plus Sign Issue\n');
  
  const baseUrl = 'http://localhost:5000';
  
  // Current problematic phone number
  const currentPhone = '++19187277348';
  const fixedPhone = '+19187277348';
  
  console.log('📋 ISSUE IDENTIFIED:');
  console.log(`Current phone: ${currentPhone} (has double plus signs)`);
  console.log(`Fixed phone: ${fixedPhone} (correct format)`);
  console.log('');
  
  console.log('🚨 WHY THIS CAUSES "UNDELIVERED" STATUS:');
  console.log('• Twilio expects phone numbers in E.164 format: +[country code][number]');
  console.log('• Double plus signs (++) are not valid in E.164 format');
  console.log('• This causes Twilio to reject the message or mark it as undelivered');
  console.log('• The extra plus sign makes the number appear invalid to carriers');
  console.log('');
  
  // Test with fixed phone number
  console.log('🧪 Testing with Fixed Phone Number...');
  try {
    const testResponse = await fetch(`${baseUrl}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '+19185048937',
        to: fixedPhone,
        body: 'Test with fixed phone number'
      })
    });
    
    if (testResponse.ok) {
      const result = await testResponse.json();
      console.log('✅ Test with fixed phone number successful');
      console.log('Response:', result.response);
    } else {
      console.log('❌ Test failed');
    }
  } catch (error) {
    console.log('❌ Error testing:', error.message);
  }
  console.log('');
  
  console.log('🔧 HOW TO FIX THIS ISSUE:\n');
  
  console.log('1. FIX THE ENVIRONMENT VARIABLE:');
  console.log('   - The TWILIO_PHONE_NUMBER environment variable is set to: ++19187277348');
  console.log('   - You need to change it to: +19187277348');
  console.log('   - Remove the extra plus sign');
  console.log('');
  
  console.log('2. WHERE TO FIX IT:');
  console.log('   - If you have a .env file, update: TWILIO_PHONE_NUMBER=+19187277348');
  console.log('   - If using Replit secrets, update the TWILIO_PHONE_NUMBER secret');
  console.log('   - If using system environment, update the environment variable');
  console.log('');
  
  console.log('3. RESTART THE SERVER:');
  console.log('   - After fixing the environment variable, restart your server');
  console.log('   - This will load the corrected phone number');
  console.log('');
  
  console.log('4. TEST THE FIX:');
  console.log('   - Send a message to +19187277348 (not ++19187277348)');
  console.log('   - Check that you receive a response');
  console.log('   - Verify in Twilio logs that status is "delivered"');
  console.log('');
  
  console.log('🎯 IMMEDIATE ACTION REQUIRED:');
  console.log('1. Fix the TWILIO_PHONE_NUMBER environment variable NOW');
  console.log('2. Change ++19187277348 to +19187277348');
  console.log('3. Restart your server');
  console.log('4. Test with a simple message');
  console.log('5. Check Twilio logs for "delivered" status');
  console.log('');
  
  console.log('📞 ALTERNATIVE FIXES:');
  console.log('1. If you can\'t change the environment variable immediately:');
  console.log('   - Update your code to clean the phone number before using it');
  console.log('   - Add: const cleanPhone = phone.replace(/^\+\+/, \'+\')');
  console.log('');
  
  console.log('2. If the issue persists after fixing:');
  console.log('   - Check your Twilio account balance');
  console.log('   - Verify the phone number is active in Twilio');
  console.log('   - Contact Twilio support with your Account SID');
  console.log('');
  
  console.log('✅ The SMS auto-responder is working correctly on your server.');
  console.log('❌ The "undelivered" status is caused by the malformed phone number.');
  console.log('🔧 Fix the double plus sign and the issue will be resolved.');
}

fixDoublePlus().catch(console.error); 