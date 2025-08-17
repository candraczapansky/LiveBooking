#!/usr/bin/env node

// Marketing Email Debug Test Script
// This script tests the marketing email functionality to identify issues

import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';

dotenv.config();

console.log('🧪 MARKETING EMAIL DEBUG TEST');
console.log('=============================\n');

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

async function testMarketingEmail() {
  console.log('📢 Testing Marketing Email...');
  
  const marketingEmail = {
    to: 'test@example.com',
    from: fromEmail,
    subject: 'Glo Head Spa - Special Offer',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #e91e63; color: white; padding: 20px; text-align: center;">
          <h1>Glo Head Spa</h1>
          <h2>Special Offer</h2>
        </div>
        <div style="padding: 20px;">
          <h3>Hello Valued Client,</h3>
          <p>We have a special offer just for you!</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #e91e63; margin-top: 0;">🎉 20% Off All Services</h4>
            <p><strong>Use Code:</strong> SPECIAL20</p>
            <p><strong>Valid Until:</strong> End of Month</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Book Now</a>
          </div>
          <p style="margin-top: 30px; text-align: center; color: #666;">
            Thank you for choosing Glo Head Spa!<br>
            <a href="#" style="color: #e91e63;">Unsubscribe</a>
          </p>
        </div>
      </div>
    `,
    text: `Glo Head Spa - Special Offer\n\nHello Valued Client,\n\nWe have a special offer just for you!\n\n🎉 20% Off All Services\nUse Code: SPECIAL20\nValid Until: End of Month\n\nBook Now: [Link]\n\nThank you for choosing Glo Head Spa!`
  };

  try {
    const response = await sgMail.send(marketingEmail);
    console.log('✅ Marketing email sent successfully!');
    console.log(`  - Status: ${response[0].statusCode}`);
    console.log(`  - Message ID: ${response[0].headers['x-message-id']}`);
    return true;
  } catch (error) {
    console.error('❌ Marketing email failed:');
    console.error(`  - Error: ${error.message}`);
    if (error.response && error.response.body) {
      console.error(`  - Details: ${JSON.stringify(error.response.body, null, 2)}`);
    }
    return false;
  }
}

async function testCampaignEmail() {
  console.log('\n📢 Testing Campaign Email...');
  
  const campaignEmail = {
    to: 'test@example.com',
    from: fromEmail,
    subject: 'Marketing Campaign - Glo Head Spa',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #667eea; color: white; padding: 20px; text-align: center;">
          <h1>Glo Head Spa</h1>
          <h2>Marketing Campaign</h2>
        </div>
        <div style="padding: 20px;">
          <h3>Hello Test Client,</h3>
          <p>This is a test marketing campaign email.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #667eea; margin-top: 0;">Special Promotion</h4>
            <p>Test campaign content goes here.</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Learn More</a>
          </div>
          <p style="margin-top: 30px; text-align: center; color: #666;">
            Thank you for choosing Glo Head Spa!<br>
            <a href="#" style="color: #667eea;">Unsubscribe</a>
          </p>
        </div>
      </div>
    `,
    text: `Marketing Campaign - Glo Head Spa\n\nHello Test Client,\n\nThis is a test marketing campaign email.\n\nSpecial Promotion\nTest campaign content goes here.\n\nLearn More: [Link]\n\nThank you for choosing Glo Head Spa!`
  };

  try {
    const response = await sgMail.send(campaignEmail);
    console.log('✅ Campaign email sent successfully!');
    console.log(`  - Status: ${response[0].statusCode}`);
    console.log(`  - Message ID: ${response[0].headers['x-message-id']}`);
    return true;
  } catch (error) {
    console.error('❌ Campaign email failed:');
    console.error(`  - Error: ${error.message}`);
    if (error.response && error.response.body) {
      console.error(`  - Details: ${JSON.stringify(error.response.body, null, 2)}`);
    }
    return false;
  }
}

async function testPromotionalEmail() {
  console.log('\n📢 Testing Promotional Email...');
  
  const promotionalEmail = {
    to: 'test@example.com',
    from: fromEmail,
    subject: 'Promotional Email - Glo Head Spa',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
          <h1>Glo Head Spa</h1>
          <h2>Promotional Offer</h2>
        </div>
        <div style="padding: 20px;">
          <h3>Hello Valued Client,</h3>
          <p>Check out our latest promotional offer!</p>
          <div style="background-color: #f1f8e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #4CAF50; margin-top: 0;">Limited Time Offer</h4>
            <p>Get 30% off your next service!</p>
            <p><strong>Code:</strong> PROMO30</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Redeem Offer</a>
          </div>
          <p style="margin-top: 30px; text-align: center; color: #666;">
            Thank you for choosing Glo Head Spa!<br>
            <a href="#" style="color: #4CAF50;">Unsubscribe</a>
          </p>
        </div>
      </div>
    `,
    text: `Promotional Email - Glo Head Spa\n\nHello Valued Client,\n\nCheck out our latest promotional offer!\n\nLimited Time Offer\nGet 30% off your next service!\nCode: PROMO30\n\nRedeem Offer: [Link]\n\nThank you for choosing Glo Head Spa!`
  };

  try {
    const response = await sgMail.send(promotionalEmail);
    console.log('✅ Promotional email sent successfully!');
    console.log(`  - Status: ${response[0].statusCode}`);
    console.log(`  - Message ID: ${response[0].headers['x-message-id']}`);
    return true;
  } catch (error) {
    console.error('❌ Promotional email failed:');
    console.error(`  - Error: ${error.message}`);
    if (error.response && error.response.body) {
      console.error(`  - Details: ${JSON.stringify(error.response.body, null, 2)}`);
    }
    return false;
  }
}

async function main() {
  console.log('🎯 Starting marketing email tests...\n');
  
  const results = [];
  
  // Test 1: Basic marketing email
  results.push(await testMarketingEmail());
  
  // Test 2: Campaign email
  results.push(await testCampaignEmail());
  
  // Test 3: Promotional email
  results.push(await testPromotionalEmail());
  
  console.log('\n📊 TEST RESULTS SUMMARY:');
  console.log('========================');
  
  const passedTests = results.filter(r => r).length;
  const totalTests = results.length;
  
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 SUCCESS: All marketing email tests passed!');
    console.log('✅ Marketing email functionality is working correctly.');
    console.log('✅ Campaign emails should work properly.');
    console.log('✅ Promotional emails should work properly.');
  } else {
    console.log('\n⚠️  WARNING: Some marketing email tests failed.');
    console.log('Please check the error messages above for details.');
  }
  
  console.log('\n🔧 NEXT STEPS:');
  console.log('1. Check if the application server is running');
  console.log('2. Test marketing email functionality in the actual application');
  console.log('3. Check application logs for any marketing email errors');
  console.log('4. Verify that marketing campaigns are being sent correctly');
}

// Run the marketing email tests
main().catch(console.error);




