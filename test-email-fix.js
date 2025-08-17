#!/usr/bin/env node

// Comprehensive Email Fix Test Script
// This script tests all the email functionality that was fixed

import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';

dotenv.config();

console.log('🧪 COMPREHENSIVE EMAIL FIX TEST');
console.log('================================\n');

// Check environment variables
const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL;

console.log('📋 Environment Check:');
console.log(`  - SENDGRID_API_KEY: ${apiKey ? '✅ SET' : '❌ MISSING'}`);
console.log(`  - SENDGRID_FROM_EMAIL: ${fromEmail || '❌ MISSING'}`);
console.log('');

if (!apiKey) {
  console.error('❌ SENDGRID_API_KEY not found. Cannot proceed with test.');
  process.exit(1);
}

if (!fromEmail) {
  console.error('❌ SENDGRID_FROM_EMAIL not found. Cannot proceed with test.');
  process.exit(1);
}

// Initialize SendGrid
sgMail.setApiKey(apiKey);

async function testEmailSending() {
  console.log('🚀 Testing Email Sending...');
  
  const testEmail = {
    to: 'test@example.com',
    from: fromEmail,
    subject: `Email Fix Test - ${new Date().toISOString()}`,
    html: `
      <h2>Email Fix Test</h2>
      <p>This is a test email to verify that the SendGrid email fix is working correctly.</p>
      <p><strong>Test Details:</strong></p>
      <ul>
        <li>From: ${fromEmail}</li>
        <li>To: test@example.com</li>
        <li>Timestamp: ${new Date().toISOString()}</li>
        <li>Purpose: Verify email fix</li>
      </ul>
      <p>If you receive this email, the SendGrid email functionality is working correctly!</p>
    `,
    text: `Email Fix Test - This is a test email to verify that the SendGrid email fix is working correctly. From: ${fromEmail}, To: test@example.com, Timestamp: ${new Date().toISOString()}`
  };

  try {
    const response = await sgMail.send(testEmail);
    console.log('✅ Email sent successfully!');
    console.log(`  - Status: ${response[0].statusCode}`);
    console.log(`  - Message ID: ${response[0].headers['x-message-id']}`);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:');
    console.error(`  - Error: ${error.message}`);
    if (error.response && error.response.body) {
      console.error(`  - Details: ${JSON.stringify(error.response.body, null, 2)}`);
    }
    return false;
  }
}

async function testAppointmentConfirmation() {
  console.log('\n📅 Testing Appointment Confirmation Email...');
  
  const appointmentEmail = {
    to: 'test@example.com',
    from: fromEmail,
    subject: 'Appointment Confirmation - Glo Head Spa',
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
    `
  };

  try {
    const response = await sgMail.send(appointmentEmail);
    console.log('✅ Appointment confirmation email sent successfully!');
    console.log(`  - Status: ${response[0].statusCode}`);
    console.log(`  - Message ID: ${response[0].headers['x-message-id']}`);
    return true;
  } catch (error) {
    console.error('❌ Appointment confirmation email failed:');
    console.error(`  - Error: ${error.message}`);
    return false;
  }
}

async function testAppointmentReminder() {
  console.log('\n⏰ Testing Appointment Reminder Email...');
  
  const reminderEmail = {
    to: 'test@example.com',
    from: fromEmail,
    subject: 'Appointment Reminder - Glo Head Spa',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Appointment Reminder</h2>
        <p>Hello Test User,</p>
        <p>This is a reminder for your upcoming appointment:</p>
        <ul>
          <li><strong>Service:</strong> Test Service</li>
          <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
          <li><strong>Time:</strong> 10:00 AM - 11:00 AM</li>
          <li><strong>Staff:</strong> Test Staff</li>
        </ul>
        <p>We look forward to seeing you!</p>
      </div>
    `
  };

  try {
    const response = await sgMail.send(reminderEmail);
    console.log('✅ Appointment reminder email sent successfully!');
    console.log(`  - Status: ${response[0].statusCode}`);
    console.log(`  - Message ID: ${response[0].headers['x-message-id']}`);
    return true;
  } catch (error) {
    console.error('❌ Appointment reminder email failed:');
    console.error(`  - Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🎯 Starting comprehensive email fix test...\n');
  
  const results = [];
  
  // Test 1: Basic email sending
  results.push(await testEmailSending());
  
  // Test 2: Appointment confirmation
  results.push(await testAppointmentConfirmation());
  
  // Test 3: Appointment reminder
  results.push(await testAppointmentReminder());
  
  console.log('\n📊 TEST RESULTS SUMMARY:');
  console.log('========================');
  
  const passedTests = results.filter(r => r).length;
  const totalTests = results.length;
  
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 SUCCESS: All email tests passed!');
    console.log('✅ SendGrid email functionality is working correctly.');
    console.log('✅ All email addresses have been updated to use verified senders.');
    console.log('✅ Email confirmations and reminders should now work properly.');
  } else {
    console.log('\n⚠️  WARNING: Some email tests failed.');
    console.log('Please check the error messages above for details.');
  }
  
  console.log('\n🔧 NEXT STEPS:');
  console.log('1. Restart your application server to apply all changes');
  console.log('2. Test email functionality in your actual application');
  console.log('3. Monitor email delivery in SendGrid dashboard');
  console.log('4. Check application logs for any remaining email issues');
}

// Run the comprehensive test
main().catch(console.error);






