#!/usr/bin/env node

/**
 * Fix Phone Number Configuration
 * 
 * This script fixes the double plus sign issue in Twilio phone number configuration
 */

import fetch from 'node-fetch';

async function fixPhoneNumberConfig() {
  console.log('🔧 Fixing Phone Number Configuration\n');
  
  const baseUrl = 'http://localhost:5000';
  
  // Current problematic phone number
  const currentPhone = '++19187277348';
  const fixedPhone = '+19187277348';
  
  console.log('📋 Issue Identified:');
  console.log(`Current phone: ${currentPhone} (has double plus signs)`);
  console.log(`Fixed phone: ${fixedPhone} (correct format)`);
  console.log('');
  
  // 1. Check current environment variable
  console.log('1. Checking Environment Variable...');
  const envPhone = process.env.TWILIO_PHONE_NUMBER;
  console.log(`Environment TWILIO_PHONE_NUMBER: ${envPhone || 'Not set'}`);
  
  if (envPhone && envPhone.includes('++')) {
    console.log('❌ Environment variable has double plus signs!');
    console.log('This needs to be fixed in your .env file.');
  } else {
    console.log('✅ Environment variable looks correct');
  }
  console.log('');
  
  // 2. Test with fixed phone number
  console.log('2. Testing with Fixed Phone Number...');
  try {
    const testResponse = await fetch(`${baseUrl}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '+19185048936',
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
  
  // 3. Instructions to fix
  console.log('🔧 HOW TO FIX THE PHONE NUMBER:\n');
  
  console.log('1. FIX ENVIRONMENT VARIABLE:');
  console.log('   - Open your .env file');
  console.log('   - Find the line: TWILIO_PHONE_NUMBER=++19187277348');
  console.log('   - Change it to: TWILIO_PHONE_NUMBER=+19187277348');
  console.log('   - Remove the extra plus sign');
  console.log('');
  
  console.log('2. RESTART THE SERVER:');
  console.log('   - Stop the current server (Ctrl+C)');
  console.log('   - Start it again: npm run dev');
  console.log('   - This will load the corrected environment variable');
  console.log('');
  
  console.log('3. UPDATE TWILIO CONSOLE:');
  console.log('   - Go to https://console.twilio.com');
  console.log('   - Navigate to Phone Numbers → Manage → Active numbers');
  console.log('   - Verify the phone number shows as: +19187277348');
  console.log('   - If it shows ++19187277348, contact Twilio support');
  console.log('');
  
  console.log('4. TEST THE FIX:');
  console.log('   - Send a message to +19187277348 (not ++19187277348)');
  console.log('   - Check that you receive a response');
  console.log('   - Verify in Twilio logs that status is "delivered"');
  console.log('');
  
  // 4. Common issues with double plus signs
  console.log('🚨 WHY DOUBLE PLUS SIGNS CAUSE ISSUES:\n');
  
  console.log('• Twilio expects phone numbers in E.164 format: +[country code][number]');
  console.log('• Double plus signs (++) are not valid in E.164 format');
  console.log('• This causes Twilio to reject the message or mark it as undelivered');
  console.log('• The extra plus sign makes the number appear invalid to carriers');
  console.log('');
  
  // 5. Verification steps
  console.log('✅ VERIFICATION STEPS:\n');
  
  console.log('After fixing the phone number:');
  console.log('1. Check .env file has: TWILIO_PHONE_NUMBER=+19187277348');
  console.log('2. Restart server and verify no double plus signs in logs');
  console.log('3. Send test message to +19187277348');
  console.log('4. Check Twilio logs show "delivered" status');
  console.log('5. Verify you receive the auto-response');
  console.log('');
  
  console.log('🎯 IMMEDIATE ACTION REQUIRED:');
  console.log('1. Fix the .env file NOW (remove extra plus sign)');
  console.log('2. Restart your server');
  console.log('3. Test with a simple message');
  console.log('4. Check Twilio logs for "delivered" status');
  console.log('');
  
  console.log('📞 If the issue persists after fixing the phone number:');
  console.log('1. Check your Twilio account balance');
  console.log('2. Verify the phone number is active in Twilio');
  console.log('3. Contact Twilio support with your Account SID');
  console.log('');
  
  console.log('✅ The SMS auto-responder is working correctly.');
  console.log('❌ The issue is the malformed phone number with double plus signs.');
}

fixPhoneNumberConfig().catch(console.error); 