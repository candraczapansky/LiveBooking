// Comprehensive SendGrid Email Debugging Script
// Following the debugging plan outlined by the user

import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';

dotenv.config();

console.log('🔍 COMPREHENSIVE SENDGRID EMAIL DEBUGGING');
console.log('==========================================');

// Step 1: Check Runtime Errors and Logs
console.log('\n📋 STEP 1: Environment Variables Check');
console.log('=====================================');

const envApiKey = process.env.SENDGRID_API_KEY;
const envFromEmail = process.env.SENDGRID_FROM_EMAIL;
const envVerifiedSender = process.env.VERIFIED_SENDER_EMAIL;

console.log('SENDGRID_API_KEY:', envApiKey ? '✅ Loaded' : '❌ Missing');
console.log('SENDGRID_FROM_EMAIL:', envFromEmail || '❌ Missing');
console.log('VERIFIED_SENDER_EMAIL:', envVerifiedSender || '❌ Missing');

if (!envApiKey) {
  console.error('❌ SENDGRID_API_KEY not found. Cannot proceed with test.');
  process.exit(1);
}

// Step 2: Verify Environment Variables at Runtime
console.log('\n📋 STEP 2: Runtime Environment Verification');
console.log('==========================================');

// Initialize SendGrid with current API key
sgMail.setApiKey(envApiKey);
console.log('✅ SendGrid client initialized with API key');

// Log the actual values (masked for security)
console.log('API Key length:', envApiKey.length);
console.log('API Key starts with:', envApiKey.substring(0, 10) + '...');
console.log('From Email:', envFromEmail);
console.log('Verified Sender:', envVerifiedSender);

// Step 3: Create Test Email Payload
console.log('\n📋 STEP 3: Email Payload Inspection');
console.log('=====================================');

const testEmail = process.env.TEST_EMAIL || 'test@example.com';
const fromEmail = envFromEmail || envVerifiedSender || 'noreply@gloheadspa.com';

const msg = {
  to: testEmail,
  from: fromEmail,
  subject: 'SendGrid Debug Test - ' + new Date().toISOString(),
  text: 'This is a comprehensive test email to debug SendGrid functionality.',
  html: `
    <h1>SendGrid Debug Test</h1>
    <p>This is a comprehensive test email to debug SendGrid functionality.</p>
    <p><strong>Test Details:</strong></p>
    <ul>
      <li>From: ${fromEmail}</li>
      <li>To: ${testEmail}</li>
      <li>Timestamp: ${new Date().toISOString()}</li>
      <li>API Key: ${envApiKey ? 'Configured' : 'Missing'}</li>
    </ul>
    <p>If you receive this email, SendGrid is working correctly.</p>
  `
};

// Log the complete payload
console.log('📧 Email Payload Details:');
console.log('From:', msg.from);
console.log('To:', msg.to);
console.log('Subject:', msg.subject);
console.log('Text length:', msg.text.length);
console.log('HTML length:', msg.html.length);

// Step 4: Send Test Email with Detailed Error Handling
console.log('\n📋 STEP 4: Sending Test Email with Enhanced Error Logging');
console.log('==========================================================');

(async () => {
  try {
    console.log('🚀 Attempting to send email...');
    console.log('📧 SendGrid Payload:', JSON.stringify(msg, null, 2));
    
    const response = await sgMail.send(msg);
    
    console.log('✅ Test email sent successfully!');
    console.log('SendGrid response status:', response[0]?.statusCode);
    console.log('SendGrid message ID:', response[0]?.headers?.['x-message-id']);
    console.log('SendGrid response headers:', response[0]?.headers);
    
    // Additional success logging
    console.log('\n🎉 SUCCESS: SendGrid is working correctly!');
    console.log('✅ API Key: Valid');
    console.log('✅ Sender Email: Valid');
    console.log('✅ Email Delivery: Successful');
    
  } catch (error) {
    console.error('❌ Test email failed:');
    console.error('Error message:', error.message);
    
    // Enhanced error logging with specific guidance
    if (error.response) {
      console.error('\n📊 SendGrid Response Details:');
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      
      if (error.response.body) {
        console.error('Response Body:', JSON.stringify(error.response.body, null, 2));
        
        if (error.response.body.errors) {
          console.error('\n🔧 Specific SendGrid Errors:');
          error.response.body.errors.forEach((err, index) => {
            console.error(`Error ${index + 1}:`);
            console.error('  Message:', err.message);
            if (err.field) console.error('  Field:', err.field);
            if (err.help) console.error('  Help:', err.help);
            
            // Provide specific guidance based on error type
            if (err.message && err.message.includes('verified Sender Identity')) {
              console.error('\n🔧 SENDER VERIFICATION FIX REQUIRED:');
              console.error('1. Go to your SendGrid account dashboard');
              console.error('2. Navigate to Settings > Sender Authentication');
              console.error('3. Verify the sender email:', fromEmail);
              console.error('4. Update your SENDGRID_FROM_EMAIL environment variable');
              console.error('5. Restart your application');
            } else if (err.message && err.message.includes('API key')) {
              console.error('\n🔧 API KEY ISSUE:');
              console.error('1. Check if your SendGrid API key is valid');
              console.error('2. Ensure the API key has "Mail Send" permissions');
              console.error('3. Verify the API key in your SendGrid account');
            } else if (err.message && err.message.includes('rate limit')) {
              console.error('\n🔧 RATE LIMIT EXCEEDED:');
              console.error('1. Check your SendGrid sending limits');
              console.error('2. Consider upgrading your SendGrid plan');
              console.error('3. Implement rate limiting in your application');
            }
          });
        }
      }
    }
    
    // Log additional error context
    console.error('\n🔍 Error Context:');
    console.error('API Key loaded:', !!envApiKey);
    console.error('From email:', fromEmail);
    console.error('To email:', testEmail);
    console.error('Subject:', msg.subject);
    
    // Network and connectivity issues
    console.error('\n🌐 Network/Connectivity Check:');
    console.error('If you see network errors, check:');
    console.error('1. Internet connectivity from Replit');
    console.error('2. SendGrid API endpoint accessibility');
    console.error('3. Firewall or proxy settings');
  }
})();

// Step 5: Test with Different Email Templates
console.log('\n📋 STEP 5: Testing with Appointment Confirmation Template');
console.log('==========================================================');

const appointmentConfirmationMsg = {
  to: testEmail,
  from: fromEmail,
  subject: 'Appointment Confirmation Test - Glo Head Spa',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Appointment Confirmation</h2>
      <p>Hello Test User,</p>
      <p>Your appointment has been confirmed:</p>
      <ul>
        <li><strong>Service:</strong> Test Service</li>
        <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
        <li><strong>Time:</strong> 10:00 AM - 11:00 AM</li>
        <li><strong>Staff:</strong> Test Staff</li>
      </ul>
      <p>We look forward to seeing you!</p>
    </div>
  `,
  text: `Appointment Confirmation - Your appointment for Test Service on ${new Date().toLocaleDateString()} at 10:00 AM has been confirmed.`
};

(async () => {
  try {
    console.log('🚀 Testing appointment confirmation template...');
    const response = await sgMail.send(appointmentConfirmationMsg);
    console.log('✅ Appointment confirmation template sent successfully!');
    console.log('Message ID:', response[0]?.headers?.['x-message-id']);
  } catch (error) {
    console.error('❌ Appointment confirmation template failed:', error.message);
  }
})();

console.log('\n📋 STEP 6: Summary and Recommendations');
console.log('==========================================');

console.log('Based on the test results above:');
console.log('1. If both tests succeed: SendGrid is working correctly');
console.log('2. If tests fail: Check the specific error messages above');
console.log('3. Common issues:');
console.log('   - Sender email not verified in SendGrid');
console.log('   - API key permissions insufficient');
console.log('   - Rate limiting');
console.log('   - Network connectivity issues');

console.log('\n🔧 Next Steps:');
console.log('1. Check SendGrid Activity Feed for email delivery status');
console.log('2. Verify sender authentication in SendGrid dashboard');
console.log('3. Test with your actual application endpoints');
console.log('4. Monitor server logs for email-related errors');

console.log('\n✅ Debugging script completed!'); 