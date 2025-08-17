#!/usr/bin/env node

// SendGrid Sender Verification Fix Script
// This script will verify which senders are working and fix verification issues

import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';

dotenv.config();

console.log('🔧 SENDGRID SENDER VERIFICATION FIX');
console.log('=====================================\n');

// Check if API key is available
if (!process.env.SENDGRID_API_KEY) {
  console.error('❌ SENDGRID_API_KEY not found. Please set it in your environment.');
  process.exit(1);
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// List of email addresses used in the application
const EMAIL_ADDRESSES_TO_TEST = [
  'hello@headspaglo.com',           // Current SENDGRID_FROM_EMAIL
  'noreply@gloheadspa.com',         // Fallback in many routes
  'noreply@gloupheadspa.app',       // Alternative fallback
  'notifications@gloupheadspa.app'  // Another fallback
];

console.log('📧 Testing email addresses used in the application:');
EMAIL_ADDRESSES_TO_TEST.forEach((email, index) => {
  console.log(`${index + 1}. ${email}`);
});
console.log('');

async function testEmailSender(fromEmail, toEmail = 'test@example.com') {
  console.log(`🧪 Testing sender: ${fromEmail}`);
  
  const msg = {
    to: toEmail,
    from: fromEmail,
    subject: `SendGrid Test - ${fromEmail} - ${new Date().toISOString()}`,
    text: `This is a test email from ${fromEmail} to verify sender authentication.`,
    html: `
      <h2>SendGrid Sender Test</h2>
      <p>This is a test email from <strong>${fromEmail}</strong> to verify sender authentication.</p>
      <p><strong>Test Details:</strong></p>
      <ul>
        <li>From: ${fromEmail}</li>
        <li>To: ${toEmail}</li>
        <li>Timestamp: ${new Date().toISOString()}</li>
        <li>Purpose: Sender verification test</li>
      </ul>
      <p>If you receive this email, the sender ${fromEmail} is properly verified in SendGrid.</p>
    `
  };

  try {
    const response = await sgMail.send(msg);
    console.log(`  ✅ SUCCESS: ${fromEmail} - Status: ${response[0].statusCode}`);
    console.log(`     Message ID: ${response[0].headers['x-message-id']}`);
    return true;
  } catch (error) {
    console.log(`  ❌ FAILED: ${fromEmail}`);
    console.log(`     Error: ${error.message}`);
    
    // Check for specific error messages
    if (error.message.includes('does not match a verified Sender Identity')) {
      console.log(`     📋 Action needed: Verify ${fromEmail} in SendGrid dashboard`);
      console.log(`        Go to: https://app.sendgrid.com/settings/sender_auth`);
    } else if (error.message.includes('The from address is not a verified sender')) {
      console.log(`     📋 Action needed: Add ${fromEmail} as verified sender`);
    } else if (error.response && error.response.body) {
      console.log(`     📋 Details: ${JSON.stringify(error.response.body, null, 2)}`);
    }
    
    return false;
  }
}

async function main() {
  console.log('🚀 Starting sender verification tests...\n');
  
  const results = [];
  
  for (const email of EMAIL_ADDRESSES_TO_TEST) {
    const success = await testEmailSender(email);
    results.push({ email, success });
    console.log(''); // Add spacing between tests
  }
  
  console.log('📊 SUMMARY RESULTS:');
  console.log('===================');
  
  const successfulSenders = results.filter(r => r.success);
  const failedSenders = results.filter(r => !r.success);
  
  if (successfulSenders.length > 0) {
    console.log('\n✅ VERIFIED SENDERS (working):');
    successfulSenders.forEach(r => console.log(`   - ${r.email}`));
  }
  
  if (failedSenders.length > 0) {
    console.log('\n❌ UNVERIFIED SENDERS (need attention):');
    failedSenders.forEach(r => console.log(`   - ${r.email}`));
    
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    console.log('1. Log into your SendGrid account: https://app.sendgrid.com');
    console.log('2. Go to Settings > Sender Authentication');
    console.log('3. Verify one or more of these email addresses:');
    failedSenders.forEach(r => console.log(`   - ${r.email}`));
    console.log('4. After verification, restart your application');
  }
  
  if (successfulSenders.length === 0) {
    console.log('\n⚠️  WARNING: No verified senders found!');
    console.log('   This means emails are likely failing in your application.');
    console.log('   Please verify at least one sender email address in SendGrid.');
  } else {
    console.log('\n✅ RECOMMENDATION: Update SENDGRID_FROM_EMAIL to use a verified sender:');
    console.log(`   export SENDGRID_FROM_EMAIL="${successfulSenders[0].email}"`);
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Verify any unverified senders in SendGrid dashboard');
  console.log('2. Update environment variable to use verified sender');
  console.log('3. Restart application server');
  console.log('4. Test email functionality in your app');
}

// Run the verification test
main().catch(console.error);






