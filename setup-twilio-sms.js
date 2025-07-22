#!/usr/bin/env node

/**
 * Twilio SMS Auto-Responder Setup Script
 * 
 * This script helps you configure Twilio for SMS auto-responder integration.
 * Run this script after setting up your Twilio account.
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupTwilioSMS() {
  console.log('🚀 Twilio SMS Auto-Responder Setup\n');
  console.log('This script will help you configure Twilio for SMS auto-responder integration.\n');

  // Check if .env file exists
  const envPath = path.join(process.cwd(), '.env');
  const envExists = fs.existsSync(envPath);
  
  if (!envExists) {
    console.log('❌ No .env file found. Please create one first.');
    console.log('You can copy from .env.example if available.\n');
    return;
  }

  console.log('📋 Step 1: Twilio Account Information\n');
  
  const accountSid = await question('Enter your Twilio Account SID (starts with "AC"): ');
  const authToken = await question('Enter your Twilio Auth Token: ');
  const phoneNumber = await question('Enter your Twilio phone number (e.g., +1234567890): ');
  
  // Validate inputs
  if (!accountSid.startsWith('AC')) {
    console.log('❌ Invalid Account SID. It should start with "AC".');
    return;
  }
  
  if (!phoneNumber.startsWith('+')) {
    console.log('❌ Invalid phone number. It should start with "+".');
    return;
  }

  console.log('\n📋 Step 2: Webhook Configuration\n');
  
  const domain = await question('Enter your domain (e.g., your-app.replit.app): ');
  const webhookUrl = `https://${domain}/api/webhook/incoming-sms`;
  
  console.log(`\n✅ Your webhook URL will be: ${webhookUrl}\n`);

  console.log('📋 Step 3: Environment Variables\n');
  
  // Read existing .env file
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if variables already exist
  const hasTwilioSid = envContent.includes('TWILIO_ACCOUNT_SID=');
  const hasTwilioToken = envContent.includes('TWILIO_AUTH_TOKEN=');
  const hasTwilioPhone = envContent.includes('TWILIO_PHONE_NUMBER=');
  
  if (hasTwilioSid || hasTwilioToken || hasTwilioPhone) {
    console.log('⚠️  Some Twilio variables already exist in .env file.');
    const overwrite = await question('Do you want to overwrite them? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      return;
    }
  }
  
  // Remove existing Twilio variables
  envContent = envContent
    .split('\n')
    .filter(line => !line.startsWith('TWILIO_ACCOUNT_SID=') && 
                   !line.startsWith('TWILIO_AUTH_TOKEN=') && 
                   !line.startsWith('TWILIO_PHONE_NUMBER='))
    .join('\n');
  
  // Add new Twilio variables
  const twilioVars = `\n# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=${accountSid}
TWILIO_AUTH_TOKEN=${authToken}
TWILIO_PHONE_NUMBER=${phoneNumber}`;
  
  envContent += twilioVars;
  
  // Write back to .env file
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ Environment variables updated successfully!\n');

  console.log('📋 Step 4: Twilio Console Configuration\n');
  console.log('Now you need to configure the webhook in your Twilio Console:\n');
  console.log('1. Log into your Twilio Console (https://console.twilio.com)');
  console.log('2. Go to Phone Numbers → Manage → Active numbers');
  console.log('3. Click on your phone number');
  console.log('4. In the "Messaging" section:');
  console.log(`   - Set webhook URL to: ${webhookUrl}`);
  console.log('   - Set HTTP method to: POST');
  console.log('5. Click "Save Configuration"\n');

  console.log('📋 Step 5: Testing\n');
  console.log('After configuration, you can test the SMS auto-responder:');
  console.log('1. Go to your AI Messaging page');
  console.log('2. Click the "SMS Auto-Respond" tab');
  console.log('3. Use the test interface to send a sample SMS');
  console.log('4. Check that auto-responses are working correctly\n');

  console.log('📋 Step 6: Security Considerations\n');
  console.log('For production use, consider:');
  console.log('- Implementing webhook signature validation');
  console.log('- Adding rate limiting to webhook endpoints');
  console.log('- Monitoring webhook logs for suspicious activity');
  console.log('- Setting up alerts for failed SMS deliveries\n');

  console.log('🎉 Setup complete! Your SMS auto-responder should now be ready to use.');
  console.log('\nFor more information, see: SMS_AUTO_RESPOND_SETUP_GUIDE.md');
}

// Handle script execution
if (require.main === module) {
  setupTwilioSMS()
    .then(() => {
      rl.close();
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error.message);
      rl.close();
      process.exit(1);
    });
}

module.exports = { setupTwilioSMS }; 