// Test script to debug SendGrid email functionality
import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';

dotenv.config();

console.log('🔍 SendGrid Debug Test Starting...');
console.log('=====================================');

// Step 1: Check environment variables
console.log('\n📋 STEP 1: Environment Variables Check');
console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ Loaded' : '❌ Missing');
console.log('VERIFIED_SENDER_EMAIL:', process.env.VERIFIED_SENDER_EMAIL || '❌ Missing');
console.log('SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL || '❌ Missing');

// Step 2: Initialize SendGrid
if (!process.env.SENDGRID_API_KEY) {
  console.error('❌ SENDGRID_API_KEY not found. Cannot proceed with test.');
  process.exit(1);
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
console.log('✅ SendGrid client initialized');

// Step 3: Create test email payload
const testEmail = process.env.TEST_EMAIL || 'test@example.com';
const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.VERIFIED_SENDER_EMAIL || 'noreply@gloheadspa.com';

const msg = {
  to: testEmail,
  from: fromEmail,
  subject: 'SendGrid Test from Replit - ' + new Date().toISOString(),
  text: 'This is a test email to confirm SendGrid is working properly.',
  html: '<h1>SendGrid Test</h1><p>This is a test email to confirm SendGrid is working properly.</p><p>Sent at: ' + new Date().toISOString() + '</p>'
};

// Step 4: Log the payload
console.log('\n📧 STEP 2: Email Payload');
console.log('From:', msg.from);
console.log('To:', msg.to);
console.log('Subject:', msg.subject);
console.log('Text length:', msg.text.length);
console.log('HTML length:', msg.html.length);

// Step 5: Send test email
console.log('\n📤 STEP 3: Sending Test Email');
(async () => {
  try {
    console.log('Attempting to send email...');
    const response = await sgMail.send(msg);
    console.log('✅ Test email sent successfully!');
    console.log('SendGrid response status:', response[0]?.statusCode);
    console.log('SendGrid response headers:', response[0]?.headers);
  } catch (error) {
    console.error('❌ Test email failed:');
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('SendGrid response status:', error.response.status);
      console.error('SendGrid response body:', JSON.stringify(error.response.body, null, 2));
      
      if (error.response.body && error.response.body.errors) {
        console.error('\n🔧 Specific SendGrid Errors:');
        error.response.body.errors.forEach((err, index) => {
          console.error(`Error ${index + 1}:`, err.message);
          if (err.field) console.error('Field:', err.field);
          if (err.help) console.error('Help:', err.help);
        });
      }
    }
    
    console.error('\n🔍 Error context:');
    console.error('API Key length:', process.env.SENDGRID_API_KEY?.length || 0);
    console.error('From email:', fromEmail);
    console.error('To email:', testEmail);
  }
})(); 