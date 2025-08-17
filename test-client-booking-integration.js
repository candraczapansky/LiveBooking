#!/usr/bin/env node

/**
 * Test script for Client Booking App Integration
 * This script tests the webhook endpoint to ensure appointments can be created
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: 'https://salon-sync-client-candraczapansky.replit.app', // Your salon app URL
  apiKey: process.env.EXTERNAL_API_KEY || 'glo-head-spa-external-2024',
  testAppointment: {
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
    clientInfo: {
      firstName: 'Test',
      lastName: 'Client',
      email: `test.client.${Date.now()}@example.com`,
      phone: '+1234567890'
    },
    serviceInfo: {
      name: 'Test Head Spa Service',
      description: 'Test service for integration verification',
      price: 75.00,
      duration: 60,
      categoryName: 'Test Category'
    },
    notes: 'Test appointment from client booking app integration'
  }
};

// Helper function to make HTTP requests
function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = client.request(requestOptions, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  console.log('🏥 Testing Health Check...');
  
  try {
    const response = await makeRequest(`${config.baseUrl}/api/external/health`);
    
    if (response.statusCode === 200) {
      console.log('✅ Health check passed');
      console.log('   Status:', response.data.status);
      console.log('   Endpoints:', response.data.endpoints);
      return true;
    } else {
      console.log('❌ Health check failed');
      console.log('   Status:', response.statusCode);
      console.log('   Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    return false;
  }
}

async function testAppointmentCreation() {
  console.log('\n📅 Testing Appointment Creation...');
  
  try {
    const response = await makeRequest(
      `${config.baseUrl}/api/appointments/webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        }
      },
      config.testAppointment
    );
    
    if (response.statusCode === 201) {
      console.log('✅ Appointment creation passed');
      console.log('   Appointment ID:', response.data.appointment.id);
      console.log('   Client ID:', response.data.appointment.clientId);
      console.log('   Service ID:', response.data.appointment.serviceId);
      console.log('   Created entities:', response.data.createdEntities);
      return true;
    } else {
      console.log('❌ Appointment creation failed');
      console.log('   Status:', response.statusCode);
      console.log('   Error:', response.data.error || response.data.message);
      if (response.data.details) {
        console.log('   Details:', response.data.details);
      }
      return false;
    }
  } catch (error) {
    console.log('❌ Appointment creation error:', error.message);
    return false;
  }
}

async function testStaffAvailability() {
  console.log('\n👥 Testing Staff Availability...');
  
  try {
    const response = await makeRequest(
      `${config.baseUrl}/api/external/staff-availability`,
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      }
    );
    
    if (response.statusCode === 200) {
      console.log('✅ Staff availability check passed');
      console.log('   Staff count:', response.data.staff?.length || 'N/A');
      return true;
    } else {
      console.log('❌ Staff availability check failed');
      console.log('   Status:', response.statusCode);
      console.log('   Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Staff availability check error:', error.message);
    return false;
  }
}

async function testInvalidApiKey() {
  console.log('\n🔒 Testing Invalid API Key...');
  
  try {
    const response = await makeRequest(
      `${config.baseUrl}/api/appointments/webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-key'
        }
      },
      config.testAppointment
    );
    
    if (response.statusCode === 401) {
      console.log('✅ Invalid API key test passed (correctly rejected)');
      return true;
    } else {
      console.log('❌ Invalid API key test failed (should have been rejected)');
      console.log('   Status:', response.statusCode);
      return false;
    }
  } catch (error) {
    console.log('❌ Invalid API key test error:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Client Booking App Integration Test Suite');
  console.log('==========================================');
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`API Key: ${config.apiKey}`);
  console.log(`Test Appointment: ${new Date(config.testAppointment.startTime).toLocaleString()}`);
  console.log('');
  
  const results = {
    healthCheck: await testHealthCheck(),
    appointmentCreation: await testAppointmentCreation(),
    staffAvailability: await testStaffAvailability(),
    invalidApiKey: await testInvalidApiKey()
  };
  
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  console.log(`Health Check: ${results.healthCheck ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Appointment Creation: ${results.appointmentCreation ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Staff Availability: ${results.staffAvailability ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Invalid API Key: ${results.invalidApiKey ? '✅ PASS' : '❌ FAIL'}`);
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\nOverall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Your integration is working correctly.');
    console.log('\n📋 Next Steps:');
    console.log('1. Use the API key in your client booking app');
    console.log('2. Send appointment data to the webhook endpoint');
    console.log('3. Monitor the salon management app for new appointments');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Verify the base URL is correct');
    console.log('2. Check if the API key is valid');
    console.log('3. Ensure the salon app is running');
    console.log('4. Check server logs for detailed errors');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testHealthCheck,
  testAppointmentCreation,
  testStaffAvailability,
  testInvalidApiKey,
  runTests
};



