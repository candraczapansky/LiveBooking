#!/usr/bin/env node

// Marketing Endpoint Test Script
// This script tests the marketing email endpoints to ensure they work correctly

import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 MARKETING ENDPOINT TEST');
console.log('===========================\n');

// Check if server is running
async function testServerConnection() {
  console.log('🔍 Testing server connection...');
  
  try {
    const response = await fetch('http://localhost:5000/api/test-sendgrid-config');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Server is running');
      console.log('  - SendGrid API Key:', data.config?.apiKey || 'NOT SET');
      console.log('  - From Email:', data.config?.fromEmail || 'NOT SET');
      console.log('  - Test Result:', data.config?.testResult || 'UNKNOWN');
      return true;
    } else {
      console.log('❌ Server responded with error:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Server is not running or not accessible');
    console.log('  - Error:', error.message);
    return false;
  }
}

async function testMarketingEndpoints() {
  console.log('\n📧 Testing Marketing Email Endpoints...');
  
  const endpoints = [
    {
      name: 'Send Promotional Email',
      url: 'http://localhost:5000/api/marketing/send-promotional-email',
      method: 'POST',
      body: {
        recipientIds: [1],
        subject: 'Test Marketing Email',
        message: 'This is a test marketing email from the application.'
      }
    },
    {
      name: 'Send Template Email',
      url: 'http://localhost:5000/api/email-marketing/send-template',
      method: 'POST',
      body: {
        templateType: 'appointment_confirmation',
        recipientEmail: 'test@example.com',
        recipientName: 'Test Client',
        subject: 'Test Template Email'
      }
    },
    {
      name: 'Bulk Promotional Email',
      url: 'http://localhost:5000/api/email-marketing/bulk/promotional',
      method: 'POST',
      body: {
        recipientIds: [1],
        subject: 'Test Bulk Email',
        content: 'This is a test bulk promotional email.',
        htmlContent: '<h1>Test Bulk Email</h1><p>This is a test bulk promotional email.</p>'
      }
    }
  ];

  const results = [];

  for (const endpoint of endpoints) {
    console.log(`\n🧪 Testing: ${endpoint.name}`);
    console.log(`  URL: ${endpoint.url}`);
    
    try {
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(endpoint.body)
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('  ✅ Success');
        console.log('    - Status:', response.status);
        console.log('    - Response:', JSON.stringify(data, null, 2));
        results.push({ name: endpoint.name, success: true, data });
      } else {
        console.log('  ❌ Failed');
        console.log('    - Status:', response.status);
        console.log('    - Error:', data.error || 'Unknown error');
        results.push({ name: endpoint.name, success: false, error: data.error });
      }
    } catch (error) {
      console.log('  ❌ Network Error');
      console.log('    - Error:', error.message);
      results.push({ name: endpoint.name, success: false, error: error.message });
    }
  }

  return results;
}

async function testCampaignEndpoints() {
  console.log('\n📢 Testing Campaign Endpoints...');
  
  const endpoints = [
    {
      name: 'Get Marketing Campaigns',
      url: 'http://localhost:5000/api/marketing/campaigns',
      method: 'GET'
    },
    {
      name: 'Get Email Marketing Campaigns',
      url: 'http://localhost:5000/api/email-marketing/campaigns',
      method: 'GET'
    }
  ];

  const results = [];

  for (const endpoint of endpoints) {
    console.log(`\n🧪 Testing: ${endpoint.name}`);
    console.log(`  URL: ${endpoint.url}`);
    
    try {
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('  ✅ Success');
        console.log('    - Status:', response.status);
        console.log('    - Data Type:', Array.isArray(data) ? 'Array' : 'Object');
        console.log('    - Items:', Array.isArray(data) ? data.length : 'N/A');
        results.push({ name: endpoint.name, success: true, data });
      } else {
        console.log('  ❌ Failed');
        console.log('    - Status:', response.status);
        console.log('    - Error:', data.error || 'Unknown error');
        results.push({ name: endpoint.name, success: false, error: data.error });
      }
    } catch (error) {
      console.log('  ❌ Network Error');
      console.log('    - Error:', error.message);
      results.push({ name: endpoint.name, success: false, error: error.message });
    }
  }

  return results;
}

async function main() {
  console.log('🎯 Starting marketing endpoint tests...\n');
  
  // Test 1: Server connection
  const serverRunning = await testServerConnection();
  
  if (!serverRunning) {
    console.log('\n⚠️  Server is not running. Please start the application server first.');
    console.log('   Command: npm start');
    return;
  }
  
  // Test 2: Marketing email endpoints
  const marketingResults = await testMarketingEndpoints();
  
  // Test 3: Campaign endpoints
  const campaignResults = await testCampaignEndpoints();
  
  // Summary
  console.log('\n📊 TEST RESULTS SUMMARY:');
  console.log('========================');
  
  const allResults = [...marketingResults, ...campaignResults];
  const passedTests = allResults.filter(r => r.success).length;
  const totalTests = allResults.length;
  
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 SUCCESS: All marketing endpoints are working!');
    console.log('✅ Marketing email functionality is ready to use.');
    console.log('✅ Campaign management is working.');
    console.log('✅ Email templates are accessible.');
  } else {
    console.log('\n⚠️  WARNING: Some endpoints failed.');
    console.log('Please check the error messages above for details.');
  }
  
  console.log('\n🔧 NEXT STEPS:');
  console.log('1. Resolve SendGrid account credit limit issue');
  console.log('2. Test actual email sending in the application');
  console.log('3. Monitor email delivery in SendGrid dashboard');
  console.log('4. Verify marketing campaigns are working correctly');
}

// Run the tests
main().catch(console.error);




