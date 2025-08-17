#!/usr/bin/env node

/**
 * Comprehensive Helcim Migration Test
 * Tests all payment processing functionality after migration from Square/Stripe to Helcim
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000';

async function testEndpoint(endpoint, method = 'GET', data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const result = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🧪 Comprehensive Helcim Migration Test');
  console.log('=====================================\n');

  const tests = [
    {
      name: 'Payment Creation (Cash)',
      endpoint: '/api/create-payment',
      method: 'POST',
      data: {
        amount: 25.00,
        type: 'test',
        description: 'Test cash payment',
        sourceId: 'cash'
      }
    },
    {
      name: 'Payment Creation (Card)',
      endpoint: '/api/create-payment',
      method: 'POST',
      data: {
        amount: 50.00,
        type: 'test',
        description: 'Test card payment',
        cardData: {
          cardNumber: '4111111111111111',
          cardExpiryMonth: '12',
          cardExpiryYear: '2025',
          cardCVV: '123'
        }
      }
    },
    {
      name: 'Saved Payment Methods',
      endpoint: '/api/saved-payment-methods?clientId=1',
      method: 'GET'
    },
    {
      name: 'Helcim Terminal Payment',
      endpoint: '/api/helcim-terminal/payment',
      method: 'POST',
      data: {
        amount: 75.00,
        description: 'Test terminal payment',
        type: 'terminal_payment'
      }
    },
    {
      name: 'Health Check',
      endpoint: '/health',
      method: 'GET'
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    console.log(`\n🔍 Testing: ${test.name}`);
    console.log(`   Endpoint: ${test.method} ${test.endpoint}`);
    
    const result = await testEndpoint(test.endpoint, test.method, test.data);
    
    if (result.success) {
      console.log(`   ✅ PASSED - Status: ${result.status}`);
      if (result.data && typeof result.data === 'object') {
        console.log(`   Response: ${JSON.stringify(result.data, null, 2)}`);
      }
      passedTests++;
    } else {
      console.log(`   ❌ FAILED - Status: ${result.status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.data && result.data.error) {
        console.log(`   Server Error: ${result.data.error}`);
      }
    }
  }

  console.log('\n📊 Test Results');
  console.log('===============');
  console.log(`Passed: ${passedTests}/${totalTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Helcim migration is complete and working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }

  // Check for remaining legacy payment references
  console.log('\n🔍 Checking for remaining legacy payment references...');
  
  function checkFileForReferences(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const squareRefs = (content.match(/square/gi) || []).length;
      const stripeRefs = (content.match(/stripe/gi) || []).length;
      
      if (squareRefs > 0 || stripeRefs > 0) {
        console.log(`   ⚠️  ${filePath}: ${squareRefs} Square refs, ${stripeRefs} Stripe refs`);
      }
    } catch (error) {
      // File doesn't exist or can't be read
    }
  }

  const filesToCheck = [
    'server/routes.ts',
    'server/routes/payments.ts',
    'client/src/pages/pos.tsx',
    'client/src/components/payment/client-payment-methods.tsx'
  ];

  filesToCheck.forEach(checkFileForReferences);
  
  console.log('\n✅ Migration verification complete!');
}

// Run the tests
runTests().catch(console.error); 